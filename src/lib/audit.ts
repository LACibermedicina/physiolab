import { db } from './db';
export async function audit(s: { sub: string } | null, acao: string, entidade: string,
  entidadeId?: string | null, req?: Request, detalhe?: object) {
  await db.auditLog.create({ data: {
    usuarioId: s?.sub ?? null, acao, entidade, entidadeId: entidadeId ?? null,
    ip: req?.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
    detalhe: detalhe as object | undefined,
  } });
}
