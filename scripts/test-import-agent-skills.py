import importlib.util
import json
import os
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location("catalog_import", Path(__file__).with_name("import-agent-skills.py"))
catalog_import = importlib.util.module_from_spec(spec)
spec.loader.exec_module(catalog_import)


class ImportSkillsTests(unittest.TestCase):
    def test_online_installation_never_requires_an_existing_local_skill_folder(self):
        source = "https://github.com/publisher/skills/tree/main/skills/review"
        self.assertEqual(catalog_import.online_install("review", source), f"npx skills add {source} -a codex")
        self.assertIn("https://publisher.example/install", catalog_import.online_install("review", "https://publisher.example/install"))
        unavailable = catalog_import.online_install("Skill With Spaces", None)
        self.assertIn("Online source not verified", unavailable)
        self.assertIn("npx skills find 'Skill With Spaces'", unavailable)
        self.assertNotIn("~/.codex/skills", unavailable)

    def test_complete_inventory_preserves_namespaces_and_excludes_stale_examples(self):
        with tempfile.TemporaryDirectory() as directory:
            home = Path(directory)

            def skill(relative, name):
                path = home / relative / "SKILL.md"
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(f"---\nname: {name}\ndescription: Review code changes.\n---\nBody is never exported.", encoding="utf-8")

            skill(".codex/skills/review", "review")
            skill(".agents/skills/review", "review")
            (home / ".agents/.skill-lock.json").write_text(json.dumps({"skills": {"review": {"sourceUrl": "https://github.com/publisher/review-skills"}}}), encoding="utf-8")
            skill(".codex/skills/.system/helper", "system-helper")
            package = ".codex/plugins/cache/vendor/tool"
            skill(f"{package}/old/skills/stale", "stale")
            skill(f"{package}/current/skills/review", "review")
            skill(f"{package}/current/skills/review/references/examples/fake", "example-only")
            skill(f"{package}/current/.codex-plugin/migrated-command-skills/command", "source-command")
            manifest = home / package / "current/.codex-plugin/plugin.json"
            manifest.write_text(json.dumps({"name": "tool", "repository": "https://example.com/tool"}), encoding="utf-8")
            os.utime(home / package / "old", (100, 100))
            os.utime(home / package / "current", (200, 200))

            installed = catalog_import.installations(home)
            self.assertEqual(next(item for item in installed if item["id"] == "review")["source"], "https://github.com/publisher/review-skills")
            self.assertEqual({item["id"] for item in installed}, {"review", "system-helper", "tool:review", "tool:source-command"})
            existing = json.loads(catalog_import.CATALOG.read_text(encoding="utf-8"))
            articles = [row for row in existing if row["Article"]]
            rows = catalog_import.refresh(articles, installed)
            custom_methods = [{"Name": "Review layout", "Call": "Check spacing"}, {"Name": "Review typography", "Call": "Check fonts"}]
            next(row for row in rows if row["Name"] == "tool:review")["Methods"].extend(custom_methods)
            refreshed = catalog_import.refresh(rows, installed)
            self.assertTrue(all(method in next(row for row in refreshed if row["Name"] == "tool:review")["Methods"] for method in custom_methods))
            catalog_import.check(rows, installed)
            exported = json.dumps(rows)
            self.assertNotIn(str(home), exported)
            self.assertNotIn("Body is never exported", exported)
            self.assertEqual(sum(row["Installed"] for row in rows), 4)
            self.assertEqual(catalog_import.refresh(refreshed, installed), refreshed)
            next(row for row in refreshed if row["Name"] == "review")["Source"] = None
            unverified = next(row for row in catalog_import.refresh(refreshed, installed) if row["Name"] == "review")
            self.assertIsNone(unverified["Source"])
            self.assertIn("Online source not verified", unverified["Install"])
            with self.assertRaises(AssertionError):
                catalog_import.check([row for row in rows if row["Name"] != "tool:review"], installed)

    def test_methods_cover_commands_tools_arguments_and_bundled_references(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            path = root / "SKILL.md"
            path.write_text('''---
name: sample
description: Manage examples.
argument-hint: "<topic>"
allowed-tools: mcp__sample__read mcp__sample__write* Read
capabilities: [history_analysis]
metadata:
  openclaw:
    cliHelp: "gws gmail --help"
---
# Sample
## Usage
```bash
npm install package
sample-cli list
sample-cli run \\
  --topic "example"
function local_helper() { echo example; }
local_helper
scripts/
...
Get-Content ./config.json
```
Use `gws gmail --help`. A `simple phrase` is not a shell command.
Call `read_page` and use the `write_page` tool.
## Commands
| Command | Description |
| --- | --- |
| `+send` | Send mail |
| `audit [target]` | Review the target |
See [the guide](references/guide.md) and [another skill](other/SKILL.md).
## Wrong usage
```bash
sample-cli incorrect
```
''', encoding="utf-8")
            (root / "references").mkdir()
            guide = root / "references/guide.md"
            guide.write_text('## More commands\n```sh\nsample-cli history\n```\n[cycle](../SKILL.md)\n', encoding="utf-8")
            (root / "other").mkdir()
            (root / "other/SKILL.md").write_text("## Usage\n```sh\nunrelated-cli run\n```", encoding="utf-8")
            methods = catalog_import.documented_methods(path, "sample", catalog_import.metadata(path), root)
            calls = {method["Call"] for method in methods}
            self.assertIn("sample-cli list", calls)
            self.assertIn('sample-cli run ' + chr(92) + '\n--topic "example"', calls)
            self.assertIn("sample-cli history", calls)
            self.assertIn("gws gmail +send [flags]", calls)
            self.assertIn("Use the sample skill: audit [target]", calls)
            self.assertIn("Use the sample skill with arguments: <topic>", calls)
            self.assertIn("Use the sample skill for: history analysis.", calls)
            self.assertTrue(any("mcp__sample__read" in call for call in calls))
            self.assertFalse(any("mcp__sample__write" in call for call in calls))
            self.assertTrue(any("read_page" in call for call in calls))
            self.assertTrue(any("write_page" in call for call in calls))
            self.assertNotIn("simple phrase", calls)
            self.assertNotIn("sample-cli incorrect", calls)
            self.assertNotIn("npm install package", calls)
            self.assertNotIn("unrelated-cli run", calls)
            self.assertNotIn("local_helper", calls)
            self.assertNotIn("scripts/", calls)
            self.assertNotIn("...", calls)
            self.assertIn("Get-Content ./config.json", calls)
            self.assertEqual(len(calls), len(methods))
            self.assertTrue(all(method.get("Reference") for method in methods))

    def test_invalid_metadata_is_reported_instead_of_silently_skipped(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "SKILL.md"
            path.write_text("---\nname: missing-description\n---\n", encoding="utf-8")
            with self.assertRaises(ValueError):
                catalog_import.metadata(path)
        self.assertIsNone(catalog_import.public_url("https://username:password@example.com"))
        self.assertIsNone(catalog_import.public_url("file:///private/path"))


if __name__ == "__main__":
    unittest.main()
