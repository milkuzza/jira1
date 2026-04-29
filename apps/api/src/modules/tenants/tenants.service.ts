// apps/api/src/modules/tenants/tenants.service.ts
// Tenant registration (with admin user creation), current tenant info, and updates.

import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { TenantEntity } from '../../entities/tenant.entity';
import { UserEntity } from '../../entities/user.entity';
import { AuthService, AuthResponse } from '../auth/auth.service';
import { RegisterTenantDto } from './dto/register-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { BCRYPT_SALT_ROUNDS, SET_TENANT_QUERY } from '../../constants';

@Injectable()
export class TenantsService {
  private readonly logger = new Logger(TenantsService.name);

  constructor(
    @InjectRepository(TenantEntity)
    private readonly tenantRepo: Repository<TenantEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly authService: AuthService,
  ) {}

  async register(dto: RegisterTenantDto): Promise<AuthResponse> {
    // Check slug uniqueness
    const existing = await this.tenantRepo.findOne({ where: { slug: dto.slug } });
    if (existing) {
      throw new ConflictException(`Slug '${dto.slug}' is already taken`);
    }

    // Transaction: create tenant → create admin user → generate tokens
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create tenant
      const tenant = queryRunner.manager.create(TenantEntity, {
        name: dto.orgName,
        slug: dto.slug,
        plan: 'FREE',
      });
      const savedTenant = await queryRunner.manager.save(tenant);

      // Set RLS context for subsequent queries
      await queryRunner.query(SET_TENANT_QUERY, [savedTenant.id]);

      // Create admin user
      const passwordHash = await bcrypt.hash(dto.adminPassword, BCRYPT_SALT_ROUNDS);
      const user = queryRunner.manager.create(UserEntity, {
        tenantId: savedTenant.id,
        email: dto.adminEmail,
        passwordHash,
        fullName: 'Admin',
        role: 'ADMIN',
      });
      const savedUser = await queryRunner.manager.save(user);

      await queryRunner.commitTransaction();

      this.logger.log(`Tenant registered: ${savedTenant.slug} (${savedTenant.id})`);

      // Generate JWT tokens
      const tokens = await this.authService.generateTokens(savedUser);

      return {
        ...tokens,
        user: {
          id: savedUser.id,
          email: savedUser.email,
          fullName: savedUser.fullName,
          role: savedUser.role,
          avatarUrl: savedUser.avatarUrl,
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getCurrent(tenantId: string): Promise<TenantEntity> {
    const tenant = await this.tenantRepo.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }
    return tenant;
  }

  async updateCurrent(tenantId: string, dto: UpdateTenantDto): Promise<TenantEntity> {
    const tenant = await this.getCurrent(tenantId);

    if (dto.name !== undefined) {
      tenant.name = dto.name;
    }
    if (dto.plan !== undefined) {
      tenant.plan = dto.plan;
    }

    return this.tenantRepo.save(tenant);
  }

  async checkSlug(slug: string): Promise<{ available: boolean }> {
    const count = await this.tenantRepo.count({ where: { slug } });
    return { available: count === 0 };
  }
}
