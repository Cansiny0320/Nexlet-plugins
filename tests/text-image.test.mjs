import assert from 'node:assert/strict';
import test from 'node:test';
import { parseTsv, textSource, LIMITS } from '../plugins/text-image/src/source.ts';

test('TSV preserves quoted line breaks, tabs, escaped quotes and empty cells', () => {
  assert.deepEqual(parseTsv('名称\t备注\t\r\n产品\t"第一行\n第二行\t\"\"引号\"\""\t\r\n'), [
    ['名称', '备注', ''], ['产品', '第一行\n第二行\t"引号"', ''],
  ]);
});
test('TSV retains deliberate blank rows and rejects excessive grid dimensions', () => {
  assert.deepEqual(parseTsv('a\tb\n\n'), [['a', 'b'], ['']]);
  assert.throws(() => parseTsv(Array.from({ length: 201 }, () => 'x').join('\t')), /largeTable/);
  assert.throws(() => parseTsv(('a\tb\tc\td\te\tf\n').repeat(900)), /largeTable/);
});
test('text input selects table only for tabs and never interprets HTML', () => {
  assert.deepEqual(textSource('<b>你好</b>\r\n世界'), { kind: 'text', text: '<b>你好</b>\n世界' });
  assert.equal(textSource('a\tb').kind, 'table');
  assert.throws(() => textSource('x'.repeat(LIMITS.characters + 1)), /largeText/);
});
