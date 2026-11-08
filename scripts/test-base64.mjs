import assert from 'node:assert/strict';

export async function checkBase64({ evaluate, send, sessionId, waitFor }) {
  const tools = '#workspace-tab-Data';
  const menuItem = '[data-testid="base64-menu-item"]';
  const dialog = '.base64-overlay';
  const input = `${dialog} .json-parser-pane--input textarea`;
  const result = `${dialog} [aria-label="Conversion result"]`;
  const mode = `${dialog} .json-parser-mode-toggle button`;
  const find = selector => `document.querySelector(${JSON.stringify(selector)})`;
  const click = selector => evaluate(`${find(selector)}.click()`);
  const clickButton = label => evaluate(`Array.from(${find(dialog)}.querySelectorAll('button'))
    .find(button => button.textContent === ${JSON.stringify(label)}).click()`);
  const expectResult = value => waitFor(
    `${find(result)}?.value === ${JSON.stringify(value)}`, `Base64 result ${JSON.stringify(value)}`);
  const type = value => evaluate(`(() => {
    const input = ${find(input)};
    input.value = ${JSON.stringify(value)};
    input.dispatchEvent(new Event('input', { bubbles: true }));
  })()`);

  await waitFor(`Boolean(${find('#tools-guide-title')})`, 'the Tools Guide', 60000);
  await click(tools);
  await waitFor(`Boolean(${find(menuItem)})`, 'the Base64 Tools entry');
  await click(menuItem);
  await waitFor(`Boolean(${find(result)})`, 'the Base64 dialog');

  await send('Browser.grantPermissions', {
    origin: await evaluate('location.origin'),
    permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'],
  });
  await send('Page.bringToFront', {}, sessionId);
  const expectCopied = async expected => {
    await clickButton('Copy result');
    await waitFor(`${find(`${dialog} .base64-feedback[role="status"]`)}?.textContent === 'Copied to clipboard.'`, 'copy confirmation');
    assert.equal(await evaluate('navigator.clipboard.readText()'), expected);
  };

  await type('%%%');
  await waitFor(`${find(`${dialog} [role="alert"]`)}?.textContent.includes('Invalid Base64')`, 'invalid Base64 feedback');
  await type(' SGVs\nbG8= ');
  await expectResult('Hello');
  await waitFor(`!${find(`${dialog} [role="alert"]`)}`, 'error cleared after valid input');
  await expectCopied('Hello');
  await clickButton('Use as input');
  await expectResult('SGVsbG8=');
  assert.equal(await evaluate(`${find(`${mode}:last-child`)}.getAttribute('aria-pressed')`), 'true');
  await expectCopied('SGVsbG8=');

  const upload = (name, content) => evaluate(`(() => {
    const transfer = new DataTransfer();
    transfer.items.add(new File([Uint8Array.from(${JSON.stringify(content)})], ${JSON.stringify(name)}));
    const file = ${find(`${dialog} input[type="file"]`)};
    file.files = transfer.files;
    file.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  await evaluate(`URL.createObjectURL = blob => {
    window.base64Download = blob;
    return 'blob:base64-test';
  };
  HTMLAnchorElement.prototype.click = function () { window.base64Filename = this.download; };`);
  const download = async name => {
    const button = `${dialog} .base64-file-panel button`;
    await waitFor(`${find(button)}?.textContent.trim() === ${JSON.stringify(`Download ${name}`)}`, `download button for ${name}`);
    await click(button);
    await waitFor(`window.base64Filename === ${JSON.stringify(name)}`, `download named ${name}`);
    return evaluate(`(async () => Array.from(new Uint8Array(await window.base64Download.arrayBuffer())))()`);
  };

  const binary = [0, 255, 254, 128, 1];
  await upload('sample.bin', binary);
  const encoded = await download('sample.bin.base64');
  assert.equal(Buffer.from(encoded).toString('ascii'), 'AP/+gAE=');
  await click(`${mode}:first-child`);
  await waitFor(`!${find(`${dialog} .base64-file-panel button`)}`, 'previous download cleared after switching modes');
  await upload('sample.bin.base64', encoded);
  assert.deepEqual(await download('sample.bin'), binary);
  console.log('PASS: Base64 live decode, validation recovery, mode reversal, clipboard contents, and binary file round-trip.');
}
