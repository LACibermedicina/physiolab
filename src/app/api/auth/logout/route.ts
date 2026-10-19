import { COOKIE, getSession } from '@/lib/auth';
import { audit } from '@/lib/audit';
import { json } from '@/lib/api';

export async function POST(req: Request) {
  const s = await getSession();
  if (s) await audit(s, 'LOGOUT', 'Usuario', s.sub, req);
  const res = json({ ok: true });
  res.cookies.set(COOKIE, '', { path: '/', maxAge: 0 });
  return res;
}
