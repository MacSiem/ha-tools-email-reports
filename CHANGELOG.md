# Changelog — HA Tools — Email & Reports

## [4.8.0] - 2026-10-17

- Summarize retained log source, selected period, observed range and honest coverage; keep full limitations in collapsed native details and missing/partial warnings visible.
- Format log dates, server next instants with offset and relative time, SMTP history, browser snapshots and preview headers using HA profile preferences. Preserve raw timestamps, server calendar authority and server-composed mail content.
- Collapse inactive legacy controls, warn only for enabled automations, and preserve disclosure state, keyboard focus and action feedback within the current user context.

## [4.7.1] - 2026-10-16

- Start the first Log Email read when the mounted card becomes available to an online administrator, including a later login or reconnection.
- Keep one occupied initial/display log read until it settles. Discard stale user, connection, role and detached results, then resume an unfinished first load without requiring another Home Assistant update.
- Keep current empty, invalid and failed responses settled; manual refresh remains available without adding polling or retrying sends. Preserve the optional alert interval and discard stale alert reads after a user, connection, role or mount change.
- Treat a fallback sensor with no readable record lists as unavailable, while preserving known empty lists and zero counts.

## [4.7.0] - Unreleased

- Preview the actual backend-composed email in an isolated frame, with daily, weekly and monthly choices and explicit rolling or completed calendar periods. Opening or refreshing a preview never sends mail.
- Send Log reports through the same backend composer and period selection; list filters and stale browser snapshots cannot change the report. Requires stable HA Tools Email 2.3.0+ for the new mail contract.
- Show readable period labels and local dates with timezone, source and partial-data limitations. Preserve raw-request single-flight, administrator gates, focus and unconfirmed outcomes without automatic retry.
- Keep the existing server schedule editor and its 2.2 summary-preview compatibility, Smart Reports 4.2.0 and the Energy Optimizer wrapper.

## [4.6.1] - 2026-10-15

- Clear Smart Reports measurements and device details immediately when the Home Assistant user, connection or timezone changes, including disconnection. Keep locale and theme changes on the current measurements.

## [4.6.0] - 2026-10-15

- Add severity, source and period filters to retained log views, with separate unique-problem and HA occurrence counts, stable aggregate deduplication, explicit limits and sensor fallback limitations. Show repetition counts before expanding narrow records. Display filters explicitly leave manual email content unchanged.
- Manage daily, weekly and monthly server log schedules with a chosen wall time, weekday or month day and IANA timezone. Drafts start disabled; previews are read-only, and a separate matching readback confirms saves.
- Require confirmed HA Tools Email 2.2.0+ calendar support before mutation; older backends cannot silently discard the selected day or timezone. Existing automation controls remain independent and warn about duplicate sending.
- Separate bounded SMTP attempt history from browser-local count snapshots. SMTP acceptance remains distinct from inbox delivery; private mail content and raw errors are absent from attempt metadata.
- Include the exact Smart Reports 4.2.0 source, previous-period comparison, device search, measured cost breakdowns and reviewed local JSON/CSV exports. Keep Energy Email as the compatibility wrapper for Energy Optimizer.
- Apply shared result states, responsive card layouts, touch targets and focus-preserving editors and actions.

## [4.5.3] - 2026-10-11

- Update vendored Smart Reports to the exact 4.1.2 source. The bundle now retains measured consumption/cost summaries with partial history and provides the current Summary, Devices and Costs views, regardless of which card resource loads first.
- A fresh Home Assistant instance without Energy preferences now shows configuration guidance; real Recorder and other preferences errors retain Retry.
- Exercise recorded subtotals, same-period refresh, daily history, labels and separate cost coverage directly in both the vendored source and generated bundle.

## [4.5.2] - 2026-10-08

- Correct the Dashboard minimum to Home Assistant Core 2024.5.0, matching the service-response frontend API used for the central Log Email recipient.
- Document the separate Core 2024.7.0 requirement of HA Tools Email and the independent Energy Optimizer dependency.
- Date the already published 4.5.1 notes. Card behavior, settings, data, exports and embedded component sources are unchanged.

## [4.5.1] - 2026-10-05

- Keep Energy Email compatibility cards at their natural Sections height while Energy Optimizer loads, so later cards remain below the report.

- Guide missing Log Email integrations through HACS installation and Add integration before SMTP Configure, in English and Polish.

- Keep schedule states, SMTP settings links, report badges and action labels readable in light and dark themes.

- Keep log email excerpts valid UTF-8 when the 200 UTF-16-unit limit crosses an emoji; retain escaping and replace malformed input surrogates.

- Use the Home Assistant profile language for Log Email and vendored Smart Reports. Translate Smart Reports views and correct Polish log counts such as “1 błąd” and “2 błędy” without changing report data or export fields.

- Clarify that Log Email toggles existing daily/weekly automations; their action supplies its own subject/body and cannot use the card's cached log snapshot. Energy Email scheduling remains in Energy Optimizer.

- Build weekly Log Email digests from retained entries in the actual seven-day window, exclude future timestamps, and withhold weekly sends when only a current fallback sensor snapshot is available. Disclose Home Assistant retention and card entry limits.

- Block repeated Log Email sends while a report is pending; disable both send buttons and restore them after success or failure.

- Show missing Smart Reports automation trigger timestamps as Never, without inventing a Unix-epoch age.

- Count Smart Reports automation triggers since Home Assistant local midnight, including long DST days, and exclude future timestamps.

- Sync canonical Smart Reports status contrast with the rendered Home Assistant card background, including custom dark themes and reconnects.

- Vendor the exact Smart Reports completed-hour boundary fix; require complete energy coverage and preserve an empty forward range before the first hour.
- Test the same period cases directly in standalone and generated bundle runtimes.

- Keep household users from reading administrator logs through the Log Email card; unavailable logs show an explicit state and an empty digest cannot be sent.
- Escape log content before rendering; keep Smart Reports at natural height in Sections and use compact administrator-only support links.
- Sync the vendored Smart Reports 4.0.1 source and regenerate the bundle with exact source digests.

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
