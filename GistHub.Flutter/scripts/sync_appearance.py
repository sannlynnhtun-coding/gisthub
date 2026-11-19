"""Copy the Blazor appearance catalog and convert its local WOFF2 fonts to TTF.

Requires Node.js and Python fonttools and brotli. Run with the source wwwroot path.
Generated assets are committed; normal Flutter builds do not run this script.
"""
import colorsys
import json
from pathlib import Path
import re
import shutil
import subprocess
import sys

from fontTools.ttLib import TTFont

source = Path(sys.argv[1]).resolve()
destination = Path(__file__).resolve().parents[1] / "assets" / "appearance"
destination.mkdir(parents=True, exist_ok=True)
extract = r"""
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = process.argv[1], context = {window:{}};
for (const file of ['vscode-theme-catalog.js','figma-theme-catalog.js'])
  vm.runInNewContext(fs.readFileSync(path.join(root,'js',file),'utf8'), context);
function array(file, name) {
  const source = fs.readFileSync(path.join(root,'js',file),'utf8');
  const expression = source.match(new RegExp('const '+name+'\\s*=\\s*([\\s\\S]*?);'))[1];
  return vm.runInNewContext('('+expression+')', {styles: name === 'presets' ? array(file, 'styles') : undefined});
}
context.window.matchMedia = () => ({matches:false});
context.document = {documentElement:{dataset:{},classList:{add(){},remove(){},toggle(){}},style:{setProperty(){}}},querySelector(){return null}};
context.localStorage = {getItem(){return null}};
vm.runInNewContext(fs.readFileSync(path.join(root,'js','theme.js'),'utf8'), context);
console.log(JSON.stringify({themes:context.window.getGistHubThemes().filter(t=>!['light','dark'].includes(t.id)),
  fonts:array('fonts.js','fonts'),styles:array('interface-styles.js','styles'),
  presets:array('interface-styles.js','presets')}));
"""
catalog = json.loads(subprocess.check_output(["node", "-e", extract, str(source)], text=True, encoding="utf-8"))
css = "\n".join((source / "css" / name).read_text(encoding="utf-8") for name in ["vscode-themes.css", "figma-themes.css", "design-styles.css", "reference-appearances.css"])
for theme in catalog["themes"]:
    block = re.search(r':root\[data-theme="' + re.escape(theme["id"]) + r'"\]\s*\{([^}]+)\}', css)[1]
    tokens = {key: value.strip() for key, value in re.findall(r'--([\w-]+):([^;]+);', block)}
    theme["colors"] = {}
    for key in ["background", "foreground", "card", "secondary", "muted-foreground", "border", "primary", "primary-foreground"]:
        h, s, light = [float(part.rstrip("%")) for part in tokens[key].split()]
        rgb = colorsys.hls_to_rgb(h / 360, light / 100, s / 100)
        theme["colors"][key] = "#" + "".join(f"{round(c * 255):02x}" for c in rgb)
    theme["colors"]["code"] = tokens.get("neo-code-text", theme["colors"]["foreground"])

styles_css = "\n".join((source / "css" / name).read_text(encoding="utf-8") for name in ["interface-styles.css", "design-styles.css", "reference-appearances.css"])
for style in catalog["styles"]:
    blocks = re.findall(r':root\[data-interface-style="' + re.escape(style["id"]) + r'"\](?:\[[^\]]+\]|:not\([^)]*\))*\s*\{([^}]+)\}', styles_css)
    tokens = dict(re.findall(r'--style-([\w-]+):\s*([^;]+);', "\n".join(blocks)))
    radii = []
    for number, unit in re.findall(r'([\d.]+)(rem|px)?', tokens.get("radius", ".65rem")):
        radii.append(float(number) * (16 if unit == "rem" else 1))
    style.update(radius=radii or [0], border=float(tokens.get("border", "1px").replace("px", "")),
                 elevation=0 if tokens.get("shadow") == "none" else 3)

font_css = "\n".join((source / "css" / name).read_text(encoding="utf-8") for name in ["fonts.css", "font-library.css"])
faces = {}
for block in re.findall(r'@font-face\s*\{([^}]+)\}', font_css):
    if "font-style: italic" in block:
        continue
    family = re.search(r"font-family:\s*['\"]([^'\"]+)", block)[1]
    file = Path(re.search(r'url\(([^)]+)\)', block)[1]).name
    faces.setdefault(family, []).append(file)
catalog["fonts"].append({"id": "myanmar", "name": "Noto Sans Myanmar", "family": "Noto Sans Myanmar Variable", "group": "Script fonts"})
for font in catalog["fonts"]:
    files = faces[font["family"]]
    selected = [f for f in files if "-latin-" in f] or files
    font["assets"] = []
    for filename in dict.fromkeys(selected):
        original = source / "fonts" / filename
        target = destination / (original.stem + ".ttf" if original.suffix == ".woff2" else original.name)
        if original.suffix == ".woff2":
            face = TTFont(original, recalcTimestamp=False)
            face.flavor = None
            face.save(target)
            face.close()
        else:
            shutil.copyfile(original, target)
        font["assets"].append("assets/appearance/" + target.name)
for license in (source / "fonts").glob("*-LICENSE.txt"):
    shutil.copyfile(license, destination / license.name)
shutil.copyfile(source / "fonts/README.md", destination / "FONT-SOURCES.md")

theme_ids = {t["id"] for t in catalog["themes"]} | {"light", "dark"}
style_ids = {s["id"] for s in catalog["styles"]}
assert all(p["theme"] in theme_ids and p["style"] in style_ids for p in catalog["presets"])
assert all(font["assets"] for font in catalog["fonts"])
(destination / "catalog.json").write_text(json.dumps(catalog, ensure_ascii=False, indent=2), encoding="utf-8")
print({key: len(value) for key, value in catalog.items()})
