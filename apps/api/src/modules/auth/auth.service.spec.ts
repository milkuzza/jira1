// apps/api/src/modules/auth/auth.service.spec.ts
// Unit tests for AuthService — login, refresh rotation, reuse detection, logout.

import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UserEntity } from '../../entities/user.entity';
import { REDIS_CLIENT } from '../../constants';

// ─── Mocks ───────────────────────────────────────

const mockUser: Partial<UserEntity> = {
  id: '11111111-1111-1111-1111-111111111111',
  tenantId: '22222222-2222-2222-2222-222222222222',
  email: 'admin@acme.com',
  passwordHash: '', // Will be set in beforeEach
  fullName: 'Alice Admin',
  role: 'ADMIN',
  avatarUrl: null,
};

const mockUserRepo = {
  createQueryBuilder: jest.fn(),
  findOne: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mock.jwt.token'),
  verify: jest.fn(),
};

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  scan: jest.fn().mockResolvedValue(['0', []]),
};

// ─── Test Suite ──────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    // Hash the password for comparison
    mockUser.passwordHash = await bcrypt.hash('password123', 4);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(UserEntity), useValue: mockUserRepo },
        { provide: JwtService, useValue: mockJwtService },
        { provide: REDIS_CLIENT, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    // Reset all mocks
    jest.clearAllMocks();
  });

  // ─── Login ──────────────────────────────────────

  describe('login', () => {
    it('should return tokens and user on valid credentials', async () => {
      const qb = {
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockUser),
      };
      mockUserRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.login('admin@acme.com', 'password123', mockUser.tenantId!);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user).toEqual({
        id: mockUser.id,
        email: mockUser.email,
        fullName: mockUser.fullName,
        role: mockUser.role,
        avatarUrl: mockUser.avatarUrl,
      });
      // Verify password_hash is NOT in the response
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('should throw UnauthorizedException on wrong password', async () => {
      const qb = {
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockUser),
      };
      mockUserRepo.createQueryBuilder.mockReturnValue(qb);

      await expect(
        service.login('admin@acme.com', 'wrongpassword', mockUser.tenantId!),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException on non-existent email (no info leak)', async () => {
      const qb = {
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      mockUserRepo.createQueryBuilder.mockReturnValue(qb);

      await expect(
        service.login('unknown@acme.com', 'password123', mockUser.tenantId!),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── Refresh ────────────────────────────────────

  describe('refresh', () => {
    const tokenPayload = {
      sub: mockUser.id,
      tenantId: mockUser.tenantId,
      tokenId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      type: 'refresh',
    };

    it('should return new token pair on valid refresh token', async () => {
      mockJwtService.verify.mockReturnValue(tokenPayload);
      mockRedis.get.mockResolvedValue(JSON.stringify({ used: false, createdAt: new Date().toISOString() }));
      mockUserRepo.findOne.mockResolvedValue(mockUser);

      const result = await service.refresh('valid.refresh.token');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.id).toBe(mockUser.id);
      // Old token should be marked as used
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringContaining(tokenPayload.tokenId),
        expect.stringContaining('"used":true'),
        'EX',
        60,
      );
    });

    it('should invalidate all sessions on token reuse (reuse detection)', async () => {
      mockJwtService.verify.mockReturnValue(tokenPayload);
      // Token marked as "used" → potential theft
      mockRedis.get.mockResolvedValue(JSON.stringify({ used: true, createdAt: new Date().toISOString() }));

      await expect(service.refresh('reused.refresh.token')).rejects.toThrow(
        UnauthorizedException,
      );
      // Should scan and delete all refresh keys for the user
      expect(mockRedis.scan).toHaveBeenCalledWith(
        '0',
        'MATCH',
        expect.stringContaining(mockUser.id!),
        'COUNT',
        100,
      );
    });

    it('should throw UnauthorizedException on invalid token', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refresh('invalid.token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
