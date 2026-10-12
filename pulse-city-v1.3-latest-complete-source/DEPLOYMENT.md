# Deploy the exported PULSE CITY source yourself

No deployment, publishing, GitHub push, repository creation or live Site change was performed during export.

## Exact settings

| Setting | Actual project value |
|---|---|
| Framework Preset | **Other** (static HTML/CSS/JS; vercel.json sets framework to null) |
| Root Directory | **./** when package.json is at GitHub repository root |
| Node.js version | **24.x** (package.json and .nvmrc); verified with 24.19.0 |
| Package Manager | **npm**, single package-lock.json; npm 11.x, verified with 11.9.0 |
| Install Command | **npm ci** |
| Build Command | **npm run build** |
| Output Directory | **dist** |
| Development Command | **npm run dev** (http://127.0.0.1:5173/) |
| Preview / Start | **npm run preview** or **npm start** (http://127.0.0.1:4173/) |
| Environment Variables | **No environment variables required** |
| Routing / Rewrite | **None**. One page with hash anchors, no path-based client router |

dist/ is the original editable source and static production tree. The build validates it without compilation. Do not choose Next.js or Vite, rename the output to build/, or delete dist/.

Local scripts require macOS/Linux or Windows WSL; native Windows path handling is not supported. Vercel uses Linux.

The Node server is for local dev/preview only. Vercel serves dist/ statically, without serverless functions. npm ci installs no external packages because the declared Three.js/GSAP dependencies are already vendored locally.

## GitHub → Vercel checklist

1. Create a separate GitHub repository, such as **pulse-city**, preferably empty without duplicate README/lockfile/starter boilerplate. A default branch **main** is suitable.
2. Extract pulse-city-v1.3-latest-complete-source.zip locally.
3. Upload **all files and folders inside the extracted project directly to the repository root**. Upload the contents, not the ZIP and not an extra outer extracted directory. Include package.json, package-lock.json, dist/, scripts/, vercel.json and the dotfiles.
4. Confirm package.json is immediately visible at the GitHub repository root beside dist/ and scripts/. Commit to main for a new project. For an existing production repository, use a feature branch and review its Vercel Preview before merging.
5. Open **Vercel → Add New → Project** and import the correct repository.
6. Set **Root Directory = ./** when package.json is at repository root. If uploaded in a subdirectory, move the contents to root or select the **actual subdirectory containing package.json**; do not guess.
7. Confirm **Other**, Node **24.x**, and the exact install/build/output settings above. vercel.json supplies framework and commands. The npm lockfile selects npm.
8. Leave environment variables empty. No API/database/Sites keys or secrets are required.
9. Inspect the proposed URL and **Project → Domains** separately. The repository/project name does not reserve pulse-city.vercel.app or necessarily change an assigned production domain. Optional names to try: pulse-city.vercel.app, pulse-city-sim.vercel.app, pulsecity-sim.vercel.app. Their availability was **not checked or claimed**. Use the actual available domain Vercel provides, or a domain you control following Vercel's instructions.
10. Deploy from your account, then confirm Vercel reports successful production deployment. This export did not perform that step.
11. Visit the actual production domain and complete the smoke checks below. Record the real final URL and project link for portfolio/LinkedIn use.

GitHub web upload may miss dotfiles: confirm .gitignore and .nvmrc separately. The ZIP has no .git directory or remote credentials.

## Routing, assets and sharing

Home is /. Authored deep links are hash anchors such as /#how-it-works and /#creator; refresh loads the same entrypoint. /index.html also serves the page. Assets use local relative paths under /assets/.

There is no /dashboard or other SPA path route. Unknown paths and missing assets should return 404. No blanket SPA rewrite is included, which avoids serving HTML in place of a missing module. For subdirectory hosting, serve the whole dist/ directory under that base and retain relative paths.

The creator URL remains https://vinh-nguyen-portfolio-three.vercel.app/. The original og:url and og:image retain the original Site URL to preserve saved source. After choosing a new production domain, update both entries to that domain and its /assets/social-preview.png. The image is included locally.

## Production smoke checks

- Home, loader, exact heading, Start Dispatching, hero and legend/status spacing at desktop/tablet/mobile.
- WebGL city, continuous riders, routes/stops, pickup/customer markers, entity inspection and camera controls. Without WebGL, the existing error/reload message is expected; alternate playable rendering is not implemented.
- City → Heatmap → System → City preserves world/camera; demand changes heat; rain changes speed/risk without fabricating orders.
- All dispatch/batching/rain-response options, slider, Dinner Rush/Normal demand, Heavy Rain/Clear skies and new-order cap.
- Grounded impact IDs, before/after values and trade-offs; honest pending/no-change feedback; View affected, Replay impact, Last decision and Close.
- Final summary, Run the City Again, Explore Freely, Guided experience, pause, speeds and sound after a user gesture.
- Hash-link refreshes, keyboard/focus, reduced motion, mobile touch/orbit/taps and creator link.

VALIDATION.md separates programmatic results from browser **Not tested** checks. No export build blocker is known; local build success does not claim an actual Vercel deployment was verified.

## Primary configuration references

Checked at export:

- https://vercel.com/docs/project-configuration/vercel-json (framework null = Other; command/output overrides).
- https://vercel.com/docs/functions/runtimes/node-js/node-js-versions (supported Node 24.x and engines selection).
