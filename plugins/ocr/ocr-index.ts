import { recognize } from './engine';
const bridge = (window as unknown as { ocrIndex: { listen(callback:(bytes:Uint8Array)=>void):void; progress(value:number):void; finish(value:{text?:string;error?:string}):void } }).ocrIndex;
bridge.listen(bytes=>{
  void recognize(bytes,value=>bridge.progress(value)).then(text=>bridge.finish({text}),error=>bridge.finish({error:error instanceof Error?error.message:String(error)}));
});
