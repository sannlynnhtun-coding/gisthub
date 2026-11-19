import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
export async function checkGitPulseGlobal({evaluate,send,sessionId,waitFor}) {
 const results=[];
 for(const route of ['/','/my-gists','/discovery','/settings','/editor','/login']) {
  await send('Page.navigate',{url:'http://localhost:5180'+route},sessionId);
  await waitFor(`!!document.querySelector('.neo-main,.neo-login-screen')`,'route '+route,60000);
  for(const width of [375,1440])for(const theme of ['gitpulse-dark','gitpulse-light']) {
   await send('Emulation.setDeviceMetricsOverride',{width,height:1100,deviceScaleFactor:1,mobile:width<600},sessionId);
   await evaluate(`applyGistHubStyle('gitpulse',false);applyGistHubTheme('${theme}',false);applyGistHubFont('plus-jakarta-sans',false)`);
   const result=await evaluate(`(async()=>{await document.fonts.ready;const p=document.createElement('section');p.style.cssText='position:fixed;left:0;top:0;z-index:99999;width:300px';p.innerHTML='<div class="neo-profile-card">Profile</div><div class="neo-gist-card">Card</div><input placeholder="Test"><span class="rounded-full border">Badge</span><button class="btn btn-primary">Action</button><dialog open>Dialog</dialog><h2 class="font-black">Heading</h2>';document.body.append(p);const css=e=>{const s=getComputedStyle(e);return {bg:s.backgroundColor,border:s.borderTopWidth,radius:s.borderRadius,shadow:s.boxShadow,color:s.color,font:s.fontFamily,transform:s.textTransform,weight:s.fontWeight}};const input=p.querySelector('input');input.focus();const data={route:location.pathname,width:innerWidth,theme:getGistHubTheme(),body:css(document.body),profile:css(p.children[0]),card:css(p.children[1]),input:css(input),badge:css(p.children[3]),button:css(p.children[4]),dialog:css(p.children[5]),heading:css(p.children[6]),overflow:document.documentElement.scrollWidth>innerWidth+1,ornaments:Array.from(document.querySelectorAll('.neo-decor'),e=>getComputedStyle(e).display)};p.remove();return data})()`);
   assert.equal(result.body.bg,theme==='gitpulse-dark'?'rgb(14, 15, 18)':'rgb(243, 244, 248)');
   assert.match(result.body.font,/Plus Jakarta Sans/);
   for(const c of [result.card,result.profile]){assert.equal(c.radius,'24px');assert.equal(c.border,'1px');assert.equal(c.shadow,'none');assert.equal(c.bg,theme==='gitpulse-dark'?'rgb(23, 24, 28)':'rgb(255, 255, 255)');}
   assert.equal(result.input.border,'1px');assert.equal(result.input.shadow,'none');assert.equal(result.input.radius,'9999px');
   assert.equal(result.badge.radius,'9999px');assert.equal(result.badge.border,'1px');
   assert.equal(result.heading.weight,'900');assert.equal(result.button.transform,'none');assert.equal(result.button.shadow,'none');assert.equal(result.dialog.radius,'18px');
   assert.equal(result.overflow,false,route+' '+width);assert.ok(result.ornaments.every(x=>x==='none'));
   results.push(result);
  }
 }
 await mkdir('artifacts/gitpulse',{recursive:true});await writeFile('artifacts/gitpulse/global.json',JSON.stringify(results,null,2));
 console.log('PASS: GitPulse global palette, fonts, surfaces, controls and no overflow on 6 routes in dark/light at mobile/desktop.');
}
