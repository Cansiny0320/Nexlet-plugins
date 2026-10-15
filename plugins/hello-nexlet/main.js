import { t, setText, startLanguage, onLanguageChange, getLocale } from './i18n.js';
const note=document.querySelector('#note');
const status=document.querySelector('#status');
let queue=Promise.resolve();
async function load(){try{note.value=(await window.nexlet.storage.get('note'))||'';setText(status,t("已保存"));}catch(e){setText(status,e.message);}}
note.addEventListener('input',()=>{const text=note.value;setText(status,t("保存中…"));queue=queue.catch(()=>{}).then(()=>window.nexlet.storage.set('note',text)).then(()=>{setText(status,t("已保存"));}).catch(e=>{setText(status,e.message);});});
document.querySelector('#copy').addEventListener('click',async()=>{try{await window.nexlet.clipboard.writeText(note.value);setText(status,t("已复制"));}catch(e){setText(status,e.message);}});
void startLanguage().then(load);
