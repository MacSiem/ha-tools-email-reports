## 4.5.0 (2026-09-24)

- Energy Email moved: `custom:ha-energy-email` is now maintained only in Energy Optimizer (HACS default). This plugin no longer ships its own copy, which removes the race where whichever bundle loaded first decided which version of the card you got.
- Existing `custom:ha-energy-email` cards keep working through a thin wrapper: with Energy Optimizer 3.5.0+ installed they render its card (in either load order); without it they show how to install Energy Optimizer.
- Tests cover both load orders, the missing-optimizer state and bundle parity.

## 4.4.0 (2026-09-24)

- The SMTP hints in the Log Email and Energy Email cards now link to **Settings → Devices & services → HA Tools Email → Configure** (HA Tools Email 2.1.0) instead of the retired "HA Tools → Settings → Email/SMTP" panel, and no longer suggest configuring an SMTP notify service.
- When the HA Tools Email integration is missing, the cards explain how to install and set it up.

## 4.3.0 (2026-09-01)

- Smart Reports now uses exact Home Assistant Energy Dashboard or explicit Recorder statistics, local-calendar periods, root-only totals and nested `included_in_stat` device rows.
- Smart Reports cost now prefers actual cost statistics and otherwise requires an explicit non-negative rate and currency; the old fabricated default rate and current-state fallback were removed.
- Smart Reports adds complete loading/configuration/error/no-data/partial states, latest-request-wins lifecycle guards, schema-v2 JSON and flat formula-safe CSV.
- The vendored Smart Reports source is byte-identical to the standalone canonical source; a pinned source digest and deterministic bundle check are now covered by tests without requiring a sibling checkout.
- Current Smart Reports screenshots remain pending a fresh in-app browser visual-QA run; no public image was regenerated in this remediation.
- Smart Reports now validates role metadata/currency, preserves per-source evidence in partial UI/JSON/CSV, supports current Energy preference names, excludes invalid total relationships and rejects detached Recorder buckets.
- Restored safe Smart Reports Title/Currency editor controls and per-instance tab selection; an all-disabled card performs no HA requests.
- Bundle provenance now covers all three source owners/paths/versions/digests, validates every input before deterministic generation, and CI runs both JavaScript and Python tests.

## 4.2.3 (2026-08-28)

- Isolation: persistence is now card-local in each source and bundled IIFE, removing `window._haToolsPersistence` load-order coupling while retaining existing localStorage keys.
- Isolation: removed document-wide sibling-card injectors and all shared global escape-helper/discovery dependencies from the three cards and development bundle.
- Isolation: each card renders its own support footer in its own shadow root, with no panel/discovery runtime dependency.
- Isolation: each source and bundled IIFE owns its Bento CSS and ignores any pre-existing `window.HAToolsBentoCSS` value.
- Security: every runtime value uses a local String-before-escape helper.

## 4.2.2 (2026-07-18)

- Fix (log-email): the Schedule tab no longer shows a dead Enable button for automations the card cannot create. When the daily/weekly automation does not exist it now shows Not created with a short note explaining how to add one (the log-email card sends the digest but, unlike energy-email, does not write the schedule automation itself).

## 4.2.1 (2026-07-18)

- Fix (UI): responsive tab bar, donate-footer anti-flicker, and section accent-dot alignment. This bundle was missed by the earlier family-wide UI fix waves; all three fixes are now applied to each of the three bundled cards.

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
