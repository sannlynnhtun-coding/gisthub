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
    def test_complete_inventory_preserves_namespaces_and_excludes_stale_examples(self):
        with tempfile.TemporaryDirectory() as directory:
            home = Path(directory)

            def skill(relative, name):
                path = home / relative / "SKILL.md"
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(f"---\nname: {name}\ndescription: Review code changes.\n---\nBody is never exported.", encoding="utf-8")

            skill(".codex/skills/review", "review")
            skill(".agents/skills/review", "review")
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
            self.assertEqual({item["id"] for item in installed}, {"review", "system-helper", "tool:review", "tool:source-command"})
            existing = json.loads(catalog_import.CATALOG.read_text(encoding="utf-8"))
            articles = [row for row in existing if row["Article"]]
            rows = catalog_import.refresh(articles, installed)
            catalog_import.check(rows, installed)
            exported = json.dumps(rows)
            self.assertNotIn(str(home), exported)
            self.assertNotIn("Body is never exported", exported)
            self.assertEqual(sum(row["Installed"] for row in rows), 4)
            self.assertEqual(catalog_import.refresh(rows, installed), rows)
            with self.assertRaises(AssertionError):
                catalog_import.check([row for row in rows if row["Name"] != "tool:review"], installed)

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
