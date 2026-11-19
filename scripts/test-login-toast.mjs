import assert from 'node:assert/strict';

export async function checkLoginToast({evaluate, send, sessionId, waitFor}) {
  await waitFor(`!!document.querySelector('.neo-login-screen form')`, 'login form', 60000);
  for (const width of [375, 1074, 1440]) {
    await send('Emulation.setDeviceMetricsOverride', {width, height:900, deviceScaleFactor:1, mobile:width < 600}, sessionId);
    const fields=await evaluate(`Array.from(document.querySelectorAll('.login-input'),e=>{const input=e.querySelector('input'),icon=e.querySelector('svg'),r=input.getBoundingClientRect(),s=getComputedStyle(input);return {id:input.id,label:!!document.querySelector('label[for="'+input.id+'"]'),gap:r.left+parseFloat(s.paddingLeft)-icon.getBoundingClientRect().right,font:s.fontFamily,width:r.width};})`);
    assert.equal(fields.length,2);
    for(const field of fields){assert.equal(field.label,true);assert.ok(field.gap>=8,'icon must not overlap input text');assert.ok(field.width>200);}
    assert.match(fields[1].font,/JetBrains Mono/);
    assert.equal(await evaluate(`document.documentElement.scrollWidth>innerWidth+1`),false);
    const before = await evaluate(`document.querySelector('form').getBoundingClientRect().x`);
    await evaluate(`document.querySelector('form').requestSubmit()`);
    await waitFor(`!!document.querySelector('.neo-login-screen [role="alert"]')`, 'validation toast');
    const toast = await evaluate(`(() => {
      const element = document.querySelector('.neo-login-screen [role="alert"]');
      const rect = element.getBoundingClientRect();
      return {position:getComputedStyle(element).position, top:rect.top, right:rect.right,
        z:Number(getComputedStyle(element).zIndex), text:element.textContent};
    })()`);
    assert.equal(toast.position, 'fixed');
    assert.ok(toast.top >= 0 && toast.top < 40 && toast.right <= width);
    assert.ok(toast.z >= 50);
    assert.ok(toast.text.includes('Please fill in all fields.'));
    assert.equal(await evaluate(`document.querySelector('form').getBoundingClientRect().x`), before, 'toast does not shift the form');
    await evaluate(`document.querySelector('[aria-label="Dismiss error"]').click()`);
    await waitFor(`!document.querySelector('.neo-login-screen [role="alert"]')`, 'manual dismissal');
  }
  await evaluate(`document.querySelector('form').requestSubmit()`);
  await waitFor(`!!document.querySelector('.neo-login-screen [role="alert"]')`, 'new toast');
  await waitFor(`!document.querySelector('.neo-login-screen [role="alert"]')`, 'automatic dismissal', 15000);
  await send('Emulation.clearDeviceMetricsOverride', {}, sessionId);
  console.log('PASS: fixed login toast, desktop/mobile placement, stable form, manual and automatic dismissal.');
}
