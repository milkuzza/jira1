// apps/api/src/modules/tenants/tenants.service.spec.ts
// Unit tests for TenantsService — registration, duplicate slug handling.

import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken, getDataSourceToken } from '@nestjs/typeorm';
import { ConflictException } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { TenantEntity } from '../../entities/tenant.entity';
import { UserEntity } from '../../entities/user.entity';
import { AuthService } from '../auth/auth.service';

// ─── Mocks ───────────────────────────────────────

const mockTenant: Partial<TenantEntity> = {
  id: '22222222-2222-2222-2222-222222222222',
  name: 'Acme Corp',
  slug: 'acme',
  plan: 'FREE',
};

const mockUser: Partial<UserEntity> = {
  id: '11111111-1111-1111-1111-111111111111',
  tenantId: mockTenant.id,
  email: 'admin@acme.com',
  fullName: 'Admin',
  role: 'ADMIN',
  avatarUrl: null,
};

const mockTenantRepo = {
  findOne: jest.fn(),
  count: jest.fn(),
};

const mockUserRepo = {};

const mockQueryRunnerManager = {
  create: jest.fn().mockImplementation((_Entity: unknown, data: Record<string, unknown>) => data),
  save: jest.fn().mockImplementation((entity: Record<string, unknown>) => ({
    ...entity,
    id: entity['id'] ?? mockTenant.id,
  })),
};

const mockQueryRunner = {
  connect: jest.fn(),
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  rollbackTransaction: jest.fn(),
  release: jest.fn(),
  query: jest.fn(),
  manager: mockQueryRunnerManager,
};

const mockDataSource = {
  createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
};

const mockAuthService = {
  generateTokens: jest.fn().mockResolvedValue({
    accessToken: 'mock.access.token',
    refreshToken: 'mock.refresh.token',
  }),
};

// ─── Test Suite ──────────────────────────────────

describe('TenantsService', () => {
  let service: TenantsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantsService,
        { provide: getRepositoryToken(TenantEntity), useValue: mockTenantRepo },
        { provide: getRepositoryToken(UserEntity), useValue: mockUserRepo },
        { provide: getDataSourceToken(), useValue: mockDataSource },
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    service = module.get<TenantsService>(TenantsService);
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should throw ConflictException when slug is already taken', async () => {
      mockTenantRepo.findOne.mockResolvedValue(mockTenant);

      await expect(
        service.register({
          orgName: 'Duplicate Corp',
          slug: 'acme',
          adminEmail: 'admin@duplicate.com',
          adminPassword: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create tenant + admin user + return tokens on success', async () => {
      mockTenantRepo.findOne.mockResolvedValue(null); // Slug is available
      mockQueryRunnerManager.save
        .mockResolvedValueOnce({ ...mockTenant, id: mockTenant.id }) // tenant save
        .mockResolvedValueOnce({ ...mockUser, id: mockUser.id }); // user save

      const result = await service.register({
        orgName: 'Acme Corp',
        slug: 'acme',
        adminEmail: 'admin@acme.com',
        adminPassword: 'password123',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe('admin@acme.com');
      expect(result.user.role).toBe('ADMIN');
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      // Should NOT have password in response
      expect(result.user).not.toHaveProperty('passwordHash');
    });
  });
  describe('checkSlug', () => {
    it('should return { available: true } when slug is not taken', async () => {
      mockTenantRepo.count.mockResolvedValue(0);
      const result = await service.checkSlug('free-slug');
      expect(result).toEqual({ available: true });
    });

    it('should return { available: false } when slug is taken', async () => {
      mockTenantRepo.count.mockResolvedValue(1);
      const result = await service.checkSlug('acme');
      expect(result).toEqual({ available: false });
    });
  });
});
