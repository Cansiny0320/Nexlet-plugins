import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,cpSync,rmSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
test('release packaging accepts retained historical URLs and rejects an unrelated tag',()=>{
 const folder=mkdtempSync(path.join(tmpdir(),'nexlet-package-'));
 try{
  for(const name of ['scripts','plugins','index.json'])cpSync(path.join(root,name),path.join(folder,name),{recursive:true});
  const index=JSON.parse(readFileSync(path.join(folder,'index.json'),'utf8'));
  // This compatibility test packages the prebuilt JS plugins. Ctool's generated
  // output is covered by its dedicated package tests and the publishing workflow.
  index.plugins=index.plugins.filter(p=>p.id!=='org.nexlet.ctool');
  index.plugins.forEach(p=>{const folderName={'org.nexlet.hello':'hello-nexlet','org.nexlet.word-count':'word-count','org.nexlet.translate':'translate'}[p.id];p.version=JSON.parse(readFileSync(path.join(folder,'plugins',folderName,'plugin.json'),'utf8')).version;});
  index.plugins.forEach((p,i)=>p.download=p.download.replace(/\/download\/[^/]+\//,`/download/${i===0?'v9.9.9':'v1.0.0'}/`));
  writeFileSync(path.join(folder,'index.json'),JSON.stringify(index));
  const run=tag=>spawnSync('python3',['scripts/package.py',tag],{cwd:folder,encoding:'utf8'});
  const success=run('v9.9.9');assert.equal(success.status,0,success.stderr);
  const failure=run('v0.0.0');assert.notEqual(failure.status,0);assert.match(failure.stderr,/at least one index download URL/);
 }finally{rmSync(folder,{recursive:true,force:true});}
});
