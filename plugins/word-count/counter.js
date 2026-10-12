const graphemes = new Intl.Segmenter('zh-CN', { granularity: 'grapheme' });

export function countText(input) {
  // Treat a Windows line ending as one character, just like a textarea does.
  const text = input.replace(/\r\n?|\u2028|\u2029/g, '\n');
  const chinese = (text.match(/\p{Script=Han}/gu) || []).length;
  const english = (text.match(/\p{Script=Latin}[\p{Script=Latin}\p{Mark}]*(?:['’\-][\p{Script=Latin}][\p{Script=Latin}\p{Mark}]*)*/gu) || []).length;
  const numbers = (text.match(/\p{Decimal_Number}+(?:[.,．，]\p{Decimal_Number}+)*/gu) || []).length;
  let characters = 0;
  let nonWhitespace = 0;
  for (const { segment } of graphemes.segment(text)) {
    characters += 1;
    if (!/^\s+$/u.test(segment)) nonWhitespace += 1;
  }
  const lines = text ? text.split('\n') : [];
  let paragraphs = 0;
  let inParagraph = false;
  for (const line of lines) {
    if (line.trim()) {
      if (!inParagraph) paragraphs += 1;
      inParagraph = true;
    } else {
      inParagraph = false;
    }
  }
  return { words: chinese + english + numbers, chinese, english, numbers, characters, nonWhitespace, lines: lines.length, paragraphs };
}
