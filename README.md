# 📧 HA Tools — Email & Reports

![Preview](banner.png)

Energy email reports, log digest and smart summary reports — sharing the ha_tools_email backend.

[![Home Assistant](https://img.shields.io/badge/Home%20Assistant-2024.1+-blue.svg?logo=homeassistant)](https://www.home-assistant.io/) [![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE) [![Version](https://img.shields.io/github/v/release/MacSiem/ha-tools-email-reports)](https://github.com/MacSiem/ha-tools-email-reports/releases)

> Part of the [HA Tools](https://github.com/MacSiem) ecosystem — split into individual HACS-installable plugins.

## Installation (HACS)

1. Open HACS → Frontend → ⋮ → **Custom repositories**
2. Repository URL: `https://github.com/MacSiem/ha-email-reports` — Category: **Lovelace**
3. Install **HA Tools — Email & Reports** from HACS
4. Restart Home Assistant

## Usage

### Lovelace card

```yaml
type: custom:ha-tools-email-reports
```

This bundle ships multiple cards. You can also add the others:

- `custom:ha-energy-email`
- `custom:ha-log-email`
- `custom:ha-smart-reports`

### Optional sidebar panel (`configuration.yaml`)

```yaml
panel_custom:
  - name: ha-tools-email-reports
    sidebar_title: HA Tools — Email & Reports
    sidebar_icon: mdi:home-assistant
    url_path: ha-tools-email-reports
    js_url: /local/community/ha-email-reports/ha-email-reports.js
    embed_iframe: false
    config: {}
```

After restart, **HA Tools — Email & Reports** appears in the HA sidebar.

## Features

- Energy email reports, log digest and smart summary reports — sharing the ha_tools_email backend.
- Bundled Bento Design System (light + dark mode, mobile-friendly)
- Self-contained — no shared HA Tools dependency
- Tool settings and dismissed-banner state are cached in browser `localStorage`
## Privacy

- No telemetry, no analytics, no tracking
- No external network calls, no CDN-hosted assets (system fonts only)
- No data leaves your device (no external network calls)
## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## Support

If this tool makes your Home Assistant life easier, consider supporting development:

- [☕ Buy Me a Coffee](https://buymeacoffee.com/macsiem)
- [💳 PayPal](https://www.paypal.com/donate/?hosted_button_id=Y967H4PLRBN8W)

## License

MIT — see [LICENSE](LICENSE).
