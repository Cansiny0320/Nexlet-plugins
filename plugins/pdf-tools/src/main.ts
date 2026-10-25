import { tr } from '../../../shared/workbench-i18n';
import '../../../shared/workbench.css';
import {element,bytes,chooseFiles,contextFiles,outputDirectory,renderFiles,showError,showStatus,stem,type WorkFile} from '../../../shared/workbench';
import {editPdf,imagesPdf,loadPdf,pageSelection} from './pdf';
import * as pdfjs from 'pdfjs-dist';
pdfjs.GlobalWorkerOptions.workerSrc=new URL('pdfjs/pdf.worker.mjs',location.href).href;
const field=(id:string)=>element<HTMLInputElement>(id);
let files:WorkFile[]=[],controller:AbortController|null=null,urls:string[]=[],outputs:string[]=[];
function controls(){for(const id of ['add','run','preview','operation','pages','rotation','scale'])element<HTMLButtonElement>(id).disabled=!!controller;element('files').inert=!!controller;element('cancel').hidden=!controller;element('progress').hidden=!controller;}
function output(path:string){outputs.push(path);const button=document.createElement('button');button.textContent=path;button.onclick=()=>void nexlet.system.reveal(path).catch(showError);element('outputs').append(button);}
function clearPreview(){for(const url of urls)URL.revokeObjectURL(url);urls=[];element('preview-images').replaceChildren();}
async function renderPdf(data:Uint8Array,range:string,scale:number,signal:AbortSignal,save:(data:Uint8Array,page:number)=>Promise<void>){
 const loading=pdfjs.getDocument({data:new Uint8Array(data),stopAtErrors:true,maxImageSize:36_000_000,canvasMaxAreaInBytes:144_000_000,cMapUrl:new URL('pdfjs/cmaps/',location.href).href,cMapPacked:true,standardFontDataUrl:new URL('pdfjs/standard_fonts/',location.href).href,wasmUrl:new URL('pdfjs/wasm/',location.href).href});
 const cancel=()=>{void loading.destroy();};signal.addEventListener('abort',cancel,{once:true});
 try{const document=await loading.promise,pages=pageSelection(range,document.numPages);if(pages.length>100)throw new Error(tr('一次最多渲染 100 页'));
 for(let i=0;i<pages.length;i++){signal.throwIfAborted();const page=await document.getPage(pages[i]+1),viewport=page.getViewport({scale});if(viewport.width*viewport.height>36_000_000)throw new Error(tr('页面超过 3600 万像素，请降低渲染比例'));const canvas=window.document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);const render=page.render({canvas,canvasContext:canvas.getContext('2d')!,viewport});const abort=()=>render.cancel();signal.addEventListener('abort',abort,{once:true});try{await render.promise;}finally{signal.removeEventListener('abort',abort);}signal.throwIfAborted();const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error(tr('PNG 编码失败'))),'image/png'));await save(new Uint8Array(await blob.arrayBuffer()),pages[i]+1);canvas.width=canvas.height=1;page.cleanup();element<HTMLProgressElement>('progress').value=(i+1)/pages.length;}
 }finally{signal.removeEventListener('abort',cancel);await loading.destroy();}
}
element('add').onclick=()=>void chooseFiles(['pdf','png','jpg','jpeg','webp']).then(next=>{files.push(...next);files=files.slice(0,50);renderFiles(files,()=>{});}).catch(showError);
element('cancel').onclick=()=>controller?.abort(new Error(tr('已取消；已保存的文件保留在输出目录')));
element('run').onclick=()=>void(async()=>{
 if(!files.length)throw new Error(tr('请先添加文件'));controller=new AbortController();const signal=controller.signal;controls();outputs=[];element('outputs').replaceChildren();showStatus(tr('处理中…'));
 try{
  const operation=field('operation').value,range=field('pages').value,rotation=Number(field('rotation').value);
  if(['split','render'].includes(operation)){
   const directory=await outputDirectory('Nexlet-PDF');if(!directory)return;const data=await bytes(files[0]);signal.throwIfAborted();
   if(operation==='render')await renderPdf(data,range,Number(field('scale').value),signal,async(data,page)=>{const path=`${directory}/${stem(files[0].name)}-${page}.png`;signal.throwIfAborted();await nexlet.files.write(path,data,false);output(path);});
   else{const pdf=await loadPdf(data),pages=pageSelection(range,pdf.getPageCount());for(let i=0;i<pages.length;i++){const dataOut=await editPdf([data],{pages:String(pages[i]+1),rotation},signal);const path=`${directory}/${stem(files[0].name)}-${i+1}-page-${pages[i]+1}.pdf`;signal.throwIfAborted();await nexlet.files.write(path,dataOut,false);output(path);element<HTMLProgressElement>('progress').value=(i+1)/pages.length;}}
  }else{
   const destination=await nexlet.dialogs.save({defaultPath:operation==='merge'?'merged.pdf':stem(files[0].name)+'-processed.pdf',filters:[{name:'PDF',extensions:['pdf']}]});if(destination.canceled||!destination.filePath)return;
   const inputs:Uint8Array[]=[];for(const file of(operation==='merge'||operation==='images'?files:files.slice(0,1))){signal.throwIfAborted();inputs.push(await bytes(file));if(inputs.reduce((n,b)=>n+b.length,0)>128*1024*1024)throw new Error(tr('文件总大小超过 128 MiB'));}
   let result:Uint8Array;
   if(operation==='images'){const images=[];for(const data of inputs){signal.throwIfAborted();const id=crypto.randomUUID(),cancel=()=>void nexlet.tasks.cancel(id);signal.addEventListener('abort',cancel,{once:true});try{const png=await nexlet.media.image({id,data,format:'png'});images.push({bytes:png.data,format:'png' as const});}finally{signal.removeEventListener('abort',cancel);}}result=await imagesPdf(images,signal);}
   else result=await editPdf(inputs,{pages:range,rotation,merge:operation==='merge',rotateOnly:operation==='rotate'},signal,value=>{element<HTMLProgressElement>('progress').value=value;});
   signal.throwIfAborted();await nexlet.files.write(destination.filePath,result,false);output(destination.filePath);
  }
  showStatus(tr(`已保存 ${outputs.length} 个文件`));
 }finally{controller=null;controls();}
})().catch(error=>{showError(error);if(outputs.length)element('status').textContent+=tr(`\n已保存 ${outputs.length} 个文件，见下方。`);});
element('preview').onclick=()=>void(async()=>{if(!files.length)throw new Error(tr('请先添加 PDF'));controller=new AbortController();controls();clearPreview();try{await renderPdf(await bytes(files[0]),'1',.8,controller.signal,async(data)=>{const url=URL.createObjectURL(new Blob([new Uint8Array(data)],{type:'image/png'}));urls.push(url);const image=document.createElement('img');image.src=url;image.alt=tr('第一页预览');element('preview-images').append(image);});showStatus('');}finally{controller=null;controls();}})().catch(showError);
nexlet.onEnter(async context=>{try{const next=await contextFiles(context);if(next.length){files=next;renderFiles(files,()=>{});}}catch(error){showError(error);}});
nexlet.onOut(()=>{controller?.abort(new Error(tr('已退出')));clearPreview();});controls();
