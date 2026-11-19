import assert from 'node:assert/strict';
export async function checkHomeDashboardAppearance({evaluate,send,sessionId,waitFor}) {
  let checks=0;
  for (const layout of ['excel','admin']) {
    await evaluate(`(()=>{const e=document.querySelector('[aria-label="Workspace layout"]');e.value=${JSON.stringify(layout)};e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await waitFor(`!!document.querySelector(${JSON.stringify('.'+(layout==='excel'?'excel-workspace':'admin-portal'))})`,layout);
    for (const width of [375,1440]) {
      await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<600},sessionId);
      const result=await evaluate(`(() => {
        const failures=[];let count=0;
        for(const preset of window.getGistHubStylePresets()) {
          window.applyGistHubStyle(preset.style,false);window.applyGistHubTheme(preset.theme,false);
          const page=document.querySelector('.dashboard');
          if(document.documentElement.scrollWidth>innerWidth+1) failures.push(preset.id+': overflow '+document.documentElement.scrollWidth);
          const card=page.querySelector('.dashboard-card');
          if(card && getComputedStyle(card).backgroundColor==='rgba(0, 0, 0, 0)') failures.push(preset.id+': transparent card');
          count++;
        }
        for(const theme of window.getGistHubThemes()) { window.applyGistHubTheme(theme.id,false);if(document.documentElement.scrollWidth>innerWidth+1) failures.push(theme.id+': overflow'); count++; }
        return {failures,count};
      })()`);
      assert.deepEqual(result.failures,[],layout+' '+width); checks+=result.count;
    }
  }
  await evaluate(`window.applyGistHubStyle('default',false);window.applyGistHubTheme('light',false)`);
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]},sessionId);
  for(const view of ['Overview','Quality','Benchmarks','Cadence']) {
    await evaluate(`Array.from(document.querySelectorAll('.dashboard-tabs button')).find(e=>e.textContent.includes(${JSON.stringify(view)})).click()`);
    await waitFor(`document.querySelector('.dashboard-tabs .selected').textContent.includes(${JSON.stringify(view)})`,view);
    assert.equal(await evaluate(`document.documentElement.scrollWidth<=innerWidth+1`),true,view+' overflow');
  }
  await evaluate(`Array.from(document.querySelectorAll('.dashboard-tabs button')).find(e=>e.textContent==='Overview').click()`);
  console.log('PASS: dashboard appearance inheritance and overflow across '+checks+' theme/preset/layout/width combinations; all views under reduced motion.');
}
