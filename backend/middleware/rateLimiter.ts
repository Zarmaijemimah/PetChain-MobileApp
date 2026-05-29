import * as Sentry from '@sentry/react-native';
import rateLimit, { type RateLimitRequestHandler } from 'express-rate-limit';
import type { Request, Response } from 'express';

import type { AuthenticatedRequest } from './auth';

/**
 * Rate limit handler — returns 429 with Retry-After header and logs to Sentry.
 */
const onLimitReached = (req: Request, res: Response): void => {
  const ip = req.ip ?? 'unknown';
  const path = req.path;
  Sentry.captureMessage(`Rate limit exceeded: ${ip} on ${path}`, 'warning');
  res.status(429).json({
    error: 'TOO_MANY_REQUESTS',
    message: 'Too many requests. Please wait before retrying.',
  });
};

/**
 * Unauthenticated limiter: 30 req/min per IP.
 * Applied to all routes; authenticated routes override with the auth limiter.
 */
export const publicRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60_000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: onLimitReached,
});

/**
 * Authenticated limiter: 300 req/min per user ID.
 * Attach after authenticateJWT on protected routes.
 */
export const authRateLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: 60_000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => (req as AuthenticatedRequest).user?.id ?? req.ip ?? 'unknown',
  handler: onLimitReached,
});
