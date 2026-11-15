import {spawn} from 'node:child_process';
import fs from 'node:fs';
const CH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const port=9334, prof=process.cwd()+'/chrome-prof2';
const p=spawn(CH,['--headless=new','--disable-gpu','--hide-scrollbars','--allow-file-access-from-files',`--remote-debugging-port=${port}`,`--user-data-dir=${prof}`,'about:blank'],{stdio:'ignore'});
let tabs;for(let i=0;i<40;i++){await new Promise(r=>setTimeout(r,500));try{tabs=await (await fetch(`http://127.0.0.1:${port}/json`)).json();break}catch{}}
const ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);
let n=0;const pend={};ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pend[m.id]){pend[m.id](m);delete pend[m.id]}};
const send=(method,params={})=>new Promise(r=>{const id=++n;pend[id]=r;ws.send(JSON.stringify({id,method,params}))});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const ev=async(x)=>(await send('Runtime.evaluate',{expression:x,awaitPromise:true,returnByValue:true})).result?.result?.value;
await send('Emulation.setDeviceMetricsOverride',{width:1080,height:1920,deviceScaleFactor:1,mobile:false});
await send('Page.navigate',{url:'file://'+process.cwd()+'/'+process.argv[2]});await sleep(3000);
await ev('document.fonts.ready.then(()=>1)');
const total=1;
const mode=process.argv[3]||'all'; const out=process.argv[4]||'frames';
fs.mkdirSync(out,{recursive:true});
const times= mode==='all' ? Array.from({length:Math.round(total*30)},(_,i)=>i/30) : mode.split(',').map(Number);
let k=0;
for(const t of times){  const r=await send('Page.captureScreenshot',{format:mode==='all'?'jpeg':'png',quality:95}); fs.writeFileSync(`${out}/${String(k++).padStart(4,'0')}.${mode==='all'?'jpg':'png'}`,Buffer.from(r.result.data,'base64')); }
console.log('frames',k); ws.close(); p.kill();
