import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

// The original static app needs no transpilation. Validate without rewriting it.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'dist');
process.chdir(root);
assert(existsSync(resolve(output, 'index.html')), 'dist/index.html is required');
const walk = folder => readdirSync(folder).flatMap(name => {
  const path = resolve(folder, name);
  return statSync(path).isDirectory() ? walk(path) : [path];
});
const files = walk(output);
let references = 0;
function localReference(from, value) {
  if (/^(?:https?:|data:|mailto:|tel:|#|\/\/)/i.test(value)) return;
  const clean = decodeURIComponent(value.split(/[?#]/)[0]);
  if (!clean) return;
  const path = clean.startsWith('/') ? resolve(output, '.' + clean) : resolve(dirname(from), clean);
  assert(path.startsWith(output + '/'), 'Reference leaves production directory: ' + value);
  assert(existsSync(path) && statSync(path).isFile(), relative(root, from) + ': missing or case-mismatched asset ' + value);
  references++;
}
for (const path of files) {
  if (!/\.(?:html|css|js)$/.test(path)) continue;
  const text = readFileSync(path, 'utf8');
  if (path.endsWith('.html')) {
    for (const match of text.matchAll(/(?:src|href)=["']([^"']+)["']/g)) localReference(path, match[1]);
  }
  if (path.endsWith('.css')) {
    for (const match of text.matchAll(/url\(\s*["']?([^"')\s]+)["']?\s*\)/g)) localReference(path, match[1]);
  }
  if (path.endsWith('.js') || path.endsWith('.html')) {
    for (const match of text.matchAll(/(?:from\s*|import\s*\(\s*)["'](\.[^"']+)["']/g)) localReference(path, match[1]);
  }
  if (path.endsWith('.js')) {
    const syntax = spawnSync(process.execPath, ['--check', path], { encoding: 'utf8' });
    assert.equal(syntax.status, 0, relative(root, path) + ': ' + syntax.stderr);
  }
}
console.log('Static production build passed: ' + files.length + ' production/source files, ' + references + ' local references, JavaScript syntax checked.');
console.log('Output: dist/ (editable static source; no compilation or external asset downloads).');
