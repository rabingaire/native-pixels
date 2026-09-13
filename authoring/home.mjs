export function home(chapters, parts, chapterPath) {
  const routes = [
    'Set up Odin and SDL, open a native window, and learn how the GPU turns geometry into pixels.',
    'Connect the window to WebGPU. Choose a device, present a clear frame, and draw your first triangle.',
    'Understand vertex memory, build an indexed rectangle, and place it with shader uniforms.',
    'Turn keyboard input and elapsed time into movement. Handle resizing, transparency, and cleanup.',
    'Add a furnished room, sprite textures, collision, diagnostics, and a character that walks.',
  ];
  return `<div class="home-content">
<section class="hero">
  <div class="hero-copy"><p class="eyebrow">A practical guide to native graphics</p><h1>Native Pixels</h1><p class="deck">Understand the renderer.<br>Build a world you can explore.</p><p class="hero-description">Learn native 2D WebGPU with Odin and SDL3, one working program at a time. Follow every step from an empty window to an animated character in a furnished room.</p><div class="hero-actions"><a class="button primary" href="${chapterPath(chapters[0])}">Start with chapter 1 <span aria-hidden="true">→</span></a><a class="button secondary" href="contents.html">Browse the chapters</a></div><a class="resume-reading" hidden href="contents.html" data-known-chapters="${chapters.map(c=>chapterPath(c).split('/').at(-1)).join(' ')}">Continue where you left off →</a></div>
  <figure class="art-preview home-preview"><img src="assets/room-gameplay.png" width="1920" height="1280" alt="The finished native game: an animated character exploring a furnished pixel-art room"><figcaption><span class="figure-label">The game you’ll build</span>A real frame from the native application. Movement, furniture collision, and animation are all part of the main path.</figcaption></figure>
</section>
<dl class="book-facts"><div><dt>23 chapters</dt><dd>A complete, runnable program at every step.</dd></div><div><dt>47 optional challenges</dt><dd>Take the game further, at your own pace.</dd></div><div><dt>Read and build offline</dt><dd>Local fonts, included artwork, complete source.</dd></div></dl>
<section class="home-section" id="the-route"><p class="eyebrow">The learning path</p><h2>One project. Five parts.</h2><p class="section-intro">Each part builds on the last. Start at the beginning, or use the checkpoints to revisit an idea.</p><ol class="learning-path">${parts.map((part,i)=>{
    const group=chapters.filter(c=>c.part===part);
    return `<li><a href="${chapterPath(group[0])}"><div><span class="path-meta">Part ${['I','II','III','IV','V'][i]} · Chapters ${group[0].number}–${group.at(-1).number}</span><h3>${part.split(' · ')[1]}</h3><p>${routes[i]}</p></div><span class="path-arrow" aria-hidden="true">→</span></a></li>`;
  }).join('')}</ol></section>
<section class="home-section getting-started" id="before-you-start"><div><p class="eyebrow">Before you start</p><h2>New to graphics?<br>You’re in the right place.</h2></div><div><p>You should be comfortable with variables, functions, loops, and structs. Graphics experience is not required: each chapter introduces the concepts, explains the choices, and follows concrete values through the code.</p><p>Read the explanation, make the change, then run the checkpoint. The complete files are there whenever you need a reference. You can skip every challenge and still finish the game.</p><a class="text-link" href="appendix/build.html">Get the toolchain ready <span aria-hidden="true">→</span></a></div></section>
<section class="home-section home-reference"><p class="eyebrow">Your reference shelf</p><h2>Keep the essentials close.</h2><div class="reference-grid"><a href="appendix/glossary.html"><h3>Glossary</h3><p>Clear definitions for the graphics vocabulary.</p><span aria-hidden="true">→</span></a><a href="appendix/cheat-sheets.html"><h3>Quick reference</h3><p>Initialization, frame order, bindings, and lifetimes.</p><span aria-hidden="true">→</span></a><a href="appendix/final-source.html"><h3>Complete source</h3><p>Every file in the finished application.</p><span aria-hidden="true">→</span></a></div></section>
</div>`;
}
