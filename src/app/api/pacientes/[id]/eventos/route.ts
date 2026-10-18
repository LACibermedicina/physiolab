import { z } from 'zod';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { getSession } from '@/lib/auth';
import { bodyOf, canClinical, err, isFisio, json, ownPatient } from '@/lib/api';

type Ctx = { params: { id: string } };
const schema = z.object({
  data: z.coerce.date(), tipo: z.enum(['INTERVENCAO', 'CONTROLE', 'EXAME', 'MARCO']),
  titulo: z.string().min(1).max(300), funcao: z.number().int().min(0).max(100).optional(), planejado: z.boolean().default(false),
});
export async function GET(req: Request, { params }: Ctx) {
  const s = await getSession(); if (!s) return err('Nao autenticado', 401);
  if (!canClinical(s) || !(await ownPatient(s, params.id))) return err('Nao encontrado', 404);
  await audit(s, 'LER_LINHA_TEMPO', 'Paciente', params.id, req);
  return json(await db.eventoClinico.findMany({ where: { pacienteId: params.id }, orderBy: { data: 'asc' }, take: 500 }));
}
export async function POST(req: Request, { params }: Ctx) {
  const s = await getSession(); if (!s) return err('Nao autenticado', 401);
  if (!isFisio(s)) return err('Sem permissao', 403);
  const p = schema.safeParse(await bodyOf(req)); if (!p.success) return err('Dados invalidos', 400);
  if (!(await ownPatient(s, params.id))) return err('Nao encontrado', 404);
  const e = await db.eventoClinico.create({ data: { ...p.data, pacienteId: params.id, autorId: s.sub } });
  await audit(s, 'CRIAR_EVENTO', 'EventoClinico', e.id, req);
  return json(e, 201);
}
