# Pulse City

A browser-local, interactive 3D last-mile delivery experiment by Vinh Nguyen.

Serve `dist/` through any static web host. All fonts, Three.js, GSAP, and visual assets are included locally. There is no login, backend, map API, or build requirement.

`assets/simulation.js` owns the deterministic road graph, rider movements, preparation and pickup waits, compatible batching, capacity, live deadline forecasts, weather, and calculated metrics. `assets/city.js` renders the model in Three.js using shared building instances. `assets/app.js` owns the gated story and accessible interface. GSAP animates metrics and transitions.

The guided experience has three decisions: assignment, batching, and disruption response. Free exploration exposes demand, weather, entity inspection, and the objective slider. Playback supports pause and 1× / 2× / 4× speed. The city supports drag and arrow-key orbiting, wheel or button zoom, and Enter to open rider inspection. The inspection dropdown provides keyboard access to all entity types.

Numbers are illustrative simulation outputs, not live operational data. On-time rate combines completed deliveries and ETA forecasts. The opening includes 50 simulated historical deliveries as a baseline; the result’s delivered count includes only the current run.

Run `node checks.mjs` for simulation, graph, reset, performance structure, asset, and interface checks. These checks do not replace visual testing in a WebGL-capable browser.

V1.3 adds a shared `DecisionFeedback` pipeline with actual before/after snapshots, pending-policy realization, ranked customer consequences, route ghosts, grouped/numbered stops, and replay without reapplying a choice. All strategic controls use this pipeline, including exploration demand/weather controls and new orders. Heatmap uses a unique district assignment for each active order; rain changes speed and SLA without inventing demand. `v13.css` keeps the existing visual identity and separates the content, city, legend, and live status into responsive document flow.

Run `node checks-v13.mjs` for every branch, future eligibility, prioritization, replay, and actual generated Three.js geometry. The compact results are recorded in `V13-audit.json`, with browser checks explicitly marked unavailable.
