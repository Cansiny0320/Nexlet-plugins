import path from 'node:path';
import type { BackendHandlers } from '@nexlet/plugin-api';
import { previewRename, executeRename, undoRename, RenameJournal, type RenameRule, type RenamePlan } from './rename';
let busy=false;
const summary=(plan:RenamePlan)=>({id:plan.id,createdAt:plan.createdAt,state:plan.state,error:plan.error,entries:plan.entries.map(({from,to})=>({from,to}))});
async function exclusive<T>(run:()=>Promise<T>){if(busy)throw new Error('另一个重命名操作正在进行');busy=true;try{return await run();}finally{busy=false;}}
export const handlers={
 preview(args,context){return exclusive(async()=>{const {files,rule}=args as {files:string[];rule:RenameRule};if(!Array.isArray(files)||files.some(file=>typeof file!=='string'))throw new Error('文件列表无效');const plan=await previewRename(files,rule,context.signal);await new RenameJournal(path.join(context.dataDirectory,'journal')).save(plan);return summary(plan);});},
 execute(args,context){return exclusive(async()=>{const {id}=args as {id:string};const journal=new RenameJournal(path.join(context.dataDirectory,'journal'));return summary(await executeRename(await journal.get(id),journal,context.signal,value=>context.emit(value)));});},
 undo(args,context){return exclusive(async()=>{const {id}=args as {id:string};const journal=new RenameJournal(path.join(context.dataDirectory,'journal'));return summary(await undoRename(await journal.get(id),journal,context.signal));});},
 async history(_args,context){return(await new RenameJournal(path.join(context.dataDirectory,'journal')).list()).map(summary);},
}satisfies BackendHandlers;
