const messages = {
  title: ['文字表格转图片', '文字表格轉圖片', 'Text & Table to Image'],
  subtitle: ['复制、预览，把内容变成一张清晰的图片。', '複製、預覽，把內容變成一張清晰的圖片。', 'Turn copied text and cells into a crisp image.'],
  read: ['读取剪贴板', '讀取剪貼簿', 'Read clipboard'],
  copy: ['复制图片', '複製圖片', 'Copy image'],
  save: ['保存 PNG', '儲存 PNG', 'Save PNG'],
  preview: ['图片预览', '圖片預覽', 'Image preview'],
  layout: ['排版设置', '排版設定', 'Layout'],
  width: ['图片宽度', '圖片寬度', 'Image width'],
  fontSize: ['字号', '字級', 'Font size'],
  padding: ['内边距', '內邊距', 'Padding'],
  background: ['背景颜色', '背景顏色', 'Background'],
  text: ['文字', '文字', 'Text'],
  table: ['表格', '表格', 'Table'],
  editor: ['编辑文字', '編輯文字', 'Edit text'],
  placeholder: ['在这里输入文字，或粘贴 Excel 单元格…', '在這裡輸入文字，或貼上 Excel 儲存格…', 'Type text or paste cells from Excel…'],
  empty: ['复制文字或 Excel 单元格，然后读取剪贴板。', '複製文字或 Excel 儲存格，然後讀取剪貼簿。', 'Copy text or Excel cells, then read the clipboard.'],
  emptyHint: ['也可以直接粘贴到这里', '也可以直接貼到這裡', 'You can also paste here'],
  local: ['本地处理 · 内容不保存', '本機處理 · 不儲存內容', 'Local processing · Content is not stored'],
  quality: ['以 2 倍像素导出 PNG', '以 2 倍像素匯出 PNG', 'PNG export at 2× resolution'],
  tableHint: ['已保留支持的单元格样式。粘贴新表格可替换内容。', '已保留支援的儲存格樣式。貼上新表格可取代內容。', 'Supported cell styles are preserved. Paste a new table to replace it.'],
  basicHint: ['按制表符还原为基础表格，未包含原始样式。', '依定位字元還原為基本表格，未包含原始樣式。', 'A basic table reconstructed from tabs, without original formatting.'],
  tableSize: ['{rows} 行 · {cells} 个单元格', '{rows} 列 · {cells} 個儲存格', '{rows} rows · {cells} cells'],
  ready: ['预览已更新', '預覽已更新', 'Preview updated'],
  rendering: ['正在生成图片…', '正在產生圖片…', 'Generating image…'],
  reading: ['正在读取剪贴板…', '正在讀取剪貼簿…', 'Reading clipboard…'],
  copied: ['图片已复制，可以直接粘贴', '圖片已複製，可以直接貼上', 'Image copied, ready to paste'],
  saved: ['PNG 已保存', 'PNG 已儲存', 'PNG saved'],
  canceled: ['已取消保存', '已取消儲存', 'Save canceled'],
  exporting: ['正在导出…', '正在匯出…', 'Exporting…'],
  legacy: ['当前 Nexlet 不支持自动读取表格样式；请直接粘贴表格，或使用更新后的宿主。', '目前 Nexlet 不支援自動讀取表格樣式；請直接貼上表格，或使用更新後的主程式。', 'This host cannot read table formatting automatically. Paste the table here or use an updated host.'],
  largeText: ['内容超过 100,000 字符，请缩小复制范围。', '內容超過 100,000 字元，請縮小複製範圍。', 'Content exceeds 100,000 characters. Copy a smaller selection.'],
  largeHtml: ['表格 HTML 超过 2 MiB，请缩小复制范围。', '表格 HTML 超過 2 MiB，請縮小複製範圍。', 'Table HTML exceeds 2 MiB. Copy a smaller selection.'],
  largeTable: ['表格超过限制（5,000 格、1,000 行或 200 列），请缩小复制范围。', '表格超過限制（5,000 格、1,000 列或 200 欄），請縮小複製範圍。', 'Table exceeds 5,000 cells, 1,000 rows or 200 columns. Copy a smaller selection.'],
  invalidTable: ['合并单元格存在重叠，请重新复制表格。', '合併儲存格存在重疊，請重新複製表格。', 'Merged cells overlap. Copy the table again.'],
  multipleTables: ['请一次复制一个表格，不支持嵌套表格。', '請一次複製一個表格，不支援巢狀表格。', 'Copy one table at a time. Nested tables are not supported.'],
  complexHtml: ['表格格式过于复杂，请缩小范围或粘贴纯文本。', '表格格式過於複雜，請縮小範圍或貼上純文字。', 'Table formatting is too complex. Copy less or paste plain text.'],
  invalidTsv: ['表格文本的引号不完整，请重新复制。', '表格文字的引號不完整，請重新複製。', 'Incomplete quoted table text. Copy the selection again.'],
  invalidSettings: ['宽度须为 240–4096，字号 10–48，内边距 0–96。', '寬度須為 240–4096，字級 10–48，內邊距 0–96。', 'Width: 240–4096; font size: 10–48; padding: 0–96.'],
  largeImage: ['图片过大（最长边 8192 像素、总计 2400 万像素），请减少内容或调整排版。', '圖片過大（最長邊 8192 像素、共 2400 萬像素），請減少內容或調整排版。', 'Image exceeds 8192 pixels on one side or 24 megapixels. Reduce content or adjust layout.'],
  largePng: ['PNG 超过 16 MiB，请减少内容或调整排版。', 'PNG 超過 16 MiB，請減少內容或調整排版。', 'PNG exceeds 16 MiB. Reduce content or adjust layout.'],
  renderFailed: ['图片生成失败，请调整内容后重试。', '圖片產生失敗，請調整內容後再試。', 'Image generation failed. Adjust the content and try again.'],
  failed: ['操作失败：{message}', '操作失敗：{message}', 'Operation failed: {message}'],
} as const;
export type Message = keyof typeof messages;
let language: 0 | 1 | 2 = 0;
export function t(key: Message, values: Record<string, string | number> = {}): string {
  return messages[key][language].replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));
}
export function errorText(error: unknown): string {
  const value = error instanceof Error ? error.message : String(error);
  if (value.includes('Clipboard HTML exceeds 2 MiB')) return t('largeHtml');
  return Object.hasOwn(messages, value) ? t(value as Message) : t('failed', { message: value });
}
export function startLanguage(changed: () => void) {
  const apply = (locale: string) => {
    language = locale === 'en' ? 2 : locale === 'zh-Hant' ? 1 : 0;
    document.documentElement.lang = ['zh-CN', 'zh-Hant', 'en'][language];
    for (const element of document.querySelectorAll<HTMLElement>('[data-i18n]')) element.textContent = t(element.dataset.i18n as Message);
    document.querySelector<HTMLTextAreaElement>('#text')!.placeholder = t('placeholder');
    document.title = t('title');
    changed();
  };
  let notified = false;
  const api = nexlet.i18n;
  api?.onChange(locale => { notified = true; apply(locale); });
  if (api) void api.getLocale().then(locale => { if (!notified) apply(locale); }).catch(() => apply('zh-CN'));
  else apply(navigator.language.startsWith('zh') ? /TW|HK|Hant/.test(navigator.language) ? 'zh-Hant' : 'zh-CN' : 'en');
}
