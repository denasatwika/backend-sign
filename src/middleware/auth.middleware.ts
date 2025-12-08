import { Context, Next } from 'hono';
import jwt from 'jsonwebtoken';
import { db, schema } from '../db/index.ts';
import { eq } from 'drizzle-orm';
import { ForbiddenError, UnauthorizedError } from '../types/errors.ts';
import { AuthVariables } from '../types/hono.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-insecure-jwt-secret-change-me';

export async function authMiddleware(c: Context<{ Variables: AuthVariables }>, next: Next) {
  let token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    const { getCookie } = await import('hono/cookie');
    token = getCookie(c, 'access_token');
  }

  if (!token) {
    return c.json({ error: new UnauthorizedError('No token provided').message }, 401);
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as {
      sub: string;
      role: string;
      wallet: string;
    };

    if (!payload.sub || !payload.wallet) {
      throw new UnauthorizedError('Invalid token payload or missing data (sub/wallet)');
    }

    const employee = await db.query.employees.findFirst({
      where: eq(schema.employees.id, payload.sub),
    });

    if (!employee || !employee.isActive) {
      throw new ForbiddenError('Employee inactive or not found.');
    }

    c.set('employeeId', employee.id);
    c.set('walletAddress', payload.wallet);
    c.set('role', employee.role);
    c.set('employeeData', employee as any);

    await next();
  } catch (e) {
    console.error("Auth middleware error:", e);
    
    if (e instanceof jwt.JsonWebTokenError) {
        return c.json({ error: `Token validation failed: ${e.message}` }, 401);
    }
    
    // Penanganan Custom Error
    if (e instanceof ForbiddenError) {
        return c.json({ error: e.message }, 403);
    }
    if (e instanceof UnauthorizedError) {
        return c.json({ error: e.message }, 401);
    }

    return c.json({ error: "Authentication failed" }, 401);
  }
}

export function requireRole(...allowedRoles: string[]) {
    return async (c: Context<{ Variables: AuthVariables }>, next: Next) => {
        const userRole = c.get('role');

        if (!allowedRoles.includes(userRole)) {
            return c.json({ 
                error: 'Access denied: Insufficient role permission', 
                required: allowedRoles,
                current: userRole
            }, 403);
        }

        await next();
    };
}