import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { once } from 'node:events';
const root=path.resolve(import.meta.dirname,'..');process.chdir(root);
if(process.argv.includes('--close-previous')){
  for(const entry of fs.readdirSync('/tmp').filter(x=>x.startsWith('native-pixels-chrome-'))){
    const portFile=path.join('/tmp',entry,'DevToolsActivePort');if(!fs.existsSync(portFile))continue;
    const [port,url]=fs.readFileSync(portFile,'utf8').trim().split('\n');
    const socket=new WebSocket(`ws://127.0.0.1:${port}${url}`);
    await new Promise(resolve=>{const timer=setTimeout(()=>{socket.close();resolve();},1500);socket.addEventListener('open',()=>socket.send(JSON.stringify({id:1,method:'Browser.close'})));socket.addEventListener('close',()=>{clearTimeout(timer);resolve();});socket.addEventListener('error',()=>{clearTimeout(timer);resolve();});});
  }
  console.log('Closed prior browser instances using this task’s isolated profiles.');
  process.exit(0);
}
const profile=fs.mkdtempSync('/tmp/native-pixels-chrome-');
const chrome=process.env.BOOK_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const proc=spawn(chrome,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'],{stdio:['ignore','ignore','pipe']});
let ws,request=0;const pending=new Map();
const endpoint=await new Promise((resolve,reject)=>{let output='';const timer=setTimeout(()=>reject(Error('Chrome startup timeout')),15000);proc.once('error',reject);proc.stderr.on('data',chunk=>{output+=chunk;const match=output.match(/DevTools listening on (ws:\/\/[^\s]+)/);if(match){clearTimeout(timer);resolve(match[1]);}});});
try{
  ws=new WebSocket(endpoint);await once(ws,'open');
  ws.addEventListener('message',event=>{const data=JSON.parse(event.data);if(data.id){const callbacks=pending.get(data.id);pending.delete(data.id);if(data.error)callbacks.reject(Error(JSON.stringify(data.error)));else callbacks.resolve(data.result);}});
  const send=(method,params={},sessionId)=>new Promise((resolve,reject)=>{const id=++request;const timer=setTimeout(()=>{pending.delete(id);reject(Error(`CDP timeout: ${method}`));},15000);pending.set(id,{resolve:value=>{clearTimeout(timer);resolve(value);},reject:error=>{clearTimeout(timer);reject(error);}});ws.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));});
  const {targetId}=await send('Target.createTarget',{url:'about:blank'});
  const {sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
  const call=(m,p={})=>send(m,p,sessionId);
  await call('Page.enable');await call('Runtime.enable');
  const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value;};
  const navigate=async file=>{await call('Page.navigate',{url:pathToFileURL(path.join(root,file)).href});await evaluate('new Promise(resolve => { if(document.readyState === "complete") resolve(true); else addEventListener("load", () => resolve(true), {once:true}); })');await evaluate('document.fonts.ready.then(() => true)');};
  const pages=['index.html','contents.html',...fs.readdirSync('chapters').filter(x=>x.endsWith('.html')).map(x=>'chapters/'+x),...fs.readdirSync('appendix').filter(x=>x.endsWith('.html')).map(x=>'appendix/'+x)];
  const results=[];
  const sharedGeometry=new Map();
  const viewports=[360,390,768,1024,1280,1440,1680];
  for(const theme of ['light','dark']) for(const width of viewports){
    await call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<500});
    for(const file of pages){
      await navigate(file);
      await evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)}`);
      const state=await evaluate('({title:document.title,overflow:document.documentElement.scrollWidth>innerWidth+1,h1:document.querySelectorAll("h1").length,themeReady:!document.querySelector(".theme-toggle").hidden,brokenImages:[...document.images].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src),missingAnchors:[...document.querySelectorAll(".on-this-page a")].filter(a=>!document.getElementById(a.hash.slice(1))).length})');
      assert.equal(state.h1,1,`${file}: h1`);assert(!state.overflow,`${width}px: overflow on ${file}`);assert(state.themeReady,`${file}: script did not initialize`);assert.deepEqual(state.brokenImages,[],`${file}: broken image`);assert.equal(state.missingAnchors,0,`${file}: section links`);
      const clipped = await evaluate(`Array.from(document.querySelectorAll('.diagram svg')).flatMap(svg => {
        const bounds = svg.viewBox.baseVal;
        return Array.from(svg.querySelectorAll('text')).filter(text => {
          const b=text.getBBox();
          return b.x < bounds.x-1 || b.y < bounds.y-1 || b.x+b.width > bounds.x+bounds.width+1 || b.y+b.height > bounds.y+bounds.height+1;
        }).map(text=>text.textContent);
      })`);
      assert.deepEqual(clipped,[],`${width}px ${file}: clipped SVG labels`);
      if(file.startsWith('chapters/')) {
        assert(await evaluate('document.querySelectorAll(".challenges > ol > li").length >= 2'),`${file}: optional challenges`);
        assert(await evaluate('document.querySelector(".learning-guide").textContent.length > 400'),`${file}: beginner walkthrough`);
      }
      // Check the actual navigation geometry, including a pointer hover. This
      // catches flush labels and moving rows that an overflow check cannot see.
      if(width===1440) {
        const layout=await evaluate(`(() => {
          const rect=s=>{const b=document.querySelector(s).getBoundingClientRect();return {x:b.x,width:b.width}};
          return {rail:rect('.book-rail'),brand:rect('.wordmark'),content:rect('.chapter,.home-content'),header:rect('.topbar')};
        })()`);
        if(!sharedGeometry.has(theme))sharedGeometry.set(theme,layout);
        assert.deepEqual(layout,sharedGeometry.get(theme),`${file}: common page and sidebar edges`);
        const measure = async () => evaluate(`(() => {
          const a=document.querySelector('.rail-sections .rail-link');
          const b=a.getBoundingClientRect(),l=a.querySelector('.rail-label').getBoundingClientRect(),s=getComputedStyle(a);
          return {x:b.x,y:b.y,width:b.width,height:b.height,labelX:l.x,labelY:l.y,labelWidth:l.width,paddingLeft:s.paddingLeft,paddingRight:s.paddingRight};
        })()`);
        await evaluate('document.querySelector(".rail-sections .rail-link").scrollIntoView({behavior:"instant",block:"center"})');
        const before=await measure();
        assert.equal(before.paddingLeft,'12px',`${file}: hover text inset`);
        assert.equal(before.paddingRight,'12px',`${file}: trailing inset`);
        await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:before.x+before.width/2,y:before.y+before.height/2});
        const after=await measure();
        assert.deepEqual(after,before,`${file}: hovering must not move text or change row size`);
        await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:1000,y:10});
      }
      results.push({theme,width,file});
    }
  }
  await call('Emulation.setDeviceMetricsOverride',{width:390,height:1000,deviceScaleFactor:1,mobile:true});
  await navigate('chapters/04-instance-and-surface.html');
  assert.equal(await evaluate('document.querySelector(".on-this-page details").open'),false,'Mobile contents starts compact');
  await evaluate('document.querySelector(".on-this-page summary").click(); document.querySelector(".source-file").open=true');
  assert(await evaluate('document.querySelector(".on-this-page details").open'),'Contents opens');
  assert(await evaluate('document.documentElement.scrollWidth <= innerWidth+1'),'Expanded contents/source stays within viewport');
  await evaluate('localStorage.setItem("native-pixels-last","15-movement-in-seconds.html")');
  await navigate('index.html');
  assert(await evaluate('!document.querySelector(".resume-reading").hidden && document.querySelector(".resume-reading").getAttribute("href")==="chapters/15-movement-in-seconds.html"'),'Resume works for a chapter absent from the overview sidebar');
  await navigate('contents.html');
  await evaluate('document.querySelector("#chapter-search").value="uniform";document.querySelector("#chapter-search").dispatchEvent(new Event("input"))');
  assert(await evaluate('document.querySelectorAll("[data-chapter-search]:not([hidden])").length > 0 && document.querySelectorAll("[data-chapter-search][hidden]").length > 0'));
  await navigate('chapters/11-coordinates-for-humans.html');
  await evaluate('document.querySelector(".coordinate-slider").value="480";document.querySelector(".coordinate-slider").dispatchEvent(new Event("input"))');
  assert.match(await evaluate('document.querySelector(".coordinate-readout").textContent'),/NDC x = 0.000/);
  await evaluate('document.querySelector(".theme-toggle").click()');
  assert(['light','dark'].includes(await evaluate('document.documentElement.dataset.theme')));
  const screenshot=async(file,width,height,selector)=>{await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<500});if(selector)await evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({behavior:'instant',block:'start'})`);await evaluate('new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))');const data=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});fs.mkdirSync('build/screenshots',{recursive:true});fs.writeFileSync('build/screenshots/'+file,Buffer.from(data.data,'base64'));};
  await navigate('index.html');await evaluate('document.documentElement.dataset.theme="light"');await screenshot('home-desktop.png',1440,1100);await screenshot('home-mobile.png',390,1000);
  await screenshot('learning-cards-mobile.png',390,1000,'.learning-path');
  await screenshot('learning-cards-desktop.png',1440,1100,'#the-route');
  await navigate('chapters/12-uniforms-and-bindings.html');await evaluate('document.documentElement.dataset.theme="dark"');await screenshot('chapter-dark.png',1440,1100);
  await navigate('chapters/04-instance-and-surface.html');
  await evaluate('document.documentElement.dataset.theme="light"');
  await screenshot('chapter-04-desktop.png',1680,1100);
  await screenshot('chapter-callout-mobile.png',390,900,'.callout');
  await evaluate('document.querySelector(".object-diagram").scrollIntoView({behavior:"instant"})');
  await screenshot('chapter-04-diagram.png',1440,900,'.object-diagram');
  await call('Emulation.setDeviceMetricsOverride',{width:390,height:900,deviceScaleFactor:1,mobile:true});
  await evaluate('document.querySelector(".object-diagram").scrollIntoView({behavior:"instant"})');
  await screenshot('chapter-04-diagram-mobile.png',390,900,'.object-diagram');
  await navigate('chapters/23-a-character-that-walks.html');
  await evaluate('document.querySelector(".challenges").scrollIntoView({behavior:"instant"})');
  await screenshot('chapter-challenges-mobile.png',390,1000,'.challenges');
  await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await evaluate('document.querySelector(".challenges").scrollIntoView({behavior:"instant"})');
  await screenshot('chapter-challenges-desktop.png',1440,1000,'.challenges');
  for(const [file,name] of [['index.html','home-hover.png'],['contents.html','contents-hover.png'],['chapters/04-instance-and-surface.html','chapter-hover.png'],['appendix/build.html','reference-hover.png']]) {
    await navigate(file);await evaluate('document.documentElement.dataset.theme="light"');
    await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false});
    const hover=await evaluate('(()=>{const b=document.querySelector(".rail-sections .rail-link").getBoundingClientRect();return {x:b.x+20,y:b.y+20}})()');
    await call('Input.dispatchMouseEvent',{type:'mouseMoved',...hover});
    await evaluate('new Promise(resolve=>setTimeout(resolve,160))');
    await screenshot(name,1440,1100);
    await call('Input.dispatchMouseEvent',{type:'mouseMoved',x:1000,y:10});
  }
  await navigate('index.html');await evaluate('document.documentElement.dataset.theme="dark"');await screenshot('home-dark.png',1440,1100);
  await navigate('appendix/build.html');await evaluate('document.documentElement.dataset.theme="dark"');await screenshot('reference-dark.png',1440,1100);
  // Printing must keep the diagrams legible, even from a dark reader theme.
  await call('Emulation.setEmulatedMedia',{media:'print'});
  await navigate('chapters/04-instance-and-surface.html');
  assert(await evaluate('getComputedStyle(document.querySelector(".book-rail")).display === "none"'),'Print hides navigation');
  await call('Emulation.setEmulatedMedia',{media:''});
  await call('Emulation.setScriptExecutionDisabled',{value:true});
  await call('Page.navigate',{url:pathToFileURL(path.join(root,'chapters/18-from-main-to-pixels.html')).href});
  // DOM commands work while page-script execution is disabled. Do not await a
  // JavaScript load listener whose delivery we just disabled.
  let documentNode;
  for(let attempt=0;attempt<100;attempt++){
    documentNode=await call('DOM.getDocument');
    const matches=await call('DOM.querySelectorAll',{nodeId:documentNode.root.nodeId,selector:'.chapter-navigation'});
    if(matches.nodeIds.length && documentNode.root.documentURL.endsWith('18-from-main-to-pixels.html'))break;
    await new Promise(resolve=>setTimeout(resolve,20));
  }
  const staticBlocks=await call('DOM.querySelectorAll',{nodeId:documentNode.root.nodeId,selector:'pre code'});
  assert(documentNode.root.documentURL.endsWith('18-from-main-to-pixels.html'));
  assert(staticBlocks.nodeIds.length>0,'Static source is available without JavaScript');
  for (const selector of ['.learning-guide','.challenges','.on-this-page a[href="#section-1"]','h2[id="section-1"]']) {
    const nodes=await call('DOM.querySelectorAll',{nodeId:documentNode.root.nodeId,selector});
    assert(nodes.nodeIds.length>0,`No-JavaScript content: ${selector}`);
  }
  await call('Emulation.setScriptExecutionDisabled',{value:false});
  const report=JSON.parse(fs.readFileSync('verification.json','utf8'));report.browser={status:'passed',pages:pages.length,viewports,themes:['light','dark'],pageViewportChecks:results.length,offlineFileURLs:true,noJavaScriptReading:true,theme:true,chapterSearch:true,coordinateInteraction:true,staticSectionNavigation:true,consistentPageGeometry:true,sidebarHoverGeometry:true,resumeReading:true,expandedMobileSource:true,svgLabelsWithinViewBox:true,imagesLoaded:true,optionalChallenges:true,screenshots:['home-desktop.png','home-mobile.png','chapter-dark.png','chapter-04-desktop.png','chapter-04-diagram.png','chapter-04-diagram-mobile.png','chapter-challenges-mobile.png','chapter-challenges-desktop.png','home-hover.png','contents-hover.png','chapter-hover.png','reference-hover.png','home-dark.png']};report.updated=new Date().toISOString();fs.writeFileSync('verification.json',JSON.stringify(report,null,2)+'\n');
  console.log(`PASS: ${results.length} file:// page/viewport checks; search, theme, coordinate interaction, and no-JavaScript reading.`);
}finally{ws?.close();proc.kill('SIGTERM');}
