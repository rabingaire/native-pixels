/* Progressive enhancement only: the complete book is in static HTML. */
(() => {
  'use strict';
  const root = document.documentElement;
  const get = key => { try { return localStorage.getItem(key); } catch { return null; } };
  const set = (key,value) => { try { localStorage.setItem(key,value); } catch { /* file:// storage can be restricted */ } };
  const theme = document.querySelector('.theme-toggle');
  const saved = get('native-pixels-theme');
  if (saved === 'dark' || saved === 'light') root.dataset.theme = saved;
  theme.hidden = false;
  const syncThemeLabel = () => {
    const dark = root.dataset.theme === 'dark' || (!root.dataset.theme && matchMedia('(prefers-color-scheme:dark)').matches);
    theme.textContent = dark ? 'Light' : 'Dark';
    theme.setAttribute('aria-label', `Switch to ${dark?'light':'dark'} theme`);
  };
  syncThemeLabel();
  new MutationObserver(syncThemeLabel).observe(root,{attributes:true,attributeFilter:['data-theme']});
  matchMedia('(prefers-color-scheme:dark)').addEventListener('change',syncThemeLabel);
  theme.addEventListener('click', () => {
    const dark = root.dataset.theme === 'dark' || (!root.dataset.theme && matchMedia('(prefers-color-scheme:dark)').matches);
    root.dataset.theme = dark ? 'light' : 'dark'; set('native-pixels-theme',root.dataset.theme); syncThemeLabel();
  });
  const focus = document.querySelector('.focus-toggle');
  focus.hidden = false;
  focus.addEventListener('click', () => { const active = document.body.classList.toggle('focus-mode'); focus.setAttribute('aria-pressed',String(active)); focus.textContent = active?'Show contents':'Focus'; });
  const onPage = document.querySelector('.on-this-page details');
  if (onPage) {
    const wide = matchMedia('(min-width: 901px)');
    const adaptContents = () => { onPage.open = wide.matches; };
    adaptContents(); wide.addEventListener('change', adaptContents);
  }
  document.querySelectorAll('pre code').forEach(block=>{
    const source=block.textContent;
    const figure=block.closest('.code-block');if(!figure)return;
    const button=document.createElement('button');button.type='button';button.className='code-copy';button.textContent='Copy';button.setAttribute('aria-label','Copy code');
    button.addEventListener('click',async()=>{
      try {
        if(navigator.clipboard?.writeText) await navigator.clipboard.writeText(source);
        else throw Error('No Clipboard API on this file origin');
        button.textContent='Copied';
      }catch{
        const selection=getSelection(),range=document.createRange();range.selectNodeContents(block);selection.removeAllRanges();selection.addRange(range);
        button.textContent='Selected';button.setAttribute('aria-label','Code selected; use your keyboard copy shortcut');
      }
      setTimeout(()=>{button.textContent='Copy';button.setAttribute('aria-label','Copy code');},2200);
    });figure.append(button);
  });
  const updateProgress=()=>{const total=document.documentElement.scrollHeight-innerHeight;document.querySelector('.reading-progress').style.width=`${total>0?Math.min(100,scrollY/total*100):0}%`;};
  addEventListener('scroll',updateProgress,{passive:true});addEventListener('resize',updateProgress);updateProgress();
  const filename=location.pathname.split('/').at(-1);
  if(/^\d\d-[a-z-]+\.html$/.test(filename))set('native-pixels-last',filename);
  const resume=document.querySelector('.resume-reading'),last=get('native-pixels-last');
  if(resume && last && /^\d\d-[a-z-]+\.html$/.test(last)){
    const known=resume.dataset.knownChapters?.split(' ').includes(last);
    if(known){resume.href=`chapters/${last}`;resume.hidden=false;}
  }
  const search=document.querySelector('#chapter-search');
  if(search){search.parentElement.hidden=false;search.addEventListener('input',()=>{
    const query=search.value.toLowerCase().trim();let count=0;
    document.querySelectorAll('[data-chapter-search]').forEach(li=>{li.hidden=!li.dataset.chapterSearch.toLowerCase().includes(query);if(!li.hidden)count++;});
    document.querySelector('#search-status').textContent=query?`${count} matching chapter${count===1?'':'s'}`:'';
  });}
  document.querySelectorAll('.coordinate-demo').forEach(figure=>{
    figure.querySelector('.interactive-only').hidden=false;const slider=figure.querySelector('input');
    slider.addEventListener('input',()=>{const x=Number(slider.value);figure.querySelector('.demo-character').setAttribute('x',String(100+x/2));figure.querySelector('.coordinate-readout').textContent=`World x = ${x} · NDC x = ${(2*x/960-1).toFixed(3)}`;});
  });
  // Open a collapsed source listing if a link/browser search targets something inside it.
  const revealHash=()=>{if(!location.hash)return;let id;try{id=decodeURIComponent(location.hash.slice(1));}catch{return;}const node=document.getElementById(id);for(let p=node;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;};
  addEventListener('hashchange',revealHash);revealHash();
})();
