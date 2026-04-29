// apps/api/src/modules/users/users.service.ts
// User management: profile, list, invite, avatar upload.

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { UserEntity } from '../../entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { InviteUserDto } from './dto/invite-user.dto';
import { BCRYPT_SALT_ROUNDS } from '../../constants';
import { MailService } from '../mail/mail.service';
import { MinioService } from './minio.service';

export interface UserListItem {
  id: string;
  fullName: string;
  email: string;
  role: string;
  avatarUrl: string | null;
  createdAt: string;
}

export interface InviteResult {
  id: string;
  email: string;
  role: string;
  inviteToken: string;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly mailService: MailService,
    private readonly minioService: MinioService,
  ) {}

  async getMe(userId: string): Promise<UserEntity> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updateMe(userId: string, dto: UpdateUserDto): Promise<UserEntity> {
    const user = await this.userRepo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.id = :userId', { userId })
      .getOne();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Password change
    if (dto.newPassword) {
      if (!dto.currentPassword) {
        throw new BadRequestException('Current password is required to set a new password');
      }
      const isCurrentValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
      if (!isCurrentValid) {
        throw new BadRequestException('Current password is incorrect');
      }
      user.passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_SALT_ROUNDS);
    }

    if (dto.fullName !== undefined) {
      user.fullName = dto.fullName;
    }
    if (dto.email !== undefined) {
      user.email = dto.email;
      // TODO: In future iterations, trigger email verification
    }
    if (dto.avatarUrl !== undefined) {
      user.avatarUrl = dto.avatarUrl;
    }

    const saved = await this.userRepo.save(user);

    // Strip passwordHash from response
    delete (saved as any).passwordHash;
    return saved;
  }

  async list(tenantId: string): Promise<UserListItem[]> {
    const users = await this.userRepo
      .createQueryBuilder('user')
      .select(['user.id', 'user.fullName', 'user.email', 'user.role', 'user.avatarUrl', 'user.createdAt'])
      .where('user.tenantId = :tenantId', { tenantId })
      .orderBy('user.fullName', 'ASC')
      .getMany();

    return users.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      role: u.role,
      avatarUrl: u.avatarUrl,
      createdAt: u.createdAt.toISOString(),
    }));
  }

  async invite(tenantId: string, dto: InviteUserDto): Promise<InviteResult> {
    // Check email uniqueness within tenant
    const existing = await this.userRepo
      .createQueryBuilder('user')
      .where('user.tenantId = :tenantId', { tenantId })
      .andWhere('user.email = :email', { email: dto.email })
      .getOne();

    if (existing) {
      throw new ConflictException('User with this email already exists in this organization');
    }

    // Generate temporary password
    const tempPassword = uuidv4().slice(0, 12);
    const passwordHash = await bcrypt.hash(tempPassword, BCRYPT_SALT_ROUNDS);
    const inviteToken = uuidv4();

    const user = this.userRepo.create({
      tenantId,
      email: dto.email,
      passwordHash,
      fullName: '',
      role: dto.role,
    });

    const savedUser = await this.userRepo.save(user);

    // Send invite email
    const loginUrl = process.env['APP_PUBLIC_URL'] ?? 'http://app.localhost';
    try {
      await this.mailService.sendInviteEmail({
        to: dto.email,
        orgName: tenantId, // we pass tenantId as fallback; ideally pass org name
        inviterName: 'Your administrator',
        temporaryPassword: tempPassword,
        loginUrl,
      });
    } catch (err) {
      this.logger.error(`Failed to send invite email to ${dto.email}: ${err}`);
      // Do not throw — user was created, just log the email failure
    }

    this.logger.log(`Invite sent to ${dto.email}`);

    return {
      id: savedUser.id,
      email: savedUser.email,
      role: savedUser.role,
      inviteToken,
    };
  }

  async uploadAvatar(
    userId: string,
    file: { buffer: Buffer; mimetype: string; originalname: string },
  ): Promise<{ avatarUrl: string }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const ext = file.originalname.split('.').pop() ?? 'jpg';
    const objectName = `${userId}/${uuidv4()}.${ext}`;

    await this.minioService.putObject('avatars', objectName, file.buffer, file.mimetype);

    const avatarUrl = this.minioService.getPublicUrl('avatars', objectName);
    await this.userRepo.update({ id: userId }, { avatarUrl });

    this.logger.log(`Avatar uploaded for user ${userId}: ${avatarUrl}`);
    return { avatarUrl };
  }

  async remove(userId: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.userRepo.remove(user);
    this.logger.log(`User ${userId} deleted`);
  }
}
