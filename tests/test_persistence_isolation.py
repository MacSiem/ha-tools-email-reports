"""Regression coverage for component-local persistence isolation."""
from pathlib import Path
import unittest


ROOT = Path(__file__).resolve().parents[1]
PERSISTENT_SOURCES = (
    "ha-energy-email.js",
    "ha-log-email.js",
    "ha-tools-email-reports.js",
)


class PersistenceIsolationTest(unittest.TestCase):
    def test_persistence_never_uses_a_window_singleton(self):
        for relative_path in PERSISTENT_SOURCES:
            with self.subTest(path=relative_path):
                source = (ROOT / relative_path).read_text(encoding="utf-8")
                self.assertNotIn("window._haToolsPersistence", source)
                self.assertNotIn("full impl in ha-tools-panel", source)
                self.assertIn("haToolsPersistence", source)

    def test_smart_reports_tab_state_is_instance_local(self):
        source = (ROOT / "ha-smart-reports.js").read_text(encoding="utf-8")
        self.assertNotIn("window._haToolsPersistence", source)
        self.assertNotIn("ha-smart-reports:active-tab", source)
        self.assertNotIn("haToolsPersistence", source)


if __name__ == "__main__":
    unittest.main()
