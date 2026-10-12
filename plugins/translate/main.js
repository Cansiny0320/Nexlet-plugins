import {LANGUAGES,MAX_CHARS,buildRequest,parseResponse,validateConfig} from './translation.js';
const $ = id => document.getElementById(id);
const api = window.nexlet;
let engine='google',config={baseUrl:'https://api.openai.com/v1',model:''},revision=0,active=null,ready=false,settingsDirty=false,saving=false,saveQueue=Promise.resolve();
function status(message,error=false){$('status').textContent=message;$('status').dataset.error=String(error);}
function settingStatus(message,error=false){$('settings-status').textContent=message;$('settings-status').dataset.error=String(error);}
function sync(){
  const count=[...$('input').value].length;
  $('count').textContent=`${count} / ${MAX_CHARS}`;$('count').dataset.error=String(count>MAX_CHARS);
  $('translate').disabled=!ready||!!active||saving||(engine==='llm'&&settingsDirty)||!$('input').value.trim()||count>MAX_CHARS;
  $('cancel').hidden=!active;$('copy').disabled=!$('output').value;
  $('translate').firstChild.textContent=active?'翻译中… ':'开始翻译 ';
}
function invalidate(message='准备就绪'){
  revision++;
  const previous=active;active=null;
  if(previous)void api.network.cancel(previous).catch(()=>{});
  $('output').value='';$('detected').textContent='';status(message);sync();
}
function persistPreferences(){
  const value={engine,source:$('source').value,target:$('target').value};
  saveQueue=saveQueue.catch(()=>{}).then(()=>api.storage.set('preferences',value)).catch(()=>status('偏好保存失败，下次打开需要重新选择',true));
}
function selectEngine(value){
  engine=value;
  for(const button of document.querySelectorAll('[data-engine]'))button.setAttribute('aria-pressed',String(button.dataset.engine===engine));
  $('engine-note').textContent=engine==='google'?'Google 网页接口':(config.model||'请先配置模型');
  sync();
}
function showSettings(visible){$('settings').hidden=!visible;$('settings-toggle').setAttribute('aria-expanded',String(visible));}
async function translate(){
  if(!ready||active)return;
  invalidate();const current=revision;
  const input={engine,text:$('input').value,source:$('source').value,target:$('target').value};
  const id=crypto.randomUUID();active=id;status('正在翻译…');sync();
  try{
    const key=input.engine==='llm'?(await api.secrets.get('apiKey')||''):'';
    if(current!==revision)return;
    const request=buildRequest(input,config,key);
    const response=await api.network.request({id,...request});
    if(current!==revision)return;
    const result=parseResponse(input.engine,response);
    $('output').value=result.text;
    $('detected').textContent=result.detected?`检测到：${LANGUAGES.find(([code])=>code===result.detected)?.[1]||result.detected}`:'';
    status('翻译完成');
  }catch(error){if(current===revision){status(error.message||'翻译失败，请重试',true);if(input.engine==='llm'&&!config.model)showSettings(true);}}
  finally{if(current===revision){active=null;sync();}}
}
for(const [code,label] of [['auto','自动检测'],...LANGUAGES])$('source').add(new Option(label,code));
for(const [code,label] of LANGUAGES)$('target').add(new Option(label,code));
$('target').value='zh-CN';
$('input').addEventListener('input',()=>invalidate('文字已更新，点击开始翻译'));
for(const id of ['source','target'])$(id).addEventListener('change',()=>{invalidate();persistPreferences();});
for(const button of document.querySelectorAll('[data-engine]'))button.addEventListener('click',()=>{if(engine===button.dataset.engine)return;invalidate();selectEngine(button.dataset.engine);persistPreferences();});
$('translate').addEventListener('click',translate);
$('cancel').addEventListener('click',()=>invalidate('已取消翻译'));
$('clear-input').addEventListener('click',()=>{$('input').value='';invalidate();$('input').focus();});
$('copy').addEventListener('click',async()=>{try{await api.clipboard.writeText($('output').value);status('译文已复制');}catch{status('复制失败，请重试',true);}});
$('settings-toggle').addEventListener('click',()=>showSettings($('settings').hidden));
for(const id of ['base-url','model','api-key'])$(id).addEventListener('input',()=>{settingsDirty=true;invalidate('配置已修改，请保存后翻译');settingStatus('修改尚未保存');});
$('save-settings').addEventListener('click',async()=>{
  saving=true;sync();const controls=['save-settings','clear-key','base-url','model','api-key'];for(const id of controls)$(id).disabled=true;
  try{
    const next=validateConfig({baseUrl:$('base-url').value,model:$('model').value});
    const key=$('api-key').value.trim();
    invalidate();let saved={persistent:true};
    if(key)saved=await api.secrets.set('apiKey',key);
    await api.storage.set('llm',next);config=next;settingsDirty=false;$('api-key').value='';
    $('api-key').placeholder='留空保留已有 Key；本地服务可不填';selectEngine(engine);
    settingStatus(saved.persistent?'设置已保存':'设置已保存；API Key 仅本次会话有效，关闭插件后需重新填写');
  }catch(error){settingStatus(error.message||'保存失败，请重试',true);}finally{saving=false;for(const id of controls)$(id).disabled=false;sync();}
});
$('clear-key').addEventListener('click',async()=>{try{invalidate();await api.secrets.set('apiKey',null);$('api-key').value='';$('api-key').placeholder='本地免认证服务可留空';settingStatus('API Key 已清除');}catch{settingStatus('清除失败，请重试',true);}});
$('reset-permissions').addEventListener('click',async()=>{try{invalidate();await api.network.resetPermissions();settingStatus('联网授权已重置，下次翻译会重新确认地址');}catch{settingStatus('重置失败，请重试',true);}});
document.addEventListener('keydown',event=>{if((event.metaKey||event.ctrlKey)&&event.key==='Enter'){event.preventDefault();if(!$('translate').disabled)void translate();}});
async function boot(){
  if(!api?.network||!api?.secrets){status('此插件需要 Nexlet 0.2.7 或更高版本，请先升级主程序',true);return;}
  try{
    const [preferences,saved]=await Promise.all([api.storage.get('preferences'),api.storage.get('llm')]);
    if(saved){try{config=validateConfig(saved);}catch{settingStatus('原有配置无效，请重新填写',true);}}
    if(preferences){if(LANGUAGES.some(([id])=>id===preferences.source)||preferences.source==='auto')$('source').value=preferences.source;if(LANGUAGES.some(([id])=>id===preferences.target))$('target').value=preferences.target;if(['google','llm'].includes(preferences.engine))engine=preferences.engine;}
    $('base-url').value=config.baseUrl;$('model').value=config.model;$('api-key').placeholder='留空保留已有 Key；本地服务可不填';selectEngine(engine);ready=true;sync();
    api.onEnter(context=>{invalidate();if(context.type==='text'){$('input').value=context.payload;status(context.payload?'文字已带入，点击开始翻译':'准备就绪');}sync();$('input').focus();});
    api.onOut(()=>{revision++;active=null;});
  }catch{status('读取配置失败，请关闭插件后重试',true);}
}
void boot();
