import { NextRequest, NextResponse } from 'next/server';
import { COOKIE, readSession } from '@/lib/jwt';

const PUBLIC = ['/api/auth/login', '/api/health'];
export async function middleware(req: NextRequest) {
  if (PUBLIC.includes(req.nextUrl.pathname) || req.nextUrl.pathname.startsWith('/api/consultor/') || req.nextUrl.pathname.startsWith('/api/teleconsulta/')) return NextResponse.next();
  if (!(await readSession(req.cookies.get(COOKIE)?.value)))
    return NextResponse.json({ erro: 'Nao autenticado' }, { status: 401 });
  // Protecao CSRF adicional: mutacoes exigem JSON
  if (req.method !== 'GET' && !req.headers.get('content-type')?.includes('application/json'))
    return NextResponse.json({ erro: 'Content-Type invalido' }, { status: 415 });
  return NextResponse.next();
}
export const config = { matcher: ['/api/:path*'] };
