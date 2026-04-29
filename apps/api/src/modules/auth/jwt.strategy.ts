// apps/api/src/modules/auth/jwt.strategy.ts
// Passport JWT strategy — validates Bearer tokens and attaches user to request.

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt, StrategyOptionsWithoutRequest } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtUser } from '../../decorators/current-user.decorator';

interface JwtPayloadRaw {
  sub: string;
  tenantId: string;
  email: string;
  role: string;
  tokenId?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const secretOrKey = configService.get<string>('JWT_SECRET');
    if (!secretOrKey) {
      throw new Error('JWT_SECRET is not configured');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey,
    } satisfies StrategyOptionsWithoutRequest);
  }

  validate(payload: JwtPayloadRaw): JwtUser {
    if (!payload.sub || !payload.tenantId) {
      throw new UnauthorizedException('Invalid token payload');
    }

    return {
      sub: payload.sub,
      tenantId: payload.tenantId,
      email: payload.email,
      role: payload.role,
      tokenId: payload.tokenId,
    };
  }
}
