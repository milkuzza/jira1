// apps/api/src/modules/issues/issues.gateway.ts
// Socket.IO gateway: real-time Kanban updates + user presence.

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { OnEvent } from '@nestjs/event-emitter';
import { WS_EVENTS, WS_PRESENCE, EVENTS } from '../../constants';
import { BoardColumnEntity } from '../../entities/board-column.entity';

interface JoinPayload {
  token: string;
  projectId: string;
}

interface JwtPayload {
  sub: string;
  tenantId: string;
  email: string;
  role: string;
  fullName?: string;
  avatarUrl?: string | null;
}

interface ViewerInfo {
  userId: string;
  fullName: string;
  avatarUrl: string | null;
}

@WebSocketGateway({
  cors: {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow same patterns as HTTP CORS
      if (!origin) { callback(null, true); return; }
      const dev = process.env['NODE_ENV'] !== 'production';
      if (dev) {
        const allowed = /^https?:\/\/(localhost|.*\.app\.localhost)(:\d+)?$/.test(origin);
        callback(null, allowed);
      } else {
        const origins = (process.env['ALLOWED_ORIGINS'] ?? '').split(',').map((o) => o.trim());
        callback(null, origins.includes(origin));
      }
    },
    credentials: true,
  },
  namespace: '/ws',
})
export class IssuesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(IssuesGateway.name);

  /** Map<room, Map<socketId, ViewerInfo>> */
  private readonly viewersMap = new Map<string, Map<string, ViewerInfo>>();

  /** Map<projectId, Set<roomName>> — for reliable broadcast without adapter inspection */
  private readonly projectRooms = new Map<string, Set<string>>();

  /** Map<socketId, { room, userId, projectId }> for cleanup on disconnect */
  private readonly socketMeta = new Map<string, { room: string; userId: string; projectId: string }>();

  constructor(private readonly jwtService: JwtService) {}

  handleConnection(client: Socket): void {
    // Immediately join personal notification room (even before join:project)
    try {
      const token = (client.handshake.auth as Record<string, unknown>)?.token as string | undefined;
      if (token) {
        const decoded = this.jwtService.verify<JwtPayload>(token);
        const userRoom = `user:${decoded.sub}:tenant:${decoded.tenantId}`;
        void client.join(userRoom);
        this.logger.debug(`Client ${client.id} joined user room ${userRoom} on connect`);
      }
    } catch {
      // Invalid/expired token at connect time — still allow connection,
      // join:project will re-verify and disconnect if needed
    }
    this.logger.debug(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    const meta = this.socketMeta.get(client.id);
    if (meta) {
      const roomViewers = this.viewersMap.get(meta.room);
      if (roomViewers) {
        roomViewers.delete(client.id);
        if (roomViewers.size === 0) {
          this.viewersMap.delete(meta.room);
        }
      }
      // Remove room from projectRooms
      if (meta.projectId) {
        this.projectRooms.get(meta.projectId)?.delete(meta.room);
      }
      // Broadcast user:left
      this.server.to(meta.room).emit(WS_PRESENCE.USER_LEFT, {
        userId: meta.userId,
      });
      this.socketMeta.delete(client.id);
    }
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage(WS_EVENTS.JOIN_PROJECT)
  handleJoinProject(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinPayload,
  ): void {
    try {
      const decoded = this.jwtService.verify<JwtPayload>(payload.token);
      const room = `project:${payload.projectId}:tenant:${decoded.tenantId}`;

      // Auto-leave previous project room if any (prevents viewer accumulation)
      const existingMeta = this.socketMeta.get(client.id);
      if (existingMeta && existingMeta.room !== room) {
        const oldRoomViewers = this.viewersMap.get(existingMeta.room);
        if (oldRoomViewers) {
          oldRoomViewers.delete(client.id);
          if (oldRoomViewers.size === 0) this.viewersMap.delete(existingMeta.room);
        }
        // Notify remaining viewers in old room
        client.to(existingMeta.room).emit(WS_PRESENCE.USER_LEFT, { userId: existingMeta.userId });
        void client.leave(existingMeta.room);
        // Clean up projectRooms for old room
        if (existingMeta.projectId) {
          this.projectRooms.get(existingMeta.projectId)?.delete(existingMeta.room);
        }
        this.socketMeta.delete(client.id);
        this.logger.debug(`Auto-left room ${existingMeta.room} on new join`);
      }

      void client.join(room);

      const viewer: ViewerInfo = {
        userId: decoded.sub,
        fullName: decoded.fullName ?? decoded.email,
        avatarUrl: decoded.avatarUrl ?? null,
      };

      // Get existing viewers BEFORE adding self
      const existingViewers = Array.from(this.viewersMap.get(room)?.values() ?? [])
        .filter((v) => v.userId !== decoded.sub);

      // Send existing viewers to the newly joining socket only
      client.emit('viewers:initial', existingViewers);

      // Track viewer (add/update entry for this socket)
      if (!this.viewersMap.has(room)) {
        this.viewersMap.set(room, new Map());
      }
      this.viewersMap.get(room)!.set(client.id, viewer);
      this.socketMeta.set(client.id, { room, userId: decoded.sub, projectId: payload.projectId });

      // Track room→project mapping for efficient broadcasts
      if (!this.projectRooms.has(payload.projectId)) {
        this.projectRooms.set(payload.projectId, new Set());
      }
      this.projectRooms.get(payload.projectId)!.add(room);

      // Broadcast user:viewing to OTHERS only (not back to sender)
      client.to(room).emit(WS_PRESENCE.USER_VIEWING, viewer);

      // Also join user-specific room for notifications
      const userRoom = `user:${decoded.sub}:tenant:${decoded.tenantId}`;
      void client.join(userRoom);

      this.logger.debug(`Client ${client.id} joined room ${room}`);
    } catch {
      this.logger.warn(`Client ${client.id} failed JWT verification`);
      client.disconnect();
    }
  }

  @SubscribeMessage('leave:project')
  handleLeaveProject(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { projectId: string },
  ): void {
    const meta = this.socketMeta.get(client.id);
    if (!meta) return;

    const roomViewers = this.viewersMap.get(meta.room);
    if (roomViewers) {
      roomViewers.delete(client.id);
      if (roomViewers.size === 0) this.viewersMap.delete(meta.room);
    }

    // Remove room from projectRooms
    if (meta.projectId) {
      this.projectRooms.get(meta.projectId)?.delete(meta.room);
    }

    // Notify remaining viewers
    client.to(meta.room).emit(WS_PRESENCE.USER_LEFT, { userId: meta.userId });
    void client.leave(meta.room);
    this.socketMeta.delete(client.id);

    this.logger.debug(`Client ${client.id} left room ${meta.room} (explicit leave)`);
    void payload; // suppress unused warning
  }

  // ─── EventEmitter Listeners → WebSocket Broadcasts ─────

  @OnEvent(EVENTS.ISSUE_MOVED)
  handleIssueMoved(payload: {
    issueId: string;
    newStatus: string;
    newOrder: number;
    movedBy: string;
    projectId: string;
  }): void {
    const rooms = this.findProjectRooms(payload.projectId);
    for (const room of rooms) {
      this.server.to(room).emit(WS_EVENTS.ISSUE_MOVED, {
        issueId: payload.issueId,
        newStatus: payload.newStatus,
        newOrder: payload.newOrder,
        movedBy: payload.movedBy,
      });
    }
  }

  @OnEvent(EVENTS.ISSUE_CREATED)
  handleIssueCreated(payload: {
    issue: { id: string; title: string; status: string; priority: string; order: number };
    projectId: string;
  }): void {
    const rooms = this.findProjectRooms(payload.projectId);
    for (const room of rooms) {
      this.server.to(room).emit(WS_EVENTS.ISSUE_CREATED, {
        issue: {
          id: payload.issue.id,
          title: payload.issue.title,
          status: payload.issue.status,
          priority: payload.issue.priority,
          assignee: null,
          storyPoints: null,
          labelsCount: 0,
          commentsCount: 0,
          order: payload.issue.order,
        },
      });
    }
  }

  @OnEvent(EVENTS.ISSUE_UPDATED)
  handleIssueUpdated(payload: {
    issueId: string;
    projectId: string;
    changes: Record<string, any>;
    userId: string;
  }): void {
    if (!payload.projectId) return;
    const rooms = this.findProjectRooms(payload.projectId);
    for (const room of rooms) {
      this.server.to(room).emit(WS_EVENTS.ISSUE_UPDATED, {
        issueId: payload.issueId,
        changes: payload.changes,
      });
    }
  }

  @OnEvent(EVENTS.ISSUE_DELETED)
  handleIssueDeleted(payload: { issueId: string; projectId: string }): void {
    const rooms = this.findProjectRooms(payload.projectId);
    for (const room of rooms) {
      this.server.to(room).emit(WS_PRESENCE.ISSUE_DELETED, {
        issueId: payload.issueId,
      });
    }
  }

  @OnEvent(EVENTS.ISSUE_COMMENTED)
  handleIssueCommented(payload: {
    issueId: string;
    commentId: string;
    userId: string;
    projectId: string;
  }): void {
    if (!payload.projectId) return;
    const rooms = this.findProjectRooms(payload.projectId);
    for (const room of rooms) {
      this.server.to(room).emit('issue:commented', {
        issueId: payload.issueId,
        commentId: payload.commentId,
      });
    }
  }

  // ─── Column Events ──────────────────────────────────────────

  @OnEvent(EVENTS.COLUMN_CREATED)
  handleColumnCreated(payload: { projectId: string; column: BoardColumnEntity }): void {
    const rooms = this.findProjectRooms(payload.projectId);
    for (const room of rooms) {
      this.server.to(room).emit(WS_EVENTS.COLUMN_CREATED, payload);
    }
  }

  @OnEvent(EVENTS.COLUMN_UPDATED)
  handleColumnUpdated(payload: { projectId: string; column: BoardColumnEntity }): void {
    const rooms = this.findProjectRooms(payload.projectId);
    for (const room of rooms) {
      this.server.to(room).emit(WS_EVENTS.COLUMN_UPDATED, payload);
    }
  }

  @OnEvent(EVENTS.COLUMN_DELETED)
  handleColumnDeleted(payload: { projectId: string; columnId: string }): void {
    const rooms = this.findProjectRooms(payload.projectId);
    for (const room of rooms) {
      this.server.to(room).emit(WS_EVENTS.COLUMN_DELETED, payload);
    }
  }

  /** Emit notification directly to a specific user's room */
  emitToUser(userId: string, tenantId: string, event: string, data: unknown): void {
    const userRoom = `user:${userId}:tenant:${tenantId}`;
    this.server.to(userRoom).emit(event, data);
  }

  private findProjectRooms(projectId: string): string[] {
    return Array.from(this.projectRooms.get(projectId) ?? new Set<string>());
  }
}
