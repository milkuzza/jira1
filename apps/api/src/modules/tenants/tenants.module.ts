// apps/api/src/modules/tenants/tenants.module.ts
// Tenant module: registration, current tenant info, updates.

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantEntity } from '../../entities/tenant.entity';
import { UserEntity } from '../../entities/user.entity';
import { TenantsService } from './tenants.service';
import { TenantsController } from './tenants.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TenantEntity, UserEntity]),
    AuthModule,
  ],
  providers: [TenantsService],
  controllers: [TenantsController],
  exports: [TenantsService],
})
export class TenantsModule {}
