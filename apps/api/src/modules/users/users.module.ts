// apps/api/src/modules/users/users.module.ts
// Users module: profile, listing, invitations, avatar uploads.

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity } from '../../entities/user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { MailModule } from '../mail/mail.module';
import { MinioService } from './minio.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity]), MailModule],
  providers: [UsersService, MinioService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
