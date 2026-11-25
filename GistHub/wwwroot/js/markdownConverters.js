import { convert as plain } from './markdownText.js';
import { render as renderWord } from './markdownDocx.js';

const limit = 1048576;
const rich = format => /Rich Text|Google Docs/.test(format) && format.startsWith('Markdown');
function safeHtml(source) { return plain(source).html; }
export function wordHtml(source) { return renderWord(document.createElement('div'), source); }
function htmlToMarkdown(html) {
    const root = document.createElement('div');
    root.innerHTML = DOMPurify.sanitize(html, { FORBID_TAGS: ['img', 'style', 'script'] });
    function walk(n) {
        if (n.nodeType === 3) return n.textContent.replace(/([\\`*_{}\[\]])/g, '\\$1');
        const text = () => [...n.childNodes].map(walk).join('');
        const t = n.nodeName;
        if (t === 'PRE') return '\n\n```\n' + n.textContent + '\n```\n\n';
        if (t === 'CODE') return '`' + n.textContent + '`';
        if (/^H[1-6]$/.test(t)) return '\n\n' + '#'.repeat(+t[1]) + ' ' + text() + '\n\n';
        if (['STRONG','B'].includes(t)) return '**' + text() + '**';
        if (['EM','I'].includes(t)) return '*' + text() + '*';
        if (['DEL','S'].includes(t)) return '~~' + text() + '~~';
        if (t === 'A') return '[' + text() + '](' + (n.getAttribute('href') || '').replace(/[()\s]/g, c => encodeURIComponent(c)) + ')';
        if (t === 'BR') return '\n';
        if (t === 'LI') {
            const content = [...n.childNodes].filter(c => !['UL','OL'].includes(c.nodeName)).map(walk).join('').trim();
            const nested = [...n.children].filter(c => ['UL','OL'].includes(c.nodeName)).map(walk).join('').trim();
            return '\n' + (n.parentNode.nodeName === 'OL' ? '1. ' : '- ') + content + (nested ? '\n'+nested.split('\n').map(line=>'  '+line).join('\n') : '');
        }
        if (t === 'BLOCKQUOTE') return '\n\n' + text().trim().split('\n').map(s => '> ' + s).join('\n') + '\n\n';
        if (t === 'TR') return '| ' + [...n.children].map(c => walk(c).trim().replace(/\|/g,'\\|')).join(' | ') + ' |\n' + (n === n.closest('table')?.querySelector('tr') ? '| ' + [...n.children].map(()=>'---').join(' | ') + ' |\n' : '');
        return text() + (['P','DIV','UL','OL','TABLE'].includes(t) ? '\n\n' : '');
    }
    return walk(root).replace(/\n{3,}/g,'\n\n').trim();
}
export function wikiToMarkdown(source) {
    // Protect code before interpreting wiki emphasis and links.
    const code = [];
    source = source.replace(/\{code(?::([^}]+))?\}\n?([\s\S]*?)\{code\}|\{\{([^}]+)\}\}/g, (_,lang,block,inline) => {
        code.push(inline === undefined ? '```'+(lang||'')+'\n'+block.trimEnd()+'\n```' : '`'+inline+'`');
        return '\u0000'+(code.length-1)+'\u0000';
    });
    return source.replace(/^([*#]+) /gm, (_,markers) => '  '.repeat(markers.length-1)+(markers.endsWith('#')?'1. ':'- ')).replace(/^bq\. /gm, '> ').replace(/^h([1-6])\. /gm, (_,n) => '#'.repeat(+n)+' ')
        .replace(/\[([^|\]\n]+)\|([^\]\n]+)\]/g,'[$1]($2)')
        .replace(/\*([^*\n]+)\*/g,'**$1**').replace(/_([^_\n]+)_/g,'*$1*')
        .replace(/\u0000(\d+)\u0000/g, (_,i) => code[+i]);
}
function platform(source, format) {
    const root = document.createElement('div'); root.innerHTML = safeHtml(source);
    const bb = format.endsWith('BBCode'), wiki = /Jira|Confluence/.test(format), slack = format.endsWith('Slack'), wa = format.endsWith('WhatsApp'), telegram = format.endsWith('Telegram');
    function walk(n) {
        if (n.nodeType === 3) return n.textContent.trim() ? n.textContent : n.textContent.includes('\n') ? '' : n.textContent;
        const t=n.nodeName, body=()=>[...n.childNodes].map(walk).join('');
        const wrap=(a,b=a)=>a+body()+b;
        if (t==='PRE') return bb ? '[code]'+n.textContent+'[/code]\n' : wiki ? '{code}\n'+n.textContent+'{code}\n' : '```\n'+n.textContent+'```\n';
        if (t==='CODE') return wrap(bb?'[code]':wiki?'{{':'`',bb?'[/code]':wiki?'}}':'`');
        if (['STRONG','B'].includes(t)) return wrap(bb?'[b]':wiki||slack||wa||telegram?'*':'**',bb?'[/b]':wiki||slack||wa||telegram?'*':'**');
        if (['EM','I'].includes(t)) return wrap(bb?'[i]':wiki||slack||wa||telegram?'_':'*',bb?'[/i]':wiki||slack||wa||telegram?'_':'*');
        if (['DEL','S'].includes(t)) return wrap(bb?'[s]':wiki?'-':wa||slack||telegram?'~':'~~',bb?'[/s]':wiki?'-':wa||slack||telegram?'~':'~~');
        if (t==='A') { const url=n.getAttribute('href')||''; return bb?'[url='+url+']'+body()+'[/url]':wiki?'['+body()+'|'+url+']':slack?'<'+url+'|'+body()+'>':wa?body()+' ('+url+')':'['+body()+']('+url+')'; }
        if (/^H[1-6]$/.test(t)) return '\n'+(wiki?'h'+t[1]+'. ':bb?'[b]':format.endsWith('Discord')?'#'.repeat(Math.min(+t[1],3))+' ':'')+body()+(bb?'[/b]':'')+'\n\n';
        if (t==='LI') {
            const ordered = n.parentNode.nodeName === 'OL';
            let depth=0; for(let p=n.parentNode.parentNode;p && p!==root;p=p.parentNode) if(['UL','OL'].includes(p.nodeName)) depth++;
            const marker = bb ? '[*]' : wiki ? (ordered?'#':'*').repeat(depth+1)+' ' : '  '.repeat(depth)+(ordered ? ([...n.parentNode.children].indexOf(n)+Number(n.parentNode.getAttribute('start')||1))+'. ' : '- ');
            return marker+body().trim()+'\n';
        }
        if (bb && ['UL','OL'].includes(t)) return (t==='OL'?'[list=1]':'[list]')+'\n'+body()+'[/list]\n\n';
        if (t==='BLOCKQUOTE') return bb ? '[quote]'+body().trim()+'[/quote]\n\n' : body().trim().split('\n').filter(Boolean).map(line=>(wiki?'bq. ':'> ')+line).join('\n')+'\n\n';
        if (t==='TR') return (wiki?'|':'')+[...n.children].map(bodyCell=>walk(bodyCell).trim()).join(wiki?'|':'\t')+(wiki?'|':'')+'\n';
        if (t==='BR') return '\n';
        return body()+(['P','BLOCKQUOTE','UL','OL','TABLE'].includes(t)?'\n\n':'');
    }
    const blocks=[];
    return walk(root).replace(/\{code\}[\s\S]*?\{code\}|\[code\][\s\S]*?\[\/code\]|```[\s\S]*?```/g, value=>{blocks.push(value);return '\u0000'+(blocks.length-1)+'\u0000';}).replace(/\n{3,}/g,'\n\n').trim().replace(/\u0000(\d+)\u0000/g,(_,i)=>blocks[+i]);
}
async function library(url, name) {
    if (window[name]) return window[name];
    await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=url;s.onload=resolve;s.onerror=()=>reject(new Error('Document library could not load. Check your connection and retry.'));document.head.append(s);});
    return window[name];
}
async function imported(format, source) {
    const file=document.querySelector('#converter-file').files[0];
    if (!file) { if (/^(PDF|DOCX)/.test(format)) throw new Error('Choose a PDF or DOCX file.'); return source; }
    if (file.size>10*limit) throw new Error('Files must be 10 MB or smaller.');
    if (format==='DOCX to Markdown') {
        const mammoth=await library('https://cdn.jsdelivr.net/npm/mammoth@1.11.0/mammoth.browser.min.js','mammoth');
        return (await mammoth.convertToHtml({arrayBuffer:await file.arrayBuffer()})).value;
    }
    if (format==='PDF to Markdown') {
        const pdfjs=await import('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs');
        pdfjs.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
        const pdf=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false}).promise;
        try { let text=''; for(let i=1;i<=pdf.numPages;i++) {const page=await pdf.getPage(i);const content=await page.getTextContent();text+=content.items.map(x=>x.str+(x.hasEOL?'\n':' ')).join('')+'\n\n';if(text.length>limit) throw new Error('Extracted text exceeds 1 MB.');} if(!text.trim()) throw new Error('No text found. Scanned PDFs require OCR.');return text.trim(); }
        finally {await pdf.destroy();}
    }
    if(file.size>limit) throw new Error('Text files must be 1 MB or smaller.');
    return file.text();
}
export function openApi(source) {
    const api=JSON.parse(source);
    if (!api || typeof api !== 'object' || Array.isArray(api)) throw new Error('Provide an OpenAPI JSON object.');
    if (!api.openapi && !api.swagger) throw new Error('Provide an OpenAPI JSON document. YAML must first be exported as JSON.');
    let text='# '+(api.info?.title||'API')+'\n\n'+(api.info?.description||'')+'\n';
    for(const [path,methods] of Object.entries(api.paths||{})) for(const [method,op] of Object.entries(methods)) {
        if(!['get','put','post','delete','patch','head','options','trace'].includes(method)) continue;
        text+='\n## '+method.toUpperCase()+' '+path+'\n\n'+(op.summary||'')+'\n\n'+(op.description||'')+'\n';
        for(const p of [...(methods.parameters||[]),...(op.parameters||[])]) text+='\n- `'+p.name+'` ('+p.in+'): '+(p.description||'');
        for(const [code,response] of Object.entries(op.responses||{})) text+='\n- Response '+code+': '+(response.description||'');
        text+='\n';
    } return text;
}
export async function convert(format, source, preview) {
    if(new TextEncoder().encode(source).length>limit) throw new Error('Source must be 1 MB or smaller.');
    let input=await imported(format,source), result;
    if(format==='URL to Markdown') {
        const url=new URL(input.trim()); if(!['http:','https:'].includes(url.protocol)||url.username||url.password) throw new Error('Enter an HTTP or HTTPS URL without credentials.');
        const response=await fetch(url,{credentials:'omit',signal:AbortSignal.timeout(15000)});
        if(!response.ok) throw new Error('Could not fetch this URL. Paste exported HTML instead.');
        const reader=response.body.getReader();let size=0;const chunks=[];
        try {while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit)throw new Error('URL content exceeds 1 MB.');chunks.push(value);}} finally {await reader.cancel();}
        input=await new Blob(chunks).text();
    }
    if(new TextEncoder().encode(input).length>limit) throw new Error('Imported content exceeds 1 MB.');
    if(format==='OpenAPI to Markdown') result=openApi(input);
    else if(/^(Jira|Confluence) to Markdown$/.test(format)) result=wikiToMarkdown(input);
    else if(format==='Text to Markdown') result=input.replace(/([\\`*_{}\[\]<>#!|~+.-])/g,'\\$1');
    else if(format==='PDF to Markdown') result=input;
    else if(format.endsWith('to Markdown')) result=htmlToMarkdown(input);
    else if(format==='Remove Markdown'||format==='LinkedIn Text Formatter') result=plain(input).text;
    else if(format==='Markdown to HTML'||rich(format)||/Markdown to (PDF|Word|DOCX)/.test(format)) result=safeHtml(input);
    else result=platform(input,format);
    preview.innerHTML=DOMPurify.sanitize(format.endsWith('to Markdown')?safeHtml(result):format==='Markdown to HTML'||rich(format)||/Markdown to (PDF|Word|DOCX)/.test(format)?result:safeHtml(input));
    document.querySelector('#converter-file').value='';
    return [result,format==='URL to Markdown'?source:input];
}
export async function copy(result,format) {
    if(rich(format)) await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([result],{type:'text/html'}),'text/plain':new Blob([plain(result).text],{type:'text/plain'})})]);
    else await navigator.clipboard.writeText(result);
}
export function download(result,format,preview) {
    if(format==='Markdown to PDF') {
        const frame=document.createElement('iframe');frame.title='Print document';document.body.append(frame);
        const doc=frame.contentDocument;doc.open();doc.write('<!doctype html><html><head><title>Document</title></head><body>'+DOMPurify.sanitize(result)+'</body></html>');doc.close();
        frame.contentWindow.addEventListener('afterprint',()=>frame.remove(),{once:true});frame.contentWindow.focus();frame.contentWindow.print();return;
    }
    const html=format==='Markdown to HTML'||rich(format), ext=html?'html':format.endsWith('to Markdown')?'md':'txt';
    const url=URL.createObjectURL(new Blob([result],{type:html?'text/html;charset=utf-8':'text/plain;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download='converted.'+ext;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

export function enableRichPaste() {
    const source=document.querySelector('#converter-source');
    const handler=event=>{
        if(!['Google Docs to Markdown','Notion to Markdown','Rich Text to Markdown','HTML to Markdown'].includes(document.querySelector('#converter-format').value)) return;
        const html=event.clipboardData?.getData('text/html');
        if(!html) return;
        event.preventDefault();
        source.setRangeText(DOMPurify.sanitize(html,{FORBID_TAGS:['img','style','script']}),source.selectionStart,source.selectionEnd,'end');
        source.dispatchEvent(new Event('change',{bubbles:true}));
    };
    source.addEventListener('paste',handler);
    source.converterPaste=handler;
}
export function disableRichPaste() {
    const source=document.querySelector('#converter-source');
    if(source?.converterPaste) source.removeEventListener('paste',source.converterPaste);
}
