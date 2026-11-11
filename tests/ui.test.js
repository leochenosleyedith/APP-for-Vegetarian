import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
const html=await readFile(new URL('../web/index.html',import.meta.url),'utf8');
const database=JSON.parse(await readFile(new URL('../web/foods.json',import.meta.url),'utf8'));
const {normalizeProfile}=await import('../web/core.js');
const tick=()=>new Promise(resolve=>setTimeout(resolve,20));
test('signed-in UI logs and edits meals, persists preferences, filters history, and checks labels',async()=>{
  const dom=new JSDOM(html,{url:'https://sprout.test/',pretendToBeVisual:true});
  const w=dom.window;let meals=[],profile=normalizeProfile();const calls=[];
  const globals=['window','document','navigator','location','Image','FormData'];const originals=new Map(globals.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
  const originalFetch=globalThis.fetch;
  for(const key of globals)Object.defineProperty(globalThis,key,{configurable:true,value:key==='window'?w:w[key]});
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;this.dispatchEvent(new w.Event('close'));};
  globalThis.fetch=async(path,options={})=>{
    calls.push([path,options.method||'GET']);let value;
    if(String(path).includes('foods.json'))value=database;
    else if(path==='/api/session')value={user:{id:'alice',email:'alice@example.test',name:'Alice Plant'}};
    else if(path==='/api/state')value={profile,meals,limit:5000};
    else if(path==='/api/meals'){const meal=JSON.parse(options.body);meals=[meal,...meals.filter(m=>m.id!==meal.id)];value={meal};}
    else if(path==='/api/profile'){profile=JSON.parse(options.body);value={profile};}
    else throw new Error('Unexpected request '+path);
    return new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}});
  };
  try {
    await import('../web/app.js?ui-test=1');await tick();
    assert.match(w.document.querySelector('h1').textContent,/Alice/);
    assert.match(w.document.querySelector('#main').textContent,/Your day is ready to grow/);
    w.document.querySelector('[data-add-meal]').click();assert.equal(w.document.querySelector('#meal-dialog').open,true);
    w.document.querySelector('#meal-name').value='Rainbow lunch';
    const search=w.document.querySelector('#food-search');search.value='chickpeas';search.dispatchEvent(new w.Event('input'));w.document.querySelector('[data-food="chickpeas"]').click();
    const grams=w.document.querySelector('[data-grams]');grams.value='200';grams.dispatchEvent(new w.Event('input'));
    assert.match(w.document.querySelector('#meal-nutrients').textContent,/328 kcal/);
    w.document.querySelector('#meal-form').dispatchEvent(new w.Event('submit',{cancelable:true}));await tick();
    assert.equal(meals.length,1);assert.equal(meals[0].items[0].grams,200);assert.equal(w.document.querySelector('#meal-dialog').open,false);
    w.location.hash='journal';w.dispatchEvent(new w.HashChangeEvent('hashchange'));await tick();assert.match(w.document.querySelector('#journal-results').textContent,/Rainbow lunch/);
    const filter=w.document.querySelector('#journal-search');filter.value='unfindable';filter.dispatchEvent(new w.Event('input'));assert.match(w.document.querySelector('#journal-results').textContent,/No meals match/);
    w.document.querySelector('#clear-filter').click();w.document.querySelector('[data-edit]').click();w.document.querySelector('#half-portions').click();w.document.querySelector('#meal-form').dispatchEvent(new w.Event('submit',{cancelable:true}));await tick();assert.equal(meals.length,1);assert.equal(meals[0].items[0].grams,100);
    w.location.hash='preferences';w.dispatchEvent(new w.HashChangeEvent('hashchange'));await tick();w.document.querySelector('[name=diet]').value='vegan';w.document.querySelector('[name=exclusion][value=soy]').checked=true;w.document.querySelector('#preferences-form').dispatchEvent(new w.Event('submit',{cancelable:true}));await tick();assert.equal(profile.diet,'vegan');assert.deepEqual(profile.exclusions,['soy']);
    w.location.hash='check';w.dispatchEvent(new w.HashChangeEvent('hashchange'));await tick();w.document.querySelector('#label-text').value='Milk, gelatin';w.document.querySelector('#label-form').dispatchEvent(new w.Event('submit',{cancelable:true}));assert.match(w.document.querySelector('#label-result').textContent,/Conflicts with preference/);
    w.location.hash='plan';w.dispatchEvent(new w.HashChangeEvent('hashchange'));await tick();assert.equal(w.document.querySelectorAll('.recipe-card').length,4);assert.ok(calls.some(([p,m])=>p==='/api/meals'&&m==='POST'));assert.equal(calls.some(([p])=>/photo|vision|upload/.test(p)),false);
  }finally{globalThis.fetch=originalFetch;for(const [key,desc] of originals)if(desc)Object.defineProperty(globalThis,key,desc);else delete globalThis[key];dom.window.close();}
});
