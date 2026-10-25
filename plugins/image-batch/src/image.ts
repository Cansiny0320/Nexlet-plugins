export interface ImageOptions { width:number; height:number; quality:number; format:'png'|'jpeg'|'webp'; watermark:string }
export function outputSize(width:number,height:number,maxWidth:number,maxHeight:number){
 if(![width,height,maxWidth,maxHeight].every(Number.isFinite)||width<1||height<1||width*height>36_000_000||maxWidth<0||maxHeight<0||maxWidth>20000||maxHeight>20000)throw new Error('图片尺寸无效或超过 3600 万像素');
 const ratio=Math.min(1,maxWidth?maxWidth/width:1,maxHeight?maxHeight/height:1);return{width:Math.max(1,Math.round(width*ratio)),height:Math.max(1,Math.round(height*ratio))};
}
export function gridLayout(count:number,columns:number,cell:number,gap:number){
 if(![count,columns,cell,gap].every(Number.isInteger)||count<1||count>100||columns<1||columns>10||cell<32||cell>4000||gap<0||gap>200)throw new Error('拼图布局无效');
 const cols=Math.min(columns,count),width=cols*cell+(cols-1)*gap,height=Math.ceil(count/cols)*cell+(Math.ceil(count/cols)-1)*gap;
 if(width*height>36_000_000)throw new Error('拼图超过 3600 万像素');return{width,height,cells:Array.from({length:count},(_,index)=>({x:(index%cols)*(cell+gap),y:Math.floor(index/cols)*(cell+gap),width:cell,height:cell}))};
}
export function drawWatermark(canvas:HTMLCanvasElement,text:string){
 if(!text)return;if(text.length>200)throw new Error('水印文字过长');
 const ctx=canvas.getContext('2d')!,size=Math.max(12,Math.round(Math.min(canvas.width,canvas.height)/25)),padding=Math.max(8,size*.7);
 ctx.save();ctx.font=`${size}px sans-serif`;ctx.textAlign='right';ctx.textBaseline='bottom';ctx.fillStyle='rgba(255,255,255,.8)';ctx.strokeStyle='rgba(0,0,0,.5)';ctx.lineWidth=3;const width=canvas.width-padding*2;ctx.strokeText(text,canvas.width-padding,canvas.height-padding,width);ctx.fillText(text,canvas.width-padding,canvas.height-padding,width);ctx.restore();
}
export async function encodeImage(canvas:HTMLCanvasElement,format:ImageOptions['format'],quality:number){
 if(!['png','jpeg','webp'].includes(format)||!Number.isFinite(quality)||quality<.1||quality>1)throw new Error('图片格式或质量无效');
 const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('图片编码失败')),'image/'+format,quality));
 if(blob.type!=='image/'+format)throw new Error('当前环境不支持所选编码格式');if(blob.size>16*1024*1024)throw new Error('生成图片超过 16 MiB，请降低尺寸或质量');return new Uint8Array(await blob.arrayBuffer());
}
export async function convertImage(data:Uint8Array,options:ImageOptions,signal:AbortSignal){
 signal.throwIfAborted();const image=await createImageBitmap(new Blob([new Uint8Array(data)]));
 try{signal.throwIfAborted();const size=outputSize(image.width,image.height,options.width,options.height),canvas=document.createElement('canvas');canvas.width=size.width;canvas.height=size.height;const ctx=canvas.getContext('2d')!;if(options.format==='jpeg'){ctx.fillStyle='#fff';ctx.fillRect(0,0,size.width,size.height);}ctx.drawImage(image,0,0,size.width,size.height);drawWatermark(canvas,options.watermark);signal.throwIfAborted();const bytes=await encodeImage(canvas,options.format,options.quality);canvas.width=canvas.height=1;return bytes;}finally{image.close();}
}
