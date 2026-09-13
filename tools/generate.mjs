import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { snapshots, finalSource } from '../authoring/source.mjs';
import { chapters } from '../authoring/chapters.mjs';
import { appendices } from '../authoring/appendices.mjs';
import { esc, code, note, section, table, sourceId } from '../authoring/html.mjs';
import { spawnSync } from 'node:child_process';
import { learningGuide, challenges } from '../authoring/learning.mjs';
import { readerTestFiles } from '../authoring/reader-tests.mjs';
import { home } from '../authoring/home.mjs';
import { site, publishedURL } from '../authoring/site.mjs';
import { highlightCode } from '../authoring/highlight.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const write = (file, body) => {
  const target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, body);
};
for (let n = 1; n < snapshots.length; n++) {
  for (const [file, body] of Object.entries(snapshots[n])) {
    write(`checkpoints/${String(n).padStart(2, '0')}/${file}`, body);
  }
  if (n >= 19) {
    const retired = path.join(root,`checkpoints/${String(n).padStart(2,'0')}/game/collision.odin`);
    if (!('game/collision.odin' in snapshots[n]) && fs.existsSync(retired)) fs.unlinkSync(retired);
    for (const asset of ['room.png','player.png','PROMPTS.json', ...(n >= 23?['player-walk.png','ANIMATION-PROMPT.txt','ANIMATION-ALPHA-PROMPT.txt']:[])]) {
      const target = path.join(root, `checkpoints/${String(n).padStart(2,'0')}/assets/${asset}`);
      fs.mkdirSync(path.dirname(target), {recursive:true});
      fs.copyFileSync(path.join(root,'project/assets',asset), target);
    }
  }
}
// Explicitly retire the foundation's files when migrating to real Odin packages.
for (const old of ['src/gpu.odin','src/platform.odin','src/renderer.odin','src/game.odin','shaders/character.wgsl']) {
  const target = path.join(root,'project',old);
  if (!(old in finalSource) && fs.existsSync(target)) fs.unlinkSync(target);
}
for (const [file, body] of Object.entries(finalSource)) write(`project/${file}`, body);
console.log(`Generated ${snapshots.length-1} source checkpoints and canonical final source.`);

const chapterPath = c => `chapters/${String(c.number).padStart(2,'0')}-${c.slug}.html`;
const appendixPath = a => `appendix/${a.slug}.html`;
const railLink = (href, label, number = '', current = false) => `<a class="rail-link${number ? ' numbered' : ''}" href="${href}"${current ? ' aria-current="page"' : ''}>${number ? `<span class="rail-index">${number}</span>` : ''}<span class="rail-label">${label}</span></a>`;
const readingRail = (prefix, current, content) => {
  const chapter = chapters.find(c => chapterPath(c) === current);
  const appendix = appendices.find(a => appendixPath(a) === current);
  const headings = [...content.matchAll(/<h2 id="([^"]+)">([\s\S]*?)<\/h2>/g)];
  const title = chapter?.title || appendix?.title || (current === 'contents.html' ? 'The complete book' : 'From window to world');
  const kicker = chapter ? `Chapter ${chapter.number}` : appendix ? 'Reference' : 'Explore the book';
  let entries = headings.map(([,id,title]) => {
    const number = title.match(/<span class="section-number"[^>]*>(.*?)<\/span>/)?.[1] || '';
    const label = title.replace(/<a class="heading-link"[\s\S]*?<\/a>/g, '').replace(/<span class="section-number"[^>]*>[\s\S]*?<\/span>/g, '');
    return railLink(`#${id}`, label, number);
  }).join('');
  if (!entries && appendix) entries = appendices.filter(a=>a!==appendix).map(a=>railLink(`${prefix}${appendixPath(a)}`,a.title)).join('');
  if (!entries) entries = [...new Set(chapters.map(c=>c.part))].map((part,i)=>railLink(`${prefix}${chapterPath(chapters.find(c=>c.part===part))}`,part.split(' · ')[1],['I','II','III','IV','V'][i])).join('');
  const primary = [['index.html','Overview'],['contents.html','All chapters'],['appendix/build.html','Build the game']].map(([file,label])=>railLink(`${prefix}${file}`,label,'',current===file)).join('');
  const references = appendices.filter(a=>a.slug!=='build').map(a=>railLink(`${prefix}${appendixPath(a)}`,a.title,'',current===appendixPath(a))).join('');
  const prev = chapter ? chapters[chapter.number-2] : null, next = chapter ? chapters[chapter.number] : null;
  const navigation = chapter ? `<div class="rail-prev-next"><a href="${prev ? prefix+chapterPath(prev) : prefix+'index.html'}">← Previous</a><a href="${next ? prefix+chapterPath(next) : prefix+'appendix/final-source.html'}">${next ? 'Next' : 'Final source'} →</a></div>` : '';
  return `<aside class="book-rail"><a class="wordmark" href="${prefix}index.html"><span class="brand-mark" aria-hidden="true">▰</span><span>Native Pixels<span class="edition">ODIN / SDL3 / WEBGPU</span></span></a><nav class="rail-primary" aria-label="Book navigation">${primary}</nav><div class="rail-context"><p class="rail-kicker">${kicker}</p><a class="rail-title" href="#top">${title}</a><nav class="rail-sections" aria-label="${chapter ? 'Chapter' : 'Page'} sections">${entries}</nav>${navigation}</div><div class="rail-reference"><p class="rail-kicker">Keep nearby</p><nav aria-label="Reference pages">${references}</nav></div></aside>`;
};
const footer = prefix => `<footer class="page-footer"><span>Native Pixels · September 2026 edition</span><a href="${prefix}appendix/sources.html">Sources &amp; verification</a><a href="${prefix}LICENSE">MIT License</a><a href="#top">Back to top ↑</a></footer>`;
function page(file, title, content, options={}) {
  const prefix = file.includes('/')?'../':'';
  const description = (options.description || site.description).replace(/<[^>]*>/g, '');
  const url = publishedURL(file), fullTitle = `${title} — ${site.name}`;
  const image = publishedURL('assets/room-gameplay.png');
  const book = {'@type':'Book', '@id':site.url+'#book', name:site.name, url:site.url,
    description:site.description, inLanguage:'en', isAccessibleForFree:true,
    author:{'@type':'Person',name:site.author}, license:publishedURL('LICENSE'), image};
  const document = {'@type':file.startsWith('chapters/')?'Chapter':'WebPage',
    '@id':url, url, name:title, description, inLanguage:'en', isPartOf:{'@id':book['@id']}};
  const graph = [book, document];
  if (!options.home) graph.push({'@type':'BreadcrumbList', itemListElement:[
    {'@type':'ListItem',position:1,name:site.name,item:site.url},
    {'@type':'ListItem',position:2,name:title,item:url},
  ]});
  const json = JSON.stringify({'@context':'https://schema.org','@graph':graph}).replaceAll('<','\\u003c');
  if (!options.home) content = readingStructure(content, file);
  content = highlightCode(content);
  // Reserve the real image aspect ratio; captures may change with display DPI.
  content = content.replace(/<img\b[^>]*>/g, tag => {
    const src = tag.match(/src="([^"]+)"/)?.[1];
    if (!src?.endsWith('.png')) return tag;
    const bytes = fs.readFileSync(path.resolve(root, path.dirname(file), src));
    if (bytes.subarray(1,4).toString() !== 'PNG') throw Error(`Invalid PNG: ${src}`);
    return tag.replace(/\s(?:width|height)="[^"]*"/g, '').replace('<img ', `<img width="${bytes.readUInt32BE(16)}" height="${bytes.readUInt32BE(20)}" `);
  });
  write(file, `<!doctype html>
<html lang="en"><head><meta charset="utf-8">${options.home?'<meta name="google-site-verification" content="-vixsPfkpxDLeq6Ls4CqWHw56gtbBHYSRIuIL6IDCl0" />':''}<meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="description" content="${esc(description)}"><meta name="author" content="${esc(site.author)}"><title>${esc(fullTitle)}</title><link rel="canonical" href="${esc(url)}"><link rel="sitemap" type="application/xml" href="${prefix}sitemap.xml"><meta property="og:type" content="${options.home?'website':'article'}"><meta property="og:site_name" content="${site.name}"><meta property="og:locale" content="en_US"><meta property="og:title" content="${esc(fullTitle)}"><meta property="og:description" content="${esc(description)}"><meta property="og:url" content="${esc(url)}"><meta property="og:image" content="${image}"><meta property="og:image:alt" content="Pixel-art room rendered with native WebGPU, Odin, and SDL3"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(fullTitle)}"><meta name="twitter:description" content="${esc(description)}"><meta name="twitter:image" content="${image}"><script type="application/ld+json">${json}</script><script>try{const theme=localStorage.getItem("native-pixels-theme");if(theme==="light"||theme==="dark")document.documentElement.dataset.theme=theme;}catch{}</script><link rel="stylesheet" href="${prefix}assets/style.css"><script defer src="${prefix}assets/book.js"></script></head>
<body id="top" class="${options.home?'home-page':'reading-page'}"><a class="skip-link" href="#main">Skip to content</a><div class="reading-progress" aria-hidden="true"></div>${readingRail(prefix,file,content)}<div class="page-shell"><header class="topbar"><div class="breadcrumb"><a href="${prefix}index.html">Native Pixels</a><span aria-hidden="true">/</span><span>${options.home ? 'Overview' : file === 'contents.html' ? 'All chapters' : file.startsWith('chapters/') ? 'Chapter '+Number(file.slice(9,11)) : 'Reference'}</span></div><div class="reader-controls"><button type="button" class="theme-toggle" hidden aria-label="Change color theme">Theme</button><button type="button" class="focus-toggle" hidden aria-pressed="false">Focus</button><a class="mobile-contents" href="${prefix}contents.html">Contents</a></div></header><main id="main" tabindex="-1">${content}</main>${footer(prefix)}</div></body></html>\n`);
}
// Generate anchors and navigation into HTML so links also work without scripts.
function readingStructure(content, file) {
  let index = 0;
  const entries = [];
  const chapter = file.startsWith('chapters/') ? Number(file.slice(9, 11)) : null;
  content = content.replace(/<section([^>]*)><h2>([\s\S]*?)<\/h2>/g, (_, attrs, title) => {
    const id = `section-${++index}`;
    const plain = title.replace(/<[^>]*>/g, '');
    const number = chapter ? `${chapter}.${index}` : '';
    entries.push(`<li><a href="#${id}">${number ? `<span>${number}</span> ` : ''}${title}</a></li>`);
    return `<section${attrs}><h2 id="${id}">${number ? `<span class="section-number" aria-hidden="true">${number}</span>` : ''}${title}<a class="heading-link" href="#${id}" aria-label="Link to ${esc(plain)}">#</a></h2>`;
  });
  return content.replace('<nav class="on-this-page" aria-label="On this page" hidden></nav>', entries.length ? `<nav class="on-this-page" aria-label="On this page"><details><summary>In this ${chapter ? 'chapter' : 'reference'}</summary><ol>${entries.join('')}</ol></details></nav>` : '');
}
const nav = (c) => {
  const prev = chapters[c.number-2], next = chapters[c.number];
  return `<nav class="chapter-navigation" aria-label="Chapter navigation"><a href="${prev?'../'+chapterPath(prev):'../index.html'}"><span>← Previous ${prev?'Chapter':'page'}</span><small>${prev?esc(prev.title):'Book introduction'}</small></a><a href="../contents.html">Contents</a><a href="${next?'../'+chapterPath(next):'../appendix/final-source.html'}"><span>Next ${next?'Chapter':'reference'} →</span><small>${next?esc(next.title):'Complete final source'}</small></a></nav>`;
};
for (const c of chapters) {
  const n = String(c.number).padStart(2,'0'), snapshot = snapshots[c.number], previous = snapshots[c.number-1] || {};
  const modifications = [...new Set([...Object.keys(snapshot),...Object.keys(previous)])].filter(f=>snapshot[f]!==previous[f]);
  const changeTable = modifications.length ? table(['File','Operation'], modifications.map(f=>[`<code>${f}</code>`,snapshot[f]===undefined?'Remove after creating its replacement in the new package': previous[f]===undefined?'Add this file':'Replace the changed portions shown below; preserve all other code'])) : '<p>No implementation changes. This checkpoint retains the previous complete runnable source.</p>';
  let diff = '';
  if (modifications.length) {
    for (const f of modifications) {
      const old = previous[f]===undefined?'/dev/null':path.join(root,`checkpoints/${String(c.number-1).padStart(2,'0')}/${f}`);
      const now = snapshot[f]===undefined?'/dev/null':path.join(root,`checkpoints/${n}/${f}`);
      const result = spawnSync('diff',['-u','--label',`before/${f}`,'--label',`after/${f}`,old,now],{encoding:'utf8'});
      if (result.status !== 0 && result.status !== 1) throw Error(result.stderr);
      diff += result.stdout;
    }
    write(`checkpoints/${n}/changes.patch`,diff);
  }
  const snapshotHTML = Object.entries(snapshot).map(([f,source])=>`<details class="source-file" id="${sourceId(f)}"><summary>${esc(f)} <span>${source.trimEnd().split('\n').length} lines</span></summary><figure class="code-block"><figcaption>${f} · complete file in your project</figcaption><pre><code class="language-${f.endsWith('.wgsl')?'wgsl':'odin'}" data-source="checkpoints/${n}/${f}" data-reader-file="${f}">${esc(source)}</code></pre></figure></details>`).join('');
  const tests = Object.entries(readerTestFiles(c.number)).map(([f,source])=>`<details class="source-file"><summary>${f} · test file</summary><figure class="code-block"><figcaption>${f} · complete file</figcaption><pre><code class="language-odin" data-reader-file="${f}">${esc(source)}</code></pre></figure></details>`).join('');
  const body = learningGuide(c.number) + c.body;
  const proseWords = body.replace(/<pre>[\s\S]*?<\/pre>/g,'').replace(/<[^>]+>/g,' ').split(/\s+/).length;
  const files = section('Apply the changes to your project',
    `<p>Work in <code>native-pixels-game</code>, the directory created in chapter 1. ${modifications.length ? 'The table lists every application file that changes in this chapter. Create any missing parent directories before adding a file. Keep files not listed here.' : 'This chapter changes no application files. Keep the working result from the preceding chapter.'}</p>`
    + changeTable
    + (diff ? `<details class="change-record"><summary>Line-by-line changes</summary><p>This is a comparison, not code to paste as a whole. A line starting with <code>-</code> is removed; a line starting with <code>+</code> is added without that prefix. A space marks unchanged context. Lines starting with <code>---</code>, <code>+++</code>, or <code>@@</code> identify files and positions. For a complete replacement, use the file listings below instead.</p>${code(diff,'diff')}</details>` : '')
    + `<p>Every complete application file for this stage follows. Open a file listing to read or copy its contents. For a new file, use the displayed path and all its contents. For an existing file, either make the focused edits taught above or replace it with its complete listing. Do not append a second copy of an existing procedure. Imports belong after the package line; procedures belong outside other procedures unless the lesson says otherwise.</p>`
    + (c.number>=19?`<p>The book includes the required image files. Save <a href="../project/assets/room.png" download="room.png">room.png</a> and <a href="../project/assets/player.png" download="player.png">player.png</a>${c.number>=23?`, plus <a href="../project/assets/player-walk.png" download="player-walk.png">player-walk.png</a>`:''} in your <code>assets</code> directory beside <code>src</code>. Keep their names exactly as shown. These are the images used by the chapter, not a source-code download. If you saved them earlier, keep those files.</p>`:'')
    + snapshotHTML + tests);
  const run = section('Build and check your result',
    `<p>Save your files and close the previous running copy. From <code>native-pixels-game</code>, use the build command matching your SDL installation. Rebuilding is necessary after editing Odin, WGSL, or an embedded image.</p>`
    + code('odin build src -out:build/native-pixels -debug -vet -extra-linker-flags:"-L$BOOK_SDL_PREFIX/lib -Wl,-rpath,$BOOK_SDL_PREFIX/lib"\n./build/native-pixels','shell','macOS/Linux · source-built SDL; use the absolute BOOK_SDL_PREFIX set in chapter 1')
    + code('odin build src -out:build/native-pixels -debug -vet -extra-linker-flags:"-L/opt/homebrew/lib"\n./build/native-pixels','shell','macOS Apple Silicon · Homebrew SDL; Intel Homebrew uses /usr/local/lib')
    + code('odin build src -out:build/native-pixels.exe -debug -vet\n./build/native-pixels.exe','powershell','Windows x64 · keep the matching SDL3.dll in build')
    + `<p><strong>Expected result:</strong> ${c.outcome}</p><p>If the result differs, check the error message and the symptom table in this chapter. The complete listings above include the imports, setup calls, and cleanup calls as well as the new feature.</p>`);
  page(chapterPath(c), c.title, `<article class="chapter"><header class="chapter-header"><span class="chapter-display-number" aria-hidden="true">${c.number}</span><p class="eyebrow">${c.part} <span>Chapter ${n} / ${chapters.length}</span></p><h1>${c.title}</h1><p class="deck">${c.deck}</p><p class="reading-meta">${Math.ceil(proseWords/180)} min read + implementation</p></header>${note('At the end of this chapter',c.outcome,'outcome')}<nav class="on-this-page" aria-label="On this page" hidden></nav>${body}${files}${run}${section('What we have now',`<p>${c.outcome}</p><p>Before continuing, explain how the change in this chapter produces that result. Use the worked example and code above to follow any step you cannot yet explain.</p>`)}${challenges(c.number)}${nav(c)}</article>`, {description:c.deck});
}
for (let i=0;i<appendices.length;i++) {
  const a=appendices[i], prev=appendices[i-1], next=appendices[i+1];
  let body = a.body;
  if(a.slug==='sources' && fs.existsSync(path.join(root,'verification.json'))){
    const r=JSON.parse(fs.readFileSync(path.join(root,'verification.json'),'utf8'));
    body=body.replace('</div>',`${table(['Check','Recorded result'],[
      ['Static pages and paths',r.static?.status==='passed'?`${r.static.pages} pages; ${r.static.localLinksAndAssets} local links/assets; ${r.static.exactSourceBlocks} exact source blocks`:'See verification.json'],
      ['Projects reconstructed from the book',r.readerReconstruction?.nativeBuilds ? `${r.readerReconstruction.chapters.length} built from HTML listings and included artwork on ${r.readerReconstruction.platform}/${r.readerReconstruction.architecture}; in-book tests passed at chapters 21–23` : 'See verification.json'],
      ['Native checkpoint builds',r.nativeBuild?.status==='passed'?`${r.nativeBuild.checkpoints.length} compiled and linked on ${r.nativeBuild.platform}/${r.nativeBuild.architecture}`:'See verification.json'],
      ['Movement tests',r.nativeBuild?.status==='passed'?`${r.nativeBuild.movementTests} passed`:'See verification.json'],
      ['Actual intermediate presentation',r.nativeStages?.status==='passed'?'Chapters 7–16: 12 successful presents each':'See verification.json'],
      ['Foundation native presentation',r.nativeSmoke?.successfulPresents?`${r.nativeSmoke.successfulPresents} successful presents, two resize requests, final position (520,100)`:'See verification.json'],
      ['Animated room presentation',r.roomSmoke?.status==='passed'?`${r.roomSmoke.successfulPresents} successful presents; two resizes; chair/wall contact; F1 overlay; actual framebuffer captures`:'See verification.json'],
      ['Room/animation unit tests',r.nativeBuild?.roomTests?`${r.nativeBuild.roomTests} passed`:'See verification.json'],
      ['Offline browser checks',r.browser?.status==='passed'?`${r.browser.pageViewportChecks} page/viewport checks; ${r.browser.viewports.join(', ')}px; scripts-disabled reading passed`:'See verification.json'],
    ])}</div>`);
  }
  page(appendixPath(a),a.title,`<article class="chapter"><header class="chapter-header"><p class="eyebrow">Reference / ${String.fromCharCode(65+i)}</p><h1>${a.title}</h1><p class="deck">${a.deck}</p></header><nav class="on-this-page" aria-label="On this page" hidden></nav>${body}<nav class="chapter-navigation" aria-label="Reference navigation"><a href="${prev?prev.slug+'.html':'../'+chapterPath(chapters.at(-1))}">← ${prev?prev.title:'Final chapter'}</a><a href="../contents.html">Contents</a><a href="${next?next.slug+'.html':'../index.html'}">${next?next.title:'Book introduction'} →</a></nav></article>`,{description:a.deck});
}
const parts = [...new Set(chapters.map(c=>c.part))];
const contents = parts.map(part=>`<section class="contents-part"><h2>${part}</h2><ol>${chapters.filter(c=>c.part===part).map(c=>`<li data-chapter-search="${esc(c.title+' '+c.deck)}"><a href="${chapterPath(c)}"><span class="large-num">${String(c.number).padStart(2,'0')}</span><span><strong>${c.title}</strong><small>${c.deck}</small></span><span aria-hidden="true">↗</span></a></li>`).join('')}</ol></section>`).join('');
page('contents.html','Contents',`<article class="chapter contents-page"><header class="chapter-header"><p class="eyebrow">The whole journey</p><h1>Every step, in order.</h1><p class="deck">${chapters.length} chapters. One native program. Every stage has a complete, runnable checkpoint.</p></header><div class="contents-search" hidden><label for="chapter-search">Find a chapter</label><input id="chapter-search" type="search" placeholder="Try “uniform”, “resize”, or “movement”"><p id="search-status" role="status"></p></div>${contents}<section class="contents-part"><h2>Reference / keep these nearby</h2><ul class="reference-list">${appendices.map(a=>`<li><a href="${appendixPath(a)}">${a.title}<span>↗</span></a></li>`).join('')}</ul></section></article>`,{description:'Browse all 23 Native Pixels chapters and six reference appendices: Odin, SDL3, WebGPU, sprite rendering, collision, and animation.'});
page('index.html','WebGPU for native 2D games in Odin',home(chapters,parts,chapterPath),{home:true});
console.log(`Generated ${chapters.length+appendices.length+2} static HTML pages with embedded source, diagrams, and relative navigation.`);

const publishedPages = ['index.html','contents.html',...chapters.map(chapterPath),...appendices.map(appendixPath)];
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${publishedPages.map(file=>`  <url><loc>${esc(publishedURL(file))}</loc></url>`).join('\n')}
</urlset>\n`);
write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${publishedURL('sitemap.xml')}\n`);
write('.nojekyll', '');
// Absolute links keep the error page usable for arbitrarily deep missing URLs.
write('404.html', `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Page not found — Native Pixels</title><link rel="stylesheet" href="${publishedURL('assets/style.css')}"></head><body><main id="main" class="chapter"><h1>Page not found</h1><p>This page may have moved. Continue with <a href="${site.url}">Native Pixels</a> or browse <a href="${publishedURL('contents.html')}">the book contents</a>.</p></main></body></html>\n`);
