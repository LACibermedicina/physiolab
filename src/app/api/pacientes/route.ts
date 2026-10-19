import { StatusPaciente } from '@prisma/client';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { getSession } from '@/lib/auth';
import { patientSchema } from '@/lib/schemas';
import { bodyOf, err, isFisio, json, patientScope } from '@/lib/api';

export async function GET(req: Request) {
  const s = await getSession(); if (!s) return err('Nao autenticado', 401);
  const sp = new URL(req.url).searchParams;
  const status = sp.get('status');
  const q = sp.get('q')?.trim();
  const data = await db.paciente.findMany({
    where: { ...patientScope(s),
      ...(status && status in StatusPaciente ? { status: status as StatusPaciente } : {}),
      ...(q ? { nome: { contains: q, mode: 'insensitive' } } : {}) },
    orderBy: { nome: 'asc' }, take: 200,
  });
  await audit(s, 'LISTAR', 'Paciente', null, req, { q, status, total: data.length });
  return json(data);
}

export async function POST(req: Request) {
  const s = await getSession(); if (!s) return err('Nao autenticado', 401);
  if (!isFisio(s)) return err('Sem permissao', 403);
  const p = patientSchema.safeParse(await bodyOf(req));
  if (!p.success) return err('Dados invalidos', 400);
  const { consentimento, ...d } = p.data;
  const pac = await db.paciente.create({ data: { ...d, fisioterapeutaId: s.sub, consentimentoEm: consentimento ? new Date() : null } });
  await audit(s, 'CRIAR', 'Paciente', pac.id, req);
  return json(pac, 201);
}
