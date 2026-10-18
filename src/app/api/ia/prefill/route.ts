import { z } from 'zod';
import { ask } from '@/lib/ai';
import { audit } from '@/lib/audit';
import { scrub } from '@/lib/anon';
import { getSession } from '@/lib/auth';
import { bodyOf, err, isFisio, json } from '@/lib/api';

const schema = z.object({ texto: z.string().min(5).max(4000), nome: z.string().max(120).optional() });
const SYSTEM = 'Voce apoia fisioterapeutas. A partir do texto, devolva SOMENTE JSON com: {"queixa":string,"especialidade":"MUSCULO_ESQUELETICA|ESPORTIVA|RESPIRATORIA_UTI|NEURO_FUNCIONAL|GERONTOLOGIA|PELVICA|DERMATOFUNCIONAL|OUTROS","objetivo":string,"sugestoes":string[]}. Nao invente dados ausentes (use null). Sao sugestoes para revisao profissional.';

export async function POST(req: Request) {
  const s = await getSession(); if (!s) return err('Nao autenticado', 401);
  if (!isFisio(s)) return err('Sem permissao', 403);
  const p = schema.safeParse(await bodyOf(req)); if (!p.success) return err('Dados invalidos', 400);
  try {
    const r = await ask({ system: SYSTEM, prompt: scrub(p.data.texto, p.data.nome ?? ''), json: true, sensivel: true });
    await audit(s, 'IA_PREFILL', 'IA', null, req, { provider: r.provider });
    return json({ provider: r.provider, sugestao: JSON.parse(r.text.replace(/```json|```/g, '').trim()) });
  } catch (e) { return err((e as Error).message, 502); }
}
