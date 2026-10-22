export interface Action { id: string; name: string; prompt: string; model: string; baseUrl: string }
export const presets: Action[] = [
  { id: 'explain', name: '解释报错', prompt: 'Explain the following error. Identify likely causes, show concrete debugging steps, and distinguish facts from assumptions. Respond in the language of the input.', model: '', baseUrl: 'https://api.openai.com/v1' },
  { id: 'polish', name: '润色文字', prompt: 'Polish the following writing while preserving its meaning, facts and language. Return the revised text only.', model: '', baseUrl: 'https://api.openai.com/v1' },
  { id: 'todos', name: '提炼待办', prompt: 'Extract actionable tasks from the following text. Include owners and deadlines only when explicitly stated. Respond in the language of the input.', model: '', baseUrl: 'https://api.openai.com/v1' },
  { id: 'commit', name: '生成提交说明', prompt: 'Draft a concise commit message from the following changes. Describe only changes supported by the input, and preserve repository-specific naming. Respond in the language of the input.', model: '', baseUrl: 'https://api.openai.com/v1' },
];
export function validateAction(value: unknown): Action {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('invalidAction');
  const item = value as Record<string, unknown>;
  for (const [key, limit] of [['id', 100], ['name', 80], ['prompt', 20000], ['model', 200], ['baseUrl', 2048]] as const)
    if (typeof item[key] !== 'string' || item[key].length > limit || (key !== 'model' && !item[key].trim()) || item[key].includes('\0')) throw Error('invalidAction');
  if (!/^[a-zA-Z0-9_-]+$/.test(item.id as string)) throw Error('invalidAction');
  let url: URL;
  try { url = new URL(item.baseUrl as string); } catch { throw Error('invalidUrl'); }
  if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) || url.username || url.password || url.search || url.hash) throw Error('invalidUrl');
  return { id: item.id as string, name: (item.name as string).trim(), prompt: item.prompt as string, model: (item.model as string).trim(), baseUrl: url.href.replace(/\/$/, '') };
}
export function buildActionRequest(action: Action, input: string) {
  const value = validateAction(action);
  if (!value.model) throw Error('missingModel');
  if (!input.trim() || input.length > 100000) throw Error('invalidInput');
  return { model: value.model, messages: [{ role: 'system', content: value.prompt }, { role: 'user', content: input }] };
}
export async function keyForEndpoint(baseUrl: string) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(new URL(baseUrl).href.replace(/\/$/, '')));
  return 'endpoint.' + [...new Uint8Array(hash)].map(value => value.toString(16).padStart(2, '0')).join('').slice(0, 32);
}
