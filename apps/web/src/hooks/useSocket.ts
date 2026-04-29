// apps/web/src/hooks/useSocket.ts
// Singleton Socket.IO connection shared across the app.

import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/auth.store';

let socketSingleton: Socket | null = null;

export interface UseSocketReturn {
  socket: Socket | null;
  connected: boolean;
  reconnecting: boolean;
}

export function useSocket(): UseSocketReturn {
  const accessToken = useAuthStore((s) => s.accessToken);
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!accessToken) {
      // User logged out — disconnect and reset singleton
      if (socketSingleton) {
        socketSingleton.disconnect();
        socketSingleton = null;
      }
      setConnected(false);
      socketRef.current = null;
      return;
    }

    // Reuse singleton if already connected with same token
    if (!socketSingleton) {
      // socket.io needs http/https URL — it handles WebSocket upgrade internally.
      // VITE_WS_URL may use ws:// or wss://, so we normalize it.
      const rawUrl = import.meta.env.VITE_WS_URL ?? 'http://api.app.localhost';
      const httpUrl = rawUrl
        .replace(/^wss:\/\//, 'https://')
        .replace(/^ws:\/\//, 'http://');
      // Append /ws namespace if not already present
      const url = httpUrl.endsWith('/ws') ? httpUrl : `${httpUrl}/ws`;
      socketSingleton = io(url, {
        auth: { token: accessToken },
        reconnectionDelay:    1000,
        reconnectionDelayMax: 30_000,
        randomizationFactor:  0.5,
        transports: ['websocket'],
      });
    }

    socketRef.current = socketSingleton;
    const socket = socketRef.current;

    const onConnect    = () => { setConnected(true);  setReconnecting(false); };
    const onDisconnect = () => { setConnected(false); };
    const onReconnectAttempt = () => setReconnecting(true);
    const onReconnect  = () => { setConnected(true);  setReconnecting(false); };

    socket.on('connect',           onConnect);
    socket.on('disconnect',        onDisconnect);
    socket.on('reconnect_attempt', onReconnectAttempt);
    socket.on('reconnect',         onReconnect);

    setConnected(socket.connected);

    return () => {
      socket.off('connect',           onConnect);
      socket.off('disconnect',        onDisconnect);
      socket.off('reconnect_attempt', onReconnectAttempt);
      socket.off('reconnect',         onReconnect);
    };
  }, [accessToken]);

  return { socket: socketRef.current, connected, reconnecting };
}
