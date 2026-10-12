# PULSE CITY — Latest Current V1.3 Complete Source

A browser-local, isometric 3D last-mile delivery simulation by Vinh Nguyen. Choose dispatch, batching and rain-response priorities, then inspect real model consequences for riders, routes, customers and delivery promises.

## Exact saved source

This export uses the latest saved Site version **2**, version ID **appgprj_6ac465074a508191b3d09cbab053f0c3~appgver_6d3c9660d1cc8191ab15c697bd41068e**, source commit **c47972b0167638b63dcfd6da3d2795928351f29d**. The saved version was **published** when exported. The native version listing returned no newer saved version; the clean current checkout matched the saved commit.

All application files and assets in dist/ are byte-for-byte copies of that commit. Its completed earlier features and V1.3 feedback/Heatmap work are preserved. This export does not recreate historical specifications. SOURCE-HASHES.json contains computed SHA-256 values for the application and original tests. SOURCE-README.md preserves the original README.

The existing Site, its configuration and repository were not modified. No GitHub repository or Vercel deployment was created.

## Actual stack and requirements

- Static HTML, CSS and native JavaScript ES modules; no React, Next.js, Vite, TypeScript or SSR.
- Locally vendored **Three.js 0.160.1** and **GSAP 3.12.5**, declared in package.json. There are no npm runtime/development dependencies.
- Local fonts: DM Sans 4.004, Space Grotesk 2.000 (regular/bold), IBM Plex Mono 2.3. Full font licenses and library notices are included.
- macOS/Linux (or Windows WSL) for the minimal local scripts; native Windows path guards are not supported.
- Node.js **24.x**, npm **11.x** for portable scripts. Export verification uses Node **24.19.0**, npm **11.9.0**. package-lock.json is the sole package-manager lockfile.
- Modern browser with WebGL for interactive 3D. Serve over HTTP; do not open index.html through file://.
- **No environment variables required.** No backend, login, database, map API or ChatGPT Sites service is required at runtime.

## Install, develop, build and preview

Extract the ZIP and open a terminal in the folder containing package.json.

    npm ci
    npm run dev

Open http://127.0.0.1:5173/. Edit the source and reload the browser; the minimal static server has no hot module replacement.

    npm run build
    npm run preview

Open http://127.0.0.1:4173/. npm start also starts the preview. Select another port with npm run preview -- --port 4174.

The original app is source-level static JavaScript: **dist/ is the editable source and production output**, not an opaque generated substitute for missing source. npm run build validates JS syntax and case-sensitive local asset/import references without rewriting the app. **Do not delete dist/ before building.**

Included original programmatic checks:

    npm run check
    npm run check:v13

The second check writes V13-audit.json. See VALIDATION.md, validation-results.json and validation.log for the export's single focused pass and precise limitations.

## Game flow and V1.3 behavior

Start Dispatching begins the guided experience. Observe and inspect the city; choose Nearest Rider / Available Rider / Route Fit; handle Dinner Rush; choose Off / Conservative / Aggressive batching; adjust the objective slider; then respond to Heavy Rain with Protect SLA / Protect Cost / Protect High-Value Customers. Final results report model-calculated outcomes and recorded choices. Run the City Again resets the model. Explore Freely exposes demand, weather, new-order and entity-inspection controls.

City, Heatmap and System share one simulation. Heatmap assigns every active order to one district, with low (1–5), medium (6–11), high (12+) intensity. Rain changes speed, fleet availability and SLA rather than inventing demand. System view hides buildings to expose the road/route network; it is not a separate backend architecture diagram.

DecisionFeedback captures actual before/after snapshots, affected entity IDs, prior/updated road routes, metric differences, beneficiaries and trade-offs. Scene feedback includes applicable route ghosts, rider rings, numbered stops, pickup/customer markers and rank labels. View affected, Replay impact and Last decision reuse the recorded impact. Replay does not apply the choice again.

A policy can honestly wait for the next eligible order/rider. An already active or infeasible operation can report no change. Batching Off does not undo existing assigned batches. Priority reordering fixes the current destination, never teleports a rider and never reassigns an already picked-up order.

## Editable source structure

| Path | Purpose |
|---|---|
| dist/index.html | Original single-page entrypoint, UI, metadata and error fallback |
| dist/assets/app.js | Guided/free flow, controls, inspection, feedback presentation and metrics UI |
| dist/assets/simulation.js | Original road graph, seeded entities, dispatch, batching, weather, movement, estimates and KPI engine |
| dist/assets/city.js | Procedural Three.js city, camera, riders/orders, materials, Heatmap and scene interactions |
| dist/assets/feedback.js | Shared decisions, snapshots, derived impacts, delayed effects, history and replay |
| dist/assets/impact-scene.js | Before/after route geometry, stops, entity markers and rank annotations |
| dist/assets/style.css, v13.css | Original identity and V1.3 responsive layout |
| dist/assets/ | Vendored libraries, fonts, favicon and local social image |
| checks.mjs, checks-v13.mjs | Existing model, geometry, asset and V1.3 branch checks |
| scripts/build.mjs, serve.mjs | Export-only portable build validation and local static serving |
| vercel.json, .nvmrc, package*.json | Deployment, Node and npm configuration |
| licenses/, THIRD-PARTY-NOTICES.md | Font/library license information |
| FEATURE-STATUS.md, VALIDATION.md | Implementation evidence and verification limitations |
| DEPLOYMENT.md, EXPORT-MANIFEST.json | GitHub/Vercel handoff and exact provenance |

No extra enclosing directory is needed: package.json is at the ZIP root. The application entrypoint remains dist/index.html, as in the original source-level architecture.

## 3D and performance

The city uses shared/instanced meshes. Existing checks count 2,245 instances and fewer than 100 static city meshes. Active orders are capped at 110 and rider capacity at four. Pixel ratio is limited to 1.3 in low detail and 1.7 otherwise; additional detail reduction lowers it to one and disables shadows. Reduced-motion preferences suppress decorative transitions/movement while preserving simulation.

WebGL initialization failure displays the original truthful error and Reload Experience button. **There is no playable non-WebGL renderer.** Browser visual layout, GPU rendering, real clicks, mobile touch and audio remain untested in this export environment.

## Simulated data and metadata

All orders, customers, merchants, money, weather and SLA numbers are fictional, local and illustrative. Fifty simulated historical deliveries provide a baseline; the final delivered count covers the current run. The on-time indicator combines completed deliveries with ETA forecasts. There is no real operational data or cross-session account save.

All essential runtime assets are included locally. Original og:url and og:image still name the existing Site, preserved with the source. After choosing the independent production domain, update those two metadata URLs in dist/index.html to the domain and /assets/social-preview.png. This does not block the app build or runtime.

Built by Vinh Nguyen. Portfolio: https://vinh-nguyen-portfolio-three.vercel.app/
