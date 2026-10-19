import { createHash, randomBytes } from 'crypto';
import { z } from 'zod';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { getSession } from '@/lib/auth';
import { bodyOf, err, isFisio, json, ownPatient } from '@/lib/api';

type Ctx = { params: { id: string } };
const sha = (t: string) => createHash('sha256').update(t).digest('hex');

export async function POST(req: Request, { params }: Ctx) {
  const s = await getSession(); if (!s) return err('Nao autenticado', 401);
  if (!isFisio(s)) return err('Sem permissao', 403);
  const p = z.object({ horas: z.number().int().min(1).max(168) }).safeParse(await bodyOf(req)); if (!p.success) return err('Dados invalidos', 400);
  if (!(await ownPatient(s, params.id))) return err('Nao encontrado', 404);
  const token = randomBytes(24).toString('base64url'), expiraEm = new Date(Date.now() + p.data.horas * 3600_000);
  const a = await db.consultorAcesso.create({ data: { pacienteId: params.id, criadoPorId: s.sub, tokenHash: sha(token), expiraEm } });
  await audit(s, 'CRIAR_TOKEN_CONSULTOR', 'ConsultorAcesso', a.id, req, { horas: p.data.horas });
  return json({ id: a.id, token, expiraEm, url: `${process.env.APP_URL}/api/consultor/${token}` }, 201); // token exibido uma unica vez
}
export async function DELETE(req: Request, { params }: Ctx) {
  const s = await getSession(); if (!s) return err('Nao autenticado', 401);
  if (!isFisio(s)) return err('Sem permissao', 403);
  const id = new URL(req.url).searchParams.get('id'); if (!id) return err('Informe id', 400);
  const r = await db.consultorAcesso.updateMany({ where: { id, pacienteId: params.id, criadoPorId: s.sub, revogadoEm: null }, data: { revogadoEm: new Date() } });
  await audit(s, 'REVOGAR_TOKEN_CONSULTOR', 'ConsultorAcesso', id, req);
  return json({ revogados: r.count });
}
