import { PDFDocument, degrees } from 'pdf-lib';
export function pageSelection(value: string, count: number): number[] {
  if (!Number.isInteger(count) || count < 1 || count > 1000) throw new Error('PDF 页数必须为 1–1000');
  if (!value.trim()) return Array.from({length:count},(_,i)=>i);
  const pages:number[]=[];
  for(const token of value.split(',')){
    const match=token.trim().match(/^(\d+)(?:\s*-\s*(\d+))?$/);if(!match)throw new Error('页码格式示例：1-3,5,2');
    const from=Number(match[1]),to=Number(match[2]??match[1]);
    if(from<1||to<1||from>count||to>count||Math.abs(to-from)>1000)throw new Error('页码超出范围');
    const direction=to>=from?1:-1;for(let page=from;;page+=direction){pages.push(page-1);if(page===to)break;}
    if(pages.length>1000)throw new Error('输出页数超过 1000');
  }
  return pages;
}
export async function loadPdf(bytes:Uint8Array){
  if(!bytes.length||bytes.length>16*1024*1024)throw new Error('单个 PDF 必须小于 16 MiB');
  const pdf=await PDFDocument.load(bytes,{ignoreEncryption:false,updateMetadata:false,throwOnInvalidObject:true});
  if(pdf.getPageCount()>1000)throw new Error('PDF 超过 1000 页');return pdf;
}
export async function editPdf(inputs:Uint8Array[],options:{pages?:string;rotation?:number;merge?:boolean;rotateOnly?:boolean},signal:AbortSignal,progress:(n:number)=>void=()=>{}){
  if(!inputs.length||inputs.length>50||inputs.reduce((sum,b)=>sum+b.length,0)>128*1024*1024)throw new Error('最多处理 50 个文件，总计 128 MiB');
  if(options.rotation!==undefined&&![0,90,180,270].includes(options.rotation))throw new Error('旋转角度无效');
  const output=await PDFDocument.create();
  for(let i=0;i<(options.merge?inputs.length:1);i++){
    signal.throwIfAborted();const source=await loadPdf(inputs[i]),selected=pageSelection(options.pages??'',source.getPageCount()),pages=options.rotateOnly?source.getPageIndices():selected;
    if(output.getPageCount()+pages.length>1000)throw new Error('输出页数超过 1000');
    for(const index of pages){signal.throwIfAborted();const [page]=await output.copyPages(source,[index]);if(options.rotation&&(!options.rotateOnly||selected.includes(index)))page.setRotation(degrees((page.getRotation().angle+options.rotation)%360));output.addPage(page);}
    progress((i+1)/(options.merge?inputs.length:1));await new Promise(resolve=>setTimeout(resolve,0));
  }
  signal.throwIfAborted();const bytes=await output.save();if(bytes.length>16*1024*1024)throw new Error('生成的 PDF 超过 16 MiB，请减少页数');return bytes;
}
export async function imagesPdf(images:{bytes:Uint8Array;format:'png'|'jpeg'}[],signal:AbortSignal){
  if(!images.length||images.length>100)throw new Error('最多处理 100 张图片');
  const output=await PDFDocument.create();
  for(const image of images){signal.throwIfAborted();const embedded=await(image.format==='png'?output.embedPng(image.bytes):output.embedJpg(image.bytes));if(embedded.width*embedded.height>36_000_000)throw new Error('图片超过 3600 万像素');const page=output.addPage([embedded.width,embedded.height]);page.drawImage(embedded,{x:0,y:0,width:embedded.width,height:embedded.height});await new Promise(resolve=>setTimeout(resolve,0));}
  signal.throwIfAborted();const bytes=await output.save();if(bytes.length>16*1024*1024)throw new Error('生成的 PDF 超过 16 MiB');return bytes;
}
