export type AiReq = { system?: string; prompt: string; json?: boolean; sensivel?: boolean };
type Provider = { name: string; on: () => boolean; run: (r: AiReq) => Promise<string> };
const env = (k: string) => process.env[k] || '';
const post = async (url: string, headers: Record<string, string>, body: unknown) => {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(25_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

const PROVIDERS: Provider[] = [
  { name: 'gemini', on: () => !!(env('GEMINI_API_KEY') || env('GOOGLE_API_KEY')),
    run: async (r) => {
      const key = env('GEMINI_API_KEY') || env('GOOGLE_API_KEY');
      const d = await post(`https://generativelanguage.googleapis.com/v1beta/models/${env('GEMINI_MODEL') || 'gemini-flash-latest'}:generateContent`, { 'x-goog-api-key': key }, {
        ...(r.system ? { systemInstruction: { parts: [{ text: r.system }] } } : {}),
        contents: [{ parts: [{ text: r.prompt }] }], ...(r.json ? { generationConfig: { responseMimeType: 'application/json' } } : {}) });
      return d.candidates[0].content.parts[0].text;
    } },
  { name: 'openai', on: () => !!(env('AI_INTEGRATIONS_OPENAI_API_KEY') || env('OPENAI_API_KEY')),
    run: async (r) => {
      const base = env('AI_INTEGRATIONS_OPENAI_BASE_URL') || 'https://api.openai.com/v1', key = env('AI_INTEGRATIONS_OPENAI_API_KEY') || env('OPENAI_API_KEY');
      const d = await post(`${base}/chat/completions`, { Authorization: `Bearer ${key}` }, { model: env('OPENAI_MODEL') || 'gpt-4o-mini',
        messages: [...(r.system ? [{ role: 'system', content: r.system }] : []), { role: 'user', content: r.prompt }], ...(r.json ? { response_format: { type: 'json_object' } } : {}) });
      return d.choices[0].message.content;
    } },
  { name: 'pollinations', on: () => !!env('POLLINATIONS_API_KEY'),
    run: async (r) => {
      const d = await post('https://text.pollinations.ai/openai', { Authorization: `Bearer ${env('POLLINATIONS_API_KEY')}` }, { model: 'openai',
        messages: [...(r.system ? [{ role: 'system', content: r.system }] : []), { role: 'user', content: r.prompt }], ...(r.json ? { response_format: { type: 'json_object' } } : {}) });
      return d.choices[0].message.content;
    } },
  { name: 'claude', on: () => !!env('ANTHROPIC_API_KEY'),
    run: async (r) => {
      const d = await post('https://api.anthropic.com/v1/messages', { 'x-api-key': env('ANTHROPIC_API_KEY'), 'anthropic-version': '2023-06-01' }, {
        model: env('CLAUDE_MODEL') || 'claude-sonnet-4-6', max_tokens: 1500, ...(r.system ? { system: r.system } : {}), messages: [{ role: 'user', content: r.prompt }] });
      return d.content.filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('');
    } },
];

/** Tenta Gemini, OpenAI, Pollinations e Claude, nessa ordem, e usa o primeiro que responder.
 *  Dados de saude: envie so texto ja anonimizado (scrub) e com base legal/consentimento; `sensivel` pula o Pollinations (servico publico). */
export async function ask(r: AiReq) {
  const tried: string[] = [];
  for (const p of PROVIDERS) {
    if (!p.on() || (r.sensivel && p.name === 'pollinations')) continue;
    try { return { provider: p.name, text: await p.run(r) }; }
    catch (e) { tried.push(`${p.name}: ${(e as Error).message}`); }
  }
  throw new Error('Nenhum provedor de IA respondeu. ' + (tried.join('; ') || 'Nenhuma chave configurada.'));
}
