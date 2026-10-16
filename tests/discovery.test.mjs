import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,symlinkSync,unlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {candidates,planPublication} from '../scripts/publish.mjs';
const manifest=(id)=>({id,name:'Demo',description:'Demo plugin',version:'1.0.0',apiVersion:1,main:'index.html',permissions:[],features:[{code:'open',name:'Open',keywords:['demo']}],author:'Nexlet',category:'Tools',platforms:['win32','darwin','linux'],minHostVersion:'0.2.30'});
function fixture(run){const dir=mkdtempSync(path.join(tmpdir(),'nexlet-discovery-'));mkdirSync(path.join(dir,'plugins'));try{return run(dir);}finally{rmSync(dir,{recursive:true,force:true});}}
function add(dir,name,value=manifest('org.nexlet.'+name),built=value){for(const [folder,data]of [[`plugins/${name}`,value],[`.build/plugins/${name}`,built]]){mkdirSync(path.join(dir,folder),{recursive:true});writeFileSync(path.join(dir,folder,'plugin.json'),JSON.stringify(data));}}
const plan=(dir)=>planPublication(candidates(dir),{schemaVersion:1,plugins:[]},{schemaVersion:1,plugins:{}});
test('discovers a newly added plugin without a catalog, preserves metadata and ignores templates and non-plugins',()=>fixture(dir=>{
 add(dir,'zeta');add(dir,'alpha');mkdirSync(path.join(dir,'plugins/notes'));mkdirSync(path.join(dir,'templates/example'),{recursive:true});writeFileSync(path.join(dir,'templates/example/plugin.json'),JSON.stringify(manifest('org.nexlet.example')));
 assert.deepEqual(candidates(dir).map(p=>p.directory),['alpha','zeta']);
 const next=plan(dir);assert.equal(next.releases.length,2);assert.equal(next.index.plugins[0].minHostVersion,'0.2.30');assert.deepEqual(next.index.plugins[0].platforms,['win32','darwin','linux']);
}));
test('invalid metadata and duplicate IDs fail the whole candidate publication',()=>fixture(dir=>{
 const invalid={...manifest('org.nexlet.alpha'),platforms:['plan9']};add(dir,'alpha',invalid);assert.throws(()=>plan(dir),/platforms/);
 add(dir,'alpha');add(dir,'beta',manifest('org.nexlet.alpha'));assert.throws(()=>plan(dir),/Duplicate/);
 add(dir,'beta',{...manifest('org.nexlet.beta'),author:''});assert.throws(()=>plan(dir),/author/);
}));
test('missing and stale builds cannot produce a published index',()=>fixture(dir=>{
 add(dir,'alpha');rmSync(path.join(dir,'.build'),{recursive:true});assert.throws(()=>candidates(dir),/ENOENT/);
 add(dir,'alpha',manifest('org.nexlet.alpha'),{...manifest('org.nexlet.alpha'),version:'0.9.0'});assert.throws(()=>candidates(dir),/Stale build/);
}));
test('rejects symlink plugin directories and malformed plugin manifests',()=>fixture(dir=>{
 mkdirSync(path.join(dir,'outside'));symlinkSync(path.join(dir,'outside'),path.join(dir,'plugins/link'),'junction');assert.throws(()=>candidates(dir),/symlink/i);unlinkSync(path.join(dir,'plugins/link'));
 add(dir,'alpha');writeFileSync(path.join(dir,'plugins/alpha/plugin.json'),'{');assert.throws(()=>candidates(dir),SyntaxError);
}));
