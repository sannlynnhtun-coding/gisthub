// Restore independently of the palette, before the first page render.
(() => {
    const styles = [
        { id: 'default', name: 'Current style (Default)', description: 'Original GistHub appearance' },
        { id: 'neobrutalism', name: 'Neobrutalism', description: 'Heavy outlines and bold offset shadows' },
        { id: 'bauhaus', name: 'Bauhaus', description: 'Geometric accents and structured surfaces' },
        { id: 'neumorphism', name: 'Neumorphism', description: 'Soft raised surfaces and inset controls' },
        { id: 'retro-futurism', name: 'Retro Futurism', description: 'Arcade frames and vintage terminal details' },
        { id: 'cyberpunk', name: 'Cyberpunk', description: 'Angular panels and restrained accent glow' },
        { id: 'glassmorphism', name: 'Glassmorphism', description: 'Frosted panels and translucent layers' },
        { id: 'flat', name: 'Flat', description: 'Clean surfaces with minimal decoration' },
        {"id": "neoclassical", "name": "Neoclassical", "description": "Balanced panels with classical heading rules"},
        {"id": "baroque", "name": "Baroque", "description": "Layered frames and deep surface shadows"},
        {"id": "aurora", "name": "Aurora", "description": "Ambient color fields and floating rounded panels"},
        {"id": "ethereal", "name": "Ethereal", "description": "Light surface shadows and open rounded frames"},
        {"id": "filigree", "name": "Filigree", "description": "Fine dotted trim around polished surfaces"},
        {"id": "acanthus", "name": "Acanthus", "description": "Leaf-shaped corners and paired accent rules"},
        {"id": "anthropomorphic", "name": "Anthropomorphic", "description": "Friendly capsule controls and expressive corner details"},
        {"id": "pixel-art", "name": "Pixel Art", "description": "Stepped shadows and pixel-grid framing"},
        {"id": "conceptual-sketch", "name": "Conceptual Sketch", "description": "Dashed ink outlines on a ruled canvas"},
        {"id": "luxury-typography", "name": "Luxury Typography", "description": "Spaced editorial headings and fine framing"},
        {"id": "japandi", "name": "Japandi", "description": "Quiet surfaces and understated section dividers"},
        {"id": "memphis", "name": "Memphis", "description": "Geometric canvas marks and offset accent shadows"},
        {"id": "bohemian", "name": "Bohemian", "description": "Woven canvas texture and stitched section trim"},
        {"id": "shabby-chic", "name": "Shabby Chic", "description": "Dotted vintage frames and soft inset edges"},
        {"id": "cottagecore", "name": "Farmhouse / Cottagecore", "description": "Gingham canvas with simple framed surfaces"},
        {"id": "victorian", "name": "Victorian", "description": "Double frames and ornamental heading dividers"},
        {"id": "art-deco", "name": "Art Deco", "description": "Stepped double outlines and geometric heading rules"},
        {"id": "art-nouveau", "name": "Art Nouveau", "description": "Flowing corners and curved accent dividers"},
        {"id": "mystical-western", "name": "Mystical Western", "description": "Celestial canvas marks and engraved frame details"},
        {"id": "kitsch", "name": "Kitsch", "description": "Glossy controls with playful layered accents"},
        {"id": "y2k", "name": "Y2K", "description": "Chrome-like inset highlights and capsule controls"},
        {"id": "brutalism", "name": "Brutalism", "description": "Square utilitarian frames with stark section rules"},
        {"id": "cybercore", "name": "Cybercore", "description": "Technical grid lines and precise accent frames"},
        {"id": "synthwave", "name": "Synthwave", "description": "Perspective-inspired grid and luminous edges"},
        {"id": "vaporwave", "name": "Vaporwave", "description": "Layered horizon bands and offset translucent frames"},
        {"id": "pop-art", "name": "Pop Art", "description": "Halftone canvas and comic-style heading emphasis"},
        {"id": "bento-box", "name": "Bento Box", "description": "Consistent modular panels with inset surface framing"},
        {"id": "graffiti", "name": "Graffiti", "description": "Speckled canvas and broad expressive heading strokes"},
        {"id": "tenebrism", "name": "Tenebrism", "description": "Spotlit canvas with deep contrasting panel shadows"},
        {"id": "gothic", "name": "Gothic", "description": "Arched panels and narrow engraved heading rules"},
        {"id": "pointillism", "name": "Pointillism", "description": "Layered dot fields and delicate stippled borders"},
        {"id": "mixed-media", "name": "Mixed Media", "description": "Mixed frame edges with offset paper layers"},
        {"id": "steampunk", "name": "Steampunk", "description": "Riveted heading trim and inset mechanical frames"},
        {"id": "kawaii", "name": "Kawaii", "description": "Pill controls and soft bubble-patterned surfaces"},
        {"id": "coquette", "name": "Coquette", "description": "Paired ribbon-like rules and delicate inset trim"},
        {"id": "surrealism", "name": "Surrealism", "description": "Unexpected organic corners and abstract orbit fields"},
        {"id": "utilitarian", "name": "Utilitarian", "description": "Plain technical panels and clearly separated controls"},
        {"id": "mid-century", "name": "Mid-Century", "description": "Organic geometric canvas with slim offset framing"},
        {"id": "scrapbook", "name": "Scrapbook", "description": "Paper layers and taped section-heading details"},
        {"id": "neo-frutiger-aero", "name": "Neo Frutiger Aero", "description": "Glossy aqua-like surfaces using the current accent"},
        {"id": "dark-magic-academia", "name": "Dark Magic Academia", "description": "Engraved book-like framing and scholarly headings"},
        {"id": "light-academia", "name": "Light Academia", "description": "Linen-like texture and restrained editorial rules"},
        {"id": "wabi-sabi", "name": "Wabi Sabi", "description": "Uneven organic corners and quiet grain patterns"},
        {"id": "wild-west", "name": "South West / Wild West", "description": "Stitched frames and strong slab-like heading rules"},
        {"id": "nautical", "name": "Nautical", "description": "Striped canvas and rope-like paired panel trim"},
        {"id": "rebus", "name": "Rebus", "description": "Geometric symbol accents with clearly labeled controls"},
        {"id": "modular-typography", "name": "Modular Typography", "description": "Grid-aligned heading blocks and segmented rules"},
        { id: 'cruip', name: 'Cruip', description: 'Artifact-inspired dashboard with quiet borders and rounded surfaces' },
        { id: 'boardui', name: 'BoardUI', description: 'BoardUI-inspired inset cards, layered buttons, segmented tabs and quiet dashboard surfaces' },
        { id: 'kit-sketchbook', name: 'Sketchbook UI', description: 'Hand-drawn frames, irregular corners and inked controls' },
        { id: 'kit-looseleaf', name: 'Looseleaf', description: 'Lined paper cards, notebook margins and a sage desktop' },
        { id: 'kit-productive', name: 'Productive Schedule', description: 'Blueprint dots, fine selection outlines and editorial section rules' },
        { id: 'kit-libraries', name: 'Libraries.dev', description: 'Luminous edge accents, metal-like buttons and dark studio surfaces' },
        { id: 'kit-beui-pro', name: 'beUI Pro', description: 'Layered ambient panels, inset highlights and polished call-to-action buttons' },
        { id: 'kit-heroui', name: 'HeroUI', description: 'Soft rounded cards, filled inputs, pill controls and segmented navigation' },
        { id: 'kit-rare', name: 'Rare UI', description: 'Folder-like card edges, tactile controls and gentle lift feedback' },
        { id: 'kit-goop', name: 'Goop UI', description: 'Organic rounded surfaces and elastic button feedback' },
        { id: 'kit-beui', name: 'beUI', description: 'Compact command panels, capsule tabs and crisp motion feedback' }
    ].map((style, index) => ({ ...style, group: index < 8 ? 'Original styles' : 'More design styles' }));
    const presets = [
        { id: 'bold-light', name: 'Neobrutalism + Light', style: 'neobrutalism', theme: 'light' },
        { id: 'geometric-light', name: 'Bauhaus + Atom One Light', style: 'bauhaus', theme: 'vscode-akamud-vscode-theme-onelight-atom-one-light' },
        { id: 'soft-nord', name: 'Neumorphism + Nord', style: 'neumorphism', theme: 'vscode-arcticicestudio-nord-visual-studio-code-nord' },
        { id: 'retro-gruvbox', name: 'Retro Futurism + Gruvbox', style: 'retro-futurism', theme: 'vscode-jdinhlife-gruvbox-gruvbox-dark-hard' },
        { id: 'cyber-tokyo', name: 'Cyberpunk + Tokyo Night', style: 'cyberpunk', theme: 'vscode-enkia-tokyo-night-tokyo-night' },
        { id: 'glass-dark', name: 'Glassmorphism + Dark', style: 'glassmorphism', theme: 'dark' },
        { id: 'flat-light', name: 'Flat + Light', style: 'flat', theme: 'light' },
        { id: 'boardui-light', name: 'BoardUI · Light', style: 'boardui', theme: 'boardui-light' },
        { id: 'boardui-dark', name: 'BoardUI · Dark', style: 'boardui', theme: 'boardui-dark' },
        ...styles.filter(style => style.id.startsWith('kit-')).flatMap(style =>
            ['light', 'dark'].map(mode => ({ id: `${style.id}-${mode}`, name: `${style.name} · ${mode === 'light' ? 'Light' : 'Dark'}`, style: style.id, theme: `${style.id}-${mode}` })))
    ];
    window.getGistHubStylePresets = () => presets;
    window.applyGistHubStylePreset = (root, id) => {
        const preset = presets.find(entry => entry.id === id);
        if (!preset) return;
        root.dataset.savedStyle = preset.style;
        window.applyGistHubStyle(preset.style);
        window.commitGistHubThemePicker(root, preset.theme);
        return preset;
    };
    window.getGistHubStyles = () => styles;
    window.getGistHubStyle = () => document.documentElement.dataset.interfaceStyle;
    window.applyGistHubStyle = (id, persist = true) => {
        if (!styles.some(style => style.id === id)) id = 'default';
        document.documentElement.dataset.interfaceStyle = id;
        if (persist) {
            try { window.gistHubBackup.setPreference('gisthub:interface-style', id); } catch { /* Storage may be disabled. */ }
        }
        return id;
    };
    let saved;
    try { saved = localStorage.getItem('gisthub:interface-style'); } catch { /* Keep the original appearance. */ }
    window.applyGistHubStyle(saved, false);
})();
