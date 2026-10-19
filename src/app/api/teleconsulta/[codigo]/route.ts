import { createHash, randomInt } from 'crypto';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { rtcToken } from '@/lib/agora';
import { err, json } from '@/lib/api';

export const dynamic = 'force-dynamic';
const hits = new Map<string, { n: number; t: number }>();
/** Publico: valida o codigo temporario e devolve o token de video (1 h) */
export async function GET(req: Request, { params }: { params: { codigo: string } }) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'x', now = Date.now(), h = hits.get(ip);
  if (h && now - h.t < 60_000) { if (++h.n > 20) return err('Muitas requisicoes', 429); } else hits.set(ip, { n: 1, t: now });
  const t = await db.teleconsulta.findUnique({ where: { codigoHash: createHash('sha256').update(params.codigo).digest('hex') } });
  if (!t || t.expiraEm < new Date()) return err('Codigo invalido ou expirado', 404);
  try {
    const r = rtcToken(t.canal, randomInt(1, 2_000_000_000));
    await audit(null, 'TELECONSULTA_ENTRADA', 'Teleconsulta', t.id, req);
    return json({ canal: t.canal, ...r });
  } catch (e) { return err((e as Error).message, 503); }
}
