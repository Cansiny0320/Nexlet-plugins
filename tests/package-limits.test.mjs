import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync,openSync,closeSync,ftruncateSync,existsSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const MiB=1024*1024;
function fixture(work){const dir=mkdtempSync(path.join(tmpdir(),'nexlet-package-limits-'));const source=path.join(dir,'source'),output=path.join(dir,'plugin.nexlet');mkdirSync(source);writeFileSync(path.join(source,'plugin.json'),JSON.stringify({id:'org.nexlet.fixture',version:'1.0.0',main:'index.html'}));writeFileSync(path.join(source,'index.html'),'<html></html>');try{work({source,output,run:()=>spawnSync('python3',['scripts/package.py','--plugin-dir',source,'--output',output],{encoding:'utf8'})});}finally{rmSync(dir,{recursive:true,force:true});}}
const sparse=(file,size)=>{const fd=openSync(file,'w');try{ftruncateSync(fd,size);}finally{closeSync(fd);}};
test('packages a 32 MiB model, rejects larger files and preserves the previous package',()=>fixture(({source,output,run})=>{
 const model=path.join(source,'model.bin');sparse(model,32*MiB);const result=run();assert.equal(result.status,0,result.stderr);const before=readFileSync(output);
 sparse(model,32*MiB+1);const invalid=run();assert.notEqual(invalid.status,0);assert.match(invalid.stderr,/32 MiB/);assert.deepEqual(readFileSync(output),before);
}));
test('rejects more than 128 MiB extracted before writing a package',()=>fixture(({source,output,run})=>{
 for(let i=0;i<4;i++)sparse(path.join(source,`model-${i}.bin`),32*MiB);
 const result=run();assert.notEqual(result.status,0);assert.match(result.stderr,/128 MiB/);assert.equal(existsSync(output),false);
}));
test('rejects a compressed archive above 64 MiB without replacing the previous artifact',()=>fixture(({source,output,run})=>{
 writeFileSync(output,'previous package');for(let i=0;i<3;i++)writeFileSync(path.join(source,`random-${i}.bin`),randomBytes(23*MiB));
 const result=run();assert.notEqual(result.status,0);assert.match(result.stderr,/64 MiB/);assert.equal(readFileSync(output,'utf8'),'previous package');
}));
