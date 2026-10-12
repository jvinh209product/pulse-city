# PULSE CITY — Focused export validation

Source: latest saved Site version **2**, published at export, commit **c47972b0167638b63dcfd6da3d2795928351f29d**.

**One focused pass** ran against the separate export copy. There was one production build command; no application refactoring, redesign, new feature development, Site mutation, publishing, GitHub push or Vercel deployment was performed.

## Build, install and package evidence

| Check | Actual command / evidence | Result |
|---|---|---|
| npm ci; exit 0; 0.294 s | validation-results.json and validation.log | PASSED |
| npm run build; exit 0; 0.711 s | validation-results.json and validation.log | PASSED |
| npm run check; exit 0; 2.691 s | validation-results.json and validation.log | PASSED |
| npm run check:v13; exit 0; 3.002 s | validation-results.json and validation.log | PASSED |
| Local production preview | npm run preview; home and all 16 saved production files returned HTTP 200 with exact local bytes and correct JS/CSS/font MIME types; unknown route and missing module returned 404 | PASS |
| Hash anchor refresh | /#creator loads the original entry response over HTTP; anchor scroll/navigation itself was not exercised | PASS (HTTP only) |
| Source preservation | Computed SHA-256 matches for 16 application/asset files, two original tests and the preserved original README | PASS |
| JavaScript / assets | Build checks all seven JS files for syntax and 19 local references on case-sensitive Linux | PASS |
| Dependencies | npm ci uses the sole npm lockfile; zero npm packages; Three.js/GSAP/fonts already included locally | PASS |
| ZIP root/extraction | Final archive membership, CRC, extraction and byte equality checked; package.json and reports are directly at ZIP root; dist/index.html present | See final measured result in EXPORT-MANIFEST.json |
| Real Vercel deployment | Not requested and not performed | NOT TESTED |

Runtime: Node v24.19.0, npm 11.9.0. Started 2026-10-12T09:56:12.507951+00:00; finished 2026-10-12T09:56:19.562889+00:00.
The npm environment emitted an informational unknown http-proxy config warning; commands exited zero. It comes from the execution environment, not this package.

The build is a real static production-tree validation, not transpilation: the original source-level static app already runs from dist/. It does not alter source files or fabricate a compiled framework.

Original checks passed: 27 baseline model story combinations, pickup waits, graph movement, rain, pause/reset, five extra random seeds, extended exploration, 2,245 instanced elements and DOM-target/local-asset assertions. V1.3 checks separately passed 27 recorded action exercises, 27 complete strategic combinations, distinct dispatch fixture riders R02/R08/R04, compatible batching, crisis rerouting, delayed eligibility, continuous weights, replay, dedupe, reset and Heatmap materials/counts.

Camera footprint fit is tested mathematically at 1920, 1680, 1440, 1280, 1024, 768, 390, 320 px. This does not test text wrapping, overlap, responsive CSS rendering or touch interaction.

## Decision acceptance matrix

**Passed below means programmatic model/CPU Three.js geometry assertions only.** Every GPU-rendered response and browser click remains Not tested. Pending policy is an observed, valid decision-time state, not a failed implementation; the later realization is separately asserted. Geometry is listed only when the actual test generated it.

| Scenario | Choice | Model/state effect | Spatial/3D response | Metrics/explanation | Status | Evidence/test command |
|---|---|---|---|---|---|---|
| Dispatch | Nearest Rider | 1 order was assigned to R02. | previous-route, updated-route, numbered-stop, affected-rider, pickup, customer | R02 load, R02 route, #A1100 SLA buffer; rationale, benefit and trade-off asserted | Passed | npm run check:v13; V13-audit.json row 1; applied |
| Dispatch | Available Rider | 1 order was assigned to R08. | updated-route, numbered-stop, affected-rider, pickup, customer | R08 load, R08 route, #A1100 SLA buffer; rationale, benefit and trade-off asserted | Passed | npm run check:v13; V13-audit.json row 2; applied |
| Dispatch | Route Fit | 1 order was assigned to R04. | previous-route, updated-route, numbered-stop, affected-rider, pickup, customer | R04 load, R04 route, #A1100 SLA buffer; rationale, benefit and trade-off asserted | Passed | npm run check:v13; V13-audit.json row 3; applied |
| Demand | Dinner Rush | 12 real orders entered the city. The arrival timer is now in dinner rush. | affected-rider, displaced | Active orders, Waiting orders, On-time forecast; rationale, benefit and trade-off asserted | Passed | npm run check:v13; V13-audit.json row 4; applied |
| Batching | Off | The policy is active. Routes will change at the next eligible assignment. | displaced | Waiting orders, SLA at risk, On-time forecast; rationale, benefit and trade-off asserted | Pending policy | npm run check:v13; V13-audit.json row 5; pending_eligible_orders |
| Batching | Conservative | 3 orders were assigned to R11, R01, R06. | previous-route, updated-route, numbered-stop, affected-rider, pickup, customer, promoted | R11 load, R11 route, #A1108 SLA buffer; rationale, benefit and trade-off asserted | Passed | npm run check:v13; V13-audit.json row 7; applied |
| Batching | Aggressive | 24 orders were assigned to R12, R07, R10, R11, R02, R01, R03, R04, R06, R05, R09. | previous-route, updated-route, numbered-stop, affected-rider, pickup, customer | R12 load, R12 route, #A1102 SLA buffer; rationale, benefit and trade-off asserted | Passed | npm run check:v13; V13-audit.json row 9; applied |
| Weather | Heavy Rain | Travel speeds and live ETAs changed; 10 riders can accept new orders. Demand counts are unchanged. | affected-rider, sla-warning | Rider speed, Available riders, SLA at risk; rationale, benefit and trade-off asserted | Passed | npm run check:v13; V13-audit.json row 10; applied |
| Protection | Protect SLA | 11 waiting orders moved ahead; 8 moved back. | promoted, displaced | Waiting orders, SLA at risk, On-time forecast; rationale, benefit and trade-off asserted | Pending policy | npm run check:v13; V13-audit.json row 11; pending_eligible_orders |
| Protection | Protect Cost | 21 orders were assigned to R04, R09, R01, R05, R03, R07, R02, R06. | previous-route, updated-route, numbered-stop, affected-rider, pickup, customer | R04 load, R04 route, #A1105 SLA buffer; rationale, benefit and trade-off asserted | Passed | npm run check:v13; V13-audit.json row 13; applied |
| Protection | Protect High-Value Customers | 7 waiting orders moved ahead; 12 moved back. | promoted, displaced | Waiting orders, SLA at risk, On-time forecast; rationale, benefit and trade-off asserted | Pending policy | npm run check:v13; V13-audit.json row 15; pending_eligible_orders |
| Optimization | 10 — customer experience | The policy is active. Routes will change at the next eligible assignment. | No immediate route geometry; truthful pending_eligible_orders | Waiting orders, SLA at risk, On-time forecast; rationale, benefit and trade-off asserted | Pending policy | npm run check:v13; V13-audit.json row 16; pending_eligible_orders |
| Optimization | 50 — balanced | The policy is active. Routes will change at the next eligible assignment. | No immediate route geometry; truthful pending_eligible_orders | Waiting orders, SLA at risk, On-time forecast; rationale, benefit and trade-off asserted | Pending policy | npm run check:v13; V13-audit.json row 17; pending_eligible_orders |
| Optimization | 90 — delivery efficiency | 21 orders were assigned to R12, R06, R10, R09, R01, R07, R03, R02, R11. | previous-route, updated-route, numbered-stop, affected-rider, pickup, customer | R12 load, R12 route, #A1105 SLA buffer; rationale, benefit and trade-off asserted | Passed | npm run check:v13; V13-audit.json row 18; applied |
| Protection | Protect SLA | R01 kept the current stop and changed later waypoints. | previous-route, updated-route, numbered-stop, affected-rider | R01 load, R01 route, #A1100 SLA buffer; rationale, benefit and trade-off asserted | Passed | npm run check:v13; V13-audit.json row 19; applied |
| Protection | Protect High-Value Customers | R01 kept the current stop and changed later waypoints. | previous-route, updated-route, numbered-stop, affected-rider | R01 load, R01 route, #A1100 SLA buffer; rationale, benefit and trade-off asserted | Passed | npm run check:v13; V13-audit.json row 20; applied |
| Batching | Aggressive — no eligible rider fixture | The policy is active. Routes will change at the next eligible assignment. | No immediate route geometry; truthful pending_eligible_orders | Waiting orders, SLA at risk, On-time forecast; rationale, benefit and trade-off asserted | Pending policy | npm run check:v13; V13-audit.json row 21; pending_eligible_orders |
| Demand | Normal demand | New demand slows to the normal rate; existing deliveries continue. | affected-rider | Active orders, Waiting orders, On-time forecast; rationale, benefit and trade-off asserted | Passed | npm run check:v13; V13-audit.json row 23; applied |
| Weather | Clear skies | Travel speeds and live ETAs changed; 12 riders can accept new orders. Demand counts are unchanged. | affected-rider, sla-warning | Rider speed, Available riders, SLA at risk; rationale, benefit and trade-off asserted | Passed | npm run check:v13; V13-audit.json row 25; applied |
| Order | Send a new order | New order #A1110 entered the waiting queue. Existing eligible orders keep their dispatch priority. | updated-route, numbered-stop, affected-rider, pickup, customer, new-order, promoted | Active orders, Waiting orders, On-time forecast; rationale, benefit and trade-off asserted | Passed | npm run check:v13; V13-audit.json row 26; applied |
| Order | Send a new order at 110 active orders | No order was added: the city already has 110 active promises. | No immediate route geometry; truthful no_change_possible | Waiting orders, SLA at risk, On-time forecast; rationale, benefit and trade-off asserted | Passed | npm run check:v13; V13-audit.json row 27; no_change_possible |
| Optimization | 40 → 45 (within one band) | Continuous weighting changes candidate score without crossing a batching band | Scene effect depends on eligible routes | Different finite candidate scores asserted | Passed | npm run check:v13; continuous-weight assertions |
| Optimization | 0 / 100 exact endpoints | Range endpoints exist in HTML; model clamps 0–100 | Not exercised at exact endpoints | Bands tested at 10/50/90 instead | Not tested | Source reviewed; no exact endpoint assertion in existing tests |
| Optimization | Release/commit an unchanged value | Existing UI keeps policy and shows unchanged badge | Existing routes stay active | No additional decision logged by unchanged-value UI path | Not tested | app.js commitObjective; source review only |
| Impact replay | Replay impact | Stored impact is returned without reapplying the mutation | Generated geometry can be reused; actual animation unverified | Model snapshot/history unchanged | Passed | npm run check:v13; captureState and history assertions |
| Impact controls | View affected / Last decision / Close | Handlers preserved; recorded entity focus/replay/close | Focus and presentation handlers in city.js/app.js | Presentation is from recorded impact | Not tested | Source review; browser DOM QA unavailable |
| Duplicate commit | Same decision key | Returns existing response without another history event | No second mutation | History length unchanged | Passed | npm run check:v13; same-commit assertions |
| Pending effects | Next eligible assignment | Pending policy realizes against actual assignment/events | Actual generated geometry then exists | realized and applied status asserted | Passed | npm run check:v13; waiting rider and batching-Off fixtures |
| View modes | City / Heatmap / System | Same simulation and projection matrix across view changes | Heat overlays/material desaturation; System hides buildings; City restores materials | Heat total equals active orders; rain does not inflate counts | Passed | npm run check:v13; CPU CityScene method/geometry assertions |
| Reset | Simulation / feedback reset | 18 active orders, clear skies, zero history and no last impact | UI reset controls preserved | Fresh model baseline asserted | Passed | npm run check and npm run check:v13 |
| Playback | Pause/resume model | No simulation-time progression while stopped | Movement driven by actual model afterward | Finite values and continued deliveries | Passed | npm run check; paused/rain/extended-exploration assertions |
| Story | All 27 authored strategic combinations | Three strategic decisions, deliveries continue through rain | Actual path/pickup/capacity invariants | Finite calculated metrics and distinct outcome ranges | Passed | npm run check (27) and npm run check:v13 (27); model execution, not DOM flow |

## Browser smoke status

| Check | Implementation evidence | Status |
|---|---|---|
| Home / Start Dispatching / loader | Original index.html and app.js handlers; entry and assets load over HTTP | Not tested in browser |
| GPU city / rain / Heatmap appearance | Original Three.js renderer and procedural geometry retained; CPU geometry checked | Not tested |
| Entity inspection / affected focus / camera | Rider/order/merchant/district handlers, keyboard orbit, pointer and zoom paths retained | Not tested |
| Final results / Run the City Again / Explore Freely / Guided experience | Original flow and handlers retained; model combinations/reset checked | Not tested as DOM flow |
| Pause and 1×/2×/4× control | Model pause checked; original control handlers retained | Not tested as DOM controls |
| Responsive hero / legend / live status / navigation | v13.css and index.html retained; eight camera-fit widths checked | Not tested as rendered CSS |
| Mobile taps/orbit, keyboard/focus, reduced motion, sound | Existing source code retained | Not tested |
| Creator link | Exact URL/credit and target=_blank, rel=noopener noreferrer inspected | Link click / destination availability Not tested |
| WebGL failure message | Existing import catch/error UI and reload button preserved | Not tested |

## Minimal export-only portability changes

1. Added Node 24/npm 11 version declarations, export release label 1.3.0, and explicit vendored dependency metadata to package.json. Kept the original npm check command; added check:v13, static build/dev/preview/start commands.
2. Added dependency-free Node static build validation and preview server. The original dist/ source structure was retained, with no HTML/CSS/JS application changes.
3. Generated the single package-lock.json for zero npm dependencies; added .nvmrc and static vercel.json. No SPA rewrite, serverless runtime or environment variable was added.
4. Replaced the export README with the requested handoff and retained the original as SOURCE-README.md. Added deployment/status/validation/provenance reports, exact source hashes and matching third-party license notices.
5. Omitted the Site-only .openai hosting identity file and all git/cache/runtime directories. The saved application requires no Site-only service.
6. Ran checks-v13.mjs in the export copy, refreshing its generated V13-audit.json as the original test already does. The source repository remained untouched.

## Known limits and blockers

- **No known build or Vercel static-deployment blocker** was observed on Linux. No actual Vercel project/deployment was tested.
- Browser/GPU rendering, physical mouse/touch/keyboard interactions, exact responsive layout, audio and full accessibility remain **Not tested**. No screenshot or manual click evidence is fabricated.
- Exact slider endpoints 0/100 and the unchanged-value UI gesture were not exercised by the existing tests; representative values 10/50/90 and continuous scores 40→45 passed.
- WebGL is required for gameplay. Existing fallback is a truthful error/reload message; a playable non-WebGL renderer is missing.
- Policy-only changes can wait for eligible orders/riders; already picked-up deliveries and current destinations are preserved. Off affects future assignments, not existing batches.
- Original Open Graph absolute URLs still reference the original Site. Update them after choosing a new domain; all essential runtime assets are local.
- Local export scripts use POSIX path guards and were verified on Linux. Use macOS/Linux or WSL for local development; native Windows path handling is not supported by these minimal scripts. This does not affect Vercel Linux deployment.
- The final summary, link targets and UI flow are present in code, but complete end-to-end browser gameplay was not tested.
