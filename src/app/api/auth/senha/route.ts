import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { getSession } from '@/lib/auth';
import { bodyOf, err, json } from '@/lib/api';

const schema = z.object({ atual: z.string().min(1), nova: z.string().min(10).max(128) });

export async function POST(req: Request) {
  const s = await getSession(); if (!s) return err('Nao autenticado', 401);
  const p = schema.safeParse(await bodyOf(req)); if (!p.success) return err('A nova senha precisa de ao menos 10 caracteres', 400);
  const u = await db.usuario.findUnique({ where: { id: s.sub } });
  if (!u || !(await bcrypt.compare(p.data.atual, u.senhaHash))) return err('Senha atual incorreta', 403);
  await db.usuario.update({ where: { id: u.id }, data: { senhaHash: await bcrypt.hash(p.data.nova, 12), trocarSenha: false } });
  await audit(s, 'SENHA_ALTERADA', 'Usuario', u.id, req);
  return json({ ok: true });
}
