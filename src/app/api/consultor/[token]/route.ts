import { createHash } from 'crypto';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { buildResumo } from '@/lib/anon';
import { err, json } from '@/lib/api';

export const dynamic = 'force-dynamic';
const hits = new Map<string, { n: number; t: number }>(); // limitador simples (instancia unica; usar Redis em escala)

export async function GET(req: Request, { params }: { params: { token: string } }) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'x', now = Date.now(), h = hits.get(ip);
  if (h && now - h.t < 60_000) { if (++h.n > 20) return err('Muitas requisicoes', 429); } else hits.set(ip, { n: 1, t: now });
  const a = await db.consultorAcesso.findUnique({ where: { tokenHash: createHash('sha256').update(params.token).digest('hex') } });
  if (!a || a.revogadoEm || a.expiraEm < new Date()) return err('Token invalido ou expirado', 404);
  await db.consultorAcesso.update({ where: { id: a.id }, data: { acessos: { increment: 1 } } });
  await audit(null, 'CONSULTOR_ACESSO', 'ConsultorAcesso', a.id, req);
  return json({ validoAte: a.expiraEm, resumo: await buildResumo(a.pacienteId) });
}
