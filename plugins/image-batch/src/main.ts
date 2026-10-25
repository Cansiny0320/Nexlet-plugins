import { tr } from '../../../shared/workbench-i18n';
import '../../../shared/workbench.css';
import {element,bytes,chooseFiles,contextFiles,outputDirectory,renderFiles,showError,showStatus,stem,type WorkFile} from '../../../shared/workbench';
import {convertImage,drawWatermark,encodeImage,gridLayout,outputSize,type ImageOptions} from './image';
const field=(id:string)=>element<HTMLInputElement>(id);let files:WorkFile[]=[],controller:AbortController|null=null,previewUrl='';
const options=():ImageOptions=>({width:Number(field('width').value),height:Number(field('height').value),quality:Number(field('quality').value)/100,format:field('format').value as ImageOptions['format'],watermark:field('watermark').value});
function controls(){for(const node of document.querySelectorAll<HTMLInputElement|HTMLButtonElement>('input,select,button'))if(node.id!=='cancel')node.disabled=!!controller;element('files').inert=!!controller;element('cancel').hidden=!controller;element('progress').hidden=!controller;}
async function readImage(file:WorkFile,signal:AbortSignal){signal.throwIfAborted();const data=await bytes(file),id=crypto.randomUUID(),abort=()=>void nexlet.tasks.cancel(id);signal.addEventListener('abort',abort,{once:true});try{const meta=await nexlet.media.image({id,data,metadata:true});outputSize(meta.width??0,meta.height??0,0,0);return data;}finally{signal.removeEventListener('abort',abort);}}
function result(name:string,path?:string){const row=document.createElement(path?'button':'p');row.textContent=name;if(path)row.onclick=()=>void nexlet.system.reveal(path).catch(showError);element('outputs').append(row);}
element('add').onclick=()=>void chooseFiles(['png','jpg','jpeg','webp','bmp']).then(next=>{files.push(...next);files=files.slice(0,100);renderFiles(files,()=>{});}).catch(showError);
element('cancel').onclick=()=>controller?.abort(new Error(tr('已取消；已保存的文件保留在输出目录')));
element('run').onclick=()=>void(async()=>{
 if(!files.length)throw new Error(tr('请先添加图片'));controller=new AbortController();const signal=controller.signal;controls();element('outputs').replaceChildren();let completed=0,failed=0;
 try{const config=options(),directory=await outputDirectory('Nexlet-Images');if(!directory)return;
 if(field('operation').value==='collage'){
  const layout=gridLayout(files.length,Number(field('columns').value),Number(field('cell').value),Number(field('gap').value)),canvas=document.createElement('canvas');canvas.width=layout.width;canvas.height=layout.height;const context=canvas.getContext('2d')!;context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);
  for(let i=0;i<files.length;i++){const data=await readImage(files[i],signal),image=await createImageBitmap(new Blob([new Uint8Array(data)]));try{signal.throwIfAborted();const cell=layout.cells[i],ratio=Math.min(cell.width/image.width,cell.height/image.height),w=image.width*ratio,h=image.height*ratio;context.drawImage(image,cell.x+(cell.width-w)/2,cell.y+(cell.height-h)/2,w,h);}finally{image.close();}element<HTMLProgressElement>('progress').value=(i+1)/files.length;}
  drawWatermark(canvas,config.watermark);const data=await encodeImage(canvas,config.format,config.quality),path=`${directory}/collage.${config.format}`;signal.throwIfAborted();await nexlet.files.write(path,data,false);result(path,path);completed=1;canvas.width=canvas.height=1;
 }else{
  for(let i=0;i<files.length;i++){signal.throwIfAborted();showStatus(tr(`正在处理 ${i+1} / ${files.length}`));try{const data=await convertImage(await readImage(files[i],signal),config,signal),path=`${directory}/${String(i+1).padStart(3,'0')}-${stem(files[i].name)}.${config.format}`;signal.throwIfAborted();await nexlet.files.write(path,data,false);result(path,path);completed++;}catch(error){signal.throwIfAborted();failed++;result(files[i].name+'：'+(error instanceof Error?error.message:String(error)));}element<HTMLProgressElement>('progress').value=(i+1)/files.length;}
 }
 showStatus(tr(`已保存 ${completed} 个文件${failed?`，失败 ${failed} 个`:''}`));
 }catch(error){showError(error);element('status').textContent+=tr(`\n已保存 ${completed} 个文件。`);}finally{controller=null;controls();}
})().catch(showError);
element('preview').onclick=()=>void(async()=>{if(!files.length)throw new Error(tr('请先添加图片'));controller=new AbortController();controls();try{const data=await convertImage(await readImage(files[0],controller.signal),options(),controller.signal);if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl=URL.createObjectURL(new Blob([new Uint8Array(data)],{type:'image/'+options().format}));const image=document.createElement('img');image.src=previewUrl;image.alt=tr('处理结果预览');element('preview-images').replaceChildren(image);showStatus(tr(`预览大小 ${(data.length/1024).toFixed(1)} KiB`));}finally{controller=null;controls();}})().catch(showError);
nexlet.onEnter(async context=>{try{const next=await contextFiles(context);if(next.length){files=next;renderFiles(files,()=>{});}}catch(error){showError(error);}});nexlet.onOut(()=>{controller?.abort(new Error(tr('已退出')));if(previewUrl)URL.revokeObjectURL(previewUrl);previewUrl='';});controls();
