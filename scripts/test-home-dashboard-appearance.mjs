import assert from 'node:assert/strict';
export async function checkHomeDashboardAppearance({evaluate,send,sessionId,waitFor}) {
  let checks=0;
  for (const layout of ['excel','admin']) {
    await evaluate(`(()=>{const e=document.querySelector('[aria-label="Workspace layout"]');e.value=${JSON.stringify(layout)};e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await waitFor(`!!document.querySelector(${JSON.stringify('.'+(layout==='excel'?'excel-workspace':'admin-portal'))})`,layout);
    for (const width of [375,1440]) {
      await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<600},sessionId);
      if (width === 1440) {
        assert.equal(await evaluate(`document.querySelector('.workspace-layout-select').offsetWidth > 0 &&
          document.querySelector('.workspace-more-trigger').offsetWidth === 0`), true, 'desktop toolbar is visible');
      }
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
  for (const layout of ['excel','admin']) {
    await evaluate(`(()=>{const e=document.querySelector('[aria-label="Workspace layout"]');e.value=${JSON.stringify(layout)};e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await waitFor(`!!document.querySelector(${JSON.stringify('.'+(layout==='excel'?'excel-workspace':'admin-portal'))})`,layout);
    await evaluate(`window.applyGistHubStyle('gitpulse',false);window.applyGistHubTheme('gitpulse-dark',false)`);
    for (const width of [320,390]) {
      await send('Emulation.setDeviceMetricsOverride',{width,height:850,deviceScaleFactor:1,mobile:true},sessionId);
      const shell = await evaluate(`(() => {
        const header = document.querySelector('.excel-topbar').getBoundingClientRect();
        const logo = document.querySelector('.excel-topbar .neo-brand-mark').getBoundingClientRect();
        const toolbar = document.querySelector('.neo-topbar-actions');
        const bounds = toolbar.getBoundingClientRect();
        const controls = [...toolbar.querySelectorAll(':scope > :is(a,button,select)')];
        const pin = document.querySelector('.excel-workspace .ribbon-command [data-quick-access-toggle]');
        const command = pin?.closest('.ribbon-command').querySelector('.tool-list-entry').getBoundingClientRect();
        const target = pin?.getBoundingClientRect();
        return {
          headerFits: logo.right <= bounds.left && bounds.right <= header.right &&
            toolbar.scrollWidth <= toolbar.clientWidth + 1 && controls.every(control => {
            const rect = control.getBoundingClientRect();
            return rect.top < logo.bottom && rect.bottom > logo.top &&
              rect.right - bounds.left <= toolbar.scrollWidth + 1;
          }),
          pinFits: !!target && target.width >= 44 && target.height >= 44 && command.right <= target.left
        };
      })()`);
      assert.ok(shell.headerFits,`${layout} ${width}: header controls share the logo row`);
      if (layout === 'excel') assert.ok(shell.pinFits,`${layout} ${width}: pin has its own touch target`);
      assert.equal(await evaluate(`document.querySelector('.workspace-layout-select').offsetWidth`), 0);
      await evaluate(`(() => {const more = document.querySelector('.workspace-more-trigger'); more.focus(); more.click()})()`);
      assert.equal(await evaluate(`document.querySelector('#workspace-more').matches(':popover-open') &&
        document.querySelector('.workspace-layout-select').offsetWidth > 0 &&
        document.querySelector('[data-testid="blur-files-trigger"]').offsetHeight >= 44`), true);
      await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27},sessionId);
      await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27},sessionId);
      await waitFor(`!document.querySelector('#workspace-more').matches(':popover-open') &&
        document.activeElement.matches('.workspace-more-trigger')`, 'More closes and returns focus');
      const blurWasOn = await evaluate(`(() => {
        document.querySelector('.workspace-more-trigger').click();
        const blur = document.querySelector('[data-testid="blur-files-trigger"]');
        const wasOn = blur.getAttribute('aria-pressed');
        blur.click();
        return wasOn;
      })()`);
      await waitFor(`!document.querySelector('#workspace-more').matches(':popover-open') &&
        document.querySelector('[data-testid="blur-files-trigger"]').getAttribute('aria-pressed') !== ${JSON.stringify(blurWasOn)}`,
        'File previews toggle and More closes');
      for (const view of ['Overview','Repos','Quality & Review','Benchmarks & CI','Cadence & Goals']) {
        await evaluate(`Array.from(document.querySelectorAll('.dashboard-toolbar nav button')).find(e=>e.textContent===${JSON.stringify(view)}).click()`);
        await waitFor(`document.querySelector('.dashboard-toolbar .selected')?.textContent===${JSON.stringify(view)}`,view);
        const fits = await evaluate(`(() => {
          const toolbar=document.querySelector('.dashboard-toolbar');
          const bounds=toolbar.getBoundingClientRect();
          return {width:innerWidth,left:bounds.left,right:bounds.right,buttons:Array.from(toolbar.querySelectorAll('button')).map(button=>{
            const r=button.getBoundingClientRect();
            return {name:button.textContent.trim(),height:r.height,left:r.left,right:r.right};
          })};
        })()`);
        assert.ok(fits.left>=-1 && fits.right<=fits.width+1 && fits.buttons.every(button=>button.height>=44 && button.left>=fits.left-1 && button.right<=fits.right+1),`${layout} ${width} ${view}: ${JSON.stringify(fits)}`);
        if (view==='Overview' || view==='Cadence & Goals') {
          const table = view==='Overview' ? '.dashboard-table-scroll' : '.cadence-table-scroll';
          assert.equal(await evaluate(`(() => {const table=document.querySelector(${JSON.stringify(table)});return table.tabIndex===0 && table.scrollWidth>table.clientWidth})()`),true);
        }
        if (view==='Benchmarks & CI') {
          assert.equal(await evaluate(`(() => {const button=document.querySelector('.city-building-hit');const name=button.querySelector('.city-building-name');return button.offsetHeight>=44 && name.offsetWidth>0})()`),true);
          await evaluate(`document.querySelector('.city-building-hit').click()`);
          await waitFor(`document.querySelector('#dashboard-inspector').open`,'phone city inspector');
          assert.equal(await evaluate(`document.querySelector('#dashboard-inspector').getBoundingClientRect().width<=innerWidth+1`),true);
          await evaluate(`document.querySelector('[aria-label="Close repository inspection"]').click()`);
          await waitFor(`!document.querySelector('#dashboard-inspector').open`,'phone city inspector closes');
        }
      }
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
