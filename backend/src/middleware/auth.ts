import { Request, Response, NextFunction } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { prisma } from '../config/database';
import { errorResponse } from '../utils/helpers';

export interface JwtPayload {
  userId: string;
  role: string;
  staffRole?: string | null;
  hotelId?: string | null;
}

function getJwtSecret(): string {
  return process.env.JWT_SECRET || 'grand-saigon-hotel-super-secret-jwt-key-2026';
}

export function signToken(payload: JwtPayload): string {
  const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'];
  return jwt.sign(payload, getJwtSecret(), { expiresIn });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, getJwtSecret()) as JwtPayload;
}

function extractToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  if (typeof req.query.token === 'string' && req.query.token.trim().length > 0) {
    return req.query.token.trim();
  }
  return null;
}

async function loadUserFromToken(token: string) {
  const decoded = verifyToken(token);
  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    include: { staff: true },
  });
  if (!user || !user.isActive) {
    return null;
  }
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    staffRole: user.staff?.isActive ? user.staff.staffRole : null,
    hotelId: user.staff?.isActive ? user.staff.hotelId : null,
    staffId: user.staff?.isActive ? user.staff.id : null,
    points: user.points,
  };
}

export async function authenticateJwt(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req);
    if (!token) {
      errorResponse(res, 'Vui lòng đăng nhập để tiếp tục', 401);
      return;
    }

    const authUser = await loadUserFromToken(token);
    if (!authUser) {
      errorResponse(res, 'Phiên đăng nhập không hợp lệ hoặc tài khoản đã bị khóa', 401);
      return;
    }

    req.user = authUser;
    next();
  } catch {
    errorResponse(res, 'Token xác thực không hợp lệ hoặc đã hết hạn', 401);
  }
}

export async function optionalJwt(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractToken(req);
    if (token) {
      const authUser = await loadUserFromToken(token);
      if (authUser) {
        req.user = authUser;
      }
    }
  } catch {
    // Ignore invalid optional tokens
  }
  next();
}
