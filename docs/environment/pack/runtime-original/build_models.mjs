import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {buildKitAsset,mergeKitAsset,ASSET_IDS,createKitMaterials} from '../runtime/EnvironmentKit.js';
import * as THREE from 'three';
// Node Blob -> exporter FileReader adapter. No network or image generation.
globalThis.FileReader=class{readAsArrayBuffer(blob){blob.arrayBuffer().then(b=>{this.result=b;this.onloadend?.();});}readAsDataURL(blob){blob.arrayBuffer().then(b=>{this.result='data:'+blob.type+';base64,'+Buffer.from(b).toString('base64');this.onloadend?.();});}};
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
fs.mkdirSync(path.join(root,'assets/models'),{recursive:true});const report=[];
for(const id of ASSET_IDS){const original=buildKitAsset(id);const model=mergeKitAsset(original);const box=new THREE.Box3().setFromObject(model);let triangles=0;model.traverse(o=>{if(o.isMesh)triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;});const bytes=await new GLTFExporter().parseAsync(model,{binary:true,onlyVisible:true});fs.writeFileSync(path.join(root,'assets/models',id+'.glb'),Buffer.from(bytes));report.push({id,file:'assets/models/'+id+'.glb',bytes:bytes.byteLength,triangles,drawCalls:model.children.length,bounds:{min:box.min.toArray(),max:box.max.toArray()},pivot:'ground center unless naturally elevated; see bounds',collision:'none; author collider separately'});}
fs.writeFileSync(path.join(root,'data/model_manifest.json'),JSON.stringify(report,null,2)+'\n');console.log('Exported',report.length,'GLBs;',report.reduce((n,r)=>n+r.triangles,0),'triangles in full catalog');
