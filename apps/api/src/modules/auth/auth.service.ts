// apps/api/src/modules/auth/auth.service.ts
// Handles login, JWT generation, refresh token rotation with reuse detection, and logout.

import {
  Injectable,
  UnauthorizedException,
  Logger,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import Redis from 'ioredis';
import { UserEntity } from '../../entities/user.entity';
import {
  REDIS_CLIENT,
  REFRESH_KEY_PREFIX,
  ACCESS_TOKEN_TTL,
  REFRESH_TOKEN_TTL_SECONDS,
} from '../../constants';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserDto {
  id: string;
  email: string;
  fullName: string;
  role: string;
  avatarUrl: string | null;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserDto;
}

interface RefreshPayload {
  sub: string;
  tenantId: string;
  tokenId: string;
  type: 'refresh';
}

interface RefreshTokenData {
  used: boolean;
  createdAt: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly jwtService: JwtService,
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
  ) {}

  async login(email: string, password: string, tenantId: string): Promise<AuthResponse> {
    // Explicitly select password_hash since it's excluded by default
    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .andWhere('user.tenantId = :tenantId', { tenantId })
      .getOne();

    if (!user) {
      // Don't reveal whether email or password is wrong
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user);
    return {
      ...tokens,
      user: this.toUserDto(user),
    };
  }

  async refresh(refreshToken: string): Promise<AuthResponse> {
    let payload: RefreshPayload;

    try {
      payload = this.jwtService.verify<RefreshPayload>(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    const redisKey = this.refreshKey(payload.sub, payload.tokenId);
    const stored = await this.redis.get(redisKey);

    if (!stored) {
      // Token not found — could be expired, logged out, or stolen
      throw new UnauthorizedException('Refresh token not found');
    }

    const tokenData: RefreshTokenData = JSON.parse(stored);

    if (tokenData.used) {
      // REUSE DETECTED — invalidate ALL refresh tokens for this user
      this.logger.warn(`Refresh token reuse detected for user ${payload.sub}`);
      await this.invalidateAllSessions(payload.sub);
      throw new UnauthorizedException({
        message: 'Token reuse detected. All sessions invalidated.',
        code: 'TOKEN_REUSE_DETECTED',
      });
    }

    // Mark the old token as used (for reuse detection window)
    tokenData.used = true;
    await this.redis.set(redisKey, JSON.stringify(tokenData), 'EX', 60); // Keep for 60s for reuse detection

    // Fetch user to generate new tokens
    const user = await this.userRepo.findOne({ where: { id: payload.sub, tenantId: payload.tenantId } });
    if (!user) {
      throw new UnauthorizedException('User not found or tenant mismatch');
    }

    const tokens = await this.generateTokens(user);
    return {
      ...tokens,
      user: this.toUserDto(user),
    };
  }

  async logout(userId: string, tokenId: string): Promise<void> {
    const redisKey = this.refreshKey(userId, tokenId);
    await this.redis.del(redisKey);
    this.logger.debug(`Logged out user ${userId}, tokenId ${tokenId}`);
  }

  public async generateTokens(user: UserEntity): Promise<AuthTokens> {
    const tokenId = uuidv4();

    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        tenantId: user.tenantId,
        email: user.email,
        role: user.role,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        tokenId,
      },
      { expiresIn: ACCESS_TOKEN_TTL },
    );

    const refreshToken = this.jwtService.sign(
      {
        sub: user.id,
        tenantId: user.tenantId,
        tokenId,
        type: 'refresh',
      },
      { expiresIn: `${REFRESH_TOKEN_TTL_SECONDS}s` },
    );

    // Store refresh token in Redis
    const redisKey = this.refreshKey(user.id, tokenId);
    const tokenData: RefreshTokenData = {
      used: false,
      createdAt: new Date().toISOString(),
    };
    await this.redis.set(redisKey, JSON.stringify(tokenData), 'EX', REFRESH_TOKEN_TTL_SECONDS);

    return { accessToken, refreshToken };
  }

  private async invalidateAllSessions(userId: string): Promise<void> {
    const pattern = `${REFRESH_KEY_PREFIX}:${userId}:*`;
    let cursor = '0';

    do {
      const [nextCursor, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;

      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } while (cursor !== '0');

    this.logger.warn(`All sessions invalidated for user ${userId}`);
  }

  private refreshKey(userId: string, tokenId: string): string {
    return `${REFRESH_KEY_PREFIX}:${userId}:${tokenId}`;
  }

  private toUserDto(user: UserEntity): UserDto {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      avatarUrl: user.avatarUrl,
    };
  }
}
