import { tr } from '../../../shared/workbench-i18n';
import '../../../shared/workbench.css';
import {element,chooseFiles,contextFiles,renderFiles,showError,showStatus,type WorkFile} from '../../../shared/workbench';
interface Plan{id:string;createdAt:number;state:string;error?:string;entries:{from:string;to:string}[]}
const field=(id:string)=>element<HTMLInputElement>(id);let files:WorkFile[]=[],plan:Plan|null=null,active='';
function controls(){for(const node of document.querySelectorAll<HTMLInputElement|HTMLButtonElement>('input,select,button'))if(node.id!=='cancel')node.disabled=!!active; element<HTMLButtonElement>('execute').disabled=!!active||!plan?.entries.length||plan.state!=='preview';element('cancel').hidden=!active;element('files').inert=!!active;}
function invalidate(){plan=null;element('preview-rows').replaceChildren();controls();}
for(const node of document.querySelectorAll('input'))node.addEventListener('input',invalidate);
async function call(method:string,args:Record<string,unknown>={}):Promise<unknown>{if(active)throw new Error(tr('操作正在进行'));active=crypto.randomUUID();controls();try{return await nexlet.backend.call({id:active,method,args:args as never,timeoutMs:120000});}finally{active='';controls();}}
async function history(){const plans=await call('history')as Plan[];element('history').replaceChildren(...plans.filter(p=>p.state!=='preview').map(item=>{const row=document.createElement('div'),text=document.createElement('p');text.textContent=tr(`${new Date(item.createdAt).toLocaleString()} · ${item.entries.length} 个文件 · ${item.state}${item.error?' · '+item.error:''}`);row.append(text);if(['done','running','partial'].includes(item.state)){const button=document.createElement('button');button.textContent=item.state==='done'?tr('撤销'):tr('恢复原名');button.onclick=()=>void(async()=>{await call('undo',{id:item.id});invalidate();showStatus(tr('已恢复原名称'));await history();})().catch(showError);row.append(button);}return row;}));}
element('add').onclick=()=>void chooseFiles(['*']).then(next=>{files.push(...next);files=files.slice(0,100);renderFiles(files,invalidate);invalidate();}).catch(showError);
element('preview').onclick=()=>void(async()=>{
 if(!files.length||files.some(file=>!file.path))throw new Error(tr('请选择具有本地路径的文件'));
 const rule={find:field('find').value,replace:field('replace').value,prefix:field('prefix').value,suffix:field('suffix').value,number:field('number').checked,start:Number(field('start').value),digits:Number(field('digits').value),template:field('template').value||undefined};
 plan=await call('preview',{files:files.map(file=>file.path!),rule})as Plan;
 element('preview-rows').replaceChildren(...plan.entries.map(entry=>{const row=document.createElement('tr');for(const value of[entry.from,entry.to]){const cell=document.createElement('td');cell.textContent=value;row.append(cell);}return row;}));showStatus(plan.entries.length?tr(`预览通过，${plan.entries.length} 个文件将被重命名`):tr('没有需要更改的文件名'));controls();
})().catch(showError);
element('execute').onclick=()=>void(async()=>{if(!plan)return;const saved=await call('execute',{id:plan.id})as Plan;plan=saved;files=saved.entries.map(entry=>({path:entry.to,name:entry.to.split(/[\\/]/).at(-1)!}));renderFiles(files,invalidate);showStatus(tr(`已重命名 ${saved.entries.length} 个文件`));controls();await history();})().catch(async error=>{plan=null;controls();showError(error);try{await history();}catch{}});
element('cancel').onclick=()=>{if(active)void nexlet.tasks.cancel(active).catch(showError);};element('refresh-history').onclick=()=>void history().catch(showError);
nexlet.tasks.onProgress(({id,value})=>{if(id===active){const v=value as {stage:string;done:number;total:number};showStatus(`${v.stage==='staging'?tr('准备'):tr('重命名')} ${v.done}/${v.total}`);}});
nexlet.onEnter(async context=>{try{const next=await contextFiles(context);if(next.length){files=next;renderFiles(files,invalidate);invalidate();}await history();}catch(error){showError(error);}});nexlet.onOut(()=>{if(active)void nexlet.tasks.cancel(active);});controls();
