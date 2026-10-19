import { LIMITS } from './source';
import type { Source, Style } from './source';

export interface Settings { width: number; fontSize: number; padding: number; background: string }
export interface Rendered { blob: Blob; width: number; height: number }

function applyStyle(element: HTMLElement, style: Style, settings: Settings) {
  for (const [property, value] of Object.entries(style)) element.style.setProperty(property, value);
  if (style['font-size']) {
    const value = style['font-size'];
    element.style.fontSize = `${parseFloat(value) * (value.endsWith('pt') ? 4 / 3 : 1) * settings.fontSize / 16}px`;
  }
}

/** Rebuild only safe elements, attributes, text and whitelisted inline CSS. */
export function createArtwork(source: Source, settings: Settings): HTMLDivElement {
  const root = document.createElement('div');
  Object.assign(root.style, {
    boxSizing: 'border-box', width: `${settings.width}px`, padding: `${settings.padding}px`,
    backgroundColor: settings.background, color: '#172033', fontFamily: '"Segoe UI", "Microsoft YaHei", "PingFang SC", sans-serif',
    fontSize: `${settings.fontSize}px`, lineHeight: '1.55', colorScheme: 'light', textAlign: 'left',
  });
  if (source.kind === 'text') {
    const text = document.createElement('div');
    Object.assign(text.style, { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', minHeight: '1.55em' });
    text.textContent = source.text;
    root.append(text);
  } else {
    const table = document.createElement('table');
    Object.assign(table.style, { borderCollapse: 'collapse', borderSpacing: '0', width: '100%', tableLayout: 'auto', fontSize: 'inherit', color: 'inherit' });
    if (source.columns.length) {
      const group = document.createElement('colgroup');
      for (const style of source.columns) {
        const col = document.createElement('col');
        if (style.width) col.style.width = style.width;
        group.append(col);
      }
      table.append(group);
    }
    const body = document.createElement('tbody');
    for (const row of source.rows) {
      const tr = document.createElement('tr');
      for (const cell of row) {
        const td = document.createElement('td');
        Object.assign(td.style, {
          border: '1px solid #cbd2dc', padding: '6px 10px', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere',
          verticalAlign: 'middle', fontSize: 'inherit', lineHeight: '1.4',
        });
        applyStyle(td, cell.style, settings);
        td.rowSpan = cell.rowSpan; td.colSpan = cell.colSpan;
        td.textContent = cell.text;
        tr.append(td);
      }
      body.append(tr);
    }
    table.append(body); root.append(table);
  }
  return root;
}

export async function renderPng(source: Source, settings: Settings): Promise<Rendered> {
  if (!Number.isFinite(settings.width) || settings.width < 240 || settings.width > 4096 ||
      !Number.isFinite(settings.fontSize) || settings.fontSize < 10 || settings.fontSize > 48 ||
      !Number.isFinite(settings.padding) || settings.padding < 0 || settings.padding > 96 ||
      !/^#[0-9a-f]{6}$/i.test(settings.background)) throw new Error('invalidSettings');
  const artwork = createArtwork(source, settings);
  const holder = document.createElement('div');
  Object.assign(holder.style, { position: 'fixed', left: '-100000px', top: '0', pointerEvents: 'none', visibility: 'hidden' });
  holder.append(artwork); document.body.append(holder);
  try {
    await document.fonts.ready;
    const bounds = artwork.getBoundingClientRect();
    const cssWidth = Math.ceil(Math.max(bounds.width, artwork.scrollWidth));
    const cssHeight = Math.ceil(Math.max(bounds.height, artwork.scrollHeight));
    const width = cssWidth * 2, height = cssHeight * 2;
    if (!width || !height || width > LIMITS.dimension || height > LIMITS.dimension || width * height > LIMITS.pixels) throw new Error('largeImage');
    artwork.style.width = `${cssWidth}px`;
    // Use a data URL, with no external resources. Blob URLs for SVG foreignObject can taint Canvas.
    const serialized = new XMLSerializer().serializeToString(artwork);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${cssWidth} ${cssHeight}"><foreignObject width="100%" height="100%">${serialized}</foreignObject></svg>`;
    const image = new Image();
    image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('renderFailed');
    context.fillStyle = settings.background; context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('renderFailed')), 'image/png'));
    canvas.width = 0; canvas.height = 0;
    if (blob.size > LIMITS.pngBytes) throw new Error('largePng');
    return { blob, width, height };
  } finally { holder.remove(); }
}
