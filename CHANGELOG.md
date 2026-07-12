# Changelog — HA Tools — Email & Reports

## [4.2.0] - 2026-07-12

- Fix (packaging): the HACS-delivered file is now a true single-file bundle of
  all three cards (ha-energy-email, ha-log-email, ha-smart-reports). Previously
  it was a loader referencing files HACS never downloads, so fresh installs got
  three silent 404s and no cards.
- Fix: central recipient auto-fill — `ha_tools_email.get_config` is now called
  with `returnResponse` and the response envelope is read correctly.
- Version headers unified at 4.2.0 (members previously self-identified as
  4.1.3 / v1.0.0).
- Docs: Privacy section now discloses the same-origin ha-tools-discovery.js
  auto-inject; install docs describe the single bundle.

## [4.1.5] - 2026-06-15

- Theme: dark/light now follows the active Home Assistant theme (luminance of --card-background-color) instead of OS prefers-color-scheme.


## [4.1.3] - 2026-05-12

### Fixed
- Removed Google Fonts CDN @import (3 occurrence(s)); now uses system font stack with Inter as the preferred locally-installed face.
- Normalized bare `font-family: "Inter", sans-serif` declarations to a complete cross-platform system stack.
- Privacy section in README: claim now matches behaviour (no CDN dependencies).

All notable changes to **HA Tools — Email & Reports** are documented here.

## [4.0.0] - 2026-05-10

### Major
- **Split from `MacSiem/ha-tools` monorepo** into a dedicated standalone HACS plugin.
- Bundled Bento Design System CSS inline — no shared dependency required.
- Inlined `_haToolsEsc` XSS sanitizer.
- Persistence keys migrated to per-tool namespace `ha-email-reports-…` (clean break — old data under `ha-tools-…` is **not** migrated automatically).
- Donation/support footer added to the panel.
- Cross-tool discovery banner removed; each tool stands on its own.

### Included tools

- `custom:ha-energy-email`
- `custom:ha-log-email`
- `custom:ha-smart-reports`

### Compatibility

- Home Assistant ≥ 2024.1.0
