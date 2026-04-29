// apps/api/src/modules/users/minio.service.ts
// MinIO client service: bucket initialization and file upload.

import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as Minio from 'minio';

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private readonly client: Minio.Client;

  constructor() {
    const rawEndpoint = process.env['MINIO_ENDPOINT'] ?? 'http://minio:9000';
    let endPoint = 'minio';
    let port = 9000;
    let useSSL = false;

    try {
      const url = new URL(rawEndpoint);
      endPoint = url.hostname;
      useSSL = url.protocol === 'https:';
      port = url.port ? parseInt(url.port, 10) : (useSSL ? 443 : 9000);
    } catch {
      // fallback defaults already set
    }

    this.client = new Minio.Client({
      endPoint,
      port,
      useSSL,
      accessKey: process.env['MINIO_ROOT_USER'] ?? 'minioadmin',
      secretKey: process.env['MINIO_ROOT_PASSWORD'] ?? 'minioadmin',
    });
  }

  async onModuleInit(): Promise<void> {
    await this.ensureBuckets();
  }

  private async ensureBuckets(): Promise<void> {
    const publicBuckets = ['avatars'];
    const privateBuckets = ['attachments'];

    for (const bucket of [...publicBuckets, ...privateBuckets]) {
      try {
        const exists = await this.client.bucketExists(bucket);
        if (!exists) {
          await this.client.makeBucket(bucket);
          this.logger.log(`Created MinIO bucket: ${bucket}`);
        }
      } catch (err) {
        this.logger.error(`Failed to ensure bucket "${bucket}": ${err}`);
      }
    }

    // Set public-read policy for avatars bucket
    for (const bucket of publicBuckets) {
      try {
        const policy = JSON.stringify({
          Version: '2012-10-17',
          Statement: [
            {
              Effect: 'Allow',
              Principal: { AWS: ['*'] },
              Action: ['s3:GetObject'],
              Resource: [`arn:aws:s3:::${bucket}/*`],
            },
          ],
        });
        await this.client.setBucketPolicy(bucket, policy);
        this.logger.log(`Set public-read policy on bucket: ${bucket}`);
      } catch (err) {
        this.logger.warn(`Could not set bucket policy for "${bucket}": ${err}`);
      }
    }
  }

  async putObject(
    bucket: string,
    objectName: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<void> {
    await this.client.putObject(bucket, objectName, buffer, buffer.length, {
      'Content-Type': contentType,
    });
  }

  getPublicUrl(bucket: string, objectName: string): string {
    const publicUrl = (process.env['MINIO_PUBLIC_URL'] ?? 'http://localhost:9000').replace(/\/$/, '');
    return `${publicUrl}/${bucket}/${objectName}`;
  }
}
