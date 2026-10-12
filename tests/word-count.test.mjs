import assert from 'node:assert/strict';
import test from 'node:test';
import { countText } from '../plugins/word-count/counter.js';

test('空文本与纯空白不产生字数或段落', () => {
  assert.deepEqual(countText(''), { words: 0, chinese: 0, english: 0, numbers: 0, characters: 0, nonWhitespace: 0, lines: 0, paragraphs: 0 });
  assert.deepEqual(countText(' \t\n\n'), { words: 0, chinese: 0, english: 0, numbers: 0, characters: 4, nonWhitespace: 0, lines: 3, paragraphs: 0 });
});

test('中英文、数字和标点按各自口径统计', () => {
  assert.deepEqual(countText('你好，Nexlet world! 2026'), { words: 5, chinese: 2, english: 2, numbers: 1, characters: 21, nonWhitespace: 19, lines: 1, paragraphs: 1 });
});

test('连字符、撇号和重音字母属于同一个英文单词', () => {
  const result = countText("Don't stop re-entering l’esprit café cafe\u0301");
  assert.equal(result.english, 6);
  assert.equal(result.words, 6);
});

test('小数与千分位数字计为一组，全角数字也可识别', () => {
  const result = countText('价格 1,234.56，版本 2.0，数量１２３');
  assert.equal(result.numbers, 3);
  assert.equal(result.words, 9);
});

test('emoji、组合字符和扩展汉字按可见字符计数', () => {
  const result = countText('𠮷 e\u0301 👨‍👩‍👧‍👦 👍🏽 🇨🇳');
  assert.equal(result.chinese, 1);
  assert.equal(result.english, 1);
  assert.equal(result.nonWhitespace, 5);
  assert.equal(result.characters, 9);
});

test('统一 Windows、macOS 和 Unicode 换行，空行分段', () => {
  const result = countText('第一行\r\n第二行\r\n \t\r\n第三行\r第四行\u2028第五行\u2029第六行\n');
  assert.equal(result.lines, 8);
  assert.equal(result.paragraphs, 2);
  assert.equal(countText('a\r\nb').characters, 3);
});

test('只含标点和 emoji 的文本有字符但无字数', () => {
  const result = countText('，。！？🙂');
  assert.equal(result.words, 0);
  assert.equal(result.nonWhitespace, 5);
});

test('支持宿主允许的 50 万字符文本', () => {
  const result = countText('中文 a\n'.repeat(100_000));
  assert.equal(result.words, 300_000);
  assert.equal(result.characters, 500_000);
  assert.equal(result.lines, 100_001);
  assert.equal(result.paragraphs, 1);
});
