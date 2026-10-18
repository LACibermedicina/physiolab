import { z } from 'zod';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { getSession } from '@/lib/auth';
import { bodyOf, canClinical, err, json, ownPatient } from '@/lib/api';

type Ctx = { params: { id: string } };
const n = (max: number) => z.number().min(0).max(max).optional();
const schema = z.object({
  data: z.coerce.date(), aguaMl: n(20000).transform((v) => v === undefined ? v : Math.round(v)),
  diureseMl: n(10000), suorMl: n(10000), evacuacoes: n(20), atividadeMin: n(1440), atividadeTipo: z.string().max(80).optional(),
  rpe: n(10), pesoKg: n(500), alturaCm: n(260), cinturaCm: n(300), quadrilCm: n(300),
  paSist: n(300), paDiast: n(200), fcBpm: n(300), spo2: n(100), fonte: z.enum(['manual', 'dispositivo']).default('manual'),
});
export async function GET(req: Request, { params }: Ctx) {
  const s = await getSession(); if (!s) return err('Nao autenticado', 401);
  if (!canClinical(s) || !(await ownPatient(s, params.id))) return err('Nao encontrado', 404);
  const sp = new URL(req.url).searchParams, de = sp.get('de'), ate = sp.get('ate');
  await audit(s, 'LER_PARAMETROS', 'Paciente', params.id, req);
  return json(await db.diaParametros.findMany({ where: { pacienteId: params.id, ...(de || ate ? { data: { ...(de ? { gte: new Date(de) } : {}), ...(ate ? { lte: new Date(ate) } : {}) } } : {}) }, orderBy: { data: 'asc' }, take: 400 }));
}
/** Paciente, cuidador e fisioterapeuta podem lancar o dia (upsert por data) */
export async function PUT(req: Request, { params }: Ctx) {
  const s = await getSession(); if (!s) return err('Nao autenticado', 401);
  if (!canClinical(s)) return err('Sem permissao', 403);
  const p = schema.safeParse(await bodyOf(req)); if (!p.success) return err('Dados invalidos', 400);
  if (!(await ownPatient(s, params.id))) return err('Nao encontrado', 404);
  const { data, ...resto } = p.data;
  const r = await db.diaParametros.upsert({ where: { pacienteId_data: { pacienteId: params.id, data } }, create: { ...resto, data, pacienteId: params.id }, update: resto });
  await audit(s, 'SALVAR_PARAMETROS', 'Paciente', params.id, req);
  return json(r);
}
