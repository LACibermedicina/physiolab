import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { COOKIE, cookieOpts, signSession } from '@/lib/auth';
import { bodyOf, err, json } from '@/lib/api';

const schema = z.object({ email: z.string().email(), senha: z.string().min(1) });
const DUMMY = bcrypt.hashSync('dummy-password', 12); // iguala o tempo de resposta quando o e-mail nao existe

export async function POST(req: Request) {
  const p = schema.safeParse(await bodyOf(req));
  if (!p.success) return err('Dados invalidos', 400);
  const u = await db.usuario.findUnique({ where: { email: p.data.email.toLowerCase() } });
  if (u?.bloqueadoAte && u.bloqueadoAte > new Date()) return err('Conta temporariamente bloqueada. Tente mais tarde.', 429);

  const ok = await bcrypt.compare(p.data.senha, u?.senhaHash ?? DUMMY);
  if (!u || !u.ativo || !ok) {
    if (u) {
      const n = u.tentativasFalhas + 1;
      await db.usuario.update({ where: { id: u.id }, data: n >= 5
        ? { tentativasFalhas: 0, bloqueadoAte: new Date(Date.now() + 15 * 60_000) }
        : { tentativasFalhas: n } });
    }
    await audit(u ? { sub: u.id } : null, 'LOGIN_FALHA', 'Usuario', u?.id, req);
    return err('Credenciais invalidas', 401);
  }
  await db.usuario.update({ where: { id: u.id }, data: { tentativasFalhas: 0, bloqueadoAte: null } });
  await audit({ sub: u.id }, 'LOGIN', 'Usuario', u.id, req);
  const res = json({ nome: u.nome, role: u.role, trocarSenha: u.trocarSenha });
  res.cookies.set(COOKIE, await signSession({ sub: u.id, role: u.role, nome: u.nome }), cookieOpts);
  return res;
}
