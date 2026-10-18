import { z } from 'zod';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { getSession } from '@/lib/auth';
import { bodyOf, canClinical, err, isFisio, json, ownPatient } from '@/lib/api';

type Ctx = { params: { id: string } };
const schema = z.object({
  historia: z.string().min(1).max(8000), funcionalidadeInicial: z.number().int().min(0).max(100),
  objetivo: z.string().max(500).optional(), protocolo: z.string().max(300).optional(),
  condicao: z.string().max(200).optional(), inicio: z.coerce.date(),
});

export async function GET(req: Request, { params }: Ctx) {
  const s = await getSession(); if (!s) return err('Nao autenticado', 401);
  if (!canClinical(s) || !(await ownPatient(s, params.id))) return err('Nao encontrado', 404);
  await audit(s, 'LER_CASO', 'Paciente', params.id, req);
  return json(await db.casoClinico.findUnique({ where: { pacienteId: params.id } }));
}
export async function PUT(req: Request, { params }: Ctx) {
  const s = await getSession(); if (!s) return err('Nao autenticado', 401);
  if (!isFisio(s)) return err('Sem permissao', 403);
  const p = schema.safeParse(await bodyOf(req)); if (!p.success) return err('Dados invalidos', 400);
  if (!(await ownPatient(s, params.id))) return err('Nao encontrado', 404);
  const c = await db.casoClinico.upsert({ where: { pacienteId: params.id }, create: { ...p.data, pacienteId: params.id }, update: p.data });
  await audit(s, 'SALVAR_CASO', 'Paciente', params.id, req);
  return json(c);
}
// Gancho para a analise por IA/protocolos: gerar plano e curvas no servidor, com fontes e versao do protocolo registradas.
