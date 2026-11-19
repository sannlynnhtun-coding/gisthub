(() => {
    const fonts = [
    {
        "id": "default",
        "name": "Inter (Default)",
        "family": "Inter Variable",
        "group": "Sans serif"
    },
    {
        "id": "josefin-sans",
        "name": "Josefin Sans",
        "family": "Josefin Sans Variable",
        "group": "Sans serif"
    },
    {
        "id": "roboto",
        "name": "Roboto",
        "family": "Roboto Variable",
        "group": "Sans serif"
    },
    {
        "id": "open-sans",
        "name": "Open Sans",
        "family": "Open Sans Variable",
        "group": "Sans serif"
    },
    {
        "id": "rubik",
        "name": "Rubik",
        "family": "Rubik Variable",
        "group": "Sans serif"
    },
    {
        "id": "dm-sans",
        "name": "DM Sans",
        "family": "DM Sans Variable",
        "group": "Sans serif"
    },
    {
        "id": "poppins",
        "name": "Poppins",
        "family": "Poppins",
        "group": "Sans serif"
    },
    {
        "id": "lato",
        "name": "Lato",
        "family": "Lato",
        "group": "Sans serif"
    },
    {
        "id": "nunito",
        "name": "Nunito",
        "family": "Nunito Variable",
        "group": "Sans serif"
    },
    {
        "id": "ubuntu",
        "name": "Ubuntu",
        "family": "Ubuntu",
        "group": "Sans serif"
    },
    {
        "id": "source-sans-pro",
        "name": "Source Sans Pro",
        "family": "Source Sans Pro",
        "group": "Sans serif"
    },
    {
        "id": "work-sans",
        "name": "Work Sans",
        "family": "Work Sans Variable",
        "group": "Sans serif"
    },
    {
        "id": "manrope",
        "name": "Manrope",
        "family": "Manrope Variable",
        "group": "Sans serif"
    },
    {
        "id": "raleway",
        "name": "Raleway",
        "family": "Raleway Variable",
        "group": "Sans serif"
    },
    {
        "id": "montserrat",
        "name": "Montserrat",
        "family": "Montserrat Variable",
        "group": "Sans serif"
    },
    {
        "id": "playfair-display",
        "name": "Playfair Display",
        "family": "Playfair Display Variable",
        "group": "Serif"
    },
    {
        "id": "libre-baskerville",
        "name": "Libre Baskerville",
        "family": "Libre Baskerville Variable",
        "group": "Serif"
    },
    {
        "id": "neuton",
        "name": "Neuton",
        "family": "Neuton",
        "group": "Serif"
    },
    {
        "id": "lora",
        "name": "Lora",
        "family": "Lora Variable",
        "group": "Serif"
    },
    {
        "id": "arvo",
        "name": "Arvo",
        "family": "Arvo",
        "group": "Slab serif"
    },
    {
        "id": "mona-sans",
        "name": "Mona Sans",
        "family": "Mona Sans Variable",
        "group": "Sans serif"
    },
    {
        "id": "hubot-sans",
        "name": "Hubot Sans",
        "family": "Hubot Sans Variable",
        "group": "Sans serif"
    },
    {
        "id": "public-sans",
        "name": "Public Sans",
        "family": "Public Sans Variable",
        "group": "Sans serif"
    },
    {
        "id": "geist",
        "name": "Geist Sans",
        "family": "Geist Variable",
        "group": "Sans serif"
    },
    {
        "id": "space-grotesk",
        "name": "Space Grotesk",
        "family": "Space Grotesk Variable",
        "group": "Sans serif"
    },
    {
        "id": "figtree",
        "name": "Figtree",
        "family": "Figtree Variable",
        "group": "Sans serif"
    },
    {
        "id": "instrument-sans",
        "name": "Instrument Sans",
        "family": "Instrument Sans Variable",
        "group": "Sans serif"
    },
    {
        "id": "onest",
        "name": "Onest",
        "family": "Onest Variable",
        "group": "Sans serif"
    },
    {
        "id": "plus-jakarta-sans",
        "name": "Plus Jakarta Sans",
        "family": "Plus Jakarta Sans Variable",
        "group": "Sans serif"
    },
    {
        "id": "outfit",
        "name": "Outfit",
        "family": "Outfit Variable",
        "group": "Sans serif"
    },
    {
        "id": "lexend",
        "name": "Lexend",
        "family": "Lexend Variable",
        "group": "Sans serif"
    },
    {
        "id": "aileron",
        "name": "Aileron",
        "family": "Aileron",
        "group": "Sans serif"
    },
    {
        "id": "hind",
        "name": "Hind",
        "family": "Hind",
        "group": "Sans serif"
    },
    {
        "id": "fira-sans",
        "name": "Fira Sans",
        "family": "Fira Sans",
        "group": "Sans serif"
    },
    {
        "id": "be-vietnam-pro",
        "name": "Be Vietnam Pro",
        "family": "Be Vietnam Pro",
        "group": "Sans serif"
    },
    {
        "id": "nacelle",
        "name": "Nacelle",
        "family": "Nacelle",
        "group": "Sans serif"
    },
    {
        "id": "hk-grotesk",
        "name": "HK Grotesk",
        "family": "HK Grotesk",
        "group": "Sans serif"
    },
    {
        "id": "playwrite-ar-guides",
        "name": "Playwrite Argentina Guides",
        "family": "Playwrite AR Guides",
        "group": "Handwriting"
    },
    {
        "id": "rubik-storm",
        "name": "Rubik Storm",
        "family": "Rubik Storm",
        "group": "Display / decorative"
    },
    {
        "id": "noto-sans-chakma",
        "name": "Noto Sans Chakma",
        "family": "Noto Sans Chakma",
        "group": "Sans serif"
    },
    {
        "id": "google-sans",
        "name": "Google Sans",
        "family": "Google Sans Variable",
        "group": "Sans serif"
    },
    {
        "id": "noto-sans-kharoshthi",
        "name": "Noto Sans Kharoshthi",
        "family": "Noto Sans Kharoshthi",
        "group": "Sans serif"
    },
    {
        "id": "asap-sharp",
        "name": "Asap Sharp",
        "family": "Asap Sharp Variable",
        "group": "Sans serif"
    },
    {
        "id": "noto-sans-jp",
        "name": "Noto Sans Japanese",
        "family": "Noto Sans JP Variable",
        "group": "Sans serif"
    },
    {
        "id": "noto-sans-elbasan",
        "name": "Noto Sans Elbasan",
        "family": "Noto Sans Elbasan",
        "group": "Sans serif"
    },
    {
        "id": "arimo",
        "name": "Arimo",
        "family": "Arimo Variable",
        "group": "Sans serif"
    },
    {
        "id": "noto-serif-gurmukhi",
        "name": "Noto Serif Gurmukhi",
        "family": "Noto Serif Gurmukhi Variable",
        "group": "Serif"
    },
    {
        "id": "roboto-condensed",
        "name": "Roboto Condensed",
        "family": "Roboto Condensed Variable",
        "group": "Sans serif"
    },
    {
        "id": "roboto-mono",
        "name": "Roboto Mono",
        "family": "Roboto Mono Variable",
        "group": "Monospace"
    },
    {
        "id": "oswald",
        "name": "Oswald",
        "family": "Oswald Variable",
        "group": "Sans serif"
    },
    {
        "id": "noto-sans",
        "name": "Noto Sans",
        "family": "Noto Sans Variable",
        "group": "Sans serif"
    },
    {
        "id": "yarndings-12",
        "name": "Yarndings 12",
        "family": "Yarndings 12",
        "group": "Display / decorative"
    },
    {
        "id": "nunito-sans",
        "name": "Nunito Sans",
        "family": "Nunito Sans Variable",
        "group": "Sans serif"
    },
    {
        "id": "noto-sans-nabataean",
        "name": "Noto Sans Nabataean",
        "family": "Noto Sans Nabataean",
        "group": "Sans serif"
    },
    {
        "id": "roboto-slab",
        "name": "Roboto Slab",
        "family": "Roboto Slab Variable",
        "group": "Serif"
    },
    {
        "id": "playwrite-it-trad",
        "name": "Playwrite Italia Tradizionale",
        "family": "Playwrite IT Trad Variable",
        "group": "Handwriting"
    },
    {
        "id": "merriweather",
        "name": "Merriweather",
        "family": "Merriweather Variable",
        "group": "Serif"
    },
    {
        "id": "kanit",
        "name": "Kanit",
        "family": "Kanit",
        "group": "Sans serif"
    },
    {
        "id": "bebas-neue",
        "name": "Bebas Neue",
        "family": "Bebas Neue",
        "group": "Sans serif"
    },
    {
        "id": "archivo-black",
        "name": "Archivo Black",
        "family": "Archivo Black",
        "group": "Sans serif"
    },
    {
        "id": "noto-sans-kr",
        "name": "Noto Sans Korean",
        "family": "Noto Sans KR Variable",
        "group": "Sans serif"
    },
    {
        "id": "micro-5-charted",
        "name": "Micro 5 Charted",
        "family": "Micro 5 Charted",
        "group": "Display / decorative"
    },
    {
        "id": "jetbrains-mono",
        "name": "JetBrains Mono",
        "family": "JetBrains Mono Variable",
        "group": "Monospace"
    },
    {
        "id": "barlow",
        "name": "Barlow",
        "family": "Barlow",
        "group": "Sans serif"
    },
    {
        "id": "pt-sans",
        "name": "PT Sans",
        "family": "PT Sans",
        "group": "Sans serif"
    },
    {
        "id": "archivo",
        "name": "Archivo",
        "family": "Archivo Variable",
        "group": "Sans serif"
    },
    {
        "id": "noto-sans-tc",
        "name": "Noto Sans Traditional Chinese",
        "family": "Noto Sans TC Variable",
        "group": "Sans serif"
    },
    {
        "id": "noto-sans-mandaic",
        "name": "Noto Sans Mandaic",
        "family": "Noto Sans Mandaic",
        "group": "Sans serif"
    },
    {
        "id": "source-sans-3",
        "name": "Source Sans 3",
        "family": "Source Sans 3 Variable",
        "group": "Sans serif"
    },
    {
        "id": "developer-jetbrains-mono",
        "name": "developer-JetBrains Mono",
        "family": "JetBrains Mono Variable",
        "group": "Developer"
    },
    {
        "id": "developer-fira-code",
        "name": "developer-Fira Code",
        "family": "Fira Code Variable",
        "group": "Developer"
    },
    {
        "id": "developer-geist-mono",
        "name": "developer-Geist Mono",
        "family": "Geist Mono Variable",
        "group": "Developer"
    },
    {
        "id": "developer-google-sans-code",
        "name": "developer-Google Sans Code",
        "family": "Google Sans Code Variable",
        "group": "Developer"
    },
    {
        "id": "developer-iosevka",
        "name": "developer-Iosevka",
        "family": "Iosevka",
        "group": "Developer"
    },
    {
        "id": "developer-source-code-pro",
        "name": "developer-Source Code Pro",
        "family": "Source Code Pro Variable",
        "group": "Developer"
    }
];
    window.getGistHubFonts = () => fonts;
    window.getGistHubFont = () => document.documentElement.dataset.font;
    window.applyGistHubFont = (id, persist = true) => {
        const font = fonts.find(font => font.id === id) ?? fonts.find(font => font.id === 'plus-jakarta-sans');
        const root = document.documentElement;
        const developer = font.group === 'Developer';
        const stack = `"${font.family}", "Noto Sans Myanmar Variable", "Myanmar Text", ${developer ? 'monospace' : 'system-ui, sans-serif'}`;
        root.dataset.font = font.id;
        root.style.setProperty('--font-ui', stack);
        if (developer) root.style.setProperty('--font-code', stack);
        else root.style.removeProperty('--font-code');
        if (font.id === 'default') root.style.removeProperty('--style-heading-font');
        else root.style.setProperty('--style-heading-font', stack);
        if (persist) {
            try { window.gistHubBackup.setPreference('gisthub:font', font.id); } catch { /* Storage can be disabled. */ }
        }
        return font.id;
    };
    let saved;
    try { saved = localStorage.getItem('gisthub:font'); } catch { /* Use the reference UI font when storage is unavailable. */ }
    window.applyGistHubFont(saved, false);
})();
