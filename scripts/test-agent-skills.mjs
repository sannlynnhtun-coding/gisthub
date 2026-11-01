import assert from 'node:assert/strict';

export async function checkAgentSkills({ evaluate, send, sessionId, waitFor }) {
  await waitFor(`document.querySelectorAll('.skills-sheet tbody tr').length > 17`, 'loaded skill catalog', 60000);
  const catalog = await evaluate(`fetch('data/agent-skills.json').then(r => r.json())`);
  assert.ok(catalog.length > 1000);
  const pageSize = 50;
  const set = (selector, value, event = 'change') => evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    el.value = ${JSON.stringify(value)};
    el.dispatchEvent(new Event(${JSON.stringify(event)}, { bubbles: true }));
  })()`);
  await set('.skills-filters select', 'Design & UI');
  await waitFor(`Array.from(document.querySelectorAll('tbody td:nth-child(2)')).every(el => el.textContent.startsWith('Design & UI'))`, 'category filter');
  await set('.skills-filters input[type=search]', 'Use the design-taste-frontend skill to design this landing page.', 'input');
  await waitFor(`document.querySelectorAll('tbody tr').length === 1 && document.querySelector('tbody').textContent.includes('Taste Skill')`, 'combined category and search');
  await set('.skills-filters input[type=search]', 'no-such-skill-xyz', 'input');
  await waitFor(`Boolean(document.querySelector('.skills-empty'))`, 'empty state');
  await evaluate(`document.querySelector('.skills-filters button').click()`);
  await waitFor(`document.querySelectorAll('tbody tr').length === ${pageSize}`, 'reset filters');
  assert.ok((await evaluate(`document.querySelector('.skills-count').textContent`)).startsWith(`${catalog.length} of ${catalog.length}`));
  await evaluate(`document.querySelector('.skills-pagination button:last-child').click()`);
  await waitFor(`document.querySelector('.skills-pagination span').textContent.startsWith('Page 2 ')`, 'next page');
  assert.ok((await evaluate(`document.querySelector('tbody th').textContent`)).includes(catalog[pageSize].Name));
  await set('.skills-filters input[type=search]', 'ecc:tdd-workflow', 'input');
  await waitFor(`document.querySelector('.skills-pagination span').textContent.startsWith('Page 1 ') && document.querySelectorAll('tbody tr').length === 1 && document.querySelector('tbody th').textContent.includes('ecc:tdd-workflow')`, 'search all pages and reset page number');
  await evaluate(`document.querySelector('.skills-filters button').click()`);
  await evaluate(`document.querySelector('.skills-filters input[type=checkbox]').click()`);
  await waitFor(`document.querySelector('.skills-count').textContent.startsWith('${catalog.filter(s => s.Installed).length} of ${catalog.length}')`, 'installed-only snapshot');
  await evaluate(`document.querySelector('.skills-filters button').click()`);
  await evaluate(`window.copiedSkillText = ''; window.skillCopyFails = false; window.copyToClipboard = async text => { window.copiedSkillText = text; return !window.skillCopyFails; }; document.querySelector('tbody td button').click()`);
  await waitFor(`document.querySelector('.skills-status').textContent.startsWith('Copied') && window.copiedSkillText.length > 0`, 'copy setup');
  await evaluate(`window.skillCopyFails = true; document.querySelector('tbody td:last-child button').click()`);
  await waitFor(`document.querySelector('.skills-status').textContent.includes('Could not copy')`, 'clipboard failure feedback');
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('thead th')).position`), 'sticky');
  assert.equal(await evaluate(`getComputedStyle(document.querySelector('tbody th')).position`), 'sticky');
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }, sessionId);
  assert.equal(await evaluate(`document.documentElement.scrollWidth > innerWidth`), false);
  assert.equal(await evaluate(`document.querySelector('.skills-sheet').scrollWidth > document.querySelector('.skills-sheet').clientWidth`), true);
  await send('Emulation.clearDeviceMetricsOverride', {}, sessionId);
  console.log('PASS: skill category/search/installed filters, reset, empty results, clipboard feedback, sticky cells and mobile sheet scrolling.');
}
