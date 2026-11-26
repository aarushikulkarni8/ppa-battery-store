import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { HttpError } from '../utils/http.js';

export const CUSTOMER_COOKIE = 'ppa_token';
export const ADMIN_COOKIE = 'ppa_admin';

type Role = 'customer' | 'admin';
interface TokenPayload {
  sub: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      customerId?: string;
      adminId?: string;
    }
  }
}

export function signToken(sub: string, role: Role) {
  return jwt.sign({ sub, role } satisfies TokenPayload, env.JWT_SECRET, {
    expiresIn: role === 'admin' ? '12h' : '30d',
  });
}

export function setAuthCookie(res: Response, name: string, token: string, days: number) {
  res.cookie(name, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.isProd,
    maxAge: days * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

function read(req: Request, cookie: string, role: Role): string | null {
  const raw = req.cookies?.[cookie];
  if (!raw) return null;
  try {
    const p = jwt.verify(raw, env.JWT_SECRET) as TokenPayload;
    return p.role === role ? p.sub : null;
  } catch {
    return null;
  }
}

export function requireCustomer(req: Request, _res: Response, next: NextFunction) {
  const id = read(req, CUSTOMER_COOKIE, 'customer');
  if (!id) return next(new HttpError(401, 'Please log in with your mobile number'));
  req.customerId = id;
  next();
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  const id = read(req, ADMIN_COOKIE, 'admin');
  if (!id) return next(new HttpError(401, 'Admin login required'));
  req.adminId = id;
  next();
}
