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
function fileIcon(path:string){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');for(const [key,value]of Object.entries({viewBox:'0 0 24 24',width:'18',height:'18',fill:'none',stroke:'currentColor','stroke-width':'1.6','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true'}))svg.setAttribute(key,value);const shape=document.createElementNS(svg.namespaceURI,'path');shape.setAttribute('d',path);svg.append(shape);return svg;}
export function renderFiles(files:WorkFile[],changed:()=>void){const list=element('files');list.replaceChildren(...files.map((file,index)=>{const row=document.createElement('li'),name=document.createElement('span'),icon=fileIcon('M14 3H6v18h12V7Zm0 0v5h4M9 12h6M9 16h6');icon.classList.add('file-icon');icon.dataset.kind=/\.pdf$/i.test(file.name)?'pdf':/\.(png|jpe?g|webp|gif|avif)$/i.test(file.name)?'image':'file';name.textContent=file.name;row.append(icon,name);for(const [label,delta]of [['上移',-1],['下移',1]]as const){const button=document.createElement('button');button.append(fileIcon(delta===-1?'M12 20V4M5 11l7-7 7 7':'M12 4v16M5 13l7 7 7-7'));button.setAttribute('aria-label',tr(label));button.title=tr(label);button.disabled=index+delta<0||index+delta>=files.length;button.onclick=()=>{[files[index],files[index+delta]]=[files[index+delta],files[index]];renderFiles(files,changed);changed();};row.append(button);}const remove=document.createElement('button');remove.append(fileIcon('M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7'));remove.setAttribute('aria-label',tr('移除'));remove.title=tr('移除');remove.onclick=()=>{files.splice(index,1);renderFiles(files,changed);changed();};row.append(remove);return row;}));}
export function showError(error:unknown){element('status').textContent=tr(error instanceof Error?error.message:String(error));element('status').dataset.error='true';}
export function showStatus(text:string){element('status').textContent=tr(text);element('status').dataset.error='false';}

startWorkbenchLanguage();
