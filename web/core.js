export const NUTRIENTS = {
  kcal: ['Energy', 'kcal', 2000], protein: ['Protein', 'g', 50],
  carbs: ['Carbohydrates', 'g', 275], fat: ['Fat', 'g', 78], fiber: ['Fiber', 'g', 28],
  iron: ['Iron', 'mg', 18], calcium: ['Calcium', 'mg', 1300], b12: ['Vitamin B12', 'µg', 2.4],
  zinc: ['Zinc', 'mg', 11], vitaminC: ['Vitamin C', 'mg', 90], vitaminD: ['Vitamin D', 'µg', 20],
  sodium: ['Sodium', 'mg', 2300], potassium: ['Potassium', 'mg', 4700]
};
export const DIETS = {
  vegan: ['Vegan', ['meat', 'fish', 'dairy', 'egg', 'honey']],
  vegetarian: ['Vegetarian', ['meat', 'fish']],
  lacto: ['Lacto-vegetarian', ['meat', 'fish', 'egg']],
  ovo: ['Ovo-vegetarian', ['meat', 'fish', 'dairy']],
  pescatarian: ['Pescatarian', ['meat']],
  flexitarian: ['Flexitarian', []]
};
export const EXCLUSIONS = ['soy', 'nuts', 'peanuts', 'sesame', 'gluten', 'dairy', 'egg', 'shellfish', 'allium'];
export const DEFAULT_PROFILE = {diet: 'vegetarian', exclusions: [], targets: Object.fromEntries(Object.entries(NUTRIENTS).map(([k,v])=>[k,v[2]]))};
export function localDate(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
export function normalizeProfile(value = {}) {
  const targets = {};
  for (const [k, v] of Object.entries(NUTRIENTS)) {
    const n = Number(value.targets?.[k]);
    targets[k] = Number.isFinite(n) && n > 0 && n <= 100000 ? n : v[2];
  }
  return {diet: Object.hasOwn(DIETS,value.diet) ? value.diet : 'vegetarian',
    exclusions: [...new Set((Array.isArray(value.exclusions) ? value.exclusions : []).filter(x=>EXCLUSIONS.includes(x)))], targets};
}
export function totalNutrients(items, foods) {
  const byId = new Map(foods.map(f=>[f.id,f]));
  const values = Object.fromEntries(Object.keys(NUTRIENTS).map(k=>[k,0]));
  const missing = Object.fromEntries(Object.keys(NUTRIENTS).map(k=>[k,0]));
  for (const item of items) {
    const f=byId.get(item.foodId);
    if (!f || !Number.isFinite(item.grams) || item.grams <= 0) continue;
    for (const k of Object.keys(values)) {
      const n=f.nutrients[k];
      if (n == null) missing[k]++; else values[k]+=n*item.grams/100;
    }
  }
  return {values, missing};
}
export function dietaryCheck(items, foods, profile) {
  const blocked=new Set([...DIETS[profile.diet][1],...profile.exclusions]);
  const conflicts=[], reviews=[];
  for (const item of items) {
    const food=foods.find(f=>f.id===item.foodId);
    if (!food) { reviews.push('Unrecognized ingredient'); continue; }
    const flags=food.tags.filter(t=>blocked.has(t));
    if(flags.length) conflicts.push(`${food.name}: ${flags.join(', ')}`);
    if(food.tags.includes('rennet') && !['pescatarian','flexitarian'].includes(profile.diet)) reviews.push(`${food.name}: check whether rennet is vegetarian`);
    if(food.tags.includes('uncertain')) reviews.push(`${food.name}: check the actual product label`);
  }
  return {conflicts,reviews,status:conflicts.length?'conflict':reviews.length?'review':'no-flags'};
}
const LABEL_RULES = [
  ['meat','Meat or animal stock',/\b(beef|pork|chicken|bacon|ham|lamb|turkey|lard|tallow|gelatin|gelatine|carmine|cochineal|isinglass|e120|e441|animal rennet|rennet|meat stock|chicken broth|beef broth|carne|pollo|cerdo|jam[oó]n|poulet|porc|b[oœ]uf|g[eé]latine|schweinefleisch|rindfleisch|h[uü]hnerfleisch)\b|[猪豬牛羊鸡雞鸭鴨]肉|明胶|明膠|豚肉|鶏肉|牛肉|ゼラチン|돼지고기|소고기|닭고기/iu],
  ['fish','Fish or seafood',/\b(fish|salmon|tuna|shrimp|prawn|anchov(?:y|ies)|bonito|oyster|shellfish|fish sauce|pesce|pescado|poisson|crevette|fisch|garnelen|dashi)\b|鱼|魚|虾|蝦|蚝|蠔|鰹|かつお|えび|海老|멸치|새우|생선/iu],
  ['dairy','Milk or dairy',/\b(milk|butter|cheese|cream|whey|casein|caseinate|lactose|yogurt|yoghurt|ghee|paneer|leche|queso|mantequilla|lait|fromage|beurre|milch|k[aä]se|molke)\b|牛奶|乳清|奶油|黄油|黃油|チーズ|バター|牛乳|우유|치즈|버터/iu],
  ['egg','Egg',/\b(eggs?|albumen|ovalbumin|huevo|oeufs?|[eœ]ufs?|eier|eiweiß)\b|鸡蛋|雞蛋|蛋白|卵|계란|달걀/iu],
  ['honey','Honey or bee products',/\b(honey|beeswax|royal jelly|miel|honig)\b|蜂蜜|蜜蝋|はちみつ|꿀/iu],
  ['soy','Soy',/\b(soy|soya|tofu|tempeh|edamame|soja)\b|大豆|豆腐|간장/iu],
  ['nuts','Tree nuts',/\b(almond|walnut|cashew|hazelnut|pistachio|pecan|macadamia)s?\b|杏仁|核桃|腰果|アーモンド/iu],
  ['peanuts','Peanuts',/\b(peanut|groundnut|cacahuete|arachide)s?\b|花生|落花生/iu],
  ['sesame','Sesame',/\b(sesame|tahini|s[eé]samo)s?\b|芝麻|ごま/iu],
  ['gluten','Gluten-containing grain',/\b(wheat|barley|rye|seitan|spelt|malt|trigo|bl[eé]|weizen)\b|小麦|小麥|大麦|大麥/iu],
  ['allium','Onion or garlic',/\b(onion|garlic|shallot|leek|chive)s?\b|洋葱|洋蔥|大蒜|にんにく/iu]
];
export function checkLabel(text, profile) {
  const raw=String(text).slice(0,10000).toLowerCase().normalize('NFKC');
  // Ignore these explicit alternative/negative phrases only; do not erase other ingredients.
  const cleaned=raw.replace(/\b(?:coconut|almond|soy|soya|oat|rice|cashew) milk\b/g,s=>s.replace('milk','drink'))
    .replace(/\b(?:peanut|almond|cashew|cocoa|shea) butter\b/g,s=>s.replace('butter','spread'))
    .replace(/\b(?:vegan|dairy[- ]free|plant[- ]based) (?:cheese|butter|cream|milk|yogurt)\b/g,'plant alternative')
    .replace(/\b(?:no|without) (?:milk|eggs?|honey|dairy|meat|fish)\b/g,'')
    .replace(/\b(?:milk|egg|dairy|meat|fish)[- ]free\b/g,'');
  const blocked=new Set([...DIETS[profile.diet][1],...profile.exclusions]);
  const matches=LABEL_RULES.filter(([tag,,rx])=>rx.test(cleaned)).map(([tag,label,rx])=>({tag,label,evidence:cleaned.match(rx)[0],blocked:blocked.has(tag)}));
  const ambiguous=/\b(natural flavou?rs?|e471|e472|mono.? and diglycerides|enzymes|vitamin d3|shellac|e904)\b|天然香料|天然香精/iu.test(raw);
  return {matches, ambiguous, status:matches.some(m=>m.blocked)?'conflict':ambiguous?'review':'no-flags'};
}
export function validateMeal(value, foods) {
  if (!value || typeof value!=='object') throw new Error('Invalid meal.');
  if (typeof value.id!=='string'||!/^[a-zA-Z0-9-]{8,80}$/.test(value.id)) throw new Error('Invalid meal ID.');
  const name=String(value.name||'').trim();
  if(!name||name.length>100) throw new Error('Enter a meal name (up to 100 characters).');
  const date=String(value.date||'');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date) throw new Error('Choose a valid date.');
  if(!['Breakfast','Lunch','Dinner','Snack'].includes(value.type)) throw new Error('Choose a meal type.');
  if(!Array.isArray(value.items)||!value.items.length||value.items.length>40) throw new Error('Add between 1 and 40 ingredients.');
  const ids=new Set(foods.map(f=>f.id));
  const items=value.items.map(x=>{
    const grams=Number(x.grams);
    if(!ids.has(x.foodId)||!Number.isFinite(grams)||grams<0.1||grams>5000) throw new Error('Each ingredient needs a known food and a weight between 0.1 and 5,000 g.');
    return {foodId:x.foodId,grams:Math.round(grams*10)/10};
  });
  const note=String(value.note||'').slice(0,1000);
  return {id:value.id,name,date,type:value.type,items,note,updatedAt:new Date().toISOString()};
}
export function historySummary(meals, foods, today=localDate()) {
  const end=new Date(`${today}T12:00:00`); const start=new Date(end);start.setDate(start.getDate()-6);
  const recent=meals.filter(m=>m.date>=localDate(start)&&m.date<=today);
  const days=new Set(recent.map(m=>m.date)).size;
  const totals=totalNutrients(recent.flatMap(m=>m.items),foods);
  const average=Object.fromEntries(Object.entries(totals.values).map(([k,v])=>[k,days?v/days:0]));
  return {days,meals:recent.length,average,missing:totals.missing};
}
const RECIPES = [
  {name:'Berry bright oats',type:'Breakfast',icon:'🫐',items:[['oats',60],['soy-milk',200],['blueberries',80],['chia',15]],tip:'Soak the oats overnight. Top with berries and chia.'},
  {name:'Apple & almond oats',type:'Breakfast',icon:'🍎',items:[['oats',60],['almond-milk',200],['apple',120],['almonds',20]],tip:'Simmer the oats, then add chopped apple and almonds.'},
  {name:'Morning potato skillet',type:'Breakfast',icon:'🥔',items:[['potato',250],['black-beans',100],['pepper',80],['olive-oil',10]],tip:'Warm the baked potato and beans; add pepper and olive oil.'},
  {name:'Greek yogurt & berry bowl',type:'Breakfast',icon:'🥣',items:[['greek-yogurt',220],['blueberries',100],['oats',50],['chia',10]],tip:'Stir together and finish with fresh berries.'},
  {name:'The feel-good grain bowl',type:'Lunch',icon:'🥗',items:[['quinoa',180],['chickpeas',130],['spinach',50],['pepper',100],['olive-oil',10]],tip:'Toss warm quinoa and chickpeas with spinach and pepper.'},
  {name:'Lentil & sweet potato plate',type:'Lunch',icon:'🍠',items:[['lentils',180],['sweet-potato',180],['broccoli',100],['olive-oil',10]],tip:'Serve lentils over baked sweet potato with broccoli.'},
  {name:'Edamame rice bowl',type:'Lunch',icon:'🫛',items:[['brown-rice',180],['edamame',150],['carrot',80],['cucumber',80],['olive-oil',10]],tip:'Arrange warm rice and edamame with crunchy vegetables.'},
  {name:'Golden tofu & greens',type:'Dinner',icon:'🥦',items:[['tofu',180],['brown-rice',180],['broccoli',120],['carrot',80],['olive-oil',10]],tip:'Pan-sear tofu, steam the vegetables, and serve with rice.'},
  {name:'Black bean harvest bowl',type:'Dinner',icon:'🥑',items:[['black-beans',180],['brown-rice',160],['avocado',70],['tomato',100],['corn',80]],tip:'Layer warm beans and rice, then add avocado and vegetables.'},
  {name:'Lentil & quinoa supper',type:'Dinner',icon:'🍲',items:[['lentils',200],['quinoa',180],['kale',80],['pepper',100],['olive-oil',10]],tip:'Warm lentils and quinoa together, then fold in the greens.'},
  {name:'A little berry crunch',type:'Snack',icon:'🍓',items:[['strawberries',150],['almonds',30],['banana',100]],tip:'Fresh fruit, a handful of almonds, and a quiet moment.'},
  {name:'Hummus & rainbow sticks',type:'Snack',icon:'🥕',items:[['hummus',100],['carrot',100],['cucumber',100],['orange',130]],tip:'Slice the vegetables and enjoy with hummus and an orange.'},
  {name:'Avocado & bean bites',type:'Snack',icon:'🥑',items:[['avocado',100],['chickpeas',80],['tomato',100]],tip:'Mash the chickpeas and avocado; serve with tomato.'}
];
export function makePlan(meals, foods, profile, variation=0, today=localDate()) {
  const summary=historySummary(meals,foods,today);
  const focus=['protein','fiber','iron','calcium','b12','zinc'].sort((a,b)=>summary.average[a]/profile.targets[a]-summary.average[b]/profile.targets[b]).slice(0,3);
  const available=RECIPES.filter(r=>{const check=dietaryCheck(r.items.map(([foodId,grams])=>({foodId,grams})),foods,profile);return !check.conflicts.length&&!check.reviews.length;});
  const chosen=['Breakfast','Lunch','Dinner','Snack'].map((type,index)=>{
    const options=available.filter(r=>r.type===type).map(r=>{
      const items=r.items.map(([foodId,grams])=>({foodId,grams}));const n=totalNutrients(items,foods);
      return {...r,items,n,score:focus.reduce((s,k)=>s+n.values[k]/profile.targets[k],0)};
    }).sort((a,b)=>b.score-a.score);
    return options.length?options[(variation+index)%options.length]:null;
  });
  const energy=chosen.reduce((n,r)=>n+(r?.n.values.kcal||0),0);
  const scale=energy?Math.max(.6,Math.min(1.6,profile.targets.kcal/energy)):1;
  return {summary,focus,recipes:chosen.map(r=>r?{...r,items:r.items.map(x=>({...x,grams:Math.round(x.grams*scale/5)*5}))}:null)};
}
function csvCell(v) {
  let s=String(v??'');
  if(/^[\s]*[=+@-]/.test(s)||/^[\t\r]/.test(s)) s="'"+s;
  return '"'+s.replaceAll('"','""')+'"';
}
export function exportCSV(meals, foods) {
  const keys=Object.keys(NUTRIENTS);
  const rows=[['meal_id','date','meal_type','meal_name','ingredient','grams','fdc_id',...keys.map(k=>`${k}_${NUTRIENTS[k][1]}`),'note']];
  for(const meal of meals) for(const item of meal.items) {
    const f=foods.find(f=>f.id===item.foodId);if(!f)continue;
    rows.push([meal.id,meal.date,meal.type,meal.name,f.name,item.grams,f.fdcId,...keys.map(k=>f.nutrients[k]==null?'':(f.nutrients[k]*item.grams/100).toFixed(3)),meal.note]);
  }
  return '\uFEFF'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n');
}
