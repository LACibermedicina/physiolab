import { SignJWT, jwtVerify } from 'jose';
import type { Role } from '@prisma/client';

export const COOKIE = 'fm_session';
export type Session = { sub: string; role: Role; nome: string };
const key = () => new TextEncoder().encode(process.env.JWT_SECRET!);

export const cookieOpts = {
  httpOnly: true, sameSite: 'strict' as const, path: '/',
  secure: process.env.COOKIE_SECURE === 'true', maxAge: 60 * 60 * 8,
};
export const signSession = (s: Session) =>
  new SignJWT({ role: s.role, nome: s.nome }).setProtectedHeader({ alg: 'HS256' })
    .setSubject(s.sub).setIssuedAt().setExpirationTime('8h').sign(key());

export async function readSession(token?: string): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ['HS256'] });
    return { sub: payload.sub!, role: payload.role as Role, nome: String(payload.nome) };
  } catch { return null; }
}
