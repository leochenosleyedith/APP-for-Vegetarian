import {readFile,readdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const foods=JSON.parse(await readFile('web/foods.json','utf8'));
assert.equal(new Set(foods.foods.map(f=>f.id)).size,52);
assert.ok(foods.archiveSha256.length===64);
for(const f of foods.foods){assert.ok(Number.isInteger(f.fdcId));assert.ok(f.portion>0);assert.ok(f.sourceDescription);assert.ok(f.nutrients.kcal>=0);}
const html=await readFile('web/index.html','utf8');
for(const match of html.matchAll(/(?:src|href)="\.\/([^"#]+)"/g))await readFile('web/'+match[1]);
const manifest=JSON.parse(await readFile('.openai/hosting.json','utf8'));assert.ok(manifest.project_id);assert.ok(manifest.d1);assert.ok(!manifest.static);
assert.ok((await readdir('drizzle')).some(f=>f.endsWith('.sql')));
const sw=await readFile('web/sw.js','utf8');assert.ok(!/SHELL=\[[^\]]*\/api\//.test(sw));
console.log('52 source-attributed USDA foods, local assets, Worker manifest and migrations verified.');
