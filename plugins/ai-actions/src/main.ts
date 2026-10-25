import { presets, validateAction, buildActionRequest, keyForEndpoint, type Action } from './actions';
import { t, languageSetup } from './i18n';
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const field = (id: string) => $<HTMLInputElement>(id);
const input = $<HTMLTextAreaElement>('input'), output = $<HTMLTextAreaElement>('output');
let actions: Action[] = [], selected = '', active = '', generation = 0, dirty = false, ready = false;
let lastStatus = 'ready';
let shared = true, sharedModel = '';
const modelPicker = document.createElement('select');
modelPicker.id = 'shared-model'; modelPicker.setAttribute('aria-label', '共享 AI 模型');
modelPicker.add(new Option(t('使用设置中的默认模型'), ''));
const sourcePicker = document.createElement('select'); sourcePicker.setAttribute('aria-label', '模型配置来源');
sourcePicker.add(new Option(t('共享模型'), 'shared')); sourcePicker.add(new Option(t('此插件的旧配置'), 'private'));
document.querySelector('aside')!.prepend(sourcePicker, modelPicker);
sourcePicker.onchange = () => { stop(); shared = sourcePicker.value === 'shared'; modelPicker.hidden = !shared; void nexlet.storage.set('shared-model', { enabled: shared, value: sharedModel }); };
modelPicker.onchange = () => { stop(); sharedModel = modelPicker.value; void nexlet.storage.set('shared-model', { enabled: shared, value: sharedModel }); };
function status(message: string, error = false) { lastStatus = message; $('status').textContent = t(message); $('status').dataset.error = String(error); }
function controls() {
  for (const id of ['copy','paste','continue']) $<HTMLButtonElement>(id).disabled = !output.value || (id === 'continue' && !nexlet.results);
  $<HTMLButtonElement>('run').disabled = !ready || !!active || dirty || !input.value.trim();
  $<HTMLButtonElement>('save').disabled = !!active;
  $('stop').hidden = !active;
  $<HTMLButtonElement>('remove').disabled = !!active || !actions.some(action => action.id === selected);
}
function list() {
  $('list').replaceChildren(...actions.map(action => {
    const button = document.createElement('button');
    const preset = presets.find(item => item.id === action.id && item.name === action.name);
    button.textContent = preset ? t(preset.id) : action.name;
    button.className = action.id === selected ? 'selected' : '';
    button.onclick = () => choose(action); return button;
  }));
}
function stop() { generation++; if(active)void nexlet.tasks.cancel(active).catch(()=>{}); active=''; controls(); }
function choose(action: Action) {
  stop(); selected=action.id;
  for(const key of ['name','prompt','model','baseUrl'] as const)field(key).value=action[key];
  field('apiKey').value=''; dirty=false; list(); controls();
}
function draft(): Action { return validateAction({id:selected,...Object.fromEntries(['name','prompt','model','baseUrl'].map(key=>[key,field(key).value]))}); }
async function run() {
  if(dirty){status('unsaved',true);return;}
  stop(); const current=generation;
  try {
    const action=draft();
    active=crypto.randomUUID(); const id=active; output.value='';status('running');controls();
    if (shared) {
      if (!input.value.trim() || input.value.length > 100000) throw Error('invalidInput');
      const split = sharedModel.indexOf(':');
      const result = await nexlet.ai.generate({ id, timeoutMs: 120000, request: {
        ...(split < 0 ? {} : { providerId: sharedModel.slice(0, split), model: sharedModel.slice(split + 1) }),
        messages: [{ role: 'system', content: action.prompt }, { role: 'user', content: input.value }],
      } });
      if (current === generation) { output.value = result.text; status('complete'); }
      return;
    }
    const request=buildActionRequest(action,input.value);
    const key=await nexlet.secrets.get(await keyForEndpoint(action.baseUrl));
    if(current!==generation)return;
    await nexlet.ai.configure({baseUrl:action.baseUrl,apiKey:key});
    if(current!==generation)return;
    const result=await nexlet.ai.chat({id,timeoutMs:120000,stream:true,request});
    if(current!==generation)return;
    output.value=result.content;status('complete');
  } catch(error){if(current===generation){ const message=error instanceof Error?error.message:String(error); if(message==='missingModel') document.querySelector('details')!.open=true; status(message,true); }}
  finally {if(current===generation){active='';controls();}}
}
nexlet.ai.onEvent(({ id, event }) => {
  if (id !== active || event.type !== 'text') return;
  output.value += event.delta; output.scrollTop = output.scrollHeight; controls();
});
nexlet.ai.onChunk(event=>{
  if(event.id!==active)return;
  const chunk=event.chunk as {choices?:{delta?:{content?:unknown}}[]};
  const value=chunk.choices?.[0]?.delta?.content;
  if(typeof value==='string'){
    if(output.value.length+value.length>500000){stop();status('invalidInput',true);return;}
    output.value+=value;output.scrollTop=output.scrollHeight;controls();
  }
});
for(const id of ['name','prompt','model','baseUrl','apiKey'])field(id).oninput=()=>{stop();dirty=true;status('unsaved');controls();};
input.oninput=()=>{stop();output.value='';status('ready');controls();};
$('new').onclick=()=>{choose({id:crypto.randomUUID(),name:'',prompt:'',model:field('model').value,baseUrl:field('baseUrl').value||'https://api.openai.com/v1'});dirty=true;controls();field('name').focus();};
$('save').onclick=()=>{void (async()=>{
  const action=draft();
  if(!actions.some(item=>item.id===action.id)&&actions.length>=100)throw Error('limit');
  let persistent=true;
  const key=field('apiKey').value.trim();
  if(key)persistent=(await nexlet.secrets.set(await keyForEndpoint(action.baseUrl),key)).persistent;
  const next=actions.some(item=>item.id===action.id)?actions.map(item=>item.id===action.id?action:item):[...actions,action];
  await nexlet.storage.set('actions',JSON.parse(JSON.stringify(next)));actions=next;choose(action);status(persistent?'saved':'keySession');
})().catch(error=>status(error.message,true));};
$('remove').onclick=()=>{void(async()=>{const next=actions.filter(item=>item.id!==selected);await nexlet.storage.set('actions',JSON.parse(JSON.stringify(next)));actions=next;choose(actions[0]||{...presets[0],id:crypto.randomUUID()});status('deleted');})().catch(error=>status(error.message,true));};
$('clearKey').onclick=()=>{void(async()=>{await nexlet.secrets.set(await keyForEndpoint(field('baseUrl').value),null);field('apiKey').value='';status('cleared');})().catch(error=>status(error.message,true));};
$('run').onclick=()=>{void run();};$('stop').onclick=()=>{stop();status('stopped');};
$('copy').onclick=()=>{void nexlet.clipboard.writeText(output.value).then(()=>status('copied')).catch(error=>status(error.message,true));};
$('paste').onclick=()=>{void nexlet.clipboard.writeText(output.value).then(()=>nexlet.input.paste()).catch(error=>status(error.message,true));};
$('continue').onclick=()=>{void nexlet.results.publish({type:'text',text:output.value}).catch(error=>status(error.message,true));};
document.addEventListener('keydown',event=>{if(!event.isComposing&&event.keyCode!==229&&(event.ctrlKey||event.metaKey)&&event.key==='Enter'){event.preventDefault();if(!$<HTMLButtonElement>('run').disabled)void run();}});
nexlet.onOut(async()=>{
  const state={selected,input:input.value,output:output.value,inputScroll:input.scrollTop,outputScroll:output.scrollTop,dirty,fields:Object.fromEntries(['name','prompt','model','baseUrl'].map(key=>[key,field(key).value])),optionsOpen:document.querySelector('details')!.open};
  stop();ready=false;await nexlet.session?.save(state);
});
nexlet.onEnter(async context=>{
  stop();const current=generation;
  try{
    const saved=await nexlet.storage.get('actions');
    const preference = await nexlet.storage.get('shared-model') as { enabled?: boolean; value?: string } | null;
    shared = preference ? preference.enabled !== false : !Array.isArray(saved);
    sharedModel = typeof preference?.value === 'string' ? preference.value : '';
    const catalog = await nexlet.ai.sharedModels();
    modelPicker.replaceChildren(new Option(t('使用设置中的默认模型'), ''), ...catalog.providers.flatMap(provider => provider.models.map(model => new Option(provider.name + ' / ' + model, provider.id + ':' + model))));
    if (sharedModel && ![...modelPicker.options].some(option => option.value === sharedModel)) modelPicker.add(new Option(t('已选模型不可用'), sharedModel));
    modelPicker.value = sharedModel; modelPicker.hidden = !shared; sourcePicker.value = shared ? 'shared' : 'private';
    actions=Array.isArray(saved)?saved.map(validateAction):structuredClone(presets);
    const state=await nexlet.session?.read();
    if(current!==generation)return;
    choose(actions.find(action=>action.id===state?.selected)||actions[0]||{...presets[0],id:crypto.randomUUID()});
    if(context.type==='text'&&context.payload){input.value=context.payload;output.value='';}
    else if(state){input.value=typeof state.input==='string'?state.input:'';output.value=typeof state.output==='string'?state.output:'';input.scrollTop=Number(state.inputScroll)||0;output.scrollTop=Number(state.outputScroll)||0;}
    if(state?.dirty && !(context.type==='text'&&context.payload) && state.fields && typeof state.fields==='object'){ for(const key of ['name','prompt','model','baseUrl']) { const value=(state.fields as Record<string,unknown>)[key];if(typeof value==='string')field(key).value=value; } selected=typeof state.selected==='string'?state.selected:selected;dirty=true; }
    document.querySelector('details')!.open=state?.optionsOpen===true;
    ready=true;status(dirty?'unsaved':'ready');controls();
  }catch(error){status(error instanceof Error?error.message:String(error),true);}
});
function sharedLabels(){
 modelPicker.setAttribute('aria-label',t('共享 AI 模型'));
 modelPicker.options[0].textContent=t('使用设置中的默认模型');
 sourcePicker.options[0].textContent=t('共享模型');sourcePicker.options[1].textContent=t('此插件的旧配置');
}
void languageSetup(()=>{list();status(lastStatus);sharedLabels();});controls();
