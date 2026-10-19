import { LIMITS } from './source';
import type { Cell, Style, TableSource } from './source';

const properties = [
  'font-family', 'font-size', 'font-weight', 'font-style', 'text-decoration-line',
  'color', 'background-color', 'text-align', 'vertical-align', 'width', 'height',
  ...['top', 'right', 'bottom', 'left'].flatMap(side => [
    `border-${side}-width`, `border-${side}-style`, `border-${side}-color`, `padding-${side}`,
  ]),
];
const forbidden = /url\s*\(|var\s*\(|expression|@|\\|[\u0000-\u001f<>]/i;
const simpleSelector = /^(?:(?:table|thead|tbody|tfoot|tr|td|th|col|span|font|b|i|strong|em)?(?:\.[\w-]+)*)(?:\s+(?:table|thead|tbody|tfoot|tr|td|th|col|span|font|b|i|strong|em)?(?:\.[\w-]+)*)*$/i;

function safeStyle(declaration: CSSStyleDeclaration): Style {
  const result: Style = {};
  for (const key of properties) {
    const value = declaration.getPropertyValue(key).trim();
    if (!value || forbidden.test(value)) continue;
    if (key === 'width' || key === 'height' || key === 'font-size' || key.endsWith('-width') || key.startsWith('padding-')) {
      if (!/^\d+(?:\.\d+)?(?:px|pt)$/.test(value) || parseFloat(value) > 4096) continue;
      if (key === 'font-size' && (parseFloat(value) < 6 || parseFloat(value) > 96)) continue;
    }
    // Fonts are local names only. No custom properties or CSS resource loading is retained.
    if (key === 'font-family' && /[();{}]/.test(value)) continue;
    if (CSS.supports(key, value)) result[key] = value;
  }
  return result;
}

function cellText(element: Element): string {
  let length = 0;
  const walk = (node: Node, depth: number): string => {
    if (depth > 50) throw new Error('complexHtml');
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? '';
      length += text.length;
      if (length > LIMITS.characters) throw new Error('largeText');
      return text;
    }
    if (!(node instanceof Element) || /^(SCRIPT|STYLE|TEMPLATE|NOSCRIPT|IFRAME|OBJECT|SVG|IMG)$/i.test(node.tagName)) return '';
    if (node.tagName === 'BR') return '\n';
    const text = Array.from(node.childNodes, child => walk(child, depth + 1)).join('');
    return /^(P|DIV)$/.test(node.tagName) ? text + '\n' : text;
  };
  return Array.from(element.childNodes, child => walk(child, 0)).join('').replace(/\r\n?/g, '\n').replace(/\n$/, '');
}

/** Parse in an inert template, then extract data. Original nodes never enter the active document. */
export function htmlTable(html: string): TableSource | null {
  if (new TextEncoder().encode(html).byteLength > LIMITS.htmlBytes) throw new Error('largeHtml');
  const template = document.createElement('template');
  template.innerHTML = html;
  const tables = template.content.querySelectorAll('table');
  if (!tables.length) return null;
  if (tables.length !== 1) throw new Error('multipleTables');
  if (template.content.querySelectorAll('*').length > 30_000) throw new Error('complexHtml');
  const table = tables[0];
  const rules: { selector: string; style: Style; specificity: number; order: number }[] = [];
  for (const element of template.content.querySelectorAll('style')) {
    const sheet = new CSSStyleSheet();
    // Constructed sheets are never adopted, so @import and resource declarations cannot load.
    sheet.replaceSync(element.textContent ?? '');
    for (const rule of sheet.cssRules) {
      if (!(rule instanceof CSSStyleRule)) continue;
      for (const selector of rule.selectorText.split(',').map(s => s.trim())) {
        if (!selector || !simpleSelector.test(selector)) continue;
        rules.push({ selector, style: safeStyle(rule.style), specificity: (selector.match(/\./g)?.length ?? 0) * 100 + (selector.match(/(?:^|\s)[a-z]+/gi)?.length ?? 0), order: rules.length });
      }
      if (rules.length > 2_000) throw new Error('complexHtml');
    }
  }
  rules.sort((a, b) => a.specificity - b.specificity || a.order - b.order);
  const styleOf = (element: Element): Style => {
    const style: Style = {};
    for (const rule of rules) if (element.matches(rule.selector)) Object.assign(style, rule.style);
    const inline = document.createElement('span').style;
    inline.cssText = element.getAttribute('style') ?? '';
    Object.assign(style, safeStyle(inline));
    for (const attr of ['width', 'height']) {
      const value = element.getAttribute(attr);
      if (!style[attr] && value && /^\d+(?:\.\d+)?$/.test(value) && Number(value) <= 4096) style[attr] = value + 'px';
    }
    for (const [attr, key] of [['bgcolor', 'background-color'], ['align', 'text-align'], ['valign', 'vertical-align']]) {
      const value = element.getAttribute(attr);
      if (!style[key] && value && !forbidden.test(value) && CSS.supports(key, value)) style[key] = value;
    }
    return style;
  };
  const inherited = (style: Style): Style => Object.fromEntries(Object.entries(style).filter(([key]) => /^(font-|color$|text-align$|vertical-align$|background-color$)/.test(key)));
  const base = inherited(styleOf(table));
  const rows: Cell[][] = [];
  const occupied: boolean[][] = [];
  let maxColumns = 0, characters = 0;
  const rowElements = Array.from(table.rows);
  if (rowElements.length > LIMITS.rows) throw new Error('largeTable');
  for (const [r, row] of rowElements.entries()) {
    const cells: Cell[] = [], rowStyle = { ...base, ...inherited(styleOf(row)) };
    let col = 0;
    for (const cell of row.cells) {
      while (occupied[r]?.[col]) col++;
      const rowSpan = cell.rowSpan === 0 ? rowElements.length - r : cell.rowSpan;
      const colSpan = cell.colSpan;
      if (r + rowSpan > rowElements.length || col + colSpan > LIMITS.columns || rowSpan * colSpan > LIMITS.cells) throw new Error('largeTable');
      for (let y = r; y < r + rowSpan; y++) {
        occupied[y] ??= [];
        for (let x = col; x < col + colSpan; x++) {
          if (occupied[y][x]) throw new Error('invalidTable');
          occupied[y][x] = true;
        }
      }
      const text = cellText(cell);
      characters += text.length;
      if (characters > LIMITS.characters) throw new Error('largeText');
      cells.push({ text, rowSpan, colSpan, style: { ...rowStyle, ...styleOf(cell) } });
      col += colSpan;
      maxColumns = Math.max(maxColumns, col);
    }
    rows.push(cells);
    if (rows.length * maxColumns > LIMITS.cells) throw new Error('largeTable');
  }
  if (!rows.length || !maxColumns) return null;
  const columns: Style[] = [];
  for (const col of table.querySelectorAll('col')) {
    const span = Number(col.getAttribute('span') ?? 1);
    if (!Number.isInteger(span) || span < 1 || columns.length + span > LIMITS.columns) throw new Error('largeTable');
    for (let i = 0; i < span; i++) columns.push(styleOf(col));
  }
  if (rows.length * Math.max(maxColumns, columns.length) > LIMITS.cells) throw new Error('largeTable');
  return { kind: 'table', rows, columns, styled: true };
}
