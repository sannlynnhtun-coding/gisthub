"""Refresh the public catalog from installed skill metadata (requires installed PyYAML).

Run: python scripts/import-agent-skills.py [--check] [--home PATH]
Only names, descriptions and public publisher links are exported, never file contents,
credentials or absolute installation paths. Cached package examples are not skills.
"""
import argparse
import json
import re
from pathlib import Path
from urllib.parse import urlparse

import yaml

CATALOG = Path(__file__).resolve().parents[1] / "GistHub/wwwroot/data/agent-skills.json"
CATEGORIES = {
    "D": "Design & UI", "V": "Development", "T": "Testing & Debugging",
    "R": "Research & Data", "P": "Automation & Productivity",
    "C": "Documents & Content", "I": "Integrations & Deployment",
    "M": "Agent & Skill Management",
}

# Short Myanmar task summaries; keep product/library identifiers in their original form.
SUMMARY_RULES = """
^wait-what$|P|နားလည်ရခက်ခဲ့သည့် အကြောင်းအရာကို ပိုမိုရှင်းလင်းသည့် ပုံစံဖြင့် ပြန်လည်ရှင်းပြပေးသည်
domain-name|P|Project နှင့်ကိုက်ညီသည့် domain အမည်များကို စဉ်းစားရွေးချယ်ပေးသည်
^antislop$|V|မလိုအပ်သော code နှင့် အလွတ်သဘောဖြစ်နေသော ရလဒ်များကို လျှော့ချပြုပြင်ပေးသည်
ponytail-debt|V|နည်းပညာကြွေးမြီနှင့် မလိုအပ်သော ရှုပ်ထွေးမှုများကို စစ်ဆေးလျှော့ချပေးသည်
ponytail-gain|V|Code လျှော့ချပြုပြင်မှုများ၏ အကျိုးရလဒ်ကို တိုင်းတာသုံးသပ်ပေးသည်
ponytail-help|M|Ponytail mode နှင့် command များကို အသုံးပြုပုံ ရှင်းပြပေးသည်
^sites$|I|Website များကို ဖန်တီးပြင်ဆင်၍ ထုတ်ဝေရန် ကူညီပေးသည်
^show-me$|D|အကြောင်းအရာကို နားလည်ရလွယ်စေရန် ပုံနှင့် diagram များဖြင့် ရှင်းပြပေးသည်
^knap$|C|Template နှင့် JSON သို့မဟုတ် CSV အချက်အလက်မှ Markdown ဖိုင်များ ထုတ်လုပ်ပေးသည်
^ck$|session-persist|M|Project အကြောင်းအရာနှင့် လက်ရှိအခြေအနေကို session များအကြား သိမ်းဆည်းပြန်လည်အသုံးပြုပေးသည်
^flow$|P|ခက်ခဲသည့် ရည်မှန်းချက်ကို စမ်းသပ်မှုနှင့် မှတ်တမ်းများဖြင့် အဆင့်ဆင့်ဖြေရှင်းပေးသည်
^llm-config$|M|Language model provider နှင့် အသုံးပြုမှု configuration များကို စီမံပေးသည်
^horizon-track$|P|အချိန်ကြာမြင့်သည့် လုပ်ငန်း၏ တိုးတက်မှုနှင့် ဆက်လုပ်ရမည့် အဆင့်များကို မှတ်တမ်းတင်ပေးသည်
^iot-anomalies$|R|IoT sensor အချက်အလက်များမှ ပုံမှန်မဟုတ်သည့် အခြေအနေများကို ရှာဖွေပေးသည်
^iot-fleet$|I|IoT စက်အစုအဝေး၏ အခြေအနေနှင့် configuration များကို စီမံပေးသည်
^iot-register$|I|IoT စက်နှင့် ၎င်း၏ အချက်အလက်များကို မှတ်ပုံတင်ရန် ကူညီပေးသည်
observe-metrics|observability|observe-trace|V|စနစ်၏ metric နှင့် trace အချက်အလက်များကို စုစည်းစစ်ဆေးပေးသည်
opensource-pipeline|I|Open-source project များအတွက် စစ်ဆေးမှုနှင့် ဖြန့်ချိမှုလုပ်ငန်းစဉ်ကို စီမံပေးသည်
to-questionnaire|P|လိုအပ်ချက်များကို စုဆောင်းနိုင်ရန် မေးခွန်းစာရင်းအဖြစ် ပြောင်းလဲပေးသည်
wasm-gallery|D|WebAssembly နမူနာနှင့် ပြသချက်များကို ဖန်တီးစီမံရန် ကူညီပေးသည်
source-command-auto-update|M|မူရင်း command နှင့် workflow ဖိုင်များကို အပ်ဒိတ်လုပ်ရန် ကူညီပေးသည်
source-command-epic-decompose|P|ကြီးမားသော feature ကို အကောင်အထည်ဖော်နိုင်သည့် အလုပ်ခွဲများအဖြစ် ခွဲပေးသည်
source-command-epic-publish|P|Epic နှင့် ၎င်း၏ အလုပ်ခွဲများကို issue tracker တွင် ထုတ်ဝေရန် ကူညီပေးသည်
source-command-epic-unblock|P|Epic လုပ်ငန်းစဉ်တွင် တားဆီးနေသည့် dependency နှင့် ပြဿနာများကို ဖြေရှင်းပေးသည်
source-command-hookify|M|လုပ်ဆောင်မှုစည်းမျဉ်း hook များကို ဖန်တီးသတ်မှတ်စီမံရန် ကူညီပေးသည်
source-command-instinct-import|M|ယခင်လေ့လာထားသော လုပ်ဆောင်မှုပုံစံများကို ပြန်လည်တင်သွင်းပေးသည်
source-command-instinct-status|M|လေ့လာထားသော လုပ်ဆောင်မှုပုံစံနှင့် ယုံကြည်မှုအခြေအနေကို ပြပေးသည်
source-command-projects|source-command-setup-pm|P|Project နှင့် package manager configuration များကို စီမံသတ်မှတ်ရန် ကူညီပေးသည်
cost-export|P|AI အသုံးပြုမှုနှင့် ကုန်ကျစရိတ်မှတ်တမ်းများကို ဖိုင်အဖြစ် ထုတ်ယူပေးသည်
cost-track|cost-tracking|P|AI အသုံးပြုမှုနှင့် ကုန်ကျစရိတ်ကို မှတ်တမ်းတင်စောင့်ကြည့်ပေးသည်
cost-trend|P|AI ကုန်ကျစရိတ်၏ အချိန်အလိုက် ပြောင်းလဲမှုကို သုံးသပ်ပေးသည်
cost-report|cost-summary|P|AI အသုံးပြုမှုနှင့် ကုန်ကျစရိတ်ကို အစီရင်ခံစာအဖြစ် စုစည်းပေးသည်
recipe-backup-sheet|P|Spreadsheet အချက်အလက်များကို CSV အဖြစ် backup လုပ်ပေးသည်
recipe-batch-invite|P|အစည်းအဝေးသို့ လူအများကို တစ်ပြိုင်နက် ဖိတ်ကြားရန် ကူညီပေးသည်
recipe-block-focus|P|အာရုံစိုက်အလုပ်လုပ်နိုင်ရန် calendar တွင် အချိန်နေရာသတ်မှတ်ပေးသည်
recipe-bulk-download|P|Folder အတွင်းရှိ ဖိုင်များကို အစုလိုက် download လုပ်ပေးသည်
recipe-collect-form|P|Form အဖြေများကို စုဆောင်းစုစည်းပေးသည်
recipe-compare-sheet|P|Spreadsheet tab များ၏ အချက်အလက်ကွာခြားမှုကို နှိုင်းယှဉ်ပေးသည်
recipe-copy-sheet|P|လအသစ်အတွက် spreadsheet ကို မိတ္တူပွားပြင်ဆင်ပေးသည်
recipe-create-classroom|P|Google Classroom course အသစ် တည်ဆောက်ရန် ကူညီပေးသည်
recipe-create-doc|P|Template ကို အခြေခံ၍ စာတမ်းအသစ် ဖန်တီးပေးသည်
recipe-create-events|P|Spreadsheet အချက်အလက်မှ calendar event များ ဖန်တီးပေးသည်
recipe-create-expense|P|အသုံးစရိတ်မှတ်တမ်းတင်သည့် spreadsheet ဖန်တီးပေးသည်
recipe-create-feedback|P|တုံ့ပြန်ချက်စုဆောင်းရန် form ဖန်တီးပေးသည်
recipe-create-gmail|P|Gmail စာများကို အလိုအလျောက်ခွဲခြားရန် filter ဖန်တီးပေးသည်
recipe-create-meet|P|Google Meet အစည်းအဝေးအခန်း ဖန်တီးပေးသည်
recipe-create-presentation|P|တင်ပြချက်အတွက် slide ဖိုင်အသစ် ဖန်တီးပေးသည်
recipe-create-shared-drive|P|အဖွဲ့မျှဝေသုံးစွဲရန် shared drive ဖန်တီးပေးသည်
recipe-create-task|P|ဆောင်ရွက်ရန် အလုပ်စာရင်း ဖန်တီးပေးသည်
recipe-create-vacation|P|ရုံးပိတ်ရက်အတွက် အလိုအလျောက် email ပြန်ကြားချက် သတ်မှတ်ပေးသည်
recipe-draft-email|P|စာတမ်းအကြောင်းအရာမှ email မူကြမ်း ရေးသားပေးသည်
recipe-email-drive|P|Drive ဖိုင် link ကို email ဖြင့် မျှဝေရန် ကူညီပေးသည်
recipe-find-free|P|Calendar မှ အားလပ်ချိန်များ ရှာဖွေပေးသည်
recipe-find-large|P|Storage အသုံးများသည့် ဖိုင်ကြီးများကို ရှာဖွေပေးသည်
recipe-forward-labeled|P|သတ်မှတ်ထားသော label ပါသည့် email များကို လွှဲပို့ရန် ကူညီပေးသည်
recipe-generate-report|P|Spreadsheet အချက်အလက်မှ အစီရင်ခံစာ ဖန်တီးပေးသည်
recipe-label-and-archive|P|Email များကို label သတ်မှတ်၍ archive လုပ်ပေးသည်
recipe-log-deal|P|အရောင်းအဝယ်၏ နောက်ဆုံးအခြေအနေကို spreadsheet တွင် မှတ်တမ်းတင်ပေးသည်
recipe-organize-drive|P|Drive folder အတွင်းရှိ ဖိုင်များကို စုစည်းပေးသည်
recipe-plan-weekly|P|တစ်ပတ်စာ အလုပ်နှင့် အချိန်ဇယားကို စီစဉ်ပေးသည်
recipe-post-mortem|P|ဖြစ်ရပ်နောက်ပိုင်း သုံးသပ်အစည်းအဝေးအတွက် စာတမ်းနှင့် အလုပ်များ ပြင်ဆင်ပေးသည်
recipe-reschedule|P|အစည်းအဝေးအချိန် ပြောင်းလဲသတ်မှတ်ရန် ကူညီပေးသည်
recipe-review-meet|P|Meet အစည်းအဝေးတက်ရောက်သူများကို စစ်ဆေးပေးသည်
recipe-review-overdue|P|သတ်မှတ်ချိန်ကျော်လွန်နေသည့် အလုပ်များကို စစ်ဆေးပေးသည်
recipe-save-email-attachments|P|Email attachment များကို Drive တွင် သိမ်းဆည်းပေးသည်
recipe-save-email-to-doc|P|Email အကြောင်းအရာကို စာတမ်းအဖြစ် သိမ်းဆည်းပေးသည်
recipe-schedule-recurring|P|အကြိမ်ကြိမ်ပြုလုပ်မည့် event အချိန်ဇယား သတ်မှတ်ပေးသည်
recipe-send-team|P|အဖွဲ့ကြေညာချက်ကို ပို့ရန် ကူညီပေးသည်
recipe-share-doc|P|စာတမ်းမျှဝေ၍ သက်ဆိုင်သူများအား အသိပေးရန် ကူညီပေးသည်
recipe-share-event|P|အစည်းအဝေးဆိုင်ရာ စာတမ်းနှင့် ဖိုင်များကို မျှဝေရန် ကူညီပေးသည်
recipe-share-folder|P|Folder အသုံးပြုခွင့်ကို အဖွဲ့နှင့် မျှဝေရန် ကူညီပေးသည်
recipe-sync-contacts|P|Contact အချက်အလက်များကို spreadsheet နှင့် တစ်ပြေးညီဖြစ်အောင် ပြင်ဆင်ပေးသည်
recipe-watch-drive|P|Drive ဖိုင်ပြောင်းလဲမှုများကို စောင့်ကြည့်ပေးသည်
gws-gmail-forward|gws-gmail-reply|gws-gmail-send|I|Gmail စာများကို ပြန်ကြား သို့မဟုတ် လွှဲပို့ရန် ကူညီပေးသည်
gws-gmail-read|gws-gmail-triage|gws-gmail-watch|I|Gmail စာများကို ဖတ်ရှု၊ ဦးစားပေးခွဲခြား သို့မဟုတ် စောင့်ကြည့်ပေးသည်
gws-sheets-append|gws-sheets-read|I|Spreadsheet မှ အချက်အလက်ဖတ်ရှုခြင်း သို့မဟုတ် row အသစ်ထည့်ခြင်းကို ကူညီပေးသည်
gws-calendar-agenda|gws-calendar-insert|I|Calendar အစီအစဉ်ကို ဖတ်ရှုခြင်း သို့မဟုတ် event အသစ်ထည့်ခြင်းကို ကူညီပေးသည်
gws-drive-upload|I|ဖိုင်ကို Google Drive သို့ တင်ရန် ကူညီပေးသည်
3d-high-poly|D|အသေးစိတ်ကျသည့် 3D model များကို ဖန်တီးပြင်ဆင်ပေးသည်
3d-high-resolution|D|3D မျက်နှာပြင်များအတွက် resolution မြင့် texture များကို ပြင်ဆင်ပေးသည်
3d-retina|D|3D မြင်ကွင်းများကို resolution မြင့် screen များနှင့် ကိုက်ညီအောင် ပြင်ဆင်ပေးသည်
a11y|accessibility|frontend-a11y|^audit$|D|လူတိုင်းအသုံးပြုနိုင်မှု၊ keyboard ထိန်းချုပ်မှုနှင့် UI ဖတ်ရှုရလွယ်ကူမှုကို စစ်ဆေးပေးသည်
animation|animate|motion|D|UI လှုပ်ရှားမှုနှင့် transition များကို ဖန်တီးစစ်ဆေးပြုပြင်ပေးသည်
design|taste|brandkit|geist$|shadcn|theme|colorize|ui-|minimalist|brutalist|bencium|emil-design|D|မျက်နှာပြင်ဒီဇိုင်း၊ layout၊ အရောင်နှင့် စာလုံးပုံစံများကို ရည်ရွယ်ချက်နှင့်ကိုက်ညီအောင် ပြင်ဆင်ပေးသည်
figma|D|Figma ဒီဇိုင်းနှင့် component များကို ဖန်တီး၊ စစ်ဆေး သို့မဟုတ် code နှင့် ချိတ်ဆက်ပေးသည်
image-to-code|D|ဒီဇိုင်းပုံကို အခြေခံ၍ ကိုက်ညီသည့် web UI code ရေးသားပေးသည်
canvas|threejs|paperjsx|D|ပုံသဏ္ဌာန်၊ ချိတ်ဆက်မှုနှင့် visual မြင်ကွင်းများ ဖန်တီးရန် ကူညီပေးသည်
break-ui|D|UI ၏ အားနည်းချက်နှင့် မျက်နှာပြင်ပျက်ယွင်းနိုင်မှုများကို ရှာဖွေစစ်ဆေးပေးသည်
assertion|test-|testing|tests$|tdd|verification|verify|qa$|T|စမ်းသပ်မှုများ ရေးသား၊ လုပ်ဆောင်၍ ရလဒ်နှင့် လွှမ်းခြုံမှုကို စစ်ဆေးပေးသည်
debug|diagnos|tombstone|symbolication|dump-collect|binlog-failure|sentry-triage|gh-fix-ci|fix-defect|T|အမှားဖြစ်ရသည့် အကြောင်းရင်းကို log နှင့် အထောက်အထားများဖြင့် စစ်ဆေးပြုပြင်ပေးသည်
review|code-quality|codehealth|plankton|T|ပြောင်းလဲမှုများ၏ မှန်ကန်မှုနှင့် code အရည်အသွေးကို စစ်ဆေးအကြံပြုပေးသည်
security|safety|pii|defi|auth|firewall|V|လုံခြုံရေး၊ အသုံးပြုခွင့်နှင့် အချက်အလက်ကာကွယ်မှုဆိုင်ရာ လုပ်ဆောင်ချက်များကို စစ်ဆေးပြင်ဆင်ပေးသည်
coverage|crap-score|T|စမ်းသပ်မှုလွှမ်းခြုံမှုနှင့် code အန္တရာယ်ရှိနိုင်သည့် နေရာများကို သုံးသပ်ပေးသည်
benchmark|performance|latency|perf-|optimizing|simd|V|လုပ်ဆောင်ချိန်နှင့် resource အသုံးပြုမှုကို တိုင်းတာ၍ စွမ်းဆောင်ရည်မြှင့်တင်ရန် ကူညီပေးသည်
cost|token|context-budget|context-compact|strategic-compact|M|AI အသုံးပြုမှု၏ token၊ context နှင့် ကုန်ကျစရိတ်ကို စစ်ဆေးစီမံပေးသည်
memory|agentdb|reasoningbank|embedding|vector|retrieval|kg-|R|အချက်အလက်များကို မှတ်ဉာဏ်နှင့် index အဖြစ် သိမ်းဆည်း၍ ပြန်လည်ရှာဖွေသုံးစွဲရန် ကူညီပေးသည်
skill|plugin|marketplace|superpowers|M|Agent skill နှင့် plugin များကို ရှာဖွေ၊ ဖန်တီး၊ တပ်ဆင် သို့မဟုတ် စီမံရန် ကူညီပေးသည်
swarm|coordinat|orchestrat|consensus|quorum|raft-|gossip|byzantine|multi-agent|parallel-agent|subagent|M|Agent အများအပြား၏ တာဝန်ခွဲဝေမှု၊ ပူးပေါင်းမှုနှင့် ရလဒ်များကို စီမံပေးသည်
agent-|agentic|council|harness|federation|ruflo|flow-nexus|daa-agent|M|AI agent ၏ လုပ်ဆောင်ပုံ၊ ချိတ်ဆက်မှုနှင့် လုပ်ငန်းဆောင်ရွက်မှုကို စီမံရန် ကူညီပေးသည်
neural|pytorch|ml-|mle-|ito-|autoresearch|R|Model နှင့် စမ်းသပ်မှုများကို လေ့ကျင့်၊ အကဲဖြတ် သို့မဟုတ် တိုးတက်အောင် သုတေသနလုပ်ရန် ကူညီပေးသည်
research|search|scrape|crawl|defuddle|dossier|osint|exa-|pubmed|uspto|gget|last30days|R|သက်ဆိုင်ရာ အရင်းအမြစ်များကို ရှာဖွေ၍ အချက်အလက်ထုတ်ယူ၊ သုတေသနနှင့် အကျဉ်းချုပ်ပြုလုပ်ပေးသည်
data-|database|postgres|mysql|redis|prisma|jpa-|clickhouse|ef-core|kleppmann|R|Database နှင့် အချက်အလက်စနစ်များကို တည်ဆောက်၊ မေးမြန်း သို့မဟုတ် စီမံရန် ကူညီပေးသည်
market-|trader-|prediction-|R|ဈေးကွက်အချက်အလက်နှင့် လမ်းကြောင်းများကို စုစည်း၍ မဟာဗျူဟာနှင့် အန္တရာယ်ကို သုံးသပ်ပေးသည်
paper-|scientific-|R|သုတေသနစာတမ်းများ၏ အချက်အလက်နှင့် အရည်အသွေးကို စုစည်းသုံးသပ်ပေးသည်
notebooklm|R|Notebook နှင့် အရင်းအမြစ်များကို စီမံ၍ မေးခွန်းများဖြေဆိုရန်နှင့် အကြောင်းအရာထုတ်လုပ်ရန် ကူညီပေးသည်
gws-|google-|I|Google Workspace ဝန်ဆောင်မှု၏ အချက်အလက်နှင့် လုပ်ငန်းများကို ချိတ်ဆက်စီမံပေးသည်
github|^gh-|git-|merge-conflict|worktree|I|Git repository၊ branch၊ issue နှင့် pull request လုပ်ငန်းများကို စီမံရန် ကူညီပေးသည်
deploy|vercel|expo-|uncloud|nuget|ci-cd|cicd|I|Project ကို တည်ဆောက်ဖြန့်ချိခြင်းနှင့် ဆက်စပ်ဝန်ဆောင်မှုများ ချိတ်ဆက်ခြင်းကို ကူညီပေးသည်
network|homelab|netmiko|cisco|wireguard|pihole|vlan|I|ကွန်ရက်ချိတ်ဆက်မှု၊ configuration နှင့် စက်ပစ္စည်းအခြေအနေများကို စစ်ဆေးစီမံပေးသည်
docker|kubernetes|flox|env-vars|I|Runtime environment နှင့် infrastructure configuration များကို ပြင်ဆင်စီမံပေးသည်
browser|playwright|computer-use|chrome|I|Browser သို့မဟုတ် desktop ကို ထိန်းချုပ်၍ သက်ဆိုင်ရာ အဆင့်များကို ဆောင်ရွက်ရန် ကူညီပေးသည်
mcp-|mcp |connect|integration|api-connector|I|Agent နှင့် ပြင်ပဝန်ဆောင်မှုများကို tool သို့မဟုတ် API ဖြင့် ချိတ်ဆက်ရန် ကူညီပေးသည်
notion|obsidian|C|ချိတ်ဆက်ထားသော မှတ်စုများနှင့် စာမျက်နှာများကို ဖန်တီး၊ စုစည်း သို့မဟုတ် ပြင်ဆင်ပေးသည်
document|docs|doc-gen|markdown|docx|pdf|technical-book|C|စာတမ်းအကြောင်းအရာများကို ဖန်တီး၊ ပြောင်းလဲ သို့မဟုတ် အစီအစဉ်တကျ စုစည်းပေးသည်
spreadsheet|excel|formula|sheets|C|Spreadsheet အချက်အလက်၊ formula နှင့် ဇယားများကို ဖန်တီးစစ်ဆေးပြင်ဆင်ပေးသည်
slide|presentation|C|တင်ပြချက်နှင့် slide များကို ဖန်တီး၊ ပြင်ဆင် သို့မဟုတ် စီစဉ်ပေးသည်
writing|writer|copywriting|content|article|brand-voice|burmese|C|ရည်ရွယ်ချက်နှင့် ပရိသတ်အလိုက် ရှင်းလင်းသည့် စာသားရေးသားပြင်ဆင်ပေးသည်
video|manim|remotion|gif|image|fal-ai|C|ပုံ၊ animation နှင့် video အကြောင်းအရာများ ဖန်တီးပြင်ဆင်ရန် ကူညီပေးသည်
template|artifact-|C|အကြောင်းအရာနှင့် ရလဒ်ဖိုင်များအတွက် သင့်လျော်သည့် template ဖန်တီးအသုံးပြုရန် ကူညီပေးသည်
resume|letterhead|visa-|C|လိုအပ်သော စာတမ်းအချက်အလက်နှင့် စာသားပုံစံများကို ပြင်ဆင်ပေးသည်
email|gmail|messages|notifications|slack|x-api|social-|crosspost|P|သတင်းစကားနှင့် လူမှုကွန်ရက်အကြောင်းအရာများကို စုစည်းစီမံရန် ကူညီပေးသည်
recipe-|P|သတ်မှတ်ထားသော လုပ်ငန်းအဆင့်များကို ချိတ်ဆက်၍ အလိုအလျောက်ဆောင်ရွက်ရန် ကူညီပေးသည်
meeting|calendar|schedule|cron-|event-|P|အစည်းအဝေး၊ အချိန်ဇယားနှင့် ဆက်လက်လုပ်ဆောင်ရမည့် အလုပ်များကို စီစဉ်ပေးသည်
file-organizer|invoice|P|ဖိုင်နှင့် စာရင်းအချက်အလက်များကို အစီအစဉ်တကျ စုစည်းပေးသည်
workflow|autopilot|autonomous|automation|loop-|P|လုပ်ငန်းအဆင့်များကို စီမံ၍ အလိုအလျောက် ထပ်မံလုပ်ဆောင်နိုင်ရန် ကူညီပေးသည်
plan|goal|wayfinder|blueprint|spec|ticket|P|လိုအပ်ချက်များကို စိစစ်၍ အကောင်အထည်ဖော်မည့် အစီအစဉ်နှင့် တာဝန်များ ခွဲပေးသည်
persona-|team-|project-|product-|story-|issue-|triage|P|လုပ်ငန်းတာဝန်၊ အဖွဲ့နှင့် project လိုအပ်ချက်များကို စိစစ်စီမံပေးသည်
finance|billing|payment|evm|P|ငွေကြေးနှင့် ငွေတောင်းခံမှုဆိုင်ရာ အချက်အလက်နှင့် လုပ်ငန်းများကို စစ်ဆေးစီမံပေးသည်
customer|support|sales|lead-|marketing|competitive|investor|P|ဖောက်သည်၊ ဈေးကွက်နှင့် စီးပွားရေးလိုအပ်ချက်များကို သုတေသနနှင့် စီမံရန် ကူညီပေးသည်
logistic|carrier|inventory|customs|energy|procurement|quality-|return|production-|P|လုပ်ငန်းလည်ပတ်မှု၊ အရည်အသွေးနှင့် ကုန်ပစ္စည်းစီမံမှုကို ကူညီပေးသည်
healthcare|hipaa|P|ကျန်းမာရေးစနစ်၏ အချက်အလက်နှင့် လုပ်ငန်းလိုအပ်ချက်များကို စီမံရန် ကူညီပေးသည်
adr-|architecture|ddd-|domain-model|V|စနစ်တည်ဆောက်ပုံ၊ domain model နှင့် နည်းပညာဆုံးဖြတ်ချက်များကို စီမံမှတ်တမ်းတင်ပေးသည်
migrat|convert-|V|လက်ရှိ code နှင့် project configuration ကို သတ်မှတ်ထားသော ပုံစံသစ်သို့ ပြောင်းလဲရန် ကူညီပေးသည်
build|msbuild|binlog|target-author|incremental|V|Project build၊ dependency နှင့် configuration ပြဿနာများကို စစ်ဆေးပြင်ဆင်ပေးသည်
react|next|vue|nuxt|svelte|angular|vite|swr|frontend|V|Frontend component၊ data fetching နှင့် framework လုပ်ဆောင်ချက်များ ရေးသားပြင်ဆင်ရန် ကူညီပေးသည်
aspnet|dotnet|csharp|fsharp|blazor|clr-|maui|V|.NET application နှင့် ဆက်စပ် runtime လုပ်ဆောင်ချက်များ တည်ဆောက်ပြင်ဆင်ရန် ကူညီပေးသည်
swift|apple|ios|android|expo|flutter|mobile|native|V|Mobile သို့မဟုတ် native application လုပ်ဆောင်ချက်များ တည်ဆောက်ပြင်ဆင်ရန် ကူညီပေးသည်
python|django|fastapi|V|Python application၊ API နှင့် framework လုပ်ဆောင်ချက်များကို တည်ဆောက်ပြင်ဆင်ပေးသည်
java|kotlin|spring|quarkus|mybatis|V|JVM application နှင့် ဆက်စပ် framework လုပ်ဆောင်ချက်များ တည်ဆောက်ပြင်ဆင်ရန် ကူညီပေးသည်
rust|golang|cpp|perl|laravel|rails|V|သက်ဆိုင်ရာ programming language နှင့် framework အတွက် code နှင့် လုပ်ဆောင်ပုံများကို လမ်းညွှန်ပေးသည်
api|backend|http|grpc|micro$|routing|middleware|queue|V|Backend ဝန်ဆောင်မှု၊ API နှင့် request လုပ်ဆောင်ပုံများ တည်ဆောက်ရန် ကူညီပေးသည်
sdk|node|bun-|ncc|turbopack|turborepo|V|SDK၊ package နှင့် developer tool လုပ်ဆောင်ချက်များကို ပြင်ဆင်အသုံးပြုရန် ကူညီပေးသည်
code|refactor|implement|diff|scan|pattern|V|Code နှင့် project ဖွဲ့စည်းပုံကို စိစစ်၍ သတ်မှတ်ထားသော အလုပ်ကို အကောင်အထည်ဖော်ပေးသည်
terminal|bash|shell|wizard|P|Command နှင့် အဆင့်ဆင့်ညွှန်ကြားချက်များဖြင့် လုပ်ငန်းဆောင်ရွက်ရန် ကူညီပေးသည်
pet|D|အလုပ်ခွင် companion ပုံနှင့် ၎င်း၏ ပုံစံများကို ဖန်တီးပြင်ဆင်ပေးသည်
"""


def public_url(value):
    return value if isinstance(value, str) and urlparse(value).scheme == "https" and not urlparse(value).username else None


def metadata(path):
    text = path.read_text(encoding="utf-8-sig")
    parts = re.split(r"^---\s*$", text, maxsplit=2, flags=re.M)
    data = yaml.safe_load(parts[1]) if len(parts) == 3 else None
    if not isinstance(data, dict) or not data.get("description"):
        raise ValueError(f"Missing skill description: {path}")
    return data


def installations(home):
    roots = [(home / ".codex/skills", "", None), (home / ".agents/skills", "", None)]
    cache = home / ".codex/plugins/cache"
    # One current cache version per package, excluding embedded examples and other agents' copies.
    for package in sorted(cache.glob("*/*")):
        versions = [p for p in package.iterdir() if p.is_dir()]
        if not versions:
            continue
        version = max(versions, key=lambda p: p.stat().st_mtime_ns)
        manifest = version / ".codex-plugin/plugin.json"
        info = json.loads(manifest.read_text(encoding="utf-8-sig")) if manifest.exists() else {}
        namespace = str(info.get("name") or package.name)
        source = public_url(info.get("repository")) or public_url(info.get("homepage"))
        roots.append((version / "skills", namespace, source))
        roots.append((version / ".codex-plugin/migrated-command-skills", namespace, source))
    found = {}
    for root, namespace, source in roots:
        for path in sorted(root.rglob("SKILL.md")):
            relative = path.relative_to(root)
            if any(part in {"references", "examples", "fixtures", "node_modules", ".git"} for part in relative.parts):
                continue
            data = metadata(path)
            name = str(data.get("name") or path.parent.name)
            key = f"{namespace}:{name}" if namespace else name
            item = dict(id=key, name=name, folder=path.parent.name, namespace=namespace,
                        description=" ".join(str(data["description"]).split()),
                        source=public_url(data.get("repository")) or public_url(data.get("homepage")) or source)
            if key.casefold() in found:
                # Shared and personal directories can contain the same skill; export it once.
                continue
            found[key.casefold()] = item
    return list(found.values())


def summary(name, description):
    for line in SUMMARY_RULES.strip().splitlines():
        pattern, category, mm = line.rsplit("|", 2)
        if re.search(pattern, name, re.I):
            return CATEGORIES[category], f"{name} — {mm}။"
    # Description keywords handle opaque names, while the English column retains the source summary.
    for line in SUMMARY_RULES.strip().splitlines():
        pattern, category, mm = line.rsplit("|", 2)
        if re.search(pattern, description, re.I):
            return CATEGORIES[category], f"{name} — {mm}။"
    return CATEGORIES["P"], f"{name} — သတ်မှတ်ထားသော လုပ်ငန်းကို မူရင်းလမ်းညွှန်ချက်များအတိုင်း ဆောင်ရွက်ရန် ကူညီပေးသည်။"


ARTICLE_ALIASES = {
    "design-taste-frontend": "Taste Skill", "impeccable": "Impeccable",
    "ponytail:ponytail": "Ponytail", "notebooklm": "NotebookLM-Py",
    "playwright-cli": "Playwright CLI", "gws-shared": "GWS — Google Workspace CLI",
    "anthropic-skill-creator": "Skill Creator", "last30days": "last30days",
    "firecrawl": "Firecrawl CLI", "obsidian-cli": "Obsidian",
}


def refresh(existing, installed):
    by_name = {row["Name"].casefold(): row for row in existing}
    rows = {row["Name"].casefold(): dict(row, Installed=False, InstalledSkills=[])
            for row in existing if not row.get("InstalledSkills") or row.get("Article")}
    for item in installed:
        name = ARTICLE_ALIASES.get(item["id"], item["id"])
        key = name.casefold()
        previous = by_name.get(key)
        if previous and (previous.get("Article") or not previous.get("InstalledSkills")):
            row = dict(previous)
        else:
            category, mm = summary(item["name"], item["description"])
            desc = re.split(r"(?<=[.!?])\s+(?=[A-Z])", item["description"])[0]
            if len(desc) > 650:
                desc = desc[:650].rsplit(" ", 1)[0] + "…"
            setup = (f"Codex: install the {item['namespace']} plugin from its publisher or the Plugins catalog, then restart Codex."
                     if item["namespace"] else
                     f"Copy the complete {item['folder']} skill folder (SKILL.md and supporting files) to ~/.codex/skills/{item['folder']}/, then restart Codex.")
            row = dict(Name=name, Category=category, Type="Skill", Agent="Codex", DescriptionEn=desc,
                       DescriptionMm=mm, Install=setup, Call=f"Use the {item['id']} skill for this task.",
                       Source=item["source"], Article=False)
        row.update(Installed=True, InstalledSkills=[item["id"]])
        rows[key] = row
    return sorted(rows.values(), key=lambda row: row["Name"].casefold())


def check(rows, installed):
    expected = {item["id"] for item in installed}
    actual = [name for row in rows for name in row.get("InstalledSkills", [])]
    assert len(actual) == len(set(actual)), "An installed skill is listed more than once"
    assert set(actual) == expected, f"Missing: {expected - set(actual)}; stale: {set(actual) - expected}"
    assert sum(row["Article"] for row in rows) == 17, "Preserve all 17 article entries"
    assert len({row["Name"].casefold() for row in rows}) == len(rows), "Duplicate display names"
    for row in rows:
        assert row["Installed"] == bool(row.get("InstalledSkills")), row["Name"]
        assert all(row[field].strip() for field in ["Name", "Category", "DescriptionEn", "DescriptionMm", "Install", "Call"]), row["Name"]
        assert any("\u1000" <= c <= "\u109f" for c in row["DescriptionMm"]), row["Name"]
        assert row["Source"] is None or public_url(row["Source"]), row["Name"]


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Verify full installed-skill coverage without writing")
    parser.add_argument("--home", type=Path, default=Path.home(), help="Home containing .codex and .agents")
    args = parser.parse_args()
    installed = installations(args.home)
    if not installed:
        parser.error("No installed skills found; the catalog was not changed")
    existing = json.loads(CATALOG.read_text(encoding="utf-8"))
    rows = existing if args.check else refresh(existing, installed)
    check(rows, installed)
    if not args.check:
        CATALOG.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{'Checked' if args.check else 'Imported'} {len(installed)} installed skills; {len(rows)} catalog entries.")
