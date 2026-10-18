import { db } from './db';

const ageBand = (d?: Date | null) => {
  if (!d) return 'nao informada';
  const a = Math.floor((Date.now() - d.getTime()) / 31557600000), b = Math.floor(a / 10) * 10;
  return `${b}-${b + 9} anos`;
};
export function scrub(text: string, nome: string) {
  let t = text;
  nome.split(/\s+/).map((w) => w.replace(/[^\p{L}]/gu, '')).filter((w) => w.length > 2)
    .forEach((w) => { t = t.replace(new RegExp(w, 'gi'), '[paciente]'); });
  return t.replace(/\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g, '[doc]').replace(/\S+@\S+/g, '[e-mail]').replace(/\+?\d[\d\s().-]{7,}\d/g, '[tel]');
}
/** Resumo clinico sem nome, contato, convenio ou identificadores; datas viram D+N */
export async function buildResumo(pacienteId: string) {
  const p = await db.paciente.findUnique({ where: { id: pacienteId },
    include: { caso: true, exames: { orderBy: { data: 'asc' } }, eventos: { orderBy: { data: 'asc' } } } });
  if (!p) return null;
  const ini = p.caso?.inicio ?? p.createdAt, d = (x: Date) => `D+${Math.round((x.getTime() - ini.getTime()) / 864e5)}`;
  return [
    'CONSULTA CLINICA ANONIMIZADA',
    `Faixa etaria: ${ageBand(p.nascimento)} · Especialidade: ${p.especialidade ?? 'n/i'}`,
    `Historia: ${p.caso ? scrub(p.caso.historia, p.nome) : 'sem historia registrada'}`,
    `Condicao: ${p.caso?.condicao ?? '-'} · Objetivo: ${p.caso?.objetivo ?? '-'} · Funcionalidade inicial: ${p.caso?.funcionalidadeInicial ?? '-'}/100`,
    `Protocolo preferencial: ${p.caso?.protocolo ?? '-'}`,
    'Exames: ' + (p.exames.map((e) => `${d(e.data)} ${e.parametro} ${e.valor} ${e.unidade ?? ''}${e.alterado ? ' (alterado)' : ''}`).join('; ') || '-'),
    'Evolucao: ' + (p.eventos.map((e) => `${d(e.data)} ${e.tipo} ${scrub(e.titulo, p.nome)}${e.funcao != null ? ` (funcao ${e.funcao})` : ''}`).join('; ') || '-'),
  ].join('\n');
}
