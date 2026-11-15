
// Run this function in the live converter page (for example with Chrome DevTools).
export async function checkAllConverters(checkLayout = () => {}) {
    const check=(ok,message)=>{if(!ok)throw new Error(message);};
    const wait=async test=>{const end=Date.now()+30000;while(!test()){if(Date.now()>end)throw new Error('Timed out waiting for converter');await new Promise(r=>setTimeout(r,50));}};
    const select=document.querySelector('#converter-format'), source=document.querySelector('#converter-source'), file=document.querySelector('#converter-file');
    const result=document.querySelector('#converter-result'), status=document.querySelector('[role=status]');
    const button=text=>[...document.querySelectorAll('button')].find(b=>b.textContent.trim().toLowerCase()===text);
    const markdown='# Hello\n\n**bold** *italic* ~~strike~~ [label](https://example.com)\n\n1. One\n2. Two\n\n> quote\n\n```js\nconst value="*literal*";\n```';
    const html='<h1>Hello</h1><p><strong>bold</strong> <em>italic</em></p><ul><li>One<ul><li>Nested</li></ul></li></ul><script>window.converterUnsafe=true</script>';
    const rows=[]; const downloads=[];
    const originalClick=HTMLAnchorElement.prototype.click, originalUrl=URL.createObjectURL;
    const blobs=new Map();URL.createObjectURL=blob=>{const url=originalUrl(blob);blobs.set(url,blob);return url;};
    HTMLAnchorElement.prototype.click=function(){downloads.push({name:this.download,blob:blobs.get(this.href)});};
    const setFile=f=>{const dt=new DataTransfer();if(f)dt.items.add(f);file.files=dt.files;};
    const run=async (format,text,f)=>{
        setFile(f);select.value=format;select.dispatchEvent(new Event('change',{bubbles:true}));
        source.value=text;source.dispatchEvent(new Event('change',{bubbles:true}));
        button('convert').click();await new Promise(r=>setTimeout(r,100));await wait(()=>button('convert') && !button('convert').disabled);
        check(status.textContent.startsWith('Converted.'),format+': '+status.textContent);
        check(result.value.length>0,format+' empty result');checkLayout(format);return result.value;
    };
    try {
        let docx;
        for(const format of [...select.options].map(o=>o.value)) {
            let text=markdown, fixture;
            if(format==='OpenAPI to Markdown') text=JSON.stringify({openapi:'3.0.0',info:{title:'Hello'},paths:{'/pets':{get:{summary:'List',responses:{200:{description:'OK'}}}}}});
            else if(format==='URL to Markdown') text=location.origin+'/converter-test.html';
            else if(/^(Confluence|Jira) to/.test(format)) text='h1. Hello\n\n*bold*\n\n{code:js}\nconst value="*literal*";\n{code}';
            else if(format==='DOCX to Markdown') { check(docx,'Missing exported DOCX fixture');fixture=new File([docx],'sample.docx');text=''; }
            else if(format==='PDF to Markdown') {
                const stream='BT /F1 12 Tf 72 720 Td (Hello PDF) Tj ET';
                const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>','<< /Length '+stream.length+' >>\nstream\n'+stream+'\nendstream'];
                let pdf='%PDF-1.4\n',offsets=[0];objects.forEach((obj,i)=>{offsets.push(pdf.length);pdf+=(i+1)+' 0 obj\n'+obj+'\nendobj\n';});
                const xref=pdf.length;pdf+='xref\n0 6\n0000000000 65535 f \n'+offsets.slice(1).map(o=>String(o).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF';
                fixture=new File([pdf],'sample.pdf');text='';
            } else if(format.endsWith('to Markdown')&&format!=='Text to Markdown') text=html;
            const value=await run(format,text,fixture);
            check(value.includes('Hello'),format+' lost heading');
            if(/^(Jira|Confluence) to/.test(format)) check(value.includes('"*literal*"'),format+' corrupted code');
            if(['HTML to Markdown','Google Docs to Markdown','Notion to Markdown','Rich Text to Markdown'].includes(format)) check(value.includes('  - Nested'),format+' flattened list');
            if(['Markdown to Jira','Markdown to Confluence'].includes(format)) check(value.includes('# One') && value.includes('bq. quote'),format+' lost list/quote');
            if(format==='Markdown to BBCode') check(value.includes('[list=1]') && value.includes('[quote]'),format+' lost list/quote');
            if(format==='Markdown to Telegram') check(value.includes('*bold*')&&!value.includes('**bold**'),'Telegram bold');
            if(format==='Markdown to Discord') check(value.includes('# Hello'),'Discord heading');
            check(!document.querySelector('[aria-label="Converted document preview"] script')&&!window.converterUnsafe,format+' unsafe preview');
            if(format!=='Markdown to PDF') {
                const before=downloads.length;button('download result').click();await wait(()=>downloads.length>before||status.textContent.includes('failed'));
                check(downloads.length>before,format+' export failed');
                const exported=downloads.at(-1);check(exported.blob?.size>0,format+' empty download');
                if(format==='Markdown to DOCX') {docx=exported.blob;check(new Uint8Array(await docx.arrayBuffer())[0]===80,'Invalid DOCX ZIP');}
            }
            rows.push({format,passed:true,result:value.slice(0,120),download:downloads.at(-1)?.name});
        }
        return rows;
    } finally {HTMLAnchorElement.prototype.click=originalClick;URL.createObjectURL=originalUrl;setFile();}
}

