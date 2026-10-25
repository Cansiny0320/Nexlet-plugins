import { tr, startWorkbenchLanguage } from './workbench-i18n';
export interface WorkFile { name:string; path?:string; bytes?:Uint8Array }
export const element=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
export const fileName=(file:string)=>file.split(/[\\/]/).at(-1)||'file';
export const stem=(name:string)=>name.replace(/\.[^.]+$/,'').replace(/[<>:"/\\|?*\u0000-\u001f]/g,'_').slice(0,120)||'file';
export async function bytes(file:WorkFile):Promise<Uint8Array>{if(file.bytes)return file.bytes;if(file.path)return nexlet.files.read(file.path);throw new Error(tr('文件不可用'));}
export async function chooseFiles(extensions:string[]):Promise<WorkFile[]>{const picked=await nexlet.dialogs.open({multiple:true,filters:[{name:'Files',extensions}]});return picked.canceled?[]:picked.filePaths.map(path=>({path,name:fileName(path)}));}
export async function contextFiles(context:Parameters<Parameters<typeof nexlet.onEnter>[0]>[0]):Promise<WorkFile[]>{
  if(context.type==='text')return[];
  const resources=context.type==='files'?context.payload:[context.payload];
  if(resources.length>100)throw new Error(tr('最多接收 100 个文件'));
  const output:WorkFile[]=[];
  for(const resource of resources){if(resource.isDirectory)continue;if(!resource.path&&resource.size>16*1024*1024)throw new Error(tr('单个文件不能超过 16 MiB'));output.push(resource.path?{name:resource.name,path:resource.path}:{name:resource.name,bytes:await nexlet.input.read(resource.id)});}
  return output;
}
export async function outputDirectory(name:string):Promise<string|null>{const pick=await nexlet.dialogs.open({directory:true});if(pick.canceled||!pick.filePaths[0])return null;const path=pick.filePaths[0].replace(/[\\/]$/,'')+'/'+name+'-'+Date.now()+'-'+crypto.randomUUID().slice(0,6);await nexlet.files.mkdir(path);return path;}
export function renderFiles(files:WorkFile[],changed:()=>void){const list=element('files');list.replaceChildren(...files.map((file,index)=>{const row=document.createElement('li'),name=document.createElement('span');name.textContent=file.name;row.append(name);for(const [label,delta]of [['↑',-1],['↓',1]]as const){const button=document.createElement('button');button.textContent=label;button.setAttribute('aria-label',label==='↑'?tr('上移'):tr('下移'));button.disabled=index+delta<0||index+delta>=files.length;button.onclick=()=>{[files[index],files[index+delta]]=[files[index+delta],files[index]];renderFiles(files,changed);changed();};row.append(button);}const remove=document.createElement('button');remove.textContent='×';remove.setAttribute('aria-label',tr('移除'));remove.onclick=()=>{files.splice(index,1);renderFiles(files,changed);changed();};row.append(remove);return row;}));}
export function showError(error:unknown){element('status').textContent=tr(error instanceof Error?error.message:String(error));element('status').dataset.error='true';}
export function showStatus(text:string){element('status').textContent=tr(text);element('status').dataset.error='false';}

startWorkbenchLanguage();
