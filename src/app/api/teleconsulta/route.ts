import { createHash, randomBytes } from 'crypto';
import { z } from 'zod';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { getSession } from '@/lib/auth';
import { sendMail } from '@/lib/mail';
import { bodyOf, err, isFisio, json, ownPatient } from '@/lib/api';

const schema = z.object({ pacienteId: z.string(), horas: z.number().int().min(1).max(72).default(24), convidadoEmail: z.string().email().optional() });
/** Cria sala de interconsulta (paciente + fisioterapeuta + convidado externo) com codigo temporario */
export async function POST(req: Request) {
  const s = await getSession(); if (!s) return err('Nao autenticado', 401);
  if (!isFisio(s)) return err('Sem permissao', 403);
  const p = schema.safeParse(await bodyOf(req)); if (!p.success) return err('Dados invalidos', 400);
  if (!(await ownPatient(s, p.data.pacienteId))) return err('Nao encontrado', 404);
  const codigo = randomBytes(6).toString('base64url'), expiraEm = new Date(Date.now() + p.data.horas * 3600_000);
  const t = await db.teleconsulta.create({ data: { pacienteId: p.data.pacienteId, criadoPorId: s.sub, convidado: p.data.convidadoEmail,
    codigoHash: createHash('sha256').update(codigo).digest('hex'), canal: 'tc-' + randomBytes(8).toString('hex'), expiraEm } });
  const link = `${process.env.APP_URL}/tele/${codigo}`;
  let enviado = false;
  if (p.data.convidadoEmail) try { await sendMail(p.data.convidadoEmail, 'Convite para interconsulta', `Voce foi convidado(a) para uma teleconsulta. Acesse ate ${expiraEm.toLocaleString('pt-BR')}: ${link}`); enviado = true; } catch { /* e-mail e opcional */ }
  await audit(s, 'CRIAR_TELECONSULTA', 'Teleconsulta', t.id, req, { enviado });
  return json({ id: t.id, link, codigo, expiraEm, enviado }, 201);
}
