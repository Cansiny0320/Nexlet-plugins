import { countText } from './counter.js';

const input = document.querySelector('#text');
const clear = document.querySelector('#clear');
const status = document.querySelector('#status');
const formatter = new Intl.NumberFormat('zh-CN');
const fields = Object.fromEntries(
  ['words', 'chinese', 'english', 'numbers', 'characters', 'nonWhitespace', 'lines', 'paragraphs']
    .map(key => [key, document.getElementById(key)]),
);
let pending;

function render() {
  clearTimeout(pending);
  const counts = countText(input.value);
  for (const [key, value] of Object.entries(counts)) {
    fields[key].textContent = formatter.format(value);
  }
  clear.disabled = !input.value;
  status.textContent = input.value ? '统计已更新' : '等待输入';
}

input.addEventListener('input', () => {
  clear.disabled = !input.value;
  clearTimeout(pending);
  // Coalesce edits to longer text while keeping ordinary typing immediate.
  if (input.value.length > 10000) {
    status.textContent = '正在统计…';
    pending = setTimeout(render, 120);
  } else {
    render();
  }
});

clear.addEventListener('click', () => {
  input.value = '';
  render();
  input.focus();
});

window.nexlet.onEnter(context => {
  if (context.type === 'text' && context.payload) {
    input.value = context.payload;
    render();
  }
  input.focus();
});

render();
input.focus();
