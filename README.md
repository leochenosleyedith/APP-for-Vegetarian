# Sprout — Eat a little brighter

An iPhone-friendly vegetarian nutrition journal. Open the website in Safari and use **Share → Add to Home Screen** to use it like an app, without the App Store.

## What works

- Account creation/sign-in through **Sign in with ChatGPT**, provided by Sites. Direct Google OAuth is not implemented. Public visitors can explore the app; signing in unlocks private, cross-device meal and preference storage.
- Camera capture and image upload. Optional CLIP food recognition runs locally in a browser worker, without a paid AI API or image uploads. Users confirm possible ingredients and edit their portion weights.
- A reproducible, downloaded **52-food USDA FoodData Central SR Legacy** subset, with original FDC IDs, preparation descriptions, 13 nutrients, and missing-value handling. This is a starter food collection, not the complete USDA database.
- Meal creation, editing, deletion, dates, notes, journal search, daily nutrient totals, CSV export, and JSON backup. CSV has one row per ingredient and protects against spreadsheet formula injection.
- Vegan, vegetarian, lacto-vegetarian, ovo-vegetarian, pescatarian, and flexitarian preferences, plus ingredient exclusions. Label checking recognizes a limited dictionary across seven languages; ambiguous additives prompt review.
- A four-part daily meal plan based on the user's preferences, targets, and nutrient patterns from the last seven calendar days, averaging days with entries. Plans include actual portions and estimated totals; meals are logged only after the user chooses to record them.
- A responsive interface, iOS icons, Home Screen manifest, and offline app shell. Private account responses never enter the service-worker cache. Internet is required for account data and saving.

## Important product boundaries

Photo suggestions are **not** ingredient detection, a scale, or a food safety check. CLIP compares the image with a small list of food labels. Initial grams come from typical servings; they are not inferred measurements. Photos cannot reveal hidden animal ingredients, distinguish every preparation, or establish allergy safety. Users must correct ingredients and portions. Cal.ai-level automatic ingredient segmentation and weight estimation are not implemented.

The first image-model download is roughly 150 MB and requires a supported browser, internet, and sufficient memory. Images remain in the browser's memory while editing. CDN/model requests download code and weights; they do not upload the photo. Recognition failures preserve manual entry. Real iPhone performance must be validated on hardware.

Nutrition values reflect the selected USDA food and preparation, not a laboratory analysis of the actual meal. Missing nutrients remain explicitly unknown. Starting targets use general adult FDA Daily Values, with a 2,000 kcal reference; they are editable, not personalized clinical requirements. Meal suggestions do not diagnose deficiencies or guarantee complete nutrition. In particular, vegan users need a reliable B12 source and may need individual professional guidance.

## Account and database architecture

The production Cloudflare Worker runs behind **Sites' trusted authentication gateway**. Sites owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, and `/callback`; the app does not implement OAuth, collect passwords, or accept an account ID from the browser.

The server reads the gateway-injected `oai-authenticated-user-id`. This stable, site-scoped ID is used in **every** meal/profile SQL query and write. Email and name are display-only. Meal IDs are unique per account. Authenticated writes also require a same-origin `Origin` and validated, bounded JSON. Responses use `Cache-Control: private, no-store`. SQL uses bound parameters. Account-data deletion affects only the signed-in visitor and does not delete their ChatGPT account.

**Do not deploy this Worker directly on an unprotected public endpoint.** Its identity headers are trustworthy only behind the Sites gateway. A standalone host needs a verified authentication layer that strips client identity headers before this application runs. Google sign-in would need an additional supported identity-provider configuration and server-side verification; a cosmetic Google button is not sufficient.

Tables and the immutable initial migration are in `db/` and `drizzle/`. Sites provisions D1 and applies the packaged schema migration at deployment. The journal reads up to 5,000 recent meals per account. Export regularly; pagination can be added for larger histories.

## Hosting and cost

The live version is published through the **Sites plugin**, on its Cloudflare-backed hosting, with D1 for records. It requires no separate server rental or paid model API key. The Sites URL and account system are managed through the connected ChatGPT account; any product-level access or hosting limits are set by that service.

For independent hosting, **Cloudflare Workers Free** is an option with a documented 100,000-request daily quota; D1 also has free-tier limits. A Cloudflare account and a separately verified authentication layer would be needed. This repository is not automatically connected to an independent Cloudflare account. GitHub Pages can host a frontend but cannot run this account-backed API on its own.

- [Cloudflare Workers limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Cloudflare D1 pricing and free allowances](https://developers.cloudflare.com/d1/platform/pricing/)

## Development and verification

Requires Node.js 24 for the SQLite-backed tests (the deployed Worker has no npm runtime dependencies).

```sh
npm ci
npm test
npm run check
npm run build
```

Authored client assets are in `web/`; the API is in `worker/index.js`. The dependency-free build embeds client assets and the food database in `dist/server/index.js`, which default-exports a Worker fetch handler. Generated build output is ignored by Git.

To change schema, edit `db/schema.js`, run `npm run db:generate`, inspect and commit the generated SQL and Drizzle metadata, then republish. Never edit applied migration files or create tables during requests.

To rebuild the nutrition subset, download the official archive into a scratch directory and run:

```sh
python scripts/import-usda.py /path/to/FoodData_Central_sr_legacy_food_json_2018-04.zip
```

The importer retains the archive SHA-256 and selects records by stable NDB number. The downloaded full archive is not checked into the repository.

Tests cover nutrient scaling, missing data, multiple dietary patterns, multilingual label checks, CSV escaping, portion validation, planning filters, SQL migrations, anonymous rejection, cross-origin writes, account isolation, scoped deletion, duplicate meal saves, and client meal/preference/journal flows using a simulated DOM. Those checks do not replace Safari, camera, authentication-provider, or model performance tests on a physical iPhone.

## Sources

- [USDA FoodData Central datasets](https://fdc.nal.usda.gov/download-datasets/) — public-domain nutrient data, SR Legacy April 2018.
- [FDA Daily Values](https://www.fda.gov/food/nutrition-facts-label/daily-value-nutrition-and-supplement-facts-labels) — starting reference values.
- [MedlinePlus vegetarian diets](https://medlineplus.gov/vegetariandiet.html) and [NIH vitamin B12](https://ods.od.nih.gov/factsheets/Vitaminb12-Consumer/) — general nutrition context.
- [Xenova CLIP model](https://huggingface.co/Xenova/clip-vit-base-patch32) — pinned model revision `6b7c523703ae26e39be4b03774966f8571c7f523`; [Transformers.js](https://huggingface.co/docs/transformers.js/) 3.7.2.
- Food photograph: Anna Pelzer / Unsplash. Fonts: DM Sans and Manrope, served by Google Fonts.
