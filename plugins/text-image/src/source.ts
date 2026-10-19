export const LIMITS = {
  characters: 100_000, htmlBytes: 2 * 1024 * 1024, cells: 5_000,
  columns: 200, rows: 1_000, dimension: 8_192, pixels: 24_000_000,
  pngBytes: 16 * 1024 * 1024,
} as const;

export type Style = Record<string, string>;
export interface Cell { text: string; rowSpan: number; colSpan: number; style: Style }
export interface TableSource { kind: 'table'; rows: Cell[][]; columns: Style[]; styled: boolean }
export type Source = { kind: 'text'; text: string } | TableSource;

export function parseTsv(text: string): string[][] {
  if (text.length > LIMITS.characters) throw new Error('largeText');
  text = text.replace(/\r\n?/g, '\n');
  const rows: string[][] = [];
  let row: string[] = [], cell = '', quoted = false;
  const endCell = () => {
    row.push(cell); cell = '';
    if (row.length > LIMITS.columns) throw new Error('largeTable');
  };
  const endRow = () => {
    endCell(); rows.push(row); row = [];
    if (rows.length > LIMITS.rows) throw new Error('largeTable');
  };
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"' && cell === '') quoted = true;
    else if (char === '\t') endCell();
    else if (char === '\n') endRow();
    else cell += char;
  }
  if (quoted) throw new Error('invalidTsv');
  if (cell || row.length || !text.endsWith('\n')) endRow();
  if (rows.length * Math.max(0, ...rows.map(r => r.length)) > LIMITS.cells) throw new Error('largeTable');
  return rows;
}

export function textSource(text: string): Source {
  if (text.length > LIMITS.characters) throw new Error('largeText');
  text = text.replace(/\r\n?/g, '\n');
  if (!text.includes('\t')) return { kind: 'text', text };
  return {
    kind: 'table', styled: false, columns: [],
    rows: parseTsv(text).map(row => row.map(text => ({ text, rowSpan: 1, colSpan: 1, style: {} }))),
  };
}
