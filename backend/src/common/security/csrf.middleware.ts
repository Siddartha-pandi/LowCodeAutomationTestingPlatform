import { ForbiddenException, Injectable, NestMiddleware } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NextFunction, Request, Response } from 'express';
import * as crypto from 'node:crypto';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const CSRF_EXEMPT_PATHS = new Set([
  '/api/v1/auth/login',
  '/api/v1/auth/register',
  '/api/v1/auth/forgot-password',
  '/api/v1/auth/reset-password',
  '/api/auth/login',
  '/api/auth/register',
]);

function constantTimeMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Double-submit cookie + Origin CSRF protection for cookie-authenticated mutations.
 * Requests authenticated via explicit Authorization Bearer header or internal service key
 * are exempt because browsers do not attach those headers automatically across sites.
 */
@Injectable()
export class CsrfMiddleware implements NestMiddleware {
  constructor(private readonly configService: ConfigService) {}

  use(req: Request, _res: Response, next: NextFunction) {
    if (!MUTATING_METHODS.has(req.method.toUpperCase())) {
      return next();
    }

    const reqPath = (req.originalUrl || req.url || '').split('?')[0];
    if (CSRF_EXEMPT_PATHS.has(reqPath)) {
      return next();
    }

    const authHeader = req.headers['authorization'];
    const internalKey = req.headers['x-internal-service-key'];
    if ((typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) || internalKey) {
      return next();
    }

    const accessCookie = req.cookies?.['access_token'];
    if (!accessCookie) {
      // Unauthenticated request; JwtAuthGuard will reject with 401
      return next();
    }

    const origin = req.headers['origin'];
    if (typeof origin === 'string' && origin.length > 0) {
      const corsOrigins = this.configService.get<string[]>('app.corsOrigins') || [];
      const isDevLocalhost =
        process.env.NODE_ENV !== 'production' &&
        /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
      if (!corsOrigins.includes(origin) && !isDevLocalhost) {
        throw new ForbiddenException('CSRF validation failed: untrusted request origin');
      }
    }

    const csrfCookie = req.cookies?.['csrf_token'];
    const csrfHeader = req.headers['x-csrf-token'];
    if (
      typeof csrfCookie !== 'string' ||
      typeof csrfHeader !== 'string' ||
      !csrfCookie ||
      !constantTimeMatch(csrfCookie, csrfHeader)
    ) {
      throw new ForbiddenException('CSRF validation failed: missing or invalid X-CSRF-Token');
    }

    return next();
  }
}
