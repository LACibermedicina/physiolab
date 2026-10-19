import { z } from 'zod';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { getSession } from '@/lib/auth';
import { bodyOf, err, isFisio, isGestor, json, patientScope } from '@/lib/api';

type Ctx = { params: { id: string } };
const soap = z.object({
  subjetivo: z.string().min(1).max(5000),
  objetivo: z.record(z.unknown()).default({}),
  avaliacaoCif: z.string().min(1).max(5000),
  planoConduta: z.string().min(1).max(5000),
});

export async function GET(req: Request, { params }: Ctx) {
  const s = await getSession(); if (!s) return err('Nao autenticado', 401);
  if (!isFisio(s) && !isGestor(s)) return err('Sem permissao', 403);
  const pac = await db.paciente.findFirst({ where: { id: params.id, ...patientScope(s) }, select: { id: true } });
  if (!pac) return err('Nao encontrado', 404);
  const data = await db.avaliacaoSOAP.findMany({ where: { pacienteId: pac.id }, orderBy: { dataAvaliacao: 'desc' }, take: 100 });
  await audit(s, 'LER_EVOLUCOES', 'Paciente', pac.id, req);
  return json(data);
}

export async function POST(req: Request, { params }: Ctx) {
  const s = await getSession(); if (!s) return err('Nao autenticado', 401);
  if (!isFisio(s)) return err('Sem permissao', 403);
  const p = soap.safeParse(await bodyOf(req)); if (!p.success) return err('Dados invalidos', 400);
  const pac = await db.paciente.findFirst({ where: { id: params.id, ...patientScope(s) }, select: { id: true } });
  if (!pac) return err('Nao encontrado', 404);
  const ev = await db.avaliacaoSOAP.create({ data: { ...p.data, objetivo: p.data.objetivo as object, pacienteId: pac.id, autorId: s.sub } });
  await audit(s, 'CRIAR_EVOLUCAO', 'AvaliacaoSOAP', ev.id, req);
  return json(ev, 201);
}
