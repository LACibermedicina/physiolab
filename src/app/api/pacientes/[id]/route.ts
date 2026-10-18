import { z } from 'zod';
import { StatusPaciente } from '@prisma/client';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { getSession } from '@/lib/auth';
import { bodyOf, err, isFisio, json, patientScope } from '@/lib/api';
import { patientSchema } from '@/lib/schemas';

type Ctx = { params: { id: string } };

export async function GET(req: Request, { params }: Ctx) {
  const s = await getSession(); if (!s) return err('Nao autenticado', 401);
  const pac = await db.paciente.findFirst({ where: { id: params.id, ...patientScope(s) } });
  if (!pac) return err('Nao encontrado', 404);
  await audit(s, 'LER', 'Paciente', pac.id, req);
  return json(pac);
}

const patch = patientSchema.partial().extend({ status: z.nativeEnum(StatusPaciente).optional() });

export async function PATCH(req: Request, { params }: Ctx) {
  const s = await getSession(); if (!s) return err('Nao autenticado', 401);
  if (!isFisio(s)) return err('Sem permissao', 403);
  const p = patch.safeParse(await bodyOf(req)); if (!p.success) return err('Dados invalidos', 400);
  const own = await db.paciente.findFirst({ where: { id: params.id, ...patientScope(s) }, select: { id: true } });
  if (!own) return err('Nao encontrado', 404);
  const { consentimento, ...d } = p.data;
  const pac = await db.paciente.update({ where: { id: params.id }, data: { ...d, ...(consentimento ? { consentimentoEm: new Date() } : {}) } });
  await audit(s, 'ATUALIZAR', 'Paciente', pac.id, req, { campos: Object.keys(p.data) });
  return json(pac);
}
// Sem DELETE: prontuarios sao arquivados (status ARQUIVADO) para respeitar prazos de guarda.
