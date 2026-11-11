import { readFile, writeFile, mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd();
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png','.wasm':'application/wasm'};
const assets={};
async function walk(dir){for(const e of await readdir(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())await walk(p);else {const key='/'+path.relative(path.join(root,'web'),p).split(path.sep).join('/');assets[key]={type:types[path.extname(p)]||'application/octet-stream',data:(await readFile(p)).toString('base64')};}}}
await walk(path.join(root,'web'));
const foods=JSON.parse(await readFile('web/foods.json','utf8'));
const core=(await readFile('web/core.js','utf8')).replace(/^export /gm,'');
const worker=(await readFile('worker/index.js','utf8')).replace(/^import .*?;\n/,'').replace(/^export /gm,'');
await rm('dist',{recursive:true,force:true});await mkdir('dist/server',{recursive:true});await mkdir('dist/.openai',{recursive:true});
await writeFile('dist/server/index.js',`${core}\n${worker}\nconst ASSETS=${JSON.stringify(assets)};\nconst FOODS=${JSON.stringify(foods.foods)};\nexport default makeWorker(FOODS,ASSETS);\n`);
await writeFile('dist/.openai/hosting.json',await readFile('.openai/hosting.json'));
console.log(`Built Worker with ${Object.keys(assets).length} assets and ${foods.foods.length} USDA foods.`);
