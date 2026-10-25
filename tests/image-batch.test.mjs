import {test} from 'node:test';import assert from 'node:assert/strict';
import {outputSize,gridLayout} from '../plugins/image-batch/src/image.ts';
test('image resize preserves aspect ratio and never enlarges input',()=>{assert.deepEqual(outputSize(1200,800,600,600),{width:600,height:400});assert.deepEqual(outputSize(120,80,600,600),{width:120,height:80});assert.throws(()=>outputSize(10000,10000,0,0));});
test('collage layouts enforce dimensions and stable cell positions',()=>{assert.deepEqual(gridLayout(3,2,100,10),{width:210,height:210,cells:[{x:0,y:0,width:100,height:100},{x:110,y:0,width:100,height:100},{x:0,y:110,width:100,height:100}]});assert.throws(()=>gridLayout(100,10,4000,0));assert.throws(()=>gridLayout(1,0,100,0));});
