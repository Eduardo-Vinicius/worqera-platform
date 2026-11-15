import {spawn} from 'node:child_process';
import fs from 'node:fs';
const CH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const port=9333;
const prof=process.cwd()+'/chrome-prof';
const p=spawn(CH,['--headless=new','--disable-gpu','--hide-scrollbars',`--remote-debugging-port=${port}`,`--user-data-dir=${prof}`,'about:blank'],{stdio:'ignore'});
let tabs;for(let i=0;i<40;i++){await new Promise(r=>setTimeout(r,500));try{tabs=await (await fetch(`http://127.0.0.1:${port}/json`)).json();break}catch{}}
const ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
await new Promise(r=>ws.onopen=r);
let n=0;const pend={};ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pend[m.id]){pend[m.id](m);delete pend[m.id]}};
const send=(method,params={})=>new Promise(r=>{const id=++n;pend[id]=r;ws.send(JSON.stringify({id,method,params}))});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const ev=async(expr)=>(await send('Runtime.evaluate',{expression:expr,awaitPromise:true,returnByValue:true})).result?.result?.value;
await send('Page.enable');await send('Runtime.enable');
async function go(url,wait=3500){await send('Page.navigate',{url});await sleep(wait)}
async function dev(w,h,dpr,mobile){await send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:dpr,mobile});}
await dev(390,844,3,true);
await go('http://localhost:3000/login',3000);
const login=await ev(`(async()=>{const r=await fetch('http://127.0.0.1:3001/api/v1/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'demo.story@worqera.test',password:'Demo-Story-2026!'})});const d=await r.json();
localStorage.setItem('token',d.accessToken);document.cookie='token='+d.accessToken+'; path=/; max-age=604800; samesite=lax';localStorage.setItem('refreshToken',d.refreshToken);
localStorage.setItem('shopId',d.shop.id);localStorage.setItem('shopName',d.shop.name);localStorage.setItem('shopSlug',d.shop.slug);localStorage.setItem('userName',d.user.name);localStorage.setItem('email',d.user.email);localStorage.setItem('role','owner');localStorage.setItem('emailVerified','1');return Object.keys(d).join(',')})()`);
console.log('login',login);
const shots=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
fs.mkdirSync('shots',{recursive:true});
for(const s of shots){
  await dev(s.w,s.h,s.dpr,s.mobile);
  await go(s.url,s.wait||4500);
  if(s.js) await ev(s.js), await sleep(1200);
  const opts={format:'png',captureBeyondViewport:!!s.full};
  if(s.full){const hgt=await ev('document.documentElement.scrollHeight');await dev(s.w,Math.min(hgt,s.maxH||3000),s.dpr,s.mobile);await sleep(800);}
  const r=await send('Page.captureScreenshot',opts);
  fs.writeFileSync('shots/'+s.name+'.png',Buffer.from(r.result.data,'base64'));
  console.log('shot',s.name, await ev('location.pathname'));
}
ws.close();p.kill();
