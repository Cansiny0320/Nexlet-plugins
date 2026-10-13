export {};
const text = document.querySelector<HTMLTextAreaElement>('#text')!;
const status = document.querySelector<HTMLPreElement>('#status')!;
let running = false;
nexlet.tasks.onProgress(event => { if (event.id === 'hash') status.textContent = JSON.stringify(event.value); });
document.querySelector('#run')!.addEventListener('click', async () => {
  if (running) return; running = true;
  try {
    const result = await nexlet.backend.call({ id: 'hash', method: 'hash', args: { text: text.value } });
    const old = await nexlet.database.get('last-result');
    await nexlet.database.put({ id: 'last-result', rev: old?.rev, value: result as { digest: string; length: number } });
    status.textContent = JSON.stringify(result, null, 2);
  } catch (error) { status.textContent = String(error); } finally { running = false; }
});
document.querySelector('#cancel')!.addEventListener('click', () => { void nexlet.tasks.cancel('hash'); });
nexlet.onReady(async () => { const previous = await nexlet.database.get('last-result'); if (previous) status.textContent = JSON.stringify(previous.value, null, 2); });
