import { t, setText, startLanguage, onLanguageChange, getLocale } from './i18n.js';
import {LANGUAGES,MAX_CHARS,buildRequest,parseResponse,validateConfig} from './translation.js';
const $ = id => document.getElementById(id);
const api = window.nexlet;
let engine='google',config={baseUrl:'https://api.openai.com/v1',model:''},revision=0,active=null,ready=false,settingsDirty=false,saving=false,saveQueue=Promise.resolve();
let autoTimer=null,composing=false;
function status(message,error=false){setText($('status'),message);$('status').dataset.error=String(error);}
function settingStatus(message,error=false){setText($('settings-status'),message);$('settings-status').dataset.error=String(error);}
function sync(){
  const count=[...$('input').value].length;
  $('count').textContent=`${count} / ${MAX_CHARS}`;$('count').dataset.error=String(count>MAX_CHARS);
  $('translate').disabled=!ready||composing||!!active||saving||(engine==='llm'&&settingsDirty)||!$('input').value.trim()||count>MAX_CHARS;
  $('cancel').hidden=!active;$('copy').disabled=!$('output').value;
  $('continue').disabled=!$('output').value || !api.results;
  $('translate').firstChild.textContent=active?t("翻译中… "):t("开始翻译 ");
}
function invalidate(message=t("准备就绪")){
  clearTimeout(autoTimer);autoTimer=null;
  revision++;
  const previous=active;active=null;
  if(previous)void api.network.cancel(previous).catch(()=>{});
  $('output').value='';$('detected').textContent='';status(message);sync();
}
function scheduleAuto(){
  clearTimeout(autoTimer);autoTimer=null;
  if(engine!=='google'||!ready||composing||saving||!$('input').value.trim()||[...$('input').value].length>MAX_CHARS)return;
  status(t("等待自动翻译…"));
  autoTimer=setTimeout(()=>{autoTimer=null;void translate();},400);
}
function persistPreferences(){
  const value={engine,source:$('source').value,target:$('target').value};
  saveQueue=saveQueue.catch(()=>{}).then(()=>api.storage.set('preferences',value)).catch(()=>status(t("偏好保存失败，下次打开需要重新选择"),true));
}
function selectEngine(value){
  engine=value;
  for(const button of document.querySelectorAll('[data-engine]'))button.setAttribute('aria-pressed',String(button.dataset.engine===engine));
  $('engine-note').textContent=engine==='google'?t("Google 网页接口"):(config.model||t("请先配置模型"));
  $('shortcut').textContent=engine==='google'?t("输入后自动翻译 · ⌘ / Ctrl + Enter 立即翻译"):t("⌘ / Ctrl + Enter 翻译");
  sync();
}
function showSettings(visible){$('settings').hidden=!visible;$('settings-toggle').setAttribute('aria-expanded',String(visible));}
async function translate(){
  if($('translate').disabled)return;
  invalidate();const current=revision;
  const input={engine,text:$('input').value,source:$('source').value,target:$('target').value};
  const id=crypto.randomUUID();active=id;status(t("正在翻译…"));sync();
  try{
    const key=input.engine==='llm'?(await api.secrets.get('apiKey')||''):'';
    if(current!==revision)return;
    const request=buildRequest(input,config,key);
    const response=await api.network.request({id,...request});
    if(current!==revision)return;
    const result=parseResponse(input.engine,response);
    $('output').value=result.text;
    $('detected').textContent=result.detected?t("检测到：{{v0}}", {v0: LANGUAGES.find(([code])=>code===result.detected)?.[1]||result.detected}):'';
    status(t("翻译完成"));
  }catch(error){if(current===revision){status(error.message||t("翻译失败，请重试"),true);if(input.engine==='llm'&&!config.model)showSettings(true);}}
  finally{if(current===revision){active=null;sync();}}
}
for(const [code,label] of [['auto',t("自动检测")],...LANGUAGES])$('source').add(new Option(t(label),code));
for(const [code,label] of LANGUAGES)$('target').add(new Option(t(label),code));
$('target').value='zh-CN';
$('input').addEventListener('compositionstart',()=>{composing=true;invalidate(t("正在输入…"));});
$('input').addEventListener('compositionend',()=>{composing=false;invalidate();scheduleAuto();});
$('input').addEventListener('input',()=>{invalidate(engine==='llm'?t("文字已更新，点击开始翻译"):t("准备就绪"));scheduleAuto();});
for(const id of ['source','target'])$(id).addEventListener('change',()=>{invalidate();persistPreferences();scheduleAuto();});
for(const button of document.querySelectorAll('[data-engine]'))button.addEventListener('click',()=>{if(engine===button.dataset.engine)return;invalidate();selectEngine(button.dataset.engine);persistPreferences();scheduleAuto();});
$('translate').addEventListener('click',translate);
$('cancel').addEventListener('click',()=>invalidate(t("已取消翻译")));
$('clear-input').addEventListener('click',()=>{$('input').value='';invalidate();$('input').focus();});
$('copy').addEventListener('click',async()=>{try{await api.clipboard.writeText($('output').value);status(t("译文已复制"));}catch{status(t("复制失败，请重试"),true);}});
$('continue').addEventListener('click',async()=>{try{await api.results.publish({type:'text',text:$('output').value});}catch(error){status(error.message,true);}});
$('settings-toggle').addEventListener('click',()=>showSettings($('settings').hidden));
for(const id of ['base-url','model','api-key'])$(id).addEventListener('input',()=>{settingsDirty=true;invalidate(t("配置已修改，请保存后翻译"));settingStatus(t("修改尚未保存"));});
$('save-settings').addEventListener('click',async()=>{
  saving=true;sync();const controls=['save-settings','clear-key','base-url','model','api-key'];for(const id of controls)$(id).disabled=true;
  try{
    const next=validateConfig({baseUrl:$('base-url').value,model:$('model').value});
    const key=$('api-key').value.trim();
    invalidate();let saved={persistent:true};
    if(key)saved=await api.secrets.set('apiKey',key);
    await api.storage.set('llm',next);config=next;settingsDirty=false;$('api-key').value='';
    $('api-key').placeholder=t("留空保留已有 Key；本地服务可不填");selectEngine(engine);
    settingStatus(saved.persistent?t("设置已保存"):t("设置已保存；API Key 仅本次会话有效，关闭插件后需重新填写"));
  }catch(error){settingStatus(error.message||t("保存失败，请重试"),true);}finally{saving=false;for(const id of controls)$(id).disabled=false;sync();}
});
$('clear-key').addEventListener('click',async()=>{try{invalidate();await api.secrets.set('apiKey',null);$('api-key').value='';$('api-key').placeholder=t("本地免认证服务可留空");settingStatus(t("API Key 已清除"));}catch{settingStatus(t("清除失败，请重试"),true);}});
document.addEventListener('keydown',event=>{if(!event.isComposing&&!composing&&(event.metaKey||event.ctrlKey)&&event.key==='Enter'){event.preventDefault();if(!$('translate').disabled)void translate();}});
async function boot(){
  if(!api?.network||!api?.secrets){status(t("此插件需要 Nexlet 0.2.7 或更高版本，请先升级主程序"),true);return;}
  try{
    const [preferences,saved]=await Promise.all([api.storage.get('preferences'),api.storage.get('llm')]);
    if(saved){try{config=validateConfig(saved);}catch{settingStatus(t("原有配置无效，请重新填写"),true);}}
    if(preferences){if(LANGUAGES.some(([id])=>id===preferences.source)||preferences.source==='auto')$('source').value=preferences.source;if(LANGUAGES.some(([id])=>id===preferences.target))$('target').value=preferences.target;if(['google','llm'].includes(preferences.engine))engine=preferences.engine;}
    $('base-url').value=config.baseUrl;$('model').value=config.model;$('api-key').placeholder=t("留空保留已有 Key；本地服务可不填");selectEngine(engine);ready=true;sync();
    api.onEnter(async context=>{
      ready=true;composing=false;invalidate();const current=revision;
      if(context.type==='text' && context.payload){$('input').value=context.payload;status(t("文字已带入，点击开始翻译"));sync();scheduleAuto();}
      else {
        const draft=await api.session?.read();if(current!==revision)return;
        if(draft){$('input').value=typeof draft.input==='string'?draft.input:'';$('output').value=typeof draft.output==='string'?draft.output:'';
          if(typeof draft.source==='string')$('source').value=draft.source;if(typeof draft.target==='string')$('target').value=draft.target;
          if(['google','llm'].includes(draft.engine))selectEngine(draft.engine);
          $('input').scrollTop=Number(draft.inputScroll)||0;$('output').scrollTop=Number(draft.outputScroll)||0;
        }
        sync();
      }
      $('input').focus();
    });
    api.onOut(async()=>{
      const draft={input:$('input').value,output:$('output').value,source:$('source').value,target:$('target').value,engine,inputScroll:$('input').scrollTop,outputScroll:$('output').scrollTop};
      ready=false;invalidate();await api.session?.save(draft);
    });
  }catch{status(t("读取配置失败，请关闭插件后重试"),true);}
}
onLanguageChange(() => {
  for (const id of ['source','target']) {
    const select=$(id), value=select.value;
    select.replaceChildren(...(id==='source'?[['auto','自动检测'],...LANGUAGES]:LANGUAGES).map(([code,label])=>new Option(t(label),code)));
    select.value=value;
  }
  selectEngine(engine);
});
void startLanguage().then(boot);
