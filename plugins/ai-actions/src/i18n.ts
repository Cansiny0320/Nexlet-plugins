const messages = {
  '共享 AI 模型': ['共享 AI 模型','共用 AI 模型','Shared AI model'],
  '使用设置中的默认模型': ['使用设置中的默认模型','使用設定中的預設模型','Use the default model from Settings'],
  '共享模型': ['共享模型','共用模型','Shared model'],
  '此插件的旧配置': ['此插件的旧配置','此外掛的舊設定','Legacy plugin configuration'],
  '已选模型不可用': ['已选模型不可用','已選模型無法使用','Selected model is unavailable'],
  title: ['AI 动作', 'AI 動作', 'AI actions'],
  subtitle: ['把一段内容交给常用 Prompt', '將一段內容交給常用 Prompt', 'Apply a reusable prompt to your text'],
  new: ['新建动作', '新增動作', 'New action'],
  name: ['动作名称', '動作名稱', 'Action name'],
  model: ['模型', '模型', 'Model'],
  key: ['API Key（留空保留此地址的 Key）', 'API Key（留空保留此位址的 Key）', 'API key (leave blank to keep this endpoint’s key)'],
  clearKey: ['清除此地址的 Key', '清除此位址的 Key', 'Clear endpoint key'],
  save: ['保存动作', '儲存動作', 'Save action'],
  remove: ['删除动作', '刪除動作', 'Delete action'],
  input: ['输入', '輸入', 'Input'],
  output: ['结果', '結果', 'Result'],
  run: ['运行 · ⌘ / Ctrl + Enter', '執行 · ⌘ / Ctrl + Enter', 'Run · ⌘ / Ctrl + Enter'],
  stop: ['停止生成', '停止產生', 'Stop'],
  copy: ['复制', '複製', 'Copy'],
  paste: ['回贴', '回貼', 'Paste back'],
  continue: ['继续处理', '繼續處理', 'Continue with…'],
  privacy: ['点击运行后，将输入发送给当前服务地址。结果仅供复制或继续处理。', '按下執行後，輸入將傳送至目前的服務位址。結果可複製或繼續處理。', 'Running sends your input to the selected endpoint. Copy the result or pass it to another tool.'],
  ready: ['准备就绪', '準備就緒', 'Ready'],
  saved: ['动作已保存', '動作已儲存', 'Action saved'],
  running: ['正在生成…', '正在產生…', 'Generating…'],
  stopped: ['已停止，保留当前结果', '已停止，保留目前結果', 'Stopped; partial output retained'],
  complete: ['生成完成', '產生完成', 'Complete'],
  copied: ['已复制', '已複製', 'Copied'],
  deleted: ['动作已删除', '動作已刪除', 'Action deleted'],
  cleared: ['Key 已清除', 'Key 已清除', 'Key cleared'],
  invalidAction: ['请填写有效的动作名称和 Prompt', '請填寫有效的動作名稱及 Prompt', 'Enter a valid action name and prompt'],
  invalidUrl: ['服务地址须为 HTTPS 或本机 HTTP，不能带凭据或查询参数', '服務位址須為 HTTPS 或本機 HTTP，不可含憑證或查詢參數', 'Use HTTPS or local HTTP without credentials or query parameters'],
  missingModel: ['请填写模型并保存动作', '請填寫模型並儲存動作', 'Enter a model and save the action'],
  invalidInput: ['请输入不超过 10 万字符的内容', '請輸入不超過 10 萬字元的內容', 'Enter text up to 100,000 characters'],
  unsaved: ['请先保存动作修改', '請先儲存動作修改', 'Save action changes first'],
  limit: ['最多保存 100 个动作', '最多儲存 100 個動作', 'Up to 100 actions'],
  keySession: ['动作已保存；系统加密不可用，Key 仅本次会话有效', '動作已儲存；系統加密無法使用，Key 僅本次工作階段有效', 'Action saved; encryption is unavailable, so the key lasts only for this session'],
  explain: ['解释报错', '解釋錯誤', 'Explain errors'], polish: ['润色文字', '潤飾文字', 'Polish text'],
  todos: ['提炼待办', '整理待辦', 'Extract tasks'], commit: ['生成提交说明', '產生提交說明', 'Draft commit message'],
} as const;
type Key = keyof typeof messages;
let language: 0 | 1 | 2 = 0;
export function t(key: string) { return key in messages ? messages[key as Key][language] : key; }
export async function languageSetup(changed: () => void) {
  const apply = (locale: string) => {
    language = locale === 'en' ? 2 : locale === 'zh-Hant' ? 1 : 0;
    document.documentElement.lang = ['zh-CN','zh-Hant','en'][language];
    document.querySelectorAll<HTMLElement>('[data-t]').forEach(element => element.textContent = t(element.dataset.t!));
    changed();
  };
  nexlet.i18n.onChange(apply); apply(await nexlet.i18n.getLocale());
}
