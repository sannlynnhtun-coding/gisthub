// Run alongside checkAllConverters in the live page at each emulated viewport.
export async function checkMobileConverters() {
    const check=(ok,message)=>{if(!ok)throw new Error(message);};
    const page=document.querySelector('.markdown-converters');
    const pane=page.closest('.tool-page-content');
    const assertLayout=format=>{
        check(document.documentElement.scrollWidth<=innerWidth+1,format+': page overflow');
        check(pane.scrollWidth<=pane.clientWidth+1,format+': workbench overflow');
        for(const el of page.querySelectorAll('select,input,textarea,button,summary')) {
            const rect=el.getBoundingClientRect();
            check(rect.width>0 && rect.left>=-1 && rect.right<=innerWidth+1,format+': clipped '+el.tagName);
            if(innerWidth<=1024) {
                check(parseFloat(getComputedStyle(el).fontSize)>=16,format+': small text/zoom risk');
                if(el.tagName!=='TEXTAREA')check(rect.height>=44,format+': small touch target '+el.tagName);
            }
        }
    };
    const rows=await checkAllConverters(assertLayout);
    const preview=page.querySelector('[aria-label="Converted document preview"]');
    // Stress rendered content separately from normal converter fixtures.
    const m=await import('/js/markdownConverters.js');
    const source='| A | B |\n|---|---|\n| '+ 'long'.repeat(150)+' | value |\n\n```\n'+ 'code'.repeat(200)+'\n```\n\nhttps://example.com/'+ 'long'.repeat(150);
    await m.convert('Markdown to HTML',source,preview);
    assertLayout('wide preview');
    for(const el of page.querySelectorAll('#converter-source, .converter-actions button, #converter-result, summary')) {
        el.scrollIntoView({block:'center'});
        const rect=el.getBoundingClientRect(), bounds=pane.getBoundingClientRect();
        check(rect.bottom>bounds.top && rect.top<bounds.bottom,'Unreachable '+el.tagName);
    }
    pane.scrollTop=0;
    return {width:innerWidth,height:innerHeight,converters:rows.length,overflow:false,wideContent:true,controlsReachable:true};
}
