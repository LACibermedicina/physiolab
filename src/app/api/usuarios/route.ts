import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { Role, Especialidade } from '@prisma/client';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { getSession } from '@/lib/auth';
import { bodyOf, err, isGestor, json } from '@/lib/api';

const pub = { id: true, nome: true, email: true, role: true, crefito: true, especialidades: true, ativo: true, createdAt: true } as const;

export async function GET() {
  const s = await getSession(); if (!s) return err('Nao autenticado', 401);
  if (!isGestor(s)) return err('Sem permissao', 403);
  return json(await db.usuario.findMany({ select: pub, orderBy: { nome: 'asc' } }));
}

const create = z.object({
  nome: z.string().min(2).max(120), email: z.string().email(), senha: z.string().min(10).max(128),
  role: z.nativeEnum(Role), crefito: z.string().max(30).optional(),
  especialidades: z.array(z.nativeEnum(Especialidade)).default([]),
});
export async function POST(req: Request) {
  const s = await getSession(); if (!s) return err('Nao autenticado', 401);
  if (!isGestor(s)) return err('Sem permissao', 403);
  const p = create.safeParse(await bodyOf(req)); if (!p.success) return err('Dados invalidos (senha minima de 10 caracteres)', 400);
  const { senha, email, ...d } = p.data;
  if (await db.usuario.findUnique({ where: { email: email.toLowerCase() } })) return err('E-mail ja cadastrado', 409);
  const u = await db.usuario.create({ data: { ...d, email: email.toLowerCase(), senhaHash: await bcrypt.hash(senha, 12), trocarSenha: true }, select: pub });
  await audit(s, 'CRIAR', 'Usuario', u.id, req, { role: u.role });
  return json(u, 201);
}

const patch = z.object({ id: z.string(), ativo: z.boolean().optional(), novaSenha: z.string().min(10).max(128).optional() });
export async function PATCH(req: Request) {
  const s = await getSession(); if (!s) return err('Nao autenticado', 401);
  if (!isGestor(s)) return err('Sem permissao', 403);
  const p = patch.safeParse(await bodyOf(req)); if (!p.success) return err('Dados invalidos', 400);
  if (p.data.id === s.sub && p.data.ativo === false) return err('Voce nao pode desativar a propria conta', 400);
  const u = await db.usuario.update({ where: { id: p.data.id }, select: pub, data: {
    ...(p.data.ativo !== undefined ? { ativo: p.data.ativo } : {}),
    ...(p.data.novaSenha ? { senhaHash: await bcrypt.hash(p.data.novaSenha, 12), trocarSenha: true } : {}) } });
  await audit(s, 'ATUALIZAR', 'Usuario', u.id, req, { ativo: p.data.ativo, senhaRedefinida: !!p.data.novaSenha });
  return json(u);
}
