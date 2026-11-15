import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../GistHub/wwwroot/js/markdownConverters.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'');
const {wikiToMarkdown,openApi}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
assert.equal(wikiToMarkdown('h2. Title\n\n*bold* [label|https://example.com]'),'## Title\n\n**bold** [label](https://example.com)');
assert.ok(wikiToMarkdown('{code:js}\nconst a=1;\n{code}').includes('```js\nconst a=1;\n```'));
assert.throws(()=>openApi('{}'),/OpenAPI/);
const api=openApi(JSON.stringify({openapi:'3.0.0',info:{title:'Pets'},paths:{'/pets':{parameters:[{name:'id',in:'query'}],get:{summary:'List pets',responses:{200:{description:'OK'}}}}}}));
assert.ok(api.includes('GET /pets'));assert.ok(api.includes('Response 200: OK'));assert.ok(api.includes('`id` (query)'));
const page=readFileSync(new URL('../GistHub/Pages/MarkdownConverters.razor',import.meta.url),'utf8');
for(const name of ['PDF','Word','DOCX','HTML','Rich Text','Google Docs','Jira','BBCode','Confluence','Slack','Discord','Telegram','WhatsApp']) assert.ok(page.includes('Markdown to '+name));
console.log('Markdown converter checks passed.');

assert.ok(wikiToMarkdown('{code:js}\nconst s="*literal*";\n{code}').includes('"*literal*"'));
assert.equal(wikiToMarkdown('bq. quote'), '> quote');
assert.throws(()=>openApi('null'),/OpenAPI/);
