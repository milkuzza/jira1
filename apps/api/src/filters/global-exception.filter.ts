// apps/api/src/filters/global-exception.filter.ts
// Unified error response: { statusCode, code, message, timestamp, path }

import {
  ExceptionFilter, Catch, ArgumentsHost,
  HttpException, HttpStatus, Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError, EntityNotFoundError } from 'typeorm';

interface ErrorBody {
  statusCode: number;
  code: string;
  message: string | string[];
  timestamp: string;
  path: string;
}

/** Map well-known Postgres error codes to HTTP status + code. */
function classifyDbError(err: QueryFailedError): { status: number; code: string; message: string } {
  const pg = (err as unknown as { code?: string; detail?: string }).code;
  const detail = (err as unknown as { detail?: string }).detail ?? '';

  switch (pg) {
    case '23505': // unique_violation
      return { status: 409, code: 'CONFLICT', message: `Duplicate entry: ${detail || err.message}` };
    case '23503': // foreign_key_violation
      return { status: 409, code: 'CONFLICT', message: 'Referenced entity does not exist.' };
    case '23502': // not_null_violation
      return { status: 400, code: 'VALIDATION_ERROR', message: `Required field missing: ${detail || err.message}` };
    case '22001': // string_data_right_truncation
      return { status: 400, code: 'VALIDATION_ERROR', message: 'Value too long for field.' };
    default:
      return { status: 500, code: 'DB_ERROR', message: 'A database error occurred.' };
  }
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    let statusCode: number;
    let code: string;
    let message: string | string[];

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        const r = res as Record<string, unknown>;
        message = (r['message'] as string | string[]) ?? exception.message;
        code    = (r['code'] as string) ?? HttpStatus[statusCode] ?? 'HTTP_ERROR';
      } else {
        message = exception.message;
        code    = HttpStatus[statusCode] ?? 'HTTP_ERROR';
      }

      // Log 4xx as warnings, 5xx as errors
      if (statusCode >= 500) {
        this.logger.error(`[${statusCode}] ${request.method} ${request.url} — ${String(message)}`);
      } else if (statusCode >= 400 && statusCode !== 401 && statusCode !== 404) {
        this.logger.warn(`[${statusCode}] ${request.method} ${request.url} — ${String(message)}`);
      }

    } else if (exception instanceof QueryFailedError) {
      const db = classifyDbError(exception);
      statusCode = db.status;
      code       = db.code;
      message    = db.message;
      if (statusCode >= 500) {
        this.logger.error(
          `[DB ${(exception as unknown as { code?: string }).code}] ${request.method} ${request.url}`,
          exception.message,
        );
      } else {
        this.logger.warn(`[DB constraint] ${request.method} ${request.url} — ${message}`);
      }

    } else if (exception instanceof EntityNotFoundError) {
      statusCode = 404;
      code       = 'NOT_FOUND';
      message    = exception.message;

    } else {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      code       = 'INTERNAL_ERROR';
      message    = 'Internal server error';
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ErrorBody = {
      statusCode,
      code,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(statusCode).json(body);
  }
}
