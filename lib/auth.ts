// lib/auth.ts
import { NextRequest } from 'next/server';
import { query } from '@/lib/db';

export interface UserContext {
  id: number;
  username: string;
  role: 'ADMIN' | 'USER';
}

//
//  Extracts identity from x-user-id header or user_id session cookie.
//  Defaults to User ID 2 (Warehouse Operator) if omitted for easy testing.
//  
export async function getCurrentUser(req: NextRequest): Promise<UserContext | null> {
  const userIdHeader = req.headers.get('x-user-id');
  const userIdCookie = req.cookies.get('user_id')?.value;
  const targetId = userIdHeader || userIdCookie || '2'; // Default: Operator

  try {
    const res = await query(
      'SELECT id, username, role FROM users WHERE id = $1',
      [targetId]
    );
    return res.rows[0] || null;
  } catch (error) {
    console.error('Auth verification error:', error);
    return null;
  }
}

// 
// Ensures user has required role(s).
// 
export function authorizeRoles(user: UserContext | null, allowedRoles: ('ADMIN' | 'USER')[]) {
  if (!user) return { authorized: false, status: 401, error: 'Unauthorized: Authentication required.' };
  if (!allowedRoles.includes(user.role)) {
    return { authorized: false, status: 403, error: `Forbidden: Requires one of [${allowedRoles.join(', ')}] permissions.` };
  }
  return { authorized: true };
}