import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { lstat, realpath, link, unlink, mkdir, readFile, open, rename, readdir } from 'node:fs/promises';
import path from 'node:path';
export interface RenameRule { find:string; replace:string; prefix:string; suffix:string; number:boolean; start:number; digits:number; template?:string }
interface Fingerprint {dev:string;ino:string;size:number;mtime:string;hash:string}
export interface RenameEntry {from:string;to:string;temp:string;identity:Fingerprint}
export interface RenamePlan {id:string;createdAt:number;state:'preview'|'running'|'done'|'partial'|'undone';entries:RenameEntry[];error?:string}
const canonical=(value:string)=>process.platform==='win32'?value.toLowerCase():value;
const exists=async(file:string)=>{try{await lstat(file);return true;}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return false;throw error;}};
function name(value:string){if(!value||value.length>240||/[<>:"/\\|?*\u0000-\u001f]/.test(value)||/[. ]$/.test(value)||value==='.'||value==='..'||/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(value))throw new Error('目标文件名无效：'+value);return value;}
async function fingerprint(file:string,signal?:AbortSignal):Promise<Fingerprint>{
 const before=await lstat(file,{bigint:true});if(!before.isFile()||before.isSymbolicLink())throw new Error('仅支持普通文件：'+file);if(before.size>256n*1024n*1024n)throw new Error('单个文件超过 256 MiB');
 const hash=createHash('sha256'),stream=createReadStream(file);const abort=()=>stream.destroy(new Error('已取消'));signal?.addEventListener('abort',abort,{once:true});
 try{signal?.throwIfAborted();for await(const chunk of stream){signal?.throwIfAborted();hash.update(chunk);}}finally{signal?.removeEventListener('abort',abort);stream.destroy();}
 const after=await lstat(file,{bigint:true});if(before.dev!==after.dev||before.ino!==after.ino||before.size!==after.size||before.mtimeNs!==after.mtimeNs)throw new Error('文件在检查期间发生变化：'+file);
 return{dev:String(after.dev),ino:String(after.ino),size:Number(after.size),mtime:String(after.mtimeNs),hash:hash.digest('hex')};
}
function same(a:Fingerprint,b:Fingerprint){return a.dev===b.dev&&a.ino===b.ino&&a.size===b.size&&a.mtime===b.mtime&&a.hash===b.hash;}
export async function createPlan(mappings:{from:string;to:string}[],signal:AbortSignal):Promise<RenamePlan>{
 if(!mappings.length||mappings.length>500)throw new Error('请选择 1–500 个文件');const id=randomUUID(),entries:RenameEntry[]=[],sources=new Set<string>(),targets=new Set<string>(),identities=new Set<string>();let total=0;
 for(let index=0;index<mappings.length;index++){
  signal.throwIfAborted();const mapping=mappings[index];if(!path.isAbsolute(mapping.from)||!path.isAbsolute(mapping.to))throw new Error('文件路径必须为绝对路径');
  const parent=await realpath(path.dirname(mapping.from)),from=path.join(parent,path.basename(mapping.from)),to=path.join(parent,name(path.basename(mapping.to)));
  if(canonical(await realpath(path.dirname(mapping.to)))!==canonical(parent))throw new Error('只能在原目录中重命名');
  if(sources.has(canonical(from))||targets.has(canonical(to)))throw new Error('文件重复或目标名称冲突');sources.add(canonical(from));targets.add(canonical(to));
  const identity=await fingerprint(from,signal),identityKey=identity.dev+':'+identity.ino;if(identities.has(identityKey))throw new Error('所选文件包含同一文件的硬链接，请分开处理');identities.add(identityKey);total+=identity.size;if(total>1024*1024*1024)throw new Error('文件总大小超过 1 GiB');
  if(from!==to)entries.push({from,to,temp:path.join(parent,`.nexlet-rename-${id}-${index}.tmp`),identity});
 }
 for(const entry of entries)if(await exists(entry.to)&&!sources.has(canonical(entry.to)))throw new Error('目标已存在：'+entry.to);
 return{id,createdAt:Date.now(),state:'preview',entries};
}
export async function previewRename(files:string[],rule:RenameRule,signal:AbortSignal){
 if(!rule||!['find','replace','prefix','suffix'].every(key=>typeof rule[key as keyof RenameRule]==='string'&&String(rule[key as keyof RenameRule]).length<=200)||!Number.isInteger(rule.start)||rule.start<0||rule.start>1e9||!Number.isInteger(rule.digits)||rule.digits<1||rule.digits>12||(rule.template!==undefined&&(typeof rule.template!=='string'||rule.template.length>240)))throw new Error('重命名规则无效');
 return createPlan(files.map((from,index)=>{const parsed=path.parse(from),base=rule.find?parsed.name.replaceAll(rule.find,rule.replace):parsed.name,n=String(rule.start+index).padStart(rule.digits,'0');const next=rule.template?rule.template.replaceAll('{name}',base).replaceAll('{n}',n).replaceAll('{ext}',parsed.ext):rule.prefix+base+(rule.number?n:'')+rule.suffix+parsed.ext;return{from,to:path.join(parsed.dir,name(next))};}),signal);
}
export class RenameJournal {
 private directory:string;
 constructor(directory:string){this.directory=directory;}
 private file(id:string){if(!/^[a-f0-9-]{36}$/.test(id))throw new Error('操作 ID 无效');return path.join(this.directory,id+'.json');}
 async save(plan:RenamePlan){await mkdir(this.directory,{recursive:true});const target=this.file(plan.id),temporary=target+'.writing',handle=await open(temporary,'w',0o600);try{await handle.writeFile(JSON.stringify(plan));await handle.sync();}finally{await handle.close();}await rename(temporary,target);}
 async get(id:string):Promise<RenamePlan>{const bytes=await readFile(this.file(id));if(bytes.length>2*1024*1024)throw new Error('操作日志过大');const plan=JSON.parse(bytes.toString()) as RenamePlan;if(plan.id!==id||!Array.isArray(plan.entries)||plan.entries.length>500)throw new Error('操作日志无效');return plan;}
 async list(){await mkdir(this.directory,{recursive:true});const names=(await readdir(this.directory)).filter(file=>/^[a-f0-9-]{36}\.json$/.test(file));const plans=[];for(const file of names){try{plans.push(await this.get(file.slice(0,-5)));}catch{/* A damaged journal remains on disk for manual recovery. */}}return plans.sort((a,b)=>b.createdAt-a.createdAt).slice(0,30);}
}
async function assertIdentity(file:string,expected:Fingerprint,signal?:AbortSignal){if(!same(await fingerprint(file,signal),expected))throw new Error('文件已被外部修改，拒绝移动：'+file);}
/** Hard-link then unlink implements a no-replace move, including cycles and case-only renames. */
async function moveNoReplace(from:string,to:string,identity:Fingerprint,signal?:AbortSignal){
 signal?.throwIfAborted();await assertIdentity(from,identity,signal);await link(from,to);
 try{await assertIdentity(from,identity);await unlink(from);}catch(error){throw new Error(`移动未完成，操作日志可恢复：${from} → ${to}；${error instanceof Error?error.message:String(error)}`);}
}
export async function executeRename(plan:RenamePlan,journal:RenameJournal,signal:AbortSignal,progress:(value:unknown)=>void=()=>{}){
 if(plan.state!=='preview')throw new Error('此预览已执行，请重新预览');
 const sources=new Set(plan.entries.map(entry=>canonical(entry.from)));
 for(const entry of plan.entries){signal.throwIfAborted();await assertIdentity(entry.from,entry.identity,signal);if(await exists(entry.temp))throw new Error('临时路径已存在');if(await exists(entry.to)&&!sources.has(canonical(entry.to)))throw new Error('目标已存在：'+entry.to);}
 plan.state='running';await journal.save(plan);
 try{
  for(let i=0;i<plan.entries.length;i++){const e=plan.entries[i];await moveNoReplace(e.from,e.temp,e.identity,signal);progress({stage:'staging',done:i+1,total:plan.entries.length});}
  for(let i=0;i<plan.entries.length;i++){const e=plan.entries[i];await moveNoReplace(e.temp,e.to,e.identity,signal);progress({stage:'renaming',done:i+1,total:plan.entries.length});}
  plan.state='done';delete plan.error;await journal.save(plan);return plan;
 }catch(error){plan.state='partial';plan.error=error instanceof Error?error.message:String(error);await journal.save(plan);throw error;}
}
export async function undoRename(plan:RenamePlan,journal:RenameJournal,signal:AbortSignal){
 if(!['running','partial','done'].includes(plan.state))throw new Error('此操作无需恢复');
 // Locate every file by identity before making changes. Never overwrite external edits.
 const locations=new Map<RenameEntry,string[]>();
 for(const entry of plan.entries){signal.throwIfAborted();const found:string[]=[];for(const file of [...new Set([entry.from,entry.temp,entry.to])])if(await exists(file)){const actual=await fingerprint(file,signal);if(same(actual,entry.identity))found.push(file);}if(!found.length)throw new Error('无法找到未修改的文件，停止恢复：'+entry.from);locations.set(entry,found);}
 const originals=new Set(plan.entries.map(e=>canonical(e.from)));
 for(const entry of plan.entries)if(await exists(entry.from)){const info=await fingerprint(entry.from,signal);if(!plan.entries.some(e=>same(info,e.identity)))throw new Error('原名称已被其他文件占用：'+entry.from);}
 try{
  for(const entry of plan.entries){signal.throwIfAborted();const found=locations.get(entry)!;
   if(!found.includes(entry.temp)){if(await exists(entry.temp))throw new Error('恢复临时路径被占用');await moveNoReplace(found[0],entry.temp,entry.identity,signal);}
   for(const file of found)if(file!==entry.temp&&await exists(file)){await assertIdentity(file,entry.identity,signal);await unlink(file);}
  }
  for(const entry of plan.entries){if(!originals.has(canonical(entry.from)))throw new Error('恢复目标无效');await moveNoReplace(entry.temp,entry.from,entry.identity,signal);}
  plan.state='undone';delete plan.error;await journal.save(plan);return plan;
 }catch(error){plan.state='partial';plan.error=error instanceof Error?error.message:String(error);await journal.save(plan);throw error;}
}
