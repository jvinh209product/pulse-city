# PULSE CITY V1.3 — Current implementation status

Source: latest saved Site version **2**, commit **c47972b0167638b63dcfd6da3d2795928351f29d**, published at export. This report describes actual saved files, including retained completed earlier work; it does not claim every requirement in unseen historical specifications is complete.

**Implementation and verification are separate.** Implemented means code exists; Passed applies only to the named programmatic evidence in VALIDATION.md. Browser visual/click/touch/GPU results are never labeled Passed.

| Feature | Implementation | Evidence / verification scope |
|---|---|---|
| Original identity, typography, assets and procedural 3D city | Implemented | dist/ copied byte-for-byte; actual browser appearance Not tested. |
| Balanced V1.3 hero, exact heading and Start Dispatching | Implemented | v13.css responsive grid and heading/DOM assertions; eight camera-fit widths. Visual layout and CTA clicks Not tested. |
| Separate legend and live rider/status blocks | Implemented | index.html / v13.css document flow. Dynamic wrapping/overlap Not tested in browser. |
| Real demand Heatmap and legend | Implemented | heatState unique active-order district assignment; actual materials/overlays tested in CPU Three.js. GPU appearance Not tested. |
| City / Heatmap / System retain state | Implemented | setView tests unchanged model/projection matrix; System hides buildings to expose roads/routes. Tab clicks Not tested. |
| Nearest Rider | Implemented | Pickup-distance assignment and entity-specific route geometry; fixture R02. |
| Available Rider | Implemented | Eligible idle/low-load assignment, capacity and route geometry; fixture R08. |
| Route Fit | Implemented | Compatibility/detour scoring and actual updated road route; fixture R04. |
| Batching Off | Implemented | Future single-order rule, truthful pending policy and later realization; does not undo existing batches. |
| Conservative batching | Implemented | Actual compatible two-order group, capacity and numbered-stop geometry. |
| Aggressive batching | Implemented | Actual feasible groups above two orders, capacity four, and delayed eligibility. |
| Continuous objective slider | Implemented | 10/50/90 policy bands; 40→45 changes candidate scores continuously. Physical input and exact endpoints 0/100 Not tested. |
| Dinner Rush / Normal demand | Implemented | Actual demand and arrival policy/feedback exercised; order cap 110. GPU heat response Not tested. |
| Heavy Rain / Clear skies | Implemented | Speed, fleet eligibility, ETA/SLA and feedback exercised; rain does not change heat counts. GPU rain Not tested. |
| Protect SLA | Implemented | Deadline objective; feasible future-stop reordering, current stop fixed; actual beneficiaries and delays. |
| Protect Cost | Implemented | Route-fit/aggressive objective and real consolidation/capacity consequences. |
| Protect High-Value Customers | Implemented | Priority/value ranking, feasible rerouting and actual promoted/displaced customers. |
| Send a new order / cap response | Implemented | Actual order and impact; 110-order cap yields no_change_possible without adding an order. |
| Universal shared decision feedback | Implemented | All strategic UI mutations use applyDecision → DecisionFeedback → presentImpact; snapshots, IDs, routes, finite metric diffs, rationale/benefit/trade-off. |
| 3D impact reactions and annotations | Implemented | Actual route ghosts/routes, rider halos, stops, pickup/customer markers and rank geometry checked; GPU visibility/timing Not tested. |
| View affected, Close and Last decision | Implemented | Original handlers and scene methods preserved; real browser interactions Not tested. |
| Replay impact | Implemented | Stored impact replay preserves model and history; button/animation Not tested in browser. |
| Duplicate prevention, pending/no-change feedback | Implemented | Engine dedupe, delayed policy realization and capped-order no-change checked; physical repeated clicks Not tested. |
| Final results and decision summary | Implemented | app.js finish derives outcomes from model; 27 story combinations have three choices and completed deliveries. End-to-end DOM presentation Not tested. |
| Run the City Again / Guided experience reset | Implemented | Simulation/feedback resets checked; UI clicks Not tested. |
| Explore Freely and entity inspection | Implemented | Demand/weather/new-order model branches exercised; rider/order/merchant/district handlers preserved. Inspection UI Not tested. |
| Pause / simulation movement | Implemented | Paused model stops; continuous graph movement, preparation waits and pickup-before-delivery checked. |
| Speeds 1×/2×/4×, camera/zoom/orbit, sound | Implemented | Original control code retained; physical UI, audio playback and speed control Not tested. |
| Keyboard/focus, reduced motion, mobile touch | Implemented | Original source behavior preserved; accessibility/device/browser behavior Not tested. |
| Creator credit and safe exact portfolio link | Implemented | Text, exact URL, target/rel inspected; external destination availability and link click Not tested. |
| Metadata, favicon and social image | Implemented | Local files/references included; original absolute Open Graph domain retained and needs updating for a new domain. |
| Lower-detail rendering/performance | Implemented | Instancing, cap, pixel-ratio and shadow reduction present; FPS/device performance Not tested. |
| WebGL initialization failure fallback | Implemented (message/reload only) | Original error UI and module-load catch; failure path Not tested. Alternate playable non-WebGL renderer Missing. |
| Portable static build / deployment config | Implemented in export copy | Export-only npm scripts, lockfile and vercel.json; see actual results in VALIDATION.md. Real Vercel deployment Not tested. |

## Known limits, with no new development

- Browser/GPU rendering, exact responsive layout, actual DOM clicks, mobile touch, audio and complete accessibility QA remain **Not tested**.
- No known missing named V1.3 strategic model/feedback or Heatmap implementation was found in saved source. This is not a guarantee about untested browser states.
- Policies can wait for eligible work. An unchanged slider value retains policy and shows the original unchanged-objective badge rather than recording another decision. Existing batches continue after Off.
- Without WebGL the app offers an error/reload message, not playable alternate rendering.
- Original Open Graph metadata needs a new domain after independent deployment.
- No backend, real data, account/cross-session save, imported model/texture packs, translations or map API exists or is implied.
