(() => {
    const themes = {
        midnight: { background: '#0d1022', glow: '#6845ff', accent: '#78dce8', card: '#121426', text: '#f7f3e8', muted: '#aaa7bf' },
        signal: { background: '#101410', glow: '#2f773c', accent: '#71d84b', card: '#111811', text: '#efffe9', muted: '#91a68f' },
        paper: { background: '#fff0cf', glow: '#ff9f5a', accent: '#ff4f87', card: '#fffaf0', text: '#17130f', muted: '#6d6257' },
        grape: { background: '#241231', glow: '#b13d8c', accent: '#ff7cb8', card: '#1c1027', text: '#fff4fa', muted: '#c3a8bd' },
        simple: { background: '#f3f4f6', glow: '#f3f4f6', accent: '#1d4ed8', card: '#ffffff', text: '#111827', muted: '#4b5563', clean: true, light: true },
        professional: { background: '#e2e8f0', glow: '#e2e8f0', accent: '#93c5fd', card: '#172033', text: '#f1f5f9', muted: '#a8b5c9', clean: true }
    };

    const syntaxColors = (theme) => ({
        keyword: theme.accent,
        selector: theme.accent,
        literal: theme.light ? '#9f1239' : '#ff7aa8',
        string: (theme.light || theme === themes.paper) ? '#8f4a00' : '#ffd866',
        title: theme.light ? '#166534' : theme === themes.signal ? '#a8ee92' : '#a9dc76',
        type: (theme.light || theme === themes.paper) ? '#6e3fc0' : '#ab9df2',
        attribute: theme.light ? '#0e7490' : '#78dce8',
        number: (theme.light || theme === themes.paper) ? '#7044b6' : '#ab9df2',
        built_in: theme.light ? '#0e7490' : '#78dce8',
        variable: theme.text,
        comment: theme.muted,
        meta: theme.muted,
        default: theme.text
    });

    const tokenColor = (className, palette) => {
        const token = (className || '').replace('hljs-', '');
        if (/comment|quote|doctag|meta/.test(token)) return palette.comment;
        if (/keyword|selector-tag|section|link/.test(token)) return palette.keyword;
        if (/string|regexp|addition|symbol|bullet/.test(token)) return palette.string;
        if (/title|name/.test(token)) return palette.title;
        if (/type|class/.test(token)) return palette.type;
        if (/attr|attribute|property|tag/.test(token)) return palette.attribute;
        if (/number/.test(token)) return palette.number;
        if (/built_in|builtin-name|params/.test(token)) return palette.built_in;
        if (/variable|template-variable/.test(token)) return palette.variable;
        if (/literal/.test(token)) return palette.literal;
        return palette.default;
    };

    const highlightedHtml = (code, language) => {
        if (typeof hljs === 'undefined') return null;
        try {
            return language && language !== 'auto'
                ? hljs.highlight(code, { language, ignoreIllegals: true }).value
                : hljs.highlightAuto(code).value;
        } catch {
            return null;
        }
    };

    window.renderCodeImagePreview = (element, code, language) => {
        if (!element) return;
        const html = highlightedHtml(code || '', language);
        if (html === null) {
            element.textContent = code || '';
        } else {
            element.innerHTML = html;
        }
    };

    const allowedMarkdownTags = new Set([
        'A', 'BLOCKQUOTE', 'BR', 'CODE', 'DEL', 'EM', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
        'HR', 'LI', 'OL', 'P', 'PRE', 'STRONG', 'TABLE', 'TBODY', 'TD', 'TH', 'THEAD', 'TR', 'UL'
    ]);

    const safeMarkdownUrl = (value) => {
        const url = (value || '').trim();
        if (!url) return null;
        if (url.startsWith('#') || /^mailto:/i.test(url)) return url;
        try {
            const parsed = new URL(url, window.location.href);
            return /^(https?):$/.test(parsed.protocol) ? parsed.href : null;
        } catch {
            return null;
        }
    };

    const sanitizeMarkdownHtml = (html) => {
        const template = document.createElement('template');
        template.innerHTML = html || '';

        template.content.querySelectorAll('*').forEach((element) => {
            const tag = element.tagName;

            if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'IFRAME' || tag === 'OBJECT' || tag === 'EMBED') {
                element.remove();
                return;
            }

            if (tag === 'INPUT' && element.getAttribute('type')?.toLowerCase() === 'checkbox') {
                const marker = document.createElement('span');
                marker.className = 'markdown-task-marker';
                marker.textContent = element.hasAttribute('checked') ? '☑' : '☐';
                element.replaceWith(marker);
                return;
            }

            if (tag === 'IMG') {
                const fallback = document.createElement('span');
                fallback.className = 'markdown-image-fallback';
                fallback.textContent = element.getAttribute('alt')
                    ? `[Image: ${element.getAttribute('alt')}]`
                    : '[Image omitted from capture]';
                element.replaceWith(fallback);
                return;
            }

            if (!allowedMarkdownTags.has(tag)) {
                element.replaceWith(...element.childNodes);
                return;
            }

            const codeLanguageClass = tag === 'CODE'
                ? [...element.classList].find(name => /^language-[a-z0-9_+-]+$/i.test(name))
                : null;
            const href = tag === 'A' ? safeMarkdownUrl(element.getAttribute('href')) : null;
            const title = tag === 'A' ? element.getAttribute('title') : null;

            [...element.attributes].forEach(attribute => element.removeAttribute(attribute.name));

            if (codeLanguageClass) element.className = codeLanguageClass;
            if (href) {
                element.setAttribute('href', href);
                element.setAttribute('rel', 'noreferrer noopener');
            }
            if (title) element.setAttribute('title', title);
        });

        return template.content;
    };

    const highlightMarkdownBlocks = (element) => {
        if (typeof hljs === 'undefined') return;
        element.querySelectorAll('pre code').forEach((block) => {
            const languageClass = [...block.classList].find(name => name.startsWith('language-'));
            const language = languageClass?.slice('language-'.length);
            const source = block.textContent || '';
            try {
                const result = language && hljs.getLanguage(language)
                    ? hljs.highlight(source, { language, ignoreIllegals: true })
                    : hljs.highlightAuto(source);
                block.innerHTML = result.value;
                block.classList.add('hljs');
            } catch {
                block.textContent = source;
            }
        });
    };

    const renderMarkdownInto = async (element, markdown) => {
        if (!element) return;
        if (typeof marked === 'undefined') {
            element.textContent = markdown || '';
            return;
        }

        const parser = new marked.Marked({ gfm: true, breaks: false });
        const escapeMath = token => token.raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        // Preserve TeX escapes before Markdown consumes backslashes or interprets formatting.
        parser.use({ extensions: [
            {
                name: 'captureBlockMath', level: 'block',
                start: source => source.indexOf('$$'),
                tokenizer(source) {
                    const match = /^\$\$([\s\S]+?)\$\$(?:\n|$)/.exec(source);
                    if (match) return { type: 'captureBlockMath', raw: match[0] };
                },
                renderer: token => `<p>${escapeMath(token)}</p>`
            },
            {
                name: 'captureInlineMath', level: 'inline',
                start: source => source.indexOf('$'),
                tokenizer(source) {
                    const match = /^(\${1,2})(?!\$)((?:\\[\s\S]|[^$\\])+?)\1(?!\$)/.exec(source);
                    if (match) return { type: 'captureInlineMath', raw: match[0] };
                },
                renderer: escapeMath
            }
        ] });
        const html = parser.parse(markdown || '');
        const fragment = sanitizeMarkdownHtml(html);
        element.replaceChildren(fragment.cloneNode(true));
        if (!element.hasChildNodes()) {
            const empty = document.createElement('p');
            empty.className = 'markdown-empty';
            empty.textContent = 'Add Markdown to see a preview.';
            element.appendChild(empty);
        }
        highlightMarkdownBlocks(element);
        if (typeof renderMathInElement === 'function') {
            renderMathInElement(element, {
                output: 'mathml', trust: false, throwOnError: false, maxSize: 10, maxExpand: 1000,
                delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }]
            });
        }
        for (const code of element.querySelectorAll('pre code.language-mermaid')) {
            if (typeof mermaid === 'undefined') continue;
            const pre = code.parentElement;
            const id = `capture-${crypto.randomUUID()}`;
            try {
                const { svg } = await mermaid.render(id, code.textContent);
                if (!element.contains(pre)) continue;
                const diagram = document.createElement('div');
                diagram.className = 'markdown-diagram';
                diagram.innerHTML = DOMPurify.sanitize(svg, { ADD_TAGS: ['foreignObject'], ADD_ATTR: ['xmlns'] });
                pre.replaceWith(diagram);
            } catch {
                pre.title = 'Diagram could not be rendered; source retained.';
            } finally {
                document.getElementById(`d${id}`)?.remove();
            }
        }
    };

    window.renderMarkdownImagePreview = renderMarkdownInto;

    const highlightedLines = (code, language, theme) => {
        const html = highlightedHtml(code, language);
        if (html === null) {
            return (code || '').replace(/\r\n/g, '\n').split('\n').map(text => [{ text, color: theme.text }]);
        }

        const host = document.createElement('div');
        host.innerHTML = html;
        const lines = [[]];
        const palette = syntaxColors(theme);

        const appendText = (text, color) => {
            const parts = text.replace(/\r\n/g, '\n').split('\n');
            parts.forEach((part, index) => {
                if (part) lines[lines.length - 1].push({ text: part, color });
                if (index < parts.length - 1) lines.push([]);
            });
        };

        const walk = (node, inheritedColor) => {
            if (node.nodeType === Node.TEXT_NODE) {
                appendText(node.nodeValue || '', inheritedColor);
                return;
            }

            const ownColor = node.nodeType === Node.ELEMENT_NODE
                ? tokenColor(node.className, palette)
                : inheritedColor;
            node.childNodes.forEach(child => walk(child, ownColor || inheritedColor));
        };

        host.childNodes.forEach(node => walk(node, theme.text));
        return lines.length ? lines : [[{ text: '', color: theme.text }]];
    };

    const roundRect = (context, x, y, width, height, radius) => {
        const r = Math.min(radius, width / 2, height / 2);
        context.beginPath();
        context.moveTo(x + r, y);
        context.arcTo(x + width, y, x + width, y + height, r);
        context.arcTo(x + width, y + height, x, y + height, r);
        context.arcTo(x, y + height, x, y, r);
        context.arcTo(x, y, x + width, y, r);
        context.closePath();
    };

    const fitFont = (context, lines, requestedSize, availableWidth, availableHeight, showLineNumbers) => {
        let size = requestedSize;
        while (size > 11) {
            context.font = `600 ${size}px "Cascadia Code", Consolas, monospace`;
            const numberGutter = showLineNumbers ? context.measureText(String(lines.length)).width + 32 : 0;
            const widest = Math.max(...lines.map(line => context.measureText(line.map(segment => segment.text).join('')).width), 0);
            const lineHeight = size * 1.65;
            if (widest + numberGutter <= availableWidth && lines.length * lineHeight <= availableHeight) break;
            size -= 1;
        }
        return size;
    };

    const createCanvas = (options) => {
        const theme = themes[options.theme] || themes.midnight;
        const requestedFont = Number(options.fontSize) || 18;
        const padding = Number(options.padding) || 64;
        const code = options.code || '';
        const lines = highlightedLines(code, options.language, theme);
        const measureCanvas = document.createElement('canvas');
        const measure = measureCanvas.getContext('2d');
        measure.font = `600 ${requestedFont}px "Cascadia Code", Consolas, monospace`;
        const numberGutter = options.showLineNumbers ? measure.measureText(String(lines.length)).width + 38 : 0;
        const widestLine = Math.max(...lines.map(line => measure.measureText(line.map(segment => segment.text).join('')).width), 0);

        let width;
        let height;
        switch (options.format) {
            case 'square': width = 1200; height = 1200; break;
            case 'landscape': width = 1600; height = 900; break;
            case 'portrait': width = 1080; height = 1350; break;
            default:
                width = Math.max(820, Math.min(1800, Math.ceil(widestLine + numberGutter + padding * 2 + 112)));
                height = Math.max(560, Math.min(2000, Math.ceil(lines.length * requestedFont * 1.65 + padding * 2 + 210)));
                break;
        }

        const scale = 2;
        const canvas = document.createElement('canvas');
        canvas.width = width * scale;
        canvas.height = height * scale;
        const context = canvas.getContext('2d');
        context.scale(scale, scale);

        const gradient = context.createLinearGradient(0, 0, width, height);
        gradient.addColorStop(0, theme.background);
        gradient.addColorStop(1, theme.glow);
        context.fillStyle = gradient;
        context.fillRect(0, 0, width, height);

        if (!theme.clean) {
            context.globalAlpha = 0.12;
            context.fillStyle = theme.text;
            for (let x = 18; x < width; x += 24) {
                for (let y = 18; y < height; y += 24) {
                    context.beginPath();
                    context.arc(x, y, 1.3, 0, Math.PI * 2);
                    context.fill();
                }
            }
            context.globalAlpha = 1;

            context.fillStyle = theme.accent;
            context.beginPath();
            context.arc(width - padding * 0.55, padding * 0.7, Math.min(150, width * 0.11), 0, Math.PI * 2);
            context.fill();

        }

        const cardX = padding;
        const cardY = padding;
        const cardWidth = width - padding * 2;
        const cardHeight = height - padding * 2;

        context.fillStyle = theme.clean ? 'rgba(15,23,42,0.08)' : 'rgba(0,0,0,0.38)';
        roundRect(context, cardX + (theme.clean ? 3 : 16), cardY + (theme.clean ? 3 : 16), cardWidth, cardHeight, 18);
        context.fill();
        context.fillStyle = theme.card;
        roundRect(context, cardX, cardY, cardWidth, cardHeight, 18);
        context.fill();
        context.strokeStyle = theme.text;
        context.globalAlpha = 0.68;
        context.lineWidth = theme.clean ? 1 : 3;
        context.stroke();
        context.globalAlpha = 1;

        const innerX = cardX + 42;
        const innerWidth = cardWidth - 84;
        const barY = cardY + 32;
        ['#ff5f57', '#febc2e', '#28c840'].forEach((color, index) => {
            context.fillStyle = theme.clean ? theme.muted : color;
            context.beginPath();
            context.arc(innerX + index * 24, barY, 7, 0, Math.PI * 2);
            context.fill();
        });

        context.textBaseline = 'middle';
        context.textAlign = 'right';
        context.fillStyle = theme.muted;
        context.font = '800 15px "Aptos", sans-serif';
        context.fillText((options.languageLabel || 'Code').toUpperCase(), cardX + cardWidth - 42, barY);

        context.textAlign = 'left';
        context.fillStyle = theme.text;
        context.font = theme.clean ? '600 30px "Aptos", sans-serif' : '900 30px "Arial Black", "Aptos Display", sans-serif';
        if (options.title?.trim()) context.fillText(options.title.trim(), innerX, cardY + 92);
        context.fillStyle = theme.muted;
        context.font = '700 16px "Aptos", sans-serif';
        if (options.author?.trim()) context.fillText(options.author.trim(), innerX, cardY + (options.title?.trim() ? 124 : 92));

        context.textAlign = 'right';
        if (options.showContentCount) context.fillText(`${String(lines.length).padStart(2, '0')} LINES`, cardX + cardWidth - 42, cardY + 112);

        const hasMeta = options.title?.trim() || options.author?.trim() || options.showContentCount;
        const codeTop = cardY + (hasMeta ? 164 : 72);
        const codeBottom = cardY + cardHeight - 48;
        const availableHeight = codeBottom - codeTop;
        const fontSize = fitFont(context, lines, requestedFont, innerWidth, availableHeight, options.showLineNumbers);
        const lineHeight = fontSize * 1.65;
        context.font = `600 ${fontSize}px "Cascadia Code", Consolas, monospace`;
        context.textBaseline = 'top';

        const gutter = options.showLineNumbers
            ? context.measureText(String(lines.length)).width + 38
            : 0;
        const codeX = innerX + gutter;

        lines.forEach((line, lineIndex) => {
            const y = codeTop + lineIndex * lineHeight;
            if (y + lineHeight > codeBottom + 1) return;

            if (options.showLineNumbers) {
                context.textAlign = 'right';
                context.fillStyle = theme.muted;
                context.globalAlpha = 0.65;
                context.fillText(String(lineIndex + 1), innerX + gutter - 22, y);
                context.globalAlpha = 1;
            }

            context.textAlign = 'left';
            let x = codeX;
            line.forEach(segment => {
                context.fillStyle = segment.color;
                context.fillText(segment.text, x, y);
                x += context.measureText(segment.text).width;
            });
        });

        context.textBaseline = 'alphabetic';
        context.textAlign = 'right';
        context.fillStyle = theme.text;
        context.globalAlpha = 0.68;
        context.font = '800 13px "Aptos", sans-serif';
        context.fillText('GISTHUB / CODE CAPTURE', width - padding, height - Math.max(16, padding * 0.28));
        context.globalAlpha = 1;

        return canvas;
    };

    const markdownCaptureCss = (theme) => `
        * { box-sizing: border-box; }
        .markdown-export-root {
            width: 100%; height: 100%; display: flex; flex-direction: column; overflow: hidden;
            padding: var(--capture-padding); color: ${theme.text};
            background-color: ${theme.background};
            background-image: ${theme.clean ? 'none' : `radial-gradient(circle at 80% 10%, ${theme.accent} 0 7%, transparent 7.2%), radial-gradient(${theme.text} 1px, transparent 1px), linear-gradient(135deg, ${theme.background}, ${theme.glow})`};
            background-size: auto, 24px 24px, auto;
            font-family: Aptos, Arial, sans-serif;
        }
        .markdown-export-card {
            min-height: 0; flex: 1; display: flex; flex-direction: column; overflow: hidden;
            color: ${theme.text}; background: ${theme.card}; border: ${theme.clean ? 1 : 3}px solid ${theme.muted};
            border-radius: 18px; box-shadow: ${theme.clean ? '0 3px 12px rgba(15, 23, 42, .08)' : '16px 16px 0 rgba(0, 0, 0, .35)'};
        }
        .markdown-export-bar {
            min-height: 64px; display: flex; flex: 0 0 auto; align-items: center; justify-content: space-between;
            padding: 0 32px; color: ${theme.muted}; border-bottom: 1px solid ${theme.muted};
            font-size: 15px; font-weight: 800; letter-spacing: .09em; text-transform: uppercase;
        }
        .markdown-export-dots { display: flex; gap: 10px; }
        .markdown-export-dots i { width: 14px; height: 14px; display: block; border-radius: 50%; background: ${theme.accent}; }
        .markdown-export-dots i:nth-child(2) { opacity: .65; }
        .markdown-export-dots i:nth-child(3) { opacity: .3; }
        .markdown-export-meta { display: flex; flex: 0 0 auto; align-items: flex-start; justify-content: space-between; gap: 24px; padding: 28px 42px 10px; }
        .markdown-export-meta > div { min-width: 0; flex: 1; }
        .markdown-export-meta h1 { width: 100%; margin: 0; overflow: hidden; color: ${theme.text}; font-size: 34px; font-weight: ${theme.clean ? 600 : 900}; line-height: 1.15; text-overflow: ellipsis; white-space: nowrap; }
        .markdown-export-meta p, .markdown-export-meta span { margin: 6px 0 0; color: ${theme.muted}; font-size: 16px; font-weight: 700; }
        .markdown-export-meta span { white-space: nowrap; }
        .markdown-export-body { min-height: 0; flex: 1; overflow: hidden; padding: 14px 42px 38px; font-size: var(--capture-font-size); line-height: 1.55; overflow-wrap: anywhere; }
        .markdown-export-body > :first-child { margin-top: 0; }
        .markdown-export-body > :last-child { margin-bottom: 0; }
        .markdown-export-body h1, .markdown-export-body h2, .markdown-export-body h3, .markdown-export-body h4, .markdown-export-body h5, .markdown-export-body h6 { margin: 1.2em 0 .45em; color: ${theme.text}; font-weight: ${theme.clean ? 600 : 900}; line-height: 1.15; }
        .markdown-export-body h1 { padding-bottom: .28em; border-bottom: 2px solid ${theme.muted}; font-size: 2em; }
        .markdown-export-body h2 { padding-bottom: .22em; border-bottom: 1px solid ${theme.muted}; font-size: 1.55em; }
        .markdown-export-body h3 { font-size: 1.25em; }
        .markdown-export-body p { margin: .7em 0; }
        .markdown-export-body ul, .markdown-export-body ol { margin: .7em 0; padding-left: 1.65em; }
        .markdown-export-body li + li { margin-top: .25em; }
        .markdown-export-body blockquote { margin: 1em 0; padding: .65em 1em; color: ${theme.muted}; background: rgba(127, 127, 127, .1); border-left: 5px solid ${theme.accent}; }
        .markdown-export-body blockquote p { margin: 0; }
        .markdown-export-body a { color: ${theme.accent}; text-decoration: underline; text-underline-offset: .16em; }
        .markdown-export-body code { padding: .12em .32em; color: ${theme.text}; background: rgba(127, 127, 127, .16); border-radius: 4px; font-family: "Cascadia Code", Consolas, monospace; font-size: .88em; }
        .markdown-export-body pre { margin: 1em 0; overflow: hidden; padding: 1em 1.1em; background: ${theme.light ? '#f8fafc' : 'rgba(0, 0, 0, .32)'}; border: 1px solid ${theme.muted}; border-radius: 8px; }
        .markdown-export-body pre code { display: block; padding: 0; background: transparent; white-space: pre-wrap; }
        .markdown-export-body table { width: 100%; margin: 1em 0; border-collapse: collapse; font-size: .92em; }
        .markdown-export-body th, .markdown-export-body td { padding: .58em .72em; text-align: left; border: 1px solid ${theme.muted}; }
        .markdown-export-body th { color: ${theme.text}; background: rgba(127, 127, 127, .16); font-weight: ${theme.clean ? 600 : 900}; }
        .markdown-export-body tr:nth-child(even) { background: rgba(127, 127, 127, .08); }
        .markdown-export-body hr { height: 2px; margin: 1.35em 0; background: ${theme.muted}; border: 0; opacity: .55; }
        .markdown-task-marker { display: inline-block; margin-right: .35em; color: ${theme.accent}; }
        .markdown-image-fallback { display: inline-block; padding: .45em .65em; color: ${theme.muted}; border: 1px dashed ${theme.muted}; border-radius: 4px; }
        .markdown-empty { color: ${theme.muted}; font-style: italic; }
        .markdown-diagram { margin: 1em 0; padding: 12px; background: #fff; border-radius: 6px; }
        .markdown-diagram svg { display: block; max-width: 100%; height: auto; margin: auto; }
        math[display="block"] { display: block; margin: 1em 0; text-align: center; }
        .hljs-comment, .hljs-quote, .hljs-meta { color: ${theme.muted}; }
        .hljs-keyword, .hljs-selector-tag, .hljs-section { color: ${theme.accent}; }
        .hljs-string, .hljs-regexp, .hljs-symbol { color: ${(theme.light || theme === themes.paper) ? '#8f4a00' : '#ffd866'}; }
        .hljs-number, .hljs-literal, .hljs-type { color: ${(theme.light || theme === themes.paper) ? '#7044b6' : '#ab9df2'}; }
        .hljs-title, .hljs-name { color: ${theme.light ? '#166534' : theme === themes.signal ? '#a8ee92' : '#a9dc76'}; }
        .hljs-built_in, .hljs-attribute, .hljs-attr { color: ${syntaxColors(theme).built_in}; }
        .markdown-export-signature { display: flex; flex: 0 0 auto; justify-content: space-between; gap: 20px; padding-top: 20px; color: ${theme.text}; font-size: 14px; font-weight: 800; letter-spacing: .12em; opacity: .72; }
    `;

    const createElement = (tag, className, text) => {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (text !== undefined) element.textContent = text;
        return element;
    };

    const markdownDimensions = (format) => {
        switch (format) {
            case 'square': return { width: 1200, height: 1200 };
            case 'landscape': return { width: 1600, height: 900 };
            case 'portrait': return { width: 1080, height: 1350 };
            default: return { width: 1200, height: null };
        }
    };

    const canvasFromSvg = async (element, width, height) => {
        const serialized = new XMLSerializer().serializeToString(element);
        const svg = element.namespaceURI === 'http://www.w3.org/2000/svg'
            ? serialized
            : `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><foreignObject width="100%" height="100%">${serialized}</foreignObject></svg>`;
        const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
        const image = new Image();
        image.decoding = 'async';
        image.src = url;
        await new Promise((resolve, reject) => {
            image.onload = resolve;
            image.onerror = () => reject(new Error('The Markdown preview could not be rendered.'));
        });

        const scale = 2;
        const canvas = document.createElement('canvas');
        canvas.width = width * scale;
        canvas.height = height * scale;
        const context = canvas.getContext('2d');
        context.scale(scale, scale);
        context.drawImage(image, 0, 0, width, height);
        return canvas;
    };

    const createMarkdownCanvas = async (options, print = false) => {
        const theme = themes[options.theme] || themes.midnight;
        const dimensions = markdownDimensions(options.format);
        const requestedFont = Math.max(14, Math.min(26, Number(options.fontSize) || 18));
        const padding = Math.max(32, Math.min(96, Number(options.padding) || 64));

        const root = createElement('div', 'markdown-export-root');
        root.setAttribute('xmlns', 'http://www.w3.org/1999/xhtml');
        root.style.setProperty('--capture-padding', `${padding}px`);
        root.style.setProperty('--capture-font-size', `${requestedFont}px`);
        root.style.width = `${dimensions.width}px`;
        if (dimensions.height) root.style.height = `${dimensions.height}px`;

        const style = document.createElement('style');
        style.textContent = markdownCaptureCss(theme);
        root.appendChild(style);

        const card = createElement('article', 'markdown-export-card');
        const bar = createElement('div', 'markdown-export-bar');
        const dots = createElement('div', 'markdown-export-dots');
        dots.append(createElement('i'), createElement('i'), createElement('i'));
        bar.append(dots, createElement('span', null, 'MARKDOWN'));

        const meta = createElement('div', 'markdown-export-meta');
        const metaText = createElement('div');
        if (options.title?.trim()) metaText.append(createElement('h1', null, options.title.trim()));
        if (options.author?.trim()) metaText.append(createElement('p', null, options.author.trim()));
        if (metaText.childElementCount) meta.append(metaText);
        if (options.showContentCount) {
            const words = ((options.code || '').match(/\b[\p{L}\p{N}_'-]+\b/gu) || []).length;
            meta.append(createElement('span', null, `${String(words).padStart(2, '0')} WORDS`));
        }

        const body = createElement('div', 'markdown-export-body');

        card.append(bar);
        if (meta.childElementCount) card.append(meta);
        card.append(body);
        const signature = createElement('div', 'markdown-export-signature');
        signature.append(
            createElement('span', null, 'GISTHUB / MARKDOWN CAPTURE'),
            createElement('span', null, (options.format || 'auto').toUpperCase())
        );
        root.append(card, signature);

        const host = document.createElement('div');
        host.style.cssText = 'position:fixed;left:-100000px;top:0;visibility:hidden;pointer-events:none;';
        host.appendChild(root);
        document.body.appendChild(host);

        try {
            await renderMarkdownInto(body, options.code || '');
            if (print) {
                style.textContent += `
                    @page { size: A4; margin: 12mm; }
                    body { margin: 0; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
                    .markdown-export-root { width: 100% !important; height: auto !important; padding: 0; display: block; background: ${theme.card}; }
                    .markdown-export-card { display: block; overflow: visible; border: 0; box-shadow: none; }
                    .markdown-export-body { overflow: visible; }
                    .markdown-export-body pre, .markdown-export-body tr, .markdown-diagram { break-inside: avoid; }
                    .markdown-export-body h1, .markdown-export-body h2, .markdown-export-body h3 { break-after: avoid; }
                `;
                await printHtml(root.outerHTML, options.title);
                return;
            }
            let height = dimensions.height;
            if (!height) {
                root.style.minHeight = '640px';
                root.style.height = 'auto';
                let fittedFont = requestedFont;
                const measureNaturalHeight = () => Math.ceil(padding * 2 + card.scrollHeight + signature.scrollHeight + 20);
                let naturalHeight = measureNaturalHeight();
                while (naturalHeight > 2600 && fittedFont > 11) {
                    fittedFont -= 1;
                    root.style.setProperty('--capture-font-size', `${fittedFont}px`);
                    naturalHeight = measureNaturalHeight();
                }
                height = Math.max(640, Math.min(2600, naturalHeight));
                root.style.height = `${height}px`;
            } else {
                let fittedFont = requestedFont;
                while (body.scrollHeight > body.clientHeight && fittedFont > 11) {
                    fittedFont -= 1;
                    root.style.setProperty('--capture-font-size', `${fittedFont}px`);
                }
            }

            if (body.scrollHeight > body.clientHeight + 2 || body.scrollWidth > body.clientWidth + 2) {
                throw new Error('Content exceeds the canvas. Use Auto canvas or PDF for a longer document.');
            }
            return await canvasFromSvg(root, dimensions.width, height);
        } finally {
            host.remove();
        }
    };

    const createExportCanvas = async (options) => options.mode === 'markdown'
        ? createMarkdownCanvas(options)
        : createCanvas(options);

    const canvasToBlob = (canvas, type = 'image/png', quality = 0.9) => new Promise((resolve, reject) => {
        canvas.toBlob((result) => {
            if (result?.type === type) resolve(result);
            else reject(new Error('The image could not be rendered.'));
        }, type, quality);
    });

    const printHtml = async (html, title = 'GistHub document') => {
        const frame = document.createElement('iframe');
        frame.title = 'Print document';
        frame.setAttribute('aria-hidden', 'true');
        frame.setAttribute('sandbox', 'allow-same-origin allow-modals');
        frame.style.cssText = 'position:fixed;width:0;height:0;border:0;';
        const loaded = new Promise(resolve => { frame.onload = resolve; });
        frame.srcdoc = '<!doctype html><html><head><meta charset="utf-8"></head><body>' + html + '</body></html>';
        document.body.appendChild(frame);
        try {
            await loaded;
            frame.contentDocument.title = title;
            await frame.contentDocument.fonts.ready;
            await Promise.all([...frame.contentDocument.images].map(image => image.decode()));
            frame.contentWindow.addEventListener('afterprint', () => frame.remove(), { once: true });
            frame.contentWindow.focus();
            frame.contentWindow.print();
        } catch (error) { frame.remove(); throw error; }
    };

    window.createDiagramCanvas = canvasFromSvg;
    window.printCapture = printHtml;

    window.createMarkdownCardBlob = async (options) => {
        const format = ['jpeg', 'webp'].includes(options?.outputFormat) ? options.outputFormat : 'png';
        const canvas = await createMarkdownCanvas(options);
        try { return await canvasToBlob(canvas, `image/${format}`, Math.max(0.5, Math.min(1, Number(options?.quality) || 0.9))); }
        finally { canvas.width = canvas.height = 0; }
    };

    window.downloadCodeImage = async (options) => {
        if (options?.outputFormat === 'pdf') {
            if (options.mode === 'markdown') return createMarkdownCanvas(options, true);
            const canvas = await createExportCanvas(options);
            return printHtml(`<img style="width:100%" alt="Code capture" src="${canvas.toDataURL('image/png')}">`, options.title);
        }
        const canvas = await createExportCanvas(options || {});
        const safeName = (options?.title || (options?.mode === 'markdown' ? 'markdown-document' : 'code-snippet'))
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '') || (options?.mode === 'markdown' ? 'markdown-document' : 'code-snippet');
        const format = ['jpeg', 'webp'].includes(options?.outputFormat) ? options.outputFormat : 'png';
        const blob = await canvasToBlob(canvas, `image/${format}`, Math.max(0.5, Math.min(1, Number(options?.quality) || 0.9)));
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `${safeName}.${format === 'jpeg' ? 'jpg' : format}`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 0);
    };

    window.copyCodeImageToClipboard = async (options) => {
        if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
            return false;
        }

        try {
            const blob = createExportCanvas(options || {}).then(canvas => canvasToBlob(canvas));

            await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
            ]);
            await blob;
            return true;
        } catch (error) {
            console.warn('Copying the code image to the clipboard failed.', error);
            return false;
        }
    };

})();
