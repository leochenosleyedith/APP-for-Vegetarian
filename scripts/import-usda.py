"""Rebuild the bundled food subset from the official USDA SR Legacy JSON ZIP.
Usage: python scripts/import-usda.py /path/to/FoodData_Central_sr_legacy_food_json_2018-04.zip
Only USDA values are used. An absent nutrient stays null, never becomes zero.
"""
import sys, json, zipfile, hashlib
from pathlib import Path

# id, NDB number, display name, typical starting portion in grams, dietary tags
FOODS = [
('quinoa',20137,'Quinoa, cooked',150,[]),
('chickpeas',16057,'Chickpeas, cooked',100,[]),
('lentils',16070,'Lentils, cooked',150,[]),
('tofu',16426,'Firm tofu, calcium-set',120,['soy']),
('tempeh',16174,'Tempeh, cooked',100,['soy']),
('black-beans',16015,'Black beans, cooked',130,[]),
('edamame',11212,'Edamame, prepared',100,['soy']),
('hummus',16137,'Hummus, home prepared',60,['sesame']),
('brown-rice',20037,'Brown rice, cooked',150,[]),
('white-rice',20045,'White rice, cooked',150,[]),
('oats',20038,'Oats, dry',50,['gluten']),
('bread',18075,'Whole-wheat bread',40,['gluten','uncertain']),
('spinach',11457,'Spinach, raw',50,[]),
('broccoli',11091,'Broccoli, cooked',100,[]),
('avocado',9037,'Avocado',75,[]),
('tomato',11529,'Tomato, raw',100,[]),
('cucumber',11205,'Cucumber, raw',80,[]),
('carrot',11124,'Carrot, raw',80,[]),
('sweet-potato',11508,'Sweet potato, baked',150,[]),
('potato',11674,'Potato, baked with skin',170,[]),
('mushroom',11260,'White mushrooms, raw',70,[]),
('pepper',11821,'Red bell pepper, raw',100,[]),
('onion',11282,'Onion, raw',50,['allium']),
('garlic',11215,'Garlic, raw',5,['allium']),
('lettuce',11251,'Romaine lettuce, raw',60,[]),
('kale',11233,'Kale, raw',50,[]),
('corn',11168,'Sweet corn, cooked',100,[]),
('peas',11305,'Green peas, cooked',100,[]),
('banana',9040,'Banana',118,[]),
('apple',9003,'Apple with skin',182,[]),
('blueberries',9050,'Blueberries',80,[]),
('strawberries',9316,'Strawberries',100,[]),
('orange',9200,'Orange',130,[]),
('almonds',12061,'Almonds',28,['nuts']),
('walnuts',12155,'Walnuts',28,['nuts']),
('chia',12006,'Chia seeds, dried',15,[]),
('tahini',12698,'Tahini',15,['sesame']),
('olive-oil',4053,'Olive oil',10,[]),
('peanut-butter',16398,'Peanut butter, unsalted',25,['peanuts']),
('soy-milk',16139,'Soymilk, calcium/vitamin A/D fortified',240,['soy']),
('almond-milk',14091,'Almond milk, unsweetened',240,['nuts']),
('greek-yogurt',1256,'Greek yogurt, plain, nonfat',170,['dairy']),
('milk',1077,'Whole milk, vitamin D fortified',240,['dairy']),
('feta',1019,'Feta cheese',30,['dairy','rennet']),
('cheddar',1009,'Cheddar cheese',30,['dairy','rennet']),
('egg',1129,'Hard-boiled egg',50,['egg']),
('honey',19296,'Honey',15,['honey']),
('chicken',5064,'Chicken breast, roasted, meat only',120,['meat']),
('beef',23570,'Ground beef, cooked',120,['meat']),
('salmon',15209,'Atlantic salmon, cooked',120,['fish']),
('shrimp',15271,'Shrimp, cooked',100,['fish','shellfish']),
('salt',2047,'Table salt',1,[])
]
NUTRIENTS = {'kcal':1008,'protein':1003,'carbs':1005,'fat':1004,'fiber':1079,
 'iron':1089,'calcium':1087,'b12':1178,'zinc':1095,'vitaminC':1162,
 'vitaminD':1114,'sodium':1093,'potassium':1092}
archive = Path(sys.argv[1]); z = zipfile.ZipFile(archive)
source = json.loads(z.read(next(n for n in z.namelist() if n.endswith('.json'))))['SRLegacyFoods']
by_ndb = {int(f['ndbNumber']):f for f in source}
foods=[]
for key, ndb, name, portion, tags in FOODS:
    f=by_ndb[ndb]; nutrients={n['nutrient']['id']:n.get('amount') for n in f['foodNutrients']}
    foods.append({'id':key,'name':name,'fdcId':f['fdcId'],'ndbNumber':ndb,
      'sourceDescription':f['description'],'portion':portion,'tags':tags,
      'nutrients':{k:nutrients.get(v) for k,v in NUTRIENTS.items()}})
result={'source':'USDA FoodData Central, SR Legacy, April 2018',
 'url':'https://fdc.nal.usda.gov/download-datasets/',
 'downloadUrl':'https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_json_2018-04.zip',
 'archiveSha256':hashlib.sha256(archive.read_bytes()).hexdigest(),
 'basis':'Nutrients per 100 grams of edible portion; null means not reported.', 'foods':foods}
dest=Path(__file__).resolve().parents[1]/'web'/'foods.json'
dest.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(f'Imported {len(foods)} foods to {dest}')
