import { textSource } from './source';
import type { Source } from './source';
import { htmlTable } from './html';
import { renderPng } from './render';
import type { Rendered, Settings } from './render';
import { t, errorText, startLanguage } from './i18n';
import type { Message } from './i18n';

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const text = byId<HTMLTextAreaElement>('text');
const preview = byId<HTMLImageElement>('preview');
const copy = byId<HTMLButtonElement>('copy');
const save = byId<HTMLButtonElement>('save');
const status = byId('status');
let source: Source = { kind: 'text', text: '' };
let rendered: Rendered | null = null, previewUrl = '', generation = 0, timer = 0;
let working = false, queued = false, exporting = false;
let sourceValid = true, contentVersion = 0;
let statusKey: Message = 'empty', lastError: unknown = null;
let legacy = false;

function setStatus(key: Message, error: unknown = null) {
  statusKey = key; lastError = error;
  status.textContent = error ? errorText(error) : t(key);
  status.dataset.error = String(!!error);
}
function buttons() { copy.disabled = save.disabled = !rendered || exporting; byId<HTMLButtonElement>('continue').disabled = !rendered || exporting || !nexlet.results; }
function clearPreview() {
  rendered = null; preview.removeAttribute('src'); preview.hidden = true;
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = ''; byId('dimensions').textContent = ''; buttons();
}
function labels() {
  byId('mode').textContent = t(source.kind === 'table' ? 'table' : 'text');
  byId('table-info').hidden = source.kind !== 'table';
  byId('editor').hidden = source.kind !== 'text';
  if (source.kind === 'table') {
    byId('table-size').textContent = t('tableSize', { rows: source.rows.length, cells: source.rows.reduce((n, row) => n + row.length, 0) });
    byId('table-hint').textContent = t(source.styled ? 'tableHint' : 'basicHint');
  }
  byId('compatibility').hidden = !legacy;
  byId('compatibility').textContent = t('legacy');
  setStatus(statusKey, lastError);
  preview.alt = t('preview');
}
function settings(): Settings {
  return {
    width: byId<HTMLInputElement>('width').valueAsNumber,
    fontSize: byId<HTMLInputElement>('font-size').valueAsNumber,
    padding: byId<HTMLInputElement>('padding').valueAsNumber,
    background: byId<HTMLInputElement>('background').value,
  };
}
async function draw() {
  if (working) { queued = true; return; }
  working = true;
  try {
    do {
      queued = false;
      const revision = generation;
      if (source.kind === 'text' && !source.text) { setStatus('empty'); continue; }
      setStatus('rendering');
      try {
        const result = await renderPng(source, settings());
        if (revision !== generation) continue;
        rendered = result;
        previewUrl = URL.createObjectURL(result.blob);
        preview.src = previewUrl; preview.hidden = false;
        byId('empty').hidden = true;
        byId('dimensions').textContent = `${result.width} × ${result.height} px · ${Math.max(1, Math.round(result.blob.size / 1024))} KB`;
        setStatus('ready'); buttons();
      } catch (error) {
        if (revision === generation) { clearPreview(); setStatus('failed', error); }
      }
    } while (queued);
  } finally { working = false; }
}
function schedule() {
  generation++; clearTimeout(timer); clearPreview();
  if (!sourceValid) return;
  byId('empty').hidden = !(source.kind === 'text' && !source.text);
  setStatus(source.kind === 'text' && !source.text ? 'empty' : 'rendering');
  timer = window.setTimeout(() => { void draw(); }, 100);
}
function importSource(plain: string, html = '') {
  source = html ? htmlTable(html) ?? textSource(plain) : textSource(plain);
  sourceValid = true;
  text.value = source.kind === 'text' ? source.text : '';
  labels(); schedule();
}
function importFailed(error: unknown) {
  sourceValid = false;
  generation++; clearTimeout(timer); queued = false; clearPreview();
  byId('empty').hidden = true; setStatus('failed', error);
}
async function readClipboard() {
  const revision = ++contentVersion;
  generation++; queued = false;
  clearTimeout(timer); clearPreview(); setStatus('reading');
  try {
    legacy = typeof nexlet.clipboard.readHTML !== 'function';
    const html = legacy ? null : await nexlet.clipboard.readHTML();
    const plain = await nexlet.clipboard.readText();
    if (revision !== contentVersion) return;
    importSource(plain, html ?? '');
  } catch (error) {
    if (revision !== contentVersion) return;
    importFailed(error);
  }
}

text.addEventListener('input', () => {
  contentVersion++;
  try { source = textSource(text.value); sourceValid = true; labels(); schedule(); } catch (error) { importFailed(error); }
});
for (const id of ['width', 'font-size', 'padding', 'background']) byId(id).addEventListener('input', schedule);
byId('read').addEventListener('click', () => { void readClipboard(); });
document.addEventListener('paste', event => {
  if (!event.clipboardData || event.target instanceof HTMLInputElement) return;
  const plain = event.clipboardData.getData('text/plain'), html = event.clipboardData.getData('text/html');
  try {
    const table = html ? htmlTable(html) : null;
    if (!table && !plain.includes('\t') && event.target === text) return;
    contentVersion++;
    event.preventDefault(); legacy = false;
    if (table) { source = table; sourceValid = true; text.value = ''; labels(); schedule(); }
    else importSource(plain);
  } catch (error) { contentVersion++; event.preventDefault(); importFailed(error); }
});

async function exportImage(action: 'copy' | 'save') {
  if (!rendered || exporting) return;
  const image = rendered, revision = generation;
  exporting = true; buttons(); setStatus('exporting');
  try {
    if (action === 'copy') {
      await nexlet.clipboard.writeImage(new Uint8Array(await image.blob.arrayBuffer()));
      if (revision === generation) setStatus('copied');
    } else {
      const result = await nexlet.dialogs.save({ title: t('save'), defaultPath: 'Nexlet-image.png', filters: [{ name: 'PNG', extensions: ['png'] }] });
      if (result.canceled || !result.filePath) { if (revision === generation) setStatus('canceled'); return; }
      const filename = /\.png$/i.test(result.filePath) ? result.filePath : result.filePath + '.png';
      await nexlet.files.write(filename, new Uint8Array(await image.blob.arrayBuffer()), true);
      if (revision === generation) setStatus('saved');
    }
  } catch (error) { if (revision === generation) setStatus('failed', error); }
  finally { exporting = false; buttons(); }
}
copy.addEventListener('click', () => { void exportImage('copy'); });
save.addEventListener('click', () => { void exportImage('save'); });
byId('continue').addEventListener('click', () => {
  const image = rendered;
  if (!image) return;
  const reader = new FileReader();
  reader.onload = () => { void nexlet.results.publish({ type: 'image', data: String(reader.result) }).catch(error => setStatus('failed', error)); };
  reader.readAsDataURL(image.blob);
});
document.addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') { event.preventDefault(); void exportImage('copy'); }
});
nexlet.onEnter(async context => {
  // Launcher/selection input is authoritative. Never enrich it with separately read clipboard data.
  if (context.type === 'text' && context.payload) {
    contentVersion++;
    try { importSource(context.payload, context.html || ''); } catch (error) { importFailed(error); }
  } else {
    const revision = ++contentVersion;
    const draft = await nexlet.session?.read();
    if (revision !== contentVersion) return;
    if (draft?.source && typeof draft.source === 'object' && !Array.isArray(draft.source)) {
      source = draft.source as unknown as Source;
      const values = draft.settings as Record<string,string|number> | undefined;
      if(values)for(const [key,id] of [['width','width'],['fontSize','font-size'],['padding','padding'],['background','background']])byId<HTMLInputElement>(id).value=String(values[key]);
      sourceValid=true;text.value=source.kind==='text'?source.text:'';labels();schedule();
      text.scrollTop=Number(draft.scroll)||0;
    } else void readClipboard();
  }
});
nexlet.onOut(async () => {
  generation++; contentVersion++; clearTimeout(timer); queued=false;
  await nexlet.session?.save(JSON.parse(JSON.stringify({source,settings:settings(),scroll:text.scrollTop})));
});
window.addEventListener('unload', () => { if (previewUrl) URL.revokeObjectURL(previewUrl); });
startLanguage(labels); labels(); buttons();
