import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
const root = path.resolve(import.meta.dirname, '..');
process.chdir(root);
for (const script of ['generate', 'verify', 'reader-check']) {
  const result = spawnSync(process.execPath, [`tools/${script}.mjs`], {stdio:'inherit'});
  assert.equal(result.status, 0, `${script} failed`);
}
// Refresh the displayed verification counts after verifying the generated book.
const generated = spawnSync(process.execPath, ['tools/generate.mjs'], {stdio:'inherit'});
assert.equal(generated.status, 0);
const output = path.join(root, 'build/site');
fs.rmSync(output, {recursive:true, force:true});
fs.mkdirSync(output, {recursive:true});
// Explicit publication list: never copy the working directory or build outputs wholesale.
const entries = ['index.html','contents.html','404.html','sitemap.xml','robots.txt','.nojekyll',
  'chapters','appendix','assets','project','checkpoints','README.md','LICENSE',
  'dependency-lock.json','verification.json'];
const extensions = new Set(['.html','.css','.js','.png','.svg','.odin','.wgsl','.patch','.json','.txt','.md','.xml','.ttf']);
for (const entry of entries) fs.cpSync(entry, path.join(output, entry), {
  recursive:true,
  filter: source => {
    const stat = fs.lstatSync(source);
    assert(!stat.isSymbolicLink(), `Refusing to publish symlink: ${source}`);
    return stat.isDirectory() || extensions.has(path.extname(source)) || ['LICENSE','.nojekyll'].includes(path.basename(source));
  },
});
// Fonts are CSS dependencies, so the HTML link walk alone cannot validate them.
for (const name of fs.readdirSync('assets/fonts')) {
  assert(fs.existsSync(path.join(output,'assets/fonts',name)), `Missing published font/license: ${name}`);
}
// Validate the actual artifact, including downloadable code and assets.
let pages = 0;
for (const entry of fs.readdirSync(output, {recursive:true})) {
  if (!entry.endsWith('.html')) continue;
  pages++;
  const file = path.join(output, entry), html = fs.readFileSync(file, 'utf8');
  for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const url = match[1];
    if (/^(https?:|mailto:|data:|#)/.test(url)) continue;
    const target = path.resolve(path.dirname(file), decodeURIComponent(url.split(/[?#]/)[0]));
    assert(target.startsWith(output + path.sep), `${entry}: URL escapes site`);
    assert(fs.existsSync(target), `${entry}: unpublished link ${url}`);
  }
}
console.log(`Staged ${pages} pages and reader downloads in build/site.`);
