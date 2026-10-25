import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PDFDocument,degrees,rgb} from 'pdf-lib';
import {createCanvas} from '@napi-rs/canvas';
import {pageSelection,editPdf,loadPdf,imagesPdf} from '../plugins/pdf-tools/src/pdf.ts';
test('PDF extracts, reorders, merges and rotates actual pages',async()=>{
 const pdf=await PDFDocument.create();for(const width of [100,200,300])pdf.addPage([width,400]);pdf.getPage(0).setRotation(degrees(90));const bytes=await pdf.save();
 const output=await loadPdf(await editPdf([bytes],{pages:'3,1',rotation:90},new AbortController().signal));
 assert.equal(output.getPageCount(),2);assert.equal(output.getPage(0).getWidth(),300);assert.equal(output.getPage(1).getRotation().angle,180);
 assert.equal((await loadPdf(await editPdf([bytes,bytes],{merge:true},new AbortController().signal))).getPageCount(),6);
 const rotated=await loadPdf(await editPdf([bytes],{pages:'2',rotation:90,rotateOnly:true},new AbortController().signal));
 assert.equal(rotated.getPageCount(),3);assert.deepEqual(rotated.getPages().map(p=>p.getWidth()),[100,200,300]);assert.deepEqual(rotated.getPages().map(p=>p.getRotation().angle),[90,90,0]);
});
test('PDF page lists retain explicit order and reject invalid or excessive selection',()=>{
 assert.deepEqual(pageSelection('3-1,2',3),[2,1,0,1]);for(const range of ['0','4','1;2','1-a'])assert.throws(()=>pageSelection(range,3));
});
test('PDF jobs respect cancellation and embedding images creates a readable page',async()=>{
 const signal=AbortSignal.abort(new Error('cancelled'));await assert.rejects(editPdf([new Uint8Array([1])],{},signal),/cancelled/);
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jP1sAAAAASUVORK5CYII=','base64');
 const result=await imagesPdf([{bytes:png,format:'png'}],new AbortController().signal);assert.equal((await loadPdf(result)).getPageCount(),1);
});

test('PDF.js renders actual PDF page pixels in Node without opening a window',async()=>{
 const pdf=await PDFDocument.create(),page=pdf.addPage([40,20]);page.drawRectangle({x:0,y:0,width:40,height:20,color:rgb(1,0,0)});
 const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');
 const job=getDocument({data:await pdf.save()});
 const doc=await job.promise;
 try{const p=await doc.getPage(1),viewport=p.getViewport({scale:2}),canvas=createCanvas(viewport.width,viewport.height),ctx=canvas.getContext('2d');await p.render({canvas,canvasContext:ctx,viewport}).promise;assert.equal(canvas.width,80);assert.equal(canvas.height,40);assert.deepEqual([...ctx.getImageData(20,20,1,1).data],[255,0,0,255]);}
 finally{await job.destroy();}
});
