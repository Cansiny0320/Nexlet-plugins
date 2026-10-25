import { test } from 'node:test';
import assert from 'node:assert/strict';
import {createCanvas,loadImage} from '@napi-rs/canvas';
import {convertImage,drawWatermark,gridLayout} from '../plugins/image-batch/src/image.ts';

test('image output has the requested size, actual encoding, JPEG background and baked watermark without a browser',async()=>{
  const previousDocument=globalThis.document,previousBitmap=globalThis.createImageBitmap;
  globalThis.document={createElement:tag=>{assert.equal(tag,'canvas');return createCanvas(1,1);}};
  globalThis.createImageBitmap=async blob=>{const image=await loadImage(Buffer.from(await blob.arrayBuffer()));image.close=()=>{};return image;};
  try{
    const input=createCanvas(200,100);input.getContext('2d').fillStyle='#ff0000';input.getContext('2d').fillRect(50,25,100,50);
    const source=await input.encode('png');
    for(const format of ['png','jpeg','webp']){
      const result=await convertImage(source,{width:100,height:100,quality:.8,format,watermark:''},new AbortController().signal),image=await loadImage(result);
      assert.equal(image.width,100);assert.equal(image.height,50);
      if(format==='jpeg')assert.equal(Buffer.from(result).subarray(0,2).toString('hex'),'ffd8');
      if(format==='png')assert.equal(Buffer.from(result).subarray(1,4).toString(),'PNG');
      if(format==='webp')assert.equal(Buffer.from(result).subarray(8,12).toString(),'WEBP');
      const canvas=createCanvas(100,50),ctx=canvas.getContext('2d');ctx.drawImage(image,0,0);
      if(format==='jpeg'){const pixel=ctx.getImageData(1,1,1,1).data;assert.ok(pixel[0]>240&&pixel[1]>240&&pixel[2]>240);}
    }
    const canvas=createCanvas(300,150),ctx=canvas.getContext('2d');ctx.fillStyle='#123456';ctx.fillRect(0,0,300,150);const before=canvas.data();
    drawWatermark(canvas,'Nexlet');assert.notDeepEqual(canvas.data(),before);
    const layout=gridLayout(3,2,50,10);assert.deepEqual(layout.cells[2],{x:0,y:60,width:50,height:50});
    await assert.rejects(convertImage(source,{width:100,height:100,quality:.8,format:'png',watermark:''},AbortSignal.abort(new Error('cancelled'))),/cancelled/);
  }finally{globalThis.document=previousDocument;globalThis.createImageBitmap=previousBitmap;}
});
