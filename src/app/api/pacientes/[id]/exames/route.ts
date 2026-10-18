import { z } from 'zod';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { getSession } from '@/lib/auth';
import { bodyOf, canClinical, err, isFisio, json, ownPatient } from '@/lib/api';
import { REF, norm } from '@/lib/ref';

type Ctx = { params: { id: string } };
const item = z.object({ parametro: z.string().min(1).max(80), valor: z.number(), unidade: z.string().max(20).optional(), data: z.coerce.date(), origem: z.enum(['manual', 'extracao']).default('manual') });

export async function GET(req: Request, { params }: Ctx) {
  const s = await getSession(); if (!s) return err('Nao autenticado', 401);
  if (!canClinical(s) || !(await ownPatient(s, params.id))) return err('Nao encontrado', 404);
  const par = new URL(req.url).searchParams.get('parametro');
  await audit(s, 'LER_EXAMES', 'Paciente', params.id, req);
  return json(await db.exameValor.findMany({ where: { pacienteId: params.id, ...(par ? { parametro: par } : {}) }, orderBy: { data: 'asc' }, take: 1000 }));
}
/** Recebe valores ja extraidos (manual ou por IA no backend); gera tambem eventos da linha do tempo */
export async function POST(req: Request, { params }: Ctx) {
  const s = await getSession(); if (!s) return err('Nao autenticado', 401);
  if (!isFisio(s)) return err('Sem permissao', 403);
  const p = z.array(item).min(1).max(200).safeParse(await bodyOf(req)); if (!p.success) return err('Dados invalidos', 400);
  if (!(await ownPatient(s, params.id))) return err('Nao encontrado', 404);
  const rows = p.data.map((x) => { const r = REF[norm(x.parametro)];
    return { ...x, pacienteId: params.id, refMin: r?.[0], refMax: r?.[1], alterado: r ? x.valor < r[0] || x.valor > r[1] : false }; });
  await db.$transaction([
    db.exameValor.createMany({ data: rows }),
    db.eventoClinico.createMany({ data: rows.map((x) => ({ pacienteId: params.id, data: x.data, tipo: 'EXAME', autorId: s.sub,
      titulo: `${x.parametro}: ${x.valor} ${x.unidade ?? ''}${x.alterado ? ' (fora da referencia)' : ''}` })) }),
  ]);
  await audit(s, 'CRIAR_EXAMES', 'Paciente', params.id, req, { total: rows.length });
  return json({ total: rows.length }, 201);
}
