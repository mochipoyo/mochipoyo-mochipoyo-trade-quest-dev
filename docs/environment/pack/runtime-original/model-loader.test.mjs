import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
test('Three.js GLTFLoader decodes all 26 models with finite geometry and material names',async()=>{
 const defs=JSON.parse(fs.readFileSync(new URL('../data/model_manifest.json',import.meta.url)));const loader=new GLTFLoader();
 for(const d of defs){const bytes=fs.readFileSync(new URL('../'+d.file,import.meta.url));const gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');let meshes=0;gltf.scene.traverse(o=>{if(!o.isMesh)return;meshes++;assert.ok(o.material.name);for(const name of ['position','normal','uv']){const attr=o.geometry.attributes[name];assert.ok(attr,d.id+' '+name);assert.ok([...attr.array].every(Number.isFinite));}});assert.ok(meshes>0,d.id);}
});
