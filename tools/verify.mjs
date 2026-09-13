import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { snapshots, finalSource } from '../authoring/source.mjs';
import { chapters } from '../authoring/chapters.mjs';
import { learningGuide, challenges } from '../authoring/learning.mjs';
import { site, publishedURL } from '../authoring/site.mjs';
const root = path.resolve(import.meta.dirname,'..');
process.chdir(root);
const read = name => fs.readFileSync(name,'utf8');
const decode = s => s.replaceAll('&quot;','"').replaceAll('&gt;','>').replaceAll('&lt;','<').replaceAll('&amp;','&');
const pages = ['index.html','contents.html', ...fs.readdirSync('chapters').filter(x=>x.endsWith('.html')).map(x=>'chapters/'+x), ...fs.readdirSync('appendix').filter(x=>x.endsWith('.html')).map(x=>'appendix/'+x)];
// Every sitemap entry must resolve to a published reading page's canonical URL.
const sitemap = read('sitemap.xml');
assert.match(sitemap, /^<\?xml version="1\.0" encoding="UTF-8"\?>\s*<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
assert.match(sitemap, /<\/urlset>\s*$/);
const sitemapURLs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>decode(m[1]));
assert.equal(new Set(sitemapURLs).size, sitemapURLs.length, 'Duplicate sitemap URLs');
assert.deepEqual([...sitemapURLs].sort(), pages.map(publishedURL).sort(), 'Sitemap must list exactly the canonical reading URLs');
for (const value of sitemapURLs) {
  const url = new URL(value), base = new URL(site.url);
  assert.equal(url.protocol, 'https:', `Sitemap URL must use HTTPS: ${value}`);
  assert.equal(url.origin, base.origin, `Sitemap URL has the wrong origin: ${value}`);
  assert(url.pathname.startsWith(base.pathname), `Sitemap URL escapes the book path: ${value}`);
  assert(!url.search && !url.hash, `Sitemap URL contains a query or fragment: ${value}`);
}
assert(read('robots.txt').split('\n').includes(`Sitemap: ${publishedURL('sitemap.xml')}`), 'robots.txt must advertise the canonical sitemap');
let links=0, sourceBlocks=0, challengeCount=0;
for(const match of read("assets/style.css").matchAll(/url\(['"]?([^'")]+)['"]?\)/g)) {
  assert(fs.existsSync(path.resolve("assets",match[1])), `Missing stylesheet asset: ${match[1]}`);
}
const report = fs.existsSync('verification.json')?JSON.parse(read('verification.json')):{};
for(const [file,source] of Object.entries(finalSource)) assert.equal(read('project/'+file),source,`Canonical source drift: ${file}`);
for(let n=1;n<snapshots.length;n++) for(const [file,source] of Object.entries(snapshots[n])) assert.equal(read(`checkpoints/${String(n).padStart(2,'0')}/${file}`),source,`Checkpoint drift: ${n}/${file}`);
const voids = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
for(const name of pages){
  const html=read(name),ids=new Set(),stack=[];
  assert.match(html,/<!doctype html>/i);assert.match(html,/<html lang="en">/);
  assert.equal((html.match(/<h1[ >]/g)||[]).length,1,`${name}: one h1`);
  assert.match(html,/<main id="main"/); assert.match(html,/<title>[^<]+<\/title>/);
  const canonicals = [...html.matchAll(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"[^>]*>/g)];
  assert.equal(canonicals.length, 1, `${name}: one canonical URL`);
  assert.equal(decode(canonicals[0][1]), publishedURL(name), `${name}: canonical URL must match the sitemap`);
  assert(!/<meta\b[^>]*name="(?:robots|googlebot)"[^>]*content="[^"]*\b(?:noindex|none)\b/i.test(html), `${name}: sitemap page must allow indexing`);
  for(const m of html.matchAll(/\bid="([^"]+)"/g)){assert(!ids.has(m[1]),`${name}: duplicate id ${m[1]}`);ids.add(m[1]);}
  for(const m of html.matchAll(/\b(href|src)="([^"]+)"/g)){
    const url=decode(m[2]);if(/^(https?:|mailto:|data:)/.test(url))continue;
    assert(!url.startsWith('/'),`${name}: absolute local URL ${url}`);
    const [file,hash]=url.split('#');const target=path.resolve(path.dirname(name),decodeURIComponent(file||path.basename(name)));
    assert(fs.existsSync(target),`${name}: missing ${url}`);
    if(hash && target.endsWith('.html')) assert(read(target).includes(`id="${hash}"`),`${name}: missing fragment ${url}`);
    links++;
  }
  for(const m of html.matchAll(/<code\b[^>]*data-source="([^"]+)"[^>]*>([\s\S]*?)<\/code>/g)){
    assert.equal(decode(m[2]),read(m[1]),`${name}: displayed source drift ${m[1]}`);sourceBlocks++;
  }
  for(const m of html.matchAll(/<\/?([a-zA-Z][\w:-]*)\b[^>]*>/g)){
    const tag=m[1].toLowerCase(); if(voids.has(tag)||m[0].endsWith('/>'))continue;
    if(m[0].startsWith('</'))assert.equal(stack.pop(),tag,`${name}: misnested ${m[0]}`);else stack.push(tag);
  }
  assert.equal(stack.length,0,`${name}: unclosed tags ${stack}`);
  if(name.startsWith('chapters/')){assert.match(html,/aria-label="Chapter navigation"/);assert.match(html,/What we have now/);assert.match(html,/Experiments/);
    assert.match(html,/class="learning-guide"/);
    const extensions=html.match(/<section class="challenges">([\s\S]*?)<\/section>/)?.[1];
    assert(extensions,`${name}: missing optional extensions`);
    const count=(extensions.match(/<li>/g)||[]).length;
    assert(count>=2,`${name}: at least two chapter-specific challenges`);
    assert.match(extensions,/requires none of these/);
    challengeCount+=count;
  }
}
report.static = {status:'passed',pages:pages.length,localLinksAndAssets:links,exactSourceBlocks:sourceBlocks,checkpoints:snapshots.length-1,canonicalFiles:Object.keys(finalSource).length,htmlNesting:'passed',beginnerWalkthroughs:chapters.length,optionalChallenges:challengeCount,localFontAssets:'passed',chapterProseWords:chapters.reduce((n,c)=>n+(learningGuide(c.number)+c.body+challenges(c.number)).replace(/<pre>[\s\S]*?<\/pre>/g,'').replace(/<[^>]+>/g,' ').split(/\s+/).filter(Boolean).length,0)};
if(process.argv.includes('--native')){
  const extra = process.env.BOOK_LINKER_FLAGS || (process.platform==='darwin'?'-L/opt/homebrew/lib':'');
  fs.mkdirSync('build/checks',{recursive:true});
  const results=[];
  for(let n=1;n<snapshots.length;n++){
    const label=String(n).padStart(2,'0');
    const args=['build',`checkpoints/${label}/src`,'-vet',`-out:build/checks/chapter-${label}${process.platform==='win32'?'.exe':''}`];if(extra)args.push(`-extra-linker-flags:${extra}`);
    const result=spawnSync('odin',args,{encoding:'utf8'});
    assert.equal(result.status,0,`Checkpoint ${label} failed:\n${result.stdout}\n${result.stderr}`);
    results.push(label);console.log(`Compiled and linked checkpoint ${label}`);
  }
  const args=['test','tests/game','-out:build/checks/game-tests'];if(extra)args.push(`-extra-linker-flags:${extra}`);
  const tests=spawnSync('odin',args,{encoding:'utf8'});assert.equal(tests.status,0,tests.stdout+tests.stderr);console.log(tests.stdout+tests.stderr);
  const roomArgs=['test','tests/room','-out:build/checks/room-tests'];if(extra)roomArgs.push(`-extra-linker-flags:${extra}`);
  const roomTests=spawnSync('odin',roomArgs,{encoding:'utf8'});assert.equal(roomTests.status,0,roomTests.stdout+roomTests.stderr);console.log(roomTests.stdout+roomTests.stderr);
  report.nativeBuild={status:'passed',platform:process.platform,architecture:process.arch,odin:spawnSync('odin',['version'],{encoding:'utf8'}).stdout.trim(),checkpoints:results,movementTests:3,roomTests:11};
}
report.updated = new Date().toISOString();
fs.writeFileSync('verification.json',JSON.stringify(report,null,2)+'\n');
console.log(`PASS: ${pages.length} HTML pages, ${links} local links/assets, ${sourceBlocks} exact source blocks.`);
