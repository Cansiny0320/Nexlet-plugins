import type { PluginContext } from '@nexlet/plugin-api';

const note = document.querySelector<HTMLTextAreaElement>('#note')!;
const status = document.querySelector<HTMLElement>('#status')!;
const save = document.querySelector<HTMLButtonElement>('#save')!;
const copy = document.querySelector<HTMLButtonElement>('#copy')!;
const message = (error: unknown) => error instanceof Error ? error.message : String(error);

// Keep initialization explicit: onEnter may arrive before a slow storage read ends.
const initialized = nexlet.storage.get('note').then(value => {
  if (typeof value === 'string') note.value = value;
  status.textContent = '已加载';
}).catch(error => { status.textContent = message(error); });

nexlet.onEnter(async (context: PluginContext) => {
  await initialized;
  if (context.type === 'text' && context.payload) {
    note.value = context.payload;
    status.textContent = '已带入文本，点击保存以保留';
  }
});

save.addEventListener('click', async () => {
  save.disabled = true;
  try {
    await initialized;
    await nexlet.storage.set('note', note.value);
    status.textContent = '已保存';
  } catch (error) { status.textContent = message(error); }
  finally { save.disabled = false; }
});

copy.addEventListener('click', async () => {
  try {
    await nexlet.clipboard.writeText(note.value);
    status.textContent = '已复制';
  } catch (error) { status.textContent = message(error); }
});
