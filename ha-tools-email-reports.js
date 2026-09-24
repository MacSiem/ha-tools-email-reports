/* GENERATED FILE — DO NOT EDIT
 * HA Tools Email Reports bundle v4.4.0
 * ha-energy-email.js — MacSiem/ha-tools-email-reports/ha-energy-email.js v4.4.0 sha256:80ad7bc26ab64a63a7bfb7ded5388d44947c5f3074a79f7e8a0be3d79e4918fb
 * ha-log-email.js — MacSiem/ha-tools-email-reports/ha-log-email.js v4.4.0 sha256:fb73c21ff51e92b08b4fc90b40a632cf4a52a7b425988f584c75c74942cc4f59
 * ha-smart-reports.js — MacSiem/ha-smart-reports/ha-smart-reports.js v4.0.0 sha256:ccc4a958307c45b95a1934170b9a99eb9fb6502e69b780906ce621bc56ef0e68
 */
/* HA Tools split — ha-energy-email v4.4.0 (2026-09-24) — single-tool standalone repo */
(function() {
'use strict';

const _esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);

// Component-local persistence retains this card's existing localStorage keys.
const haToolsPersistence = { _cache: {}, _hass: null, setHass(h) { this._hass = h; }, async save(k, d) { try { localStorage.setItem('ha-energy-email-' + k, JSON.stringify(d)); } catch(e) { console.debug('[ha-energy-email] caught:', e); } }, async load(k) { try { const r = localStorage.getItem('ha-energy-email-' + k); return r ? JSON.parse(r) : null; } catch(e) { return null; } }, loadSync(k) { try { const r = localStorage.getItem('ha-energy-email-' + k); return r ? JSON.parse(r) : null; } catch(e) { return null; } } };
const OWN_SUPPORT_FOOTER = `<div class="donate-section" data-source="own-card"><div class="donate-text"><h3>❤️ Support HA Tools Development</h3><p>If this tool makes your Home Assistant life easier, consider supporting the project.</p></div><div class="donate-buttons"><a class="donate-btn coffee" href="https://buymeacoffee.com/macsiem" target="_blank" rel="noopener noreferrer">☕ Buy Me a Coffee</a><a class="donate-btn paypal" href="https://www.paypal.com/donate/?hosted_button_id=Y967H4PLRBN8W" target="_blank" rel="noopener noreferrer">💳 PayPal</a></div></div>`;

/**
 * HA Energy Email Card v4.4.0
 * Send daily/weekly/monthly energy usage reports as HTML email.
 * v4.0.0: HA-native persistent storage (input_text helpers) for cross-device sync.
 *         Auto-creation of report automations with configurable schedule.
 *         Auto-discovery of energy sensors and notify services.
 *         Falls back to manual config (sensor.energy_report_devices) if available.
 *
 * Config:
 *   type: custom:ha-energy-email
 *   title: Energy Email Reports          (optional)
 *   recipient: your@email.com            (optional, auto-detected from notify service)
 *   currency: PLN                        (optional, default PLN)
 *   energy_price: 0.65                   (optional PLN/kWh)
 *   notify_service: email_report         (optional, auto-detected)
 */
/* ===== HA Tools split — inline shared infrastructure ===== */
// Component-local Bento CSS: independent of card load order.
const LOCAL_BENTO_CSS = `
/* ═══════════════════════════════════════════════
   HA Tools — Bento Design System v2.0 (Premium)
   ═══════════════════════════════════════════════ */

/* keyboard a11y */
:focus-visible { outline: 2px solid var(--bento-primary, #6366f1); outline-offset: 2px; border-radius: 3px; }

:host {
  /* Brand palette — diamond top, gradient-friendly */
  --bento-primary: #6366f1;
  --bento-primary-2: #8b5cf6;
  --bento-primary-3: #ec4899;
  --bento-primary-hover: #4f46e5;
  --bento-primary-light: rgba(99, 102, 241, 0.08);
  --bento-primary-glow: rgba(99, 102, 241, 0.35);
  --bento-success: #10B981;
  --bento-success-light: rgba(16, 185, 129, 0.10);
  --bento-success-border: rgba(16, 185, 129, 0.25);
  --bento-error: #EF4444;
  --bento-error-light: rgba(239, 68, 68, 0.10);
  --bento-error-border: rgba(239, 68, 68, 0.25);
  --bento-warning: #F59E0B;
  --bento-warning-light: rgba(245, 158, 11, 0.10);
  --bento-warning-border: rgba(245, 158, 11, 0.25);
  --bento-info: #06b6d4;
  --bento-info-light: rgba(6, 182, 212, 0.10);
  --bento-info-border: rgba(6, 182, 212, 0.25);

  /* Theme */
  --bento-bg:     var(--primary-background-color, #fafaf9);
  --bento-bg-2:   var(--card-background-color, #f5f5f4);
  --bento-card:   var(--card-background-color, #ffffff);
  --bento-glass:  rgba(255, 255, 255, 0.7);
  --bento-border: var(--divider-color, #e7e5e4);
  --bento-border-strong: rgba(0, 0, 0, 0.08);
  --bento-text:           var(--primary-text-color,   #0c0a09);
  --bento-text-secondary: var(--secondary-text-color, #57534e);
  --bento-text-muted:     var(--disabled-text-color,  #a8a29e);

  /* Radii */
  --bento-radius-xs: 8px;
  --bento-radius-sm: 12px;
  --bento-radius-md: 18px;
  --bento-radius-lg: 24px;
  --bento-radius-pill: 999px;

  /* Shadows — modern, layered */
  --bento-shadow-sm: 0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.02);
  --bento-shadow-md: 0 4px 12px rgba(0,0,0,0.05), 0 2px 6px rgba(0,0,0,0.03);
  --bento-shadow-lg: 0 24px 48px -12px rgba(0,0,0,0.10), 0 12px 24px -8px rgba(0,0,0,0.05);
  --bento-shadow-glow: 0 0 0 1px rgba(99,102,241,0.15), 0 8px 32px -8px rgba(99,102,241,0.25);

  /* Gradients */
  --bento-grad-primary: linear-gradient(135deg, #6366f1, #8b5cf6);
  --bento-grad-rainbow: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%);
  --bento-grad-success: linear-gradient(135deg, #10b981, #34d399);
  --bento-grad-error:   linear-gradient(135deg, #ef4444, #f87171);
  --bento-grad-warning: linear-gradient(135deg, #f59e0b, #fbbf24);

  /* Motion */
  --bento-trans-fast: 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  --bento-trans:      0.25s cubic-bezier(0.4, 0, 0.2, 1);
  --bento-trans-slow: 0.4s cubic-bezier(0.4, 0, 0.2, 1);

  /* Typography */
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, sans-serif;
  font-feature-settings: "cv11" 1, "ss01" 1;
  letter-spacing: -0.01em;
  display: block;
  color: var(--bento-text);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* ── Dark mode ───────────────────────────────── */
:host(.bento-dark) {
    --bento-bg:     var(--primary-background-color, #0a0a0f);
    --bento-bg-2:   var(--card-background-color,    #111119);
    --bento-card:   var(--card-background-color,    #16161f);
    --bento-glass:  rgba(22, 22, 31, 0.7);
    --bento-border: var(--divider-color,            #27272f);
    --bento-border-strong: rgba(255, 255, 255, 0.08);
    --bento-text:           var(--primary-text-color,   #fafaf9);
    --bento-text-secondary: var(--secondary-text-color, #d6d3d1);
    --bento-text-muted:     var(--disabled-text-color,  #78716c);
    --bento-primary:        #818cf8;
    --bento-primary-2:      #a78bfa;
    --bento-primary-3:      #f472b6;
    --bento-primary-light:  rgba(129, 140, 248, 0.12);
    --bento-primary-glow:   rgba(129, 140, 248, 0.45);
    --bento-success: #34d399;
    --bento-success-light:  rgba(52, 211, 153, 0.12);
    --bento-success-border: rgba(52, 211, 153, 0.30);
    --bento-error:   #f87171;
    --bento-error-light:    rgba(248, 113, 113, 0.12);
    --bento-error-border:   rgba(248, 113, 113, 0.30);
    --bento-warning: #fbbf24;
    --bento-warning-light:  rgba(251, 191, 36, 0.12);
    --bento-warning-border: rgba(251, 191, 36, 0.30);
    --bento-info:    #22d3ee;
    --bento-info-light:     rgba(34, 211, 238, 0.12);
    --bento-info-border:    rgba(34, 211, 238, 0.30);
    --bento-shadow-sm: 0 1px 2px rgba(0,0,0,0.4);
    --bento-shadow-md: 0 4px 12px rgba(0,0,0,0.4), 0 2px 6px rgba(0,0,0,0.2);
    --bento-shadow-lg: 0 24px 48px -12px rgba(0,0,0,0.6), 0 12px 24px -8px rgba(0,0,0,0.3);
    --bento-shadow-glow: 0 0 0 1px rgba(129,140,248,0.2), 0 8px 32px -8px rgba(129,140,248,0.5);
    --bento-grad-primary: linear-gradient(135deg, #818cf8, #a78bfa);
    --bento-grad-rainbow: linear-gradient(135deg, #818cf8, #a78bfa 50%, #f472b6);
    color-scheme: dark !important;
  }
:host(.bento-dark) .card, :host(.bento-dark) .card-container, :host(.bento-dark) .main-card, :host(.bento-dark) .panel-card {
    background: var(--bento-card) !important; color: var(--bento-text) !important; border-color: var(--bento-border) !important;
  }
:host(.bento-dark) input, :host(.bento-dark) select, :host(.bento-dark) textarea { background: var(--bento-bg-2); color: var(--bento-text); border-color: var(--bento-border); }
:host(.bento-dark) table th { background: var(--bento-bg-2); color: var(--bento-text-secondary); border-color: var(--bento-border); }
:host(.bento-dark) table td { color: var(--bento-text); border-color: var(--bento-border); }
:host(.bento-dark) pre, :host(.bento-dark) code { background: #1e1e2e !important; color: #e2e8f0 !important; }

/* ── Reset & motion preferences ──────────────── */
* { box-sizing: border-box; }
@media (prefers-reduced-motion: reduce) { * { animation-duration: 0s !important; transition-duration: 0s !important; } }

/* ── Main Card Wrapper ───────────────────────── */
.card {
  background: var(--bento-card);
  border: 1px solid var(--bento-border);
  border-radius: var(--bento-radius-md);
  box-shadow: var(--bento-shadow-md);
  color: var(--bento-text);
  font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
  position: relative;
  transition: box-shadow var(--bento-trans), border-color var(--bento-trans);
}

/* ── Header ──────────────────────────────────── */
.header {
  padding: 20px 24px 0;
  display: flex; align-items: center; gap: 12px;
}
.header-icon { font-size: 24px; }
.header-title {
  font-size: 18px; font-weight: 700; letter-spacing: -0.02em;
  color: var(--bento-text);
}
.header-badge {
  margin-left: auto;
  background: var(--bento-grad-primary); color: #fff;
  font-size: 11px; padding: 4px 10px; border-radius: var(--bento-radius-pill);
  font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;
  box-shadow: 0 4px 14px -2px var(--bento-primary-glow);
}
.content { padding: 20px 24px 24px; }

/* ── Tabs (modern pill style) ────────────────── */
.tabs, .tab-bar, .tab-nav, .tab-header {
  display: flex !important; gap: 4px !important;
  padding: 4px !important;
  background: var(--bento-bg-2) !important;
  border-radius: var(--bento-radius-pill) !important;
  margin-bottom: 20px !important;
  overflow: visible !important;
  -webkit-overflow-scrolling: touch !important;
  flex-wrap: wrap !important; border-bottom: 0 !important;
  width: 100%; max-width: 100%; box-sizing: border-box;
}
.tab, .tab-btn, .tab-button, .dtab {
  padding: 8px 16px !important;
  border: none !important; background: transparent !important; cursor: pointer !important;
  font-size: 13px !important; font-weight: 600 !important;
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, system-ui, sans-serif !important;
  color: var(--bento-text-secondary) !important;
  border-radius: var(--bento-radius-pill) !important;
  margin-bottom: 0 !important;
  transition: all var(--bento-trans) !important;
  white-space: nowrap !important; flex: 1 1 auto !important; text-align: center !important; min-height: 40px !important;
  letter-spacing: -0.005em !important;
}
.tab:hover, .tab-btn:hover, .tab-button:hover, .dtab:hover {
  color: var(--bento-text) !important;
  background: var(--bento-card) !important;
}
.tab.active, .tab-btn.active, .tab-button.active, .dtab.active {
  background: var(--bento-card) !important;
  color: var(--bento-primary) !important;
  box-shadow: var(--bento-shadow-sm) !important;
  font-weight: 700 !important;
}
.tab-content { display: block; }
.tab-content.active { animation: bentoFadeIn 0.35s cubic-bezier(0.4, 0, 0.2, 1); }
@keyframes bentoFadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Stat / KPI cards (premium) ──────────────── */
.stat-card, .stat-item, .metric-card, .kpi-card {
  background: var(--bento-bg-2) !important;
  border: 1px solid var(--bento-border) !important;
  border-radius: var(--bento-radius-sm) !important;
  padding: 18px !important;
  text-align: left !important;
  transition: transform var(--bento-trans), box-shadow var(--bento-trans), border-color var(--bento-trans);
  position: relative; overflow: hidden;
}
.stat-card::before, .metric-card::before, .kpi-card::before {
  content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
  background: var(--bento-grad-primary);
  opacity: 0; transition: opacity var(--bento-trans);
}
.stat-card:hover, .stat-item:hover, .metric-card:hover, .kpi-card:hover {
  transform: translateY(-2px); box-shadow: var(--bento-shadow-lg); border-color: var(--bento-primary-light);
}
.stat-card:hover::before, .metric-card:hover::before, .kpi-card:hover::before { opacity: 1; }
.stat-icon { font-size: 22px; margin-bottom: 6px; opacity: 0.85; }
.stat-value, .stat-val, .metric-value, .kpi-val {
  font-size: 26px; font-weight: 800; line-height: 1.1;
  letter-spacing: -0.02em; color: var(--bento-text);
  font-feature-settings: "tnum" 1;
}
.stat-label, .stat-lbl, .metric-label, .kpi-lbl {
  font-size: 11px; color: var(--bento-text-secondary);
  margin-top: 4px; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600;
}
.stat-num {
  font-size: 24px; font-weight: 800; color: var(--bento-primary);
  font-feature-settings: "tnum" 1; letter-spacing: -0.02em;
}
.stat-sub { font-size: 12px; color: var(--bento-text-muted); font-weight: 500; }

/* ── Overview grid ───────────────────────────── */
.overview-grid, .stats-grid, .summary-grid, .stat-cards, .kpi-grid, .metrics-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px; margin-bottom: 20px;
}

/* ── Section headers ─────────────────────────── */
.section-header, .section-title {
  display: flex; align-items: center; justify-content: space-between;
  position: relative; padding-left: 12px;
  font-size: 12px; font-weight: 700; color: var(--bento-text-secondary);
  text-transform: uppercase; letter-spacing: 0.08em;
  margin: 16px 0 10px;
}
.section-header::before, .section-title::before {
  content: ""; width: 4px; height: 4px; border-radius: 50%; background: var(--bento-primary);
  position: absolute; left: 0; top: 50%; transform: translateY(-50%); flex-shrink: 0;
}

/* ── Loading / Empty / Info ──────────────────── */
.loading-bar {
  height: 3px; border-radius: var(--bento-radius-pill);
  background: linear-gradient(90deg, var(--bento-primary), var(--bento-primary-2), transparent);
  background-size: 200% 100%;
  animation: bentoLoad 1.5s linear infinite; margin-bottom: 12px;
}
@keyframes bentoLoad { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.empty-state, .no-data, .no-results {
  text-align: center; color: var(--bento-text-secondary);
  padding: 40px 20px; font-size: 14px;
  background: var(--bento-bg-2); border-radius: var(--bento-radius-md);
  border: 1px dashed var(--bento-border);
}
.info-note, .tip-box {
  font-size: 13px; color: var(--bento-text-secondary);
  background: var(--bento-primary-light);
  border-radius: var(--bento-radius-sm); padding: 12px 14px;
  border-left: 3px solid var(--bento-primary); margin-top: 12px;
  line-height: 1.55;
}
.last-updated {
  font-size: 11px; color: var(--bento-text-muted);
  text-align: right; margin-top: 12px; font-feature-settings: "tnum" 1;
}

/* ── Buttons (premium) ───────────────────────── */
.refresh-btn {
  background: var(--bento-bg-2); border: 1px solid var(--bento-border);
  border-radius: var(--bento-radius-pill); padding: 6px 14px;
  font-size: 12px; color: var(--bento-text-secondary);
  cursor: pointer; font-weight: 600; transition: all var(--bento-trans);
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, system-ui, sans-serif;
}
.refresh-btn:hover {
  background: var(--bento-card); color: var(--bento-primary);
  border-color: var(--bento-primary); transform: translateY(-1px);
  box-shadow: var(--bento-shadow-sm);
}
.toggle-btn, .action-btn {
  background: var(--bento-grad-primary); border: none;
  border-radius: var(--bento-radius-xs); padding: 8px 16px;
  font-size: 13px; color: #fff; cursor: pointer; font-weight: 600;
  transition: all var(--bento-trans); font-family: "Inter", -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, system-ui, sans-serif;
  letter-spacing: -0.005em;
  box-shadow: 0 4px 12px -2px var(--bento-primary-glow);
}
.toggle-btn:hover, .action-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px -4px var(--bento-primary-glow);
}
.send-btn, .btn-primary {
  width: 100%;
  background: var(--bento-grad-primary); color: #fff;
  border: none; border-radius: var(--bento-radius-sm);
  padding: 12px 20px; font-size: 14px; font-weight: 700;
  cursor: pointer; font-family: "Inter", -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, system-ui, sans-serif;
  letter-spacing: -0.01em;
  transition: all var(--bento-trans);
  box-shadow: 0 4px 14px -2px var(--bento-primary-glow);
}
.send-btn:hover, .btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px -6px var(--bento-primary-glow);
}
.send-btn:active, .btn-primary:active { transform: translateY(0); }
.send-btn:disabled, .btn-primary:disabled {
  opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none;
}

/* ── Badges / Status (modern pill) ───────────── */
.badge, .status-badge, .tag, .chip {
  padding: 4px 12px; border-radius: var(--bento-radius-pill);
  font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 5px;
  letter-spacing: 0.04em; text-transform: uppercase;
  border: 1px solid;
}
.badge-ok, .badge-success { background: var(--bento-success-light); color: var(--bento-success); border-color: var(--bento-success-border); }
.badge-er, .badge-error   { background: var(--bento-error-light);   color: var(--bento-error);   border-color: var(--bento-error-border); }
.badge-warn, .badge-warning { background: var(--bento-warning-light); color: var(--bento-warning); border-color: var(--bento-warning-border); }
.badge-info { background: var(--bento-info-light); color: var(--bento-info); border-color: var(--bento-info-border); }

.count-badge {
  font-size: 11px; font-weight: 700; padding: 3px 10px;
  border-radius: var(--bento-radius-pill); display: inline-flex; align-items: center;
  font-feature-settings: "tnum" 1;
}
.error-badge { background: var(--bento-error-light); color: var(--bento-error); border: 1px solid var(--bento-error-border); }
.warn-badge  { background: var(--bento-warning-light); color: var(--bento-warning); border: 1px solid var(--bento-warning-border); }
.info-badge  { background: var(--bento-primary-light); color: var(--bento-primary); border: 1px solid var(--bento-border); }
.ok-badge    { background: var(--bento-success-light); color: var(--bento-success); border: 1px solid var(--bento-success-border); }

/* ── Tables (modern) ─────────────────────────── */
table { width: 100%; border-collapse: separate; border-spacing: 0; }
th {
  background: var(--bento-bg-2); color: var(--bento-text-secondary);
  font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;
  padding: 12px 16px; text-align: left;
  border-bottom: 1px solid var(--bento-border);
}
th:first-child { border-top-left-radius: var(--bento-radius-sm); }
th:last-child  { border-top-right-radius: var(--bento-radius-sm); }
td {
  padding: 14px 16px; border-bottom: 1px solid var(--bento-border);
  color: var(--bento-text); font-size: 13px;
}
tr { transition: background var(--bento-trans-fast); }
tr:hover td { background: var(--bento-primary-light); }
tr:last-child td { border-bottom: 0; }

/* ── Forms / Inputs ──────────────────────────── */
input, select, textarea {
  padding: 10px 14px; border: 1.5px solid var(--bento-border);
  border-radius: var(--bento-radius-xs);
  background: var(--bento-card); color: var(--bento-text);
  font-size: 14px; font-family: "Inter", -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, system-ui, sans-serif;
  transition: all var(--bento-trans); outline: none;
  letter-spacing: -0.005em;
}
input:focus, select:focus, textarea:focus {
  border-color: var(--bento-primary);
  box-shadow: 0 0 0 4px var(--bento-primary-light);
}
input::placeholder, textarea::placeholder { color: var(--bento-text-muted); }

/* ── Code blocks ─────────────────────────────── */
code {
  background: var(--bento-bg-2); padding: 2px 6px;
  border-radius: 4px; font-size: 12px;
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
  border: 1px solid var(--bento-border);
}
pre {
  background: #1e1e2e; color: #e2e8f0;
  padding: 16px; border-radius: var(--bento-radius-sm);
  font-size: 12.5px; overflow-x: auto; line-height: 1.65;
  white-space: pre-wrap; word-break: break-word;
  font-family: "JetBrains Mono", ui-monospace, monospace;
  box-shadow: var(--bento-shadow-md);
}

/* ── Grid layouts ────────────────────────────── */
.schedule-grid, .send-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
}
.schedule-card, .send-card, .info-card {
  background: var(--bento-bg-2); border: 1px solid var(--bento-border);
  border-radius: var(--bento-radius-sm); padding: 16px;
  transition: all var(--bento-trans);
}
.schedule-card:hover, .send-card:hover, .info-card:hover {
  border-color: var(--bento-primary-light); transform: translateY(-1px);
  box-shadow: var(--bento-shadow-md);
}

/* ── Log entries ─────────────────────────────── */
.log-entry {
  display: flex; flex-wrap: wrap; align-items: flex-start;
  gap: 4px 8px; padding: 10px 12px;
  border-radius: var(--bento-radius-sm); margin-bottom: 6px;
  font-size: 12.5px; min-width: 0; overflow: hidden;
  border: 1px solid transparent; transition: all var(--bento-trans-fast);
}
.error-entry { background: var(--bento-error-light); border-color: var(--bento-error-border); }
.warn-entry  { background: var(--bento-warning-light); border-color: var(--bento-warning-border); }
.log-time { color: var(--bento-text-muted); font-feature-settings: "tnum" 1; flex-shrink: 0; font-family: "JetBrains Mono", monospace; }
.log-domain {
  font-weight: 700; flex-shrink: 1; min-width: 0; max-width: 100%;
  overflow: hidden; text-overflow: ellipsis; word-break: break-all;
}
.error-domain { color: var(--bento-error); }
.warn-domain  { color: var(--bento-warning); }
.log-msg {
  color: var(--bento-text-secondary); flex-basis: 100%;
  word-break: break-word; overflow-wrap: anywhere;
  white-space: pre-wrap; min-width: 0; line-height: 1.55;
}

/* ── Send status ─────────────────────────────── */
.send-status {
  padding: 12px 16px; border-radius: var(--bento-radius-sm);
  margin-top: 14px; font-size: 13px; font-weight: 600;
  text-align: center; letter-spacing: -0.005em;
  border: 1px solid;
}
.send-status.sending { background: var(--bento-primary-light); color: var(--bento-primary); border-color: var(--bento-border); }
.send-status.success { background: var(--bento-success-light); color: var(--bento-success); border-color: var(--bento-success-border); }
.send-status.error   { background: var(--bento-error-light);   color: var(--bento-error);   border-color: var(--bento-error-border); }

/* ── Scrollbar ───────────────────────────────── */
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--bento-border); border-radius: var(--bento-radius-pill); border: 2px solid transparent; background-clip: content-box; }
::-webkit-scrollbar-thumb:hover { background: var(--bento-text-muted); background-clip: content-box; }

/* ── Animations ──────────────────────────────── */
@keyframes bentoSpin  { to { transform: rotate(360deg); } }
@keyframes bentoPulse { 0%,100% { opacity: 1; } 50% { opacity: .5; } }
@keyframes bentoSlideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes bentoStaggerIn { from { opacity: 0; transform: translateY(12px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }

/* Apply stagger to grids of stat-cards */
.stats-grid > *, .overview-grid > *, .summary-grid > * {
  animation: bentoStaggerIn 0.35s cubic-bezier(0.4, 0, 0.2, 1) both;
}
.stats-grid > *:nth-child(1)  { animation-delay: 0.02s; }
.stats-grid > *:nth-child(2)  { animation-delay: 0.06s; }
.stats-grid > *:nth-child(3)  { animation-delay: 0.10s; }
.stats-grid > *:nth-child(4)  { animation-delay: 0.14s; }
.stats-grid > *:nth-child(5)  { animation-delay: 0.18s; }
.stats-grid > *:nth-child(6)  { animation-delay: 0.22s; }

/* ── Mobile — 768 px ─────────────────────────── */
@media (max-width: 768px) {
  .content { padding: 16px; }
  .header { padding: 16px 16px 0; }
  .tabs { gap: 2px !important; padding: 3px !important; }
  .tab, .tab-button, .tab-btn { padding: 6px 12px !important; font-size: 12px !important; }
  .overview-grid, .stats-grid, .summary-grid, .stat-cards, .kpi-grid, .metrics-grid {
    grid-template-columns: repeat(2, 1fr); gap: 10px;
  }
  .stat-value, .stat-val, .kpi-val, .metric-val { font-size: 22px; }
  .stat-label, .stat-lbl, .kpi-lbl, .metric-lbl { font-size: 10px; }
  .send-grid, .schedule-grid { grid-template-columns: 1fr; }
  .log-entry { flex-wrap: wrap; gap: 2px 6px; padding: 8px 10px; }
  .log-domain { max-width: 60%; font-size: 11.5px; }
  .log-msg { flex-basis: 100%; max-width: 100%; font-size: 11.5px; }
  pre { padding: 12px; font-size: 11.5px; }
  h2 { font-size: 18px; }
  h3 { font-size: 15px; }
  table { font-size: 12.5px; }
  th, td { padding: 10px 12px; }
}
@media (max-width: 480px) {
  .tabs { gap: 1px !important; padding: 2px !important; }
  .tab, .tab-button, .tab-btn { padding: 5px 10px !important; font-size: 11px !important; }
  .overview-grid, .stats-grid, .summary-grid { grid-template-columns: 1fr 1fr; }
  .stat-value, .stat-val, .kpi-val { font-size: 18px; }
}
`;

class HAEnergyEmail extends HTMLElement {
  static getConfigElement() { return document.createElement('ha-energy-email-editor'); }
  constructor() {
    super();
    this._lang = (navigator.language || '').startsWith('pl') ? 'pl' : 'en';
    this.attachShadow({ mode: 'open' });
    this._toolId = this.tagName.toLowerCase().replace('ha-', '');
    this._hass = null;
    this._config = {};
    this._activeTab = 'overview';
    this._lastSent = {};
    this._sending = false;
    this._firstRender = false;
    this._lastRenderTime = 0;
    this._renderScheduled = false;
    this._reportPeriod = 'week';
    this._overviewPeriod = 'total';
    this._discoveredDevices = null;
    this._detectedRecipient = null;
    this._detectedService = null;
    this._helpersChecked = false;
    this._helpersReady = false;
    this._discoveryDone = false;
    this._excludedDevices = new Set();
    this._devicePage = 0;
    this._devicesPerPage = 20;
    // Default schedule times
    this._scheduleDefaults = { daily: '07:30', weekly_day: 'mon', weekly_time: '08:00', monthly_time: '08:00' };
  }

  _sanitize(str) {
    if (!str) return str;
    try { return decodeURIComponent(escape(str)); } catch(e) { return str; }
  }
  set hass(hass) {
    try {
      var _bg = (getComputedStyle(this).getPropertyValue('--card-background-color') || getComputedStyle(this).getPropertyValue('--primary-background-color') || '').trim();
      var _d = false;
      if (_bg) {
        var _h, _r, _g, _b, _m;
        if (_bg.charAt(0) === '#') { _h = _bg.slice(1); if (_h.length === 3) _h = _h.replace(/(.)/g, '$1$1'); _r = parseInt(_h.slice(0,2),16); _g = parseInt(_h.slice(2,4),16); _b = parseInt(_h.slice(4,6),16); }
        else { _m = _bg.match(/[\d.]+/g); if (_m) { _r = +_m[0]; _g = +_m[1]; _b = +_m[2]; } }
        if (_r != null) _d = (0.2126*_r + 0.7152*_g + 0.0722*_b) / 255 < 0.5;
      } else if (hass && hass.themes) { _d = !!hass.themes.darkMode; }
      this.classList.toggle('bento-dark', _d);
    } catch (e) {}
    if (hass?.language) this._lang = hass.language.startsWith('pl') ? 'pl' : 'en';
    this._hass = hass;
    if (!hass) return;
    const now = Date.now();
    if (!this._firstRender) {
      this._firstRender = true;
      this._discoverAll();
      this._render();
      this._lastRenderTime = now;
      return;
    }
    if (now - this._lastRenderTime < 10000) {
      if (!this._renderScheduled) {
        this._renderScheduled = true;
        setTimeout(() => {
          this._renderScheduled = false;
          this._updateLiveData();
          this._lastRenderTime = Date.now();
        }, 5000);
      }
      return;
    }
    this._updateLiveData();
    this._lastRenderTime = now;
  }


  get _t() {
    const T = {
      pl: {
        title: 'Email Energetyczny',
        loading: 'Wczytywanie...',
        noData: 'Brak danych',
        error: 'Błąd',
        refresh: 'Odśwież',
        save: 'Zapisz',
        cancel: 'Anuluj',
        smtpConfigWarning: 'Skonfiguruj SMTP w: Ustawienia \u2192 Urz\u0105dzenia i us\u0142ugi \u2192 HA Tools Email \u2192 Konfiguruj.',
        locale: (this._lang === 'pl' ? 'pl-PL' : 'en-US'),
      },
      en: {
        title: 'Energy Email',
        loading: 'Loading...',
        noData: 'No data',
        error: 'Error',
        refresh: 'Refresh',
        save: 'Save',
        cancel: 'Cancel',
        smtpConfigWarning: 'Set up SMTP in: Settings \u2192 Devices & services \u2192 HA Tools Email \u2192 Configure.',
        locale: 'en-US',
      },
    };
    return T[this._lang] || T.en;
  }

  setConfig(config) {
    this._config = {
      ...config,
      title: config.title || 'Energy Email Reports',
      recipient: config.recipient || '',
      currency: config.currency || 'PLN',
      energy_price: parseFloat(config.energy_price) || 0.65,
      energy_tariff_mode: config.energy_tariff_mode || 'flat',
      energy_price_day: parseFloat(config.energy_price_day) || 0.65,
      energy_price_night: parseFloat(config.energy_price_night) || 0.45,
      energy_price_weekday: parseFloat(config.energy_price_weekday) || 0.65,
      energy_price_weekend: parseFloat(config.energy_price_weekend) || 0.50,
      energy_price_wd_day: parseFloat(config.energy_price_wd_day) || 0.65,
      energy_price_wd_night: parseFloat(config.energy_price_wd_night) || 0.45,
      energy_price_we_day: parseFloat(config.energy_price_we_day) || 0.55,
      energy_price_we_night: parseFloat(config.energy_price_we_night) || 0.40,
      energy_day_hour_start: parseInt(config.energy_day_hour_start) || 6,
      energy_night_hour_start: parseInt(config.energy_night_hour_start) || 22,
      notify_service: config.notify_service || '',
    };
  }

  getCardSize() { return 4; }

  getGridOptions() { return { rows: 8, columns: 12, min_rows: 3, min_columns: 6 }; }

  _getRate(hour, dayOfWeek) {
    const c = this._config;
    const mode = c.energy_tariff_mode || 'flat';
    const dayStart = c.energy_day_hour_start || 6;
    const nightStart = c.energy_night_hour_start || 22;
    const isDay = (dayStart < nightStart) ? (hour >= dayStart && hour < nightStart) : (hour >= dayStart || hour < nightStart);
    const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6);
    switch (mode) {
      case 'day_night':
        return isDay ? (c.energy_price_day || 0.65) : (c.energy_price_night || 0.45);
      case 'weekday_weekend':
        return isWeekend ? (c.energy_price_weekend || 0.50) : (c.energy_price_weekday || 0.65);
      case 'mixed':
        if (isWeekend) return isDay ? (c.energy_price_we_day || 0.55) : (c.energy_price_we_night || 0.40);
        return isDay ? (c.energy_price_wd_day || 0.65) : (c.energy_price_wd_night || 0.45);
      default:
        return c.energy_price || 0.65;
    }
  }

  _getAvgRate() {
    const mode = this._config.energy_tariff_mode || 'flat';
    if (mode === 'flat') return this._config.energy_price || 0.65;
    let sum = 0;
    for (let dow = 0; dow < 7; dow++) {
      for (let h = 0; h < 24; h++) {
        sum += this._getRate(h, dow);
      }
    }
    return sum / 168;
  }

  _getTariffLabel() {
    const c = this._config;
    const mode = c.energy_tariff_mode || 'flat';
    const cur = c.currency || 'PLN';
    const suffix = this._lang === 'pl' ?
      { 'day_night': '/kWh (dzień/noc)', 'weekday_weekend': '/kWh (roboczy/weekend)' } :
      { 'day_night': '/kWh (day/night)', 'weekday_weekend': '/kWh (weekday/weekend)' };
    switch (mode) {
      case 'day_night': return (c.energy_price_day || 0.65) + '/' + (c.energy_price_night || 0.45) + ' ' + cur + (suffix['day_night'] || '');
      case 'weekday_weekend': return (c.energy_price_weekday || 0.65) + '/' + (c.energy_price_weekend || 0.50) + ' ' + cur + (suffix['weekday_weekend'] || '');
      case 'mixed': return 'mix: ' + (c.energy_price_wd_day || 0.65) + '/' + (c.energy_price_wd_night || 0.45) + '/' + (c.energy_price_we_day || 0.55) + '/' + (c.energy_price_we_night || 0.40) + ' ' + cur;
      default: return (c.energy_price || 0.65) + ' ' + cur + '/kWh';
    }
  }


  static getStubConfig() {
    return {
      title: 'Energy Email Reports',
      currency: 'PLN',
      energy_price: 0.65
    };
  }

  _state(entity_id, fallback = '0') {
    if (!this._hass) return fallback;
    const s = this._hass.states[entity_id];
    return s ? s.state : fallback;
  }

  _attr(entity_id, attr, fallback = null) {
    if (!this._hass) return fallback;
    const s = this._hass.states[entity_id];
    return s && s.attributes[attr] !== undefined ? s.attributes[attr] : fallback;
  }

  _float(v, fallback = 0) {
    const n = parseFloat(v);
    return isNaN(n) ? fallback : n;
  }

  _fmt(v, decimals = 2) {
    return this._float(v).toFixed(decimals);
  }

  // --- auto-discovery ---

  async _discoverAll() {
    await this._ensureHelpers();
    this._discoverEnergySensors();
    this._discoverRecipient();
    this._discoveryDone = true;
    this._render();
    // Fetch recorder stats in background (for period views)
    this._fetchAllPeriodStats().then(() => {
      if (this._periodCache_day || this._periodCache_week || this._periodCache_month) this._render();
    }).catch(() => {});
  }

  _discoverEnergySensors() {
    if (!this._hass) return;
    const states = this._hass.states;
    const energySensors = [];
    for (const [entityId, state] of Object.entries(states)) {
      if (!entityId.startsWith('sensor.')) continue;
      const attrs = state.attributes || {};
      const dc = attrs.device_class;
      const uom = attrs.unit_of_measurement;
      const sc = attrs.state_class;
      const val = parseFloat(state.state);
      if (dc === 'energy' || ((uom === 'kWh' || uom === 'Wh') && (sc === 'total_increasing' || sc === 'total' || sc === 'measurement'))) {
        if (isNaN(val) || state.state === 'unavailable' || state.state === 'unknown') continue;
        energySensors.push({
          entity_id: entityId,
          friendly_name: attrs.friendly_name || entityId.replace('sensor.', '').replace(/_/g, ' '),
          value: uom === 'Wh' ? val / 1000 : val,
          unit: 'kWh',
          device_class: dc,
          state_class: sc,
          icon: attrs.icon || 'mdi:flash',
          last_updated: state.last_updated
        });
      }
    }
    const deviceMap = {};
    for (const sensor of energySensors) {
      const eid = sensor.entity_id.replace('sensor.', '');
      let deviceKey = eid
        .replace(/_energy_?.*$/i, '')
        .replace(/_power_?.*$/i, '')
        .replace(/_electricity_?.*$/i, '')
        .replace(/_daily$/i, '')
        .replace(/_weekly$/i, '')
        .replace(/_monthly$/i, '')
        .replace(/_total$/i, '')
        .replace(/_kwh$/i, '')
        .replace(/_consumption$/i, '');
      if (!deviceMap[deviceKey]) {
        deviceMap[deviceKey] = {
          key: deviceKey,
          name: sensor.friendly_name.replace(/\s*(energy|power|electricity|daily|weekly|monthly|total|kwh|consumption)\s*/gi, '').trim() || deviceKey.replace(/_/g, ' '),
          sensors: []
        };
      }
      deviceMap[deviceKey].sensors.push(sensor);
    }
    const devices = [];
    for (const [key, device] of Object.entries(deviceMap)) {
      const sorted = device.sensors.sort((a, b) => {
        const priority = { total_increasing: 3, total: 2, measurement: 1 };
        return (priority[b.state_class] || 0) - (priority[a.state_class] || 0) || b.value - a.value;
      });
      const best = sorted[0];
      if (best) {
        devices.push({
          key: key,
          name: device.name.charAt(0).toUpperCase() + device.name.slice(1),
          entity_id: best.entity_id,
          value_kwh: best.value,
          sensor_count: device.sensors.length,
          all_sensors: device.sensors
        });
      }
    }
    devices.sort((a, b) => b.value_kwh - a.value_kwh);
    this._discoveredDevices = devices;
  }

  // --- HA-native persistent storage via input_text helpers ---

  // Helper config: 'key' is our logical name, 'name' generates entity_id (HA slugifies name → entity_id)
  // e.g. name "Energy Email Recipient" → input_text.energy_email_recipient
  static get HELPERS() {
    return [
      { key: 'recipient', name: 'Energy Email Recipient', max: 255 },
      { key: 'service', name: 'Energy Email Service', max: 100 },
      { key: 'daily_time', name: 'Energy Email Daily Time', max: 5 },
      { key: 'weekly_time', name: 'Energy Email Weekly Time', max: 5 },
      { key: 'weekly_day', name: 'Energy Email Weekly Day', max: 3 },
      { key: 'monthly_time', name: 'Energy Email Monthly Time', max: 5 },
      { key: 'price', name: 'Energy Email Price', max: 10 },
      { key: 'excluded', name: 'Energy Email Excluded', max: 255 },
    ];
  }

  // Resolve helper key → entity_id by scanning hass.states for matching friendly_name
  _helperEntity(key) {
    const cfg = HAEnergyEmail.HELPERS.find(h => h.key === key);
    if (!cfg) return null;
    // First try exact slug match (name lowercased, spaces→underscores)
    const slug = cfg.name.toLowerCase().replace(/\s+/g, '_');
    const directEid = `input_text.${slug}`;
    if (this._hass?.states?.[directEid]) return directEid;
    // Fallback: scan all input_text entities for matching friendly_name
    if (this._hass?.states) {
      for (const [eid, state] of Object.entries(this._hass.states)) {
        if (eid.startsWith('input_text.energy_email') && state.attributes?.friendly_name === cfg.name) return eid;
      }
    }
    return directEid; // return expected eid even if not found yet
  }

  async _ensureHelpers() {
    if (this._helpersChecked) return;
    this._helpersChecked = true;
    // Use entity registry to check existence (hass.states may not have new helpers yet)
    let registeredIds = new Set();
    try {
      const entries = await this._hass.callWS({ type: 'config/entity_registry/list' });
      for (const e of entries) {
        if (e.entity_id.startsWith('input_text.energy_email')) registeredIds.add(e.entity_id);
      }
    } catch(e) { /* fallback to hass.states check */ }
    let created = 0;
    for (const h of HAEnergyEmail.HELPERS) {
      const slug = h.name.toLowerCase().replace(/\s+/g, '_');
      const eid = `input_text.${slug}`;
      if (registeredIds.has(eid) || this._hass.states[eid]) continue;
      try {
        await this._hass.callWS({ type: 'input_text/create', name: h.name, min: 0, max: h.max, initial: '', mode: 'text' });
        created++;
      } catch (e) {
        // May fail if already exists or no permission — that's ok
      }
    }
    // If we created helpers, wait for HA to register them in states
    if (created > 0) await new Promise(r => setTimeout(r, 1500));
    this._helpersReady = true;
    this._loadFromHelpers();
  }

  _loadFromHelpers() {
    const s = this._hass?.states;
    if (!s) return;
    const read = (key) => {
      const eid = this._helperEntity(key);
      const val = s[eid]?.state;
      return (val && val !== 'unknown' && val !== '') ? val : '';
    };
    const recipient = read('recipient');
    const service = read('service');
    const dailyTime = read('daily_time');
    const weeklyTime = read('weekly_time');
    const weeklyDay = read('weekly_day');
    const monthlyTime = read('monthly_time');
    const price = read('price');
    if (recipient && recipient.includes('@')) this._detectedRecipient = recipient;
    if (service && service.length > 0) this._detectedService = service;
    if (/^\d{2}:\d{2}$/.test(dailyTime)) this._scheduleDefaults.daily = dailyTime;
    if (/^\d{2}:\d{2}$/.test(weeklyTime)) this._scheduleDefaults.weekly_time = weeklyTime;
    if (weeklyDay && weeklyDay.length >= 3) this._scheduleDefaults.weekly_day = weeklyDay;
    if (/^\d{2}:\d{2}$/.test(monthlyTime)) this._scheduleDefaults.monthly_time = monthlyTime;
    if (price && !isNaN(parseFloat(price)) && parseFloat(price) > 0) this._config.energy_price = parseFloat(price);
    const excluded = read('excluded');
    if (excluded) this._excludedDevices = new Set(excluded.split(',').map(s => s.trim()).filter(Boolean));
  }

  async _saveToHelper(key, value) {
    const eid = this._helperEntity(key);
    try {
      await this._hass.callService('input_text', 'set_value', { entity_id: eid, value: value || '' });
    } catch (e) {
      // Fallback to localStorage
      try { localStorage.setItem(`ha-energy-email-${key}`, value); } catch(e2) { console.debug('[ha-energy-email] caught:', e); }
    }
  }

  _readHelper(key) {
    const eid = this._helperEntity(key);
    const s = this._hass?.states?.[eid];
    if (s && s.state && s.state !== 'unknown' && s.state !== '') return s.state;
    // Fallback to localStorage
    try { return localStorage.getItem(`ha-energy-email-${key}`) || ''; } catch(e) { return ''; }
  }

  _discoverRecipient() {
    if (!this._hass) return;
    // Try to get SMTP recipient from HA helper first
    if (!this._config.recipient && !this._detectedRecipient) {
      const savedRecipient = this._readHelper('recipient');
      if (savedRecipient && savedRecipient.includes('@')) { this._detectedRecipient = savedRecipient; return; }
      // Try config_entries API to get ha_tools_email default recipient
      if (!this._detectedRecipient && !this._configEntriesChecked) {
        this._configEntriesChecked = true;
        this._hass.callWS({ type: 'config/config_entries' }).then(entries => {
          const haToolsEntry = entries.find(e => e.domain === 'ha_tools_email');
          if (haToolsEntry && haToolsEntry.data) {
            const r = haToolsEntry.data.default_recipient;
            if (r) { this._detectedRecipient = r; this._render(); }
          }
        }).catch(() => {});
      }
    }
  }

  _getRecipient() {
    if (this._config.recipient) return this._config.recipient;
    if (this._detectedRecipient) return this._detectedRecipient;
    return '';
  }

  _saveRecipient(email) {
    this._saveToHelper('recipient', email);
    this._detectedRecipient = email;
    this._render();
  }

  _devices() {
    const manual = this._attr('sensor.energy_report_devices', 'devices');
    if (manual && Array.isArray(manual) && manual.length > 0) {
      return manual;
    }
    return [];
  }

  _getOverviewDataForPeriod(period) {
    const manual = this._devices();
    if (manual.length === 0) return this._getOverviewData();
    if (period === 'total' || period === 'month') {
      return manual.map(d => ({
        name: d.name,
        month: this._float(this._state(period === 'total' ? (d.energy_month || d.energy_week) : d.energy_month, '0')),
        lastMonth: this._float(this._state(d.energy_last_month, '0')),
        cost: this._float(this._state(d.cost_month || d.cost_week, '0')),
        source: 'manual'
      })).sort((a, b) => b.month - a.month);
    }
    if (period === 'week') {
      return manual.map(d => ({
        name: d.name,
        month: this._float(this._state(d.energy_week, '0')),
        lastMonth: this._float(this._state(d.energy_last_week, '0')),
        cost: this._float(this._state(d.cost_week, '0')),
        source: 'manual'
      })).sort((a, b) => b.month - a.month);
    }
    if (period === 'day') {
      return manual.map(d => ({
        name: d.name,
        month: this._float(this._state(d.energy_day || d.energy_week, '0')),
        lastMonth: 0,
        cost: this._float(this._state(d.energy_day || d.energy_week, '0')) * this._getAvgRate(),
        source: 'manual'
      })).sort((a, b) => b.month - a.month);
    }
    return this._getOverviewData();
  }

  _getAutoDataForPeriod(period) {
    // Return cached recorder stats if available
    const cacheKey = `_periodCache_${period}`;
    if (this[cacheKey] && this[cacheKey].length > 0) return this._filterExcluded(this[cacheKey]).sort((a, b) => b.month - a.month);
    // Fallback: try suffix-based sensors
    if (!this._discoveredDevices) return [];
    const suffixMap = { day: /daily|_day|_24h/i, week: /weekly|_week|_7d/i, month: /monthly|_month|_30d/i };
    const regex = suffixMap[period];
    if (!regex) return [];
    const result = [];
    for (const dev of this._discoveredDevices) {
      if (!dev.all_sensors) continue;
      const match = dev.all_sensors.find(s => regex.test(s.entity_id) || regex.test(s.friendly_name));
      if (match) {
        result.push({
          name: dev.name, key: dev.key || dev.entity_id,
          month: match.value, lastMonth: 0,
          cost: match.value * this._getAvgRate(),
          entity_id: match.entity_id, source: 'auto'
        });
      }
    }
    return this._filterExcluded(result).sort((a, b) => b.month - a.month);
  }

  // Fetch energy consumption from HA recorder statistics (same as Energy Dashboard)
  async _fetchRecorderStats(period) {
    if (!this._hass || !this._discoveredDevices || this._discoveredDevices.length === 0) return;
    const now = new Date();
    const periodConfig = {
      day:   { hours: 24, statPeriod: 'hour' },
      week:  { hours: 168, statPeriod: 'day' },
      month: { hours: 720, statPeriod: 'day' }
    };
    const pc = periodConfig[period];
    if (!pc) return;
    const startTime = new Date(now.getTime() - pc.hours * 3600000);
    // Collect all total_increasing sensor entity_ids
    const sensorIds = [];
    const devMap = {};
    for (const dev of this._discoveredDevices) {
      // Pick the best total_increasing sensor per device
      const best = dev.all_sensors
        ? dev.all_sensors.find(s => s.state_class === 'total_increasing') || dev.all_sensors[0]
        : { entity_id: dev.entity_id };
      if (best && best.entity_id) {
        sensorIds.push(best.entity_id);
        devMap[best.entity_id] = dev;
      }
    }
    if (sensorIds.length === 0) return;
    try {
      const stats = await this._hass.callWS({
        type: 'recorder/statistics_during_period',
        start_time: startTime.toISOString(),
        end_time: now.toISOString(),
        statistic_ids: sensorIds,
        period: pc.statPeriod,
        types: ['change']
      });
      const result = [];
      for (const [entityId, dataPoints] of Object.entries(stats || {})) {
        const dev = devMap[entityId];
        if (!dev || !dataPoints || dataPoints.length === 0) continue;
        const totalChange = dataPoints.reduce((sum, dp) => sum + (dp.change || 0), 0);
        // Convert Wh to kWh if needed
        const attrs = this._hass.states?.[entityId]?.attributes || {};
        const kwh = attrs.unit_of_measurement === 'Wh' ? totalChange / 1000 : totalChange;
        if (kwh <= 0) continue;
        result.push({
          name: dev.name, key: dev.key || dev.entity_id,
          month: kwh, lastMonth: 0,
          cost: kwh * this._getAvgRate(),
          entity_id: entityId, source: 'auto'
        });
      }
      // Cache results
      this[`_periodCache_${period}`] = result;
      this[`_periodCacheTime_${period}`] = Date.now();
    } catch (e) {
      // recorder/statistics_during_period may not be available on older HA versions
      console.warn('Energy Email: recorder stats fetch failed:', e.message);
    }
  }

  // Fetch stats for all periods (called once during discovery)
  async _fetchAllPeriodStats() {
    await Promise.all([
      this._fetchRecorderStats('day'),
      this._fetchRecorderStats('week'),
      this._fetchRecorderStats('month')
    ]);
  }

  _filterExcluded(data) {
    if (!this._excludedDevices || this._excludedDevices.size === 0) return data;
    return data.filter(d => {
      const key = d.key || d.entity_id || d.name;
      return !this._excludedDevices.has(key);
    });
  }

  _getOverviewData() {
    const manual = this._devices();
    if (manual.length > 0) {
      return this._filterExcluded(manual.map(d => ({
        name: d.name, key: d.name,
        month: this._float(this._state(d.energy_month, '0')),
        lastMonth: this._float(this._state(d.energy_last_month, '0')),
        cost: this._float(this._state(d.cost_month, '0')),
        source: 'manual'
      }))).sort((a, b) => b.month - a.month);
    }
    if (this._discoveredDevices && this._discoveredDevices.length > 0) {
      return this._filterExcluded(this._discoveredDevices.map(d => ({
        name: d.name, key: d.key || d.entity_id,
        month: d.value_kwh,
        lastMonth: 0,
        cost: d.value_kwh * this._getAvgRate(),
        entity_id: d.entity_id,
        sensor_count: d.sensor_count,
        source: 'auto'
      }))).sort((a, b) => b.month - a.month);
    }
    return [];
  }

  _autoState(id) {
    const s = this._state(id, 'unknown');
    return s === 'on' ? '\u2705 Enabled' : s === 'off' ? '\u274C Disabled' : '\u2753 Unknown';
  }

  _autoStateClass(id) {
    const s = this._state(id, 'unknown');
    return s === 'on' ? 'auto-on' : s === 'off' ? 'auto-off' : 'auto-unknown';
  }

  // --- main render ---

  _render() {
    if (!this._hass) return;
    const L = this._lang === 'pl';
    const recipient = this._getRecipient();
    const recipientDisplay = recipient
      ? `To: ${_esc(recipient)}`
      : (L ? 'Nie ustawiono odbiorcy' : 'No recipient set');
    this.shadowRoot.innerHTML = `
      <style>${LOCAL_BENTO_CSS}
/* === HA Tools split — premium banners (donate / intro / prereq) === */

/* Donation footer — diamond top */
.donate-section {  margin: 24px 0 4px; padding: 20px 24px; position: relative; overflow: hidden;  background: linear-gradient(135deg, rgba(99,102,241,0.06), rgba(236,72,153,0.06));  border: 1px solid rgba(99,102,241,0.18); border-radius: var(--bento-radius-md, 18px);  display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 18px;  font-family: 'Inter', -apple-system, sans-serif;}
.donate-section::before {  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;  background: linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899);}
.donate-section .donate-text { flex: 1; min-width: 240px; }
.donate-section h3 {  margin: 0 0 6px; font-size: 16px; font-weight: 700; letter-spacing: -0.02em;  background: linear-gradient(135deg, #6366f1, #ec4899);  -webkit-background-clip: text; background-clip: text; color: transparent;}
.donate-section p { margin: 0; font-size: 13px; line-height: 1.55; color: var(--bento-text-secondary, #57534e); letter-spacing: -0.005em; }
.donate-buttons { display: flex; gap: 10px; flex-wrap: wrap; }
.donate-btn {  display: inline-flex; align-items: center; gap: 6px; padding: 10px 18px;  border-radius: 12px; font-weight: 700; font-size: 13px; letter-spacing: -0.005em;  text-decoration: none; transition: transform 0.2s cubic-bezier(0.4,0,0.2,1), box-shadow 0.2s, filter 0.2s;  border: 1px solid transparent;}
.donate-btn:hover { transform: translateY(-2px); filter: brightness(1.05); }
.donate-btn.coffee {  background: linear-gradient(135deg, #FFDD00, #FFC700); color: #000;  box-shadow: 0 4px 14px -2px rgba(255, 221, 0, 0.4);}
.donate-btn.coffee:hover { box-shadow: 0 8px 24px -4px rgba(255, 221, 0, 0.55); }
.donate-btn.paypal {  background: linear-gradient(135deg, #0070ba, #005ea6); color: #fff;  box-shadow: 0 4px 14px -2px rgba(0, 112, 186, 0.45);}
.donate-btn.paypal:hover { box-shadow: 0 8px 24px -4px rgba(0, 112, 186, 0.6); }
:host(.bento-dark) .donate-section { background: linear-gradient(135deg, rgba(129,140,248,0.10), rgba(244,114,182,0.10)); border-color: rgba(129,140,248,0.25); }
:host(.bento-dark) .donate-section h3 { background: linear-gradient(135deg, #a5b4fc, #f9a8d4); -webkit-background-clip: text; background-clip: text; color: transparent; }
:host(.bento-dark) .donate-section p { color: #d6d3d1; }
@media (max-width: 600px) {  .donate-section { flex-direction: column; text-align: center; padding: 18px; }  .donate-buttons { justify-content: center; width: 100%; } }

/* Prereq banner — premium */
.prereq-banner {  display: flex; align-items: flex-start; gap: 14px; padding: 16px 20px;  border-radius: var(--bento-radius-sm, 12px); margin: 0 0 16px;  font-size: 13px; line-height: 1.55; border: 1px solid;  font-family: 'Inter', sans-serif; letter-spacing: -0.005em;  position: relative; overflow: hidden;}
.prereq-banner::before {  content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;}
.prereq-banner.prereq-error { background: rgba(239,68,68,0.06); border-color: rgba(239,68,68,0.25); color: #991b1b; }
.prereq-banner.prereq-error::before { background: linear-gradient(180deg, #ef4444, #f87171); }
.prereq-banner.prereq-info  { background: rgba(99,102,241,0.06); border-color: rgba(99,102,241,0.25); color: #4338ca; }
.prereq-banner.prereq-info::before  { background: linear-gradient(180deg, #6366f1, #8b5cf6); }
.prereq-banner .prereq-icon { font-size: 22px; line-height: 1; padding-top: 2px; flex-shrink: 0; }
.prereq-banner .prereq-text { flex: 1; min-width: 0; }
.prereq-banner .prereq-text strong { font-weight: 700; letter-spacing: -0.01em; }
.prereq-banner code {  background: rgba(0,0,0,0.06); padding: 1px 7px; border-radius: 5px;  font-size: 12px; font-family: 'JetBrains Mono', ui-monospace, monospace;  border: 1px solid rgba(0,0,0,0.08);}
.prereq-banner .prereq-cta {  display: inline-flex; align-items: center; padding: 8px 16px; border-radius: 10px;  background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff !important;  text-decoration: none; font-weight: 700; font-size: 12.5px; flex-shrink: 0;  letter-spacing: -0.005em;  box-shadow: 0 4px 14px -2px rgba(99,102,241,0.45);  transition: all 0.2s cubic-bezier(0.4,0,0.2,1);}
.prereq-banner .prereq-cta:hover { transform: translateY(-1px); box-shadow: 0 8px 24px -4px rgba(99,102,241,0.6); }
:host(.bento-dark) .prereq-banner.prereq-error { background: rgba(248,113,113,0.10); border-color: rgba(248,113,113,0.30); color: #fca5a5; }
:host(.bento-dark) .prereq-banner.prereq-info { background: rgba(129,140,248,0.10); border-color: rgba(129,140,248,0.30); color: #c7d2fe; }
:host(.bento-dark) .prereq-banner code { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.10); }
@media (max-width: 600px) {  .prereq-banner { flex-direction: column; align-items: stretch; padding-left: 20px; }  .prereq-banner .prereq-cta { align-self: flex-start; } }

/* First-run intro banner — premium */
.intro-banner {  position: relative; padding: 18px 52px 18px 22px; margin: 0 0 18px;  background: linear-gradient(135deg, rgba(99,102,241,0.08), rgba(236,72,153,0.06));  border: 1px solid rgba(99,102,241,0.20);  border-radius: var(--bento-radius-sm, 12px);  font-size: 13px; line-height: 1.55; overflow: hidden;  font-family: 'Inter', sans-serif; letter-spacing: -0.005em;  animation: bentoSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);}
.intro-banner::before {  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;  background: linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899);}
.intro-banner .intro-headline {  font-weight: 700; font-size: 14.5px; margin-bottom: 10px; letter-spacing: -0.02em;  background: linear-gradient(135deg, #6366f1, #ec4899);  -webkit-background-clip: text; background-clip: text; color: transparent;  display: flex; align-items: center; gap: 8px;}
.intro-banner .intro-steps {  margin: 8px 0 0; padding: 0; list-style: none; counter-reset: introstep;}
.intro-banner .intro-steps li {  margin-bottom: 8px; line-height: 1.55; color: var(--bento-text, #0c0a09);  padding-left: 32px; position: relative; counter-increment: introstep;  font-size: 12.5px;}
.intro-banner .intro-steps li::before {  content: counter(introstep); position: absolute; left: 0; top: -1px;  width: 22px; height: 22px; border-radius: 50%;  background: var(--bento-card, #fff); border: 1px solid rgba(99,102,241,0.25);  display: flex; align-items: center; justify-content: center;  font-size: 11px; font-weight: 800; color: #6366f1;  font-family: 'JetBrains Mono', ui-monospace, monospace;  font-feature-settings: 'tnum' 1;}
.intro-banner .intro-dismiss {  position: absolute; top: 12px; right: 14px;  background: var(--bento-card, transparent); border: 1px solid var(--bento-border, transparent);  cursor: pointer; font-size: 14px; line-height: 1;  color: var(--bento-text-secondary, #64748B);  padding: 4px 8px; border-radius: 999px;  transition: all 0.15s ease;}
.intro-banner .intro-dismiss:hover {  background: var(--bento-bg-2, #e7e5e4); color: var(--bento-text, #0c0a09);  transform: rotate(90deg);}
:host(.bento-dark) .intro-banner { background: linear-gradient(135deg, rgba(129,140,248,0.14), rgba(244,114,182,0.10)); border-color: rgba(129,140,248,0.30); }
:host(.bento-dark) .intro-banner .intro-headline { background: linear-gradient(135deg, #a5b4fc, #f9a8d4); -webkit-background-clip: text; background-clip: text; color: transparent; }
:host(.bento-dark) .intro-banner .intro-steps li { color: #fafaf9; }
:host(.bento-dark) .intro-banner .intro-steps li::before { background: #16161f; border-color: rgba(129,140,248,0.35); color: #a5b4fc; }
:host(.bento-dark) .intro-banner .intro-dismiss { background: #16161f; border-color: #27272f; color: #d6d3d1; }
:host(.bento-dark) .intro-banner .intro-dismiss:hover { background: #27272f; color: #fafaf9; }


        
/* ===== BENTO DESIGN SYSTEM (local fallback) ===== */

:host {
  --bento-primary: #3B82F6;
  --bento-primary-hover: #2563EB;
  --bento-primary-light: rgba(59, 130, 246, 0.08);
  --bento-success: #10B981;
  --bento-success-light: rgba(16, 185, 129, 0.08);
  --bento-error: #EF4444;
  --bento-error-light: rgba(239, 68, 68, 0.08);
  --bento-warning: #F59E0B;
  --bento-warning-light: rgba(245, 158, 11, 0.08);
  --bento-bg: var(--primary-background-color, #F8FAFC);
  --bento-card: var(--card-background-color, #FFFFFF);
  --bento-border: var(--divider-color, #E2E8F0);
  --bento-text: var(--primary-text-color, #1E293B);
  --bento-text-secondary: var(--secondary-text-color, #64748B);
  --bento-text-muted: var(--disabled-text-color, #94A3B8);
  --bento-radius-xs: 6px;
  --bento-radius-sm: 10px;
  --bento-radius-md: 16px;
  --bento-shadow-sm: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06);
  --bento-shadow-md: 0 4px 12px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.04);
  --bento-shadow-lg: 0 8px 25px rgba(0,0,0,0.06), 0 4px 10px rgba(0,0,0,0.04);
  --bento-transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

:host {
          font-family: 'Inter', sans-serif;
        }
        
:host(.bento-dark) {
    --bento-bg: var(--primary-background-color, #1a1a2e);
    --bento-card: var(--card-background-color, #16213e);
    --bento-text: var(--primary-text-color, #e2e8f0);
    --bento-text-secondary: var(--secondary-text-color, #94a3b8);
    --bento-border: var(--divider-color, #334155);
    --bento-shadow-sm: 0 1px 3px rgba(0,0,0,0.3);
    --bento-shadow-md: 0 4px 12px rgba(0,0,0,0.4);
  }
        .card { background: var(--bento-card); border: 1px solid var(--bento-border); border-radius: var(--bento-radius-md); padding: 20px; box-shadow: var(--bento-shadow-sm); box-sizing: border-box; max-width: 100%; overflow: hidden; }
        .header { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
        .header-icon { font-size: 24px; }
        .header-title { font-size: 17px; font-weight: 700; color: var(--bento-text); }
        .header-sub { font-size: 12px; color: var(--bento-text-secondary); margin-top: 1px; }
        .tabs { display: flex; gap: 4px; border-bottom: 2px solid var(--bento-border); margin-bottom: 18px; overflow-x: auto; overflow-y: hidden; scrollbar-width: thin; scrollbar-color: var(--bento-border) transparent; -webkit-overflow-scrolling: touch; }
        .tabs::-webkit-scrollbar { height: 4px; }
        .tabs::-webkit-scrollbar-track { background: transparent; }
        .tabs::-webkit-scrollbar-thumb { background: var(--bento-border); border-radius: 4px; }
        .tab-btn { padding: 8px 16px; border: none; background: transparent; cursor: pointer; font-size: 13px; font-weight: 500; color: var(--bento-text-secondary); border-bottom: 2px solid transparent; margin-bottom: -2px; transition: all .2s; white-space: nowrap; font-family: 'Inter', sans-serif; border-radius: 0; }
        .tab-btn:hover { color: var(--bento-primary); background: var(--bento-primary-light); }
        .tab-btn.active { color: var(--bento-primary); border-bottom-color: var(--bento-primary); font-weight: 600; }
        .grid2 { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; margin-bottom: 16px; }
        .grid3 { display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 10px; margin-bottom: 16px; }
        @media (max-width: 768px) { .grid3 { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 480px) { .grid3 { grid-template-columns: 1fr; } .grid2 { grid-template-columns: repeat(2, 1fr); } }
        .stat { background: var(--bento-bg); border: 1px solid var(--bento-border); border-radius: var(--bento-radius-sm); padding: 14px; text-align: center; min-width: 0; overflow: hidden; box-sizing: border-box; }
        .stat-value { font-size: 24px; font-weight: 700; color: var(--bento-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .stat-label { font-size: 11px; font-weight: 500; color: var(--bento-text-secondary); text-transform: uppercase; letter-spacing: .4px; margin-top: 2px; }
        .stat-sub { font-size: 11px; color: var(--bento-text-muted); margin-top: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .section-title { font-size: 13px; font-weight: 600; color: var(--bento-text-secondary); text-transform: uppercase; letter-spacing: .5px; margin: 16px 0 8px; }
        .device-row { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: var(--bento-radius-xs); transition: background .15s; box-sizing: border-box; max-width: 100%; overflow: hidden; }
        .device-row:hover { background: var(--bento-primary-light); }
        .device-name { flex: 1; font-size: 13px; color: var(--bento-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
        .device-val { font-size: 12px; font-weight: 600; color: var(--bento-primary); min-width: 70px; text-align: right; white-space: nowrap; flex-shrink: 0; }
        .device-bar-wrap { flex: 1; background: var(--bento-border); border-radius: 4px; height: 6px; overflow: hidden; }
        .device-bar { height: 100%; background: var(--bento-primary); border-radius: 4px; transition: width .4s; }
        .schedule-card { border: 1px solid var(--bento-border); border-radius: var(--bento-radius-sm); padding: 14px; margin-bottom: 10px; box-sizing: border-box; max-width: 100%; overflow: hidden; }
        .schedule-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; overflow: hidden; }
        .schedule-name { font-size: 14px; font-weight: 600; color: var(--bento-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
        .badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .4px; }
        .badge-ok { background: var(--bento-success-light); color: var(--bento-success); }
        .badge-er { background: var(--bento-error-light); color: var(--bento-error); }
        .badge-wa { background: var(--bento-warning-light); color: var(--bento-warning); }
        .badge-pr { background: var(--bento-primary-light); color: var(--bento-primary); }
        .badge-auto { background: rgba(139,92,246,.1); color: #8B5CF6; }
        .schedule-meta { font-size: 12px; color: var(--bento-text-secondary); }
        .schedule-meta span { margin-right: 12px; }
        .btn-row { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
        .btn { padding: 8px 16px; border-radius: var(--bento-radius-xs); border: 1.5px solid var(--bento-border); background: var(--bento-card); color: var(--bento-text); font-size: 13px; font-weight: 500; cursor: pointer; font-family: 'Inter', sans-serif; transition: all .2s; }
        .btn:hover { background: var(--bento-bg); }
        .btn:disabled { opacity: .45; cursor: not-allowed; }
        .btn-primary { background: var(--bento-primary) !important; color: #fff !important; border-color: var(--bento-primary) !important; box-shadow: 0 2px 8px rgba(59,130,246,.3); }
        .btn-primary:hover { background: #2563EB !important; }
        .btn-ok { background: var(--bento-success) !important; color: #fff !important; border-color: var(--bento-success) !important; }
        .smtp-section { background: var(--bento-bg); border: 1px solid var(--bento-border); border-radius: 12px; padding: 16px; margin-bottom: 16px; }
        .smtp-missing { border-color: #f59e0b40; background: #fef3c720; }
        .smtp-header { display: flex; align-items: center; gap: 12px; }
        .smtp-icon { font-size: 24px; }
        .smtp-title { font-weight: 700; font-size: 14px; color: var(--bento-text); }
        .smtp-detail { font-size: 12px; color: var(--bento-text-secondary); margin-top: 2px; }
        .smtp-detail code { background: var(--bento-border); padding: 1px 6px; border-radius: 4px; font-size: 11px; }
        .smtp-actions { display: flex; align-items: center; gap: 10px; margin-top: 12px; flex-wrap: wrap; }
        .smtp-guide { margin-top: 16px; }
        .guide-title { font-weight: 700; font-size: 14px; margin-bottom: 12px; color: var(--bento-text); }
        .guide-steps { display: flex; flex-direction: column; gap: 16px; }
        .guide-step { display: flex; gap: 12px; }
        .step-num { flex-shrink: 0; width: 28px; height: 28px; background: var(--bento-primary); color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; }
        .guide-step p { margin: 4px 0; font-size: 13px; color: var(--bento-text-secondary); line-height: 1.5; }
        .guide-step pre { background: #1e293b; color: #e2e8f0; padding: 12px; border-radius: 8px; font-size: 12px; overflow-x: auto; line-height: 1.6; white-space: pre; margin: 8px 0; max-width: 100%; box-sizing: border-box; }
        .guide-step a { color: var(--bento-primary); text-decoration: none; }
        .guide-step a:hover { text-decoration: underline; }
        .guide-alt { margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--bento-border); }
        .smtp-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
        .smtp-table th { background: var(--bento-border); padding: 6px 10px; text-align: left; font-weight: 600; }
        .smtp-table td { padding: 6px 10px; border-bottom: 1px solid var(--bento-border); }
        .smtp-table tr:hover td { background: var(--bento-border); }
        .toast { display: none; position: fixed; bottom: 24px; right: 24px; z-index: 9999; background: #1e293b; color: #e2e8f0; padding: 12px 20px; border-radius: var(--bento-radius-sm); font-size: 13px; box-shadow: 0 8px 24px rgba(0,0,0,.3); max-width: 320px; }
        .toast.show { display: block; animation: slideUp .3s ease-out; }
        @keyframes slideUp { from { opacity:0; transform: translateY(12px); } to { opacity:1; transform: translateY(0); } }
        .preview-box { background: var(--bento-bg); border: 1px solid var(--bento-border); border-radius: var(--bento-radius-sm); padding: 16px; font-size: 13px; color: var(--bento-text); max-height: 320px; overflow-y: auto; }
        .preview-box h3 { font-size: 15px; margin: 0 0 10px; }
        .preview-box h4 { font-size: 13px; margin: 14px 0 6px; color: var(--bento-text-secondary); }
        .preview-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .preview-table th { background: var(--bento-border); padding: 5px 8px; text-align: left; font-weight: 600; font-size: 11px; }
        .preview-table td { padding: 5px 8px; border-bottom: 1px solid var(--bento-border); }
        .preview-table tr:last-child td { border-bottom: none; }
        .trend-up { color: var(--bento-error); }
        .trend-down { color: var(--bento-success); }
        .pagination-row { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 12px 0 4px; }
        .pagination-btn { padding: 6px 14px; border: 1px solid var(--bento-border); border-radius: var(--bento-radius-xs); background: var(--bento-bg); color: var(--bento-text); font-size: 12px; cursor: pointer; transition: all .15s; }
        .pagination-btn:hover:not([disabled]) { background: var(--bento-primary-light); border-color: var(--bento-primary); color: var(--bento-primary); }
        .pagination-btn[disabled] { opacity: 0.4; cursor: not-allowed; }
        .pagination-info { font-size: 12px; color: var(--bento-text-secondary); }
        .info-row { display: flex; gap: 6px; align-items: flex-start; padding: 10px; background: var(--bento-primary-light); border-radius: var(--bento-radius-xs); margin-bottom: 12px; font-size: 12px; color: var(--bento-text); }
        .info-warn { background: var(--bento-warning-light); }
        .auto-on { color: var(--bento-success); }
        .auto-off { color: var(--bento-error); }
        .auto-unknown { color: var(--bento-warning); }
        .spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.3); border-top-color: #fff; border-radius: 50%; animation: spin .6s linear infinite; margin-right: 6px; vertical-align: middle; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .last-sent { font-size: 11px; color: var(--bento-text-muted); margin-top: 4px; }
        .empty-state { text-align: center; padding: 32px 20px; }
        .empty-state .big { font-size: 40px; margin-bottom: 12px; }
        .empty-state .title { font-size: 15px; font-weight: 600; color: var(--bento-text); margin-bottom: 6px; }
        .empty-state .desc { font-size: 13px; color: var(--bento-text-secondary); line-height: 1.6; max-width: 400px; margin: 0 auto; }
        .source-badge { display: inline-flex; align-items: center; gap: 3px; padding: 1px 8px; border-radius: 10px; font-size: 10px; font-weight: 600; margin-left: 6px; }
        .source-auto { background: rgba(139,92,246,.1); color: #8B5CF6; }
        .email-setup { background: var(--bento-warning-light); border: 1px solid rgba(245,158,11,.3); border-radius: var(--bento-radius-sm); padding: 14px; margin-bottom: 16px; }
        .email-setup-title { font-size: 13px; font-weight: 600; color: var(--bento-text); margin-bottom: 8px; }
        .email-input-row { display: flex; gap: 8px; align-items: center; }
        .email-input { flex: 1; padding: 8px 12px; border: 1.5px solid var(--bento-border); border-radius: var(--bento-radius-xs); font-size: 13px; font-family: 'Inter', sans-serif; background: var(--bento-card); color: var(--bento-text); outline: none; }
        .email-input:focus { border-color: var(--bento-primary); box-shadow: 0 0 0 3px var(--bento-primary-light); }
        .email-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; padding: 8px 12px; background: var(--bento-success-light); border-radius: var(--bento-radius-xs); font-size: 12px; color: var(--bento-text); }
        .email-edit-btn { background: none; border: none; color: var(--bento-primary); cursor: pointer; font-size: 11px; padding: 2px 6px; font-family: 'Inter', sans-serif; }
        .email-edit-btn:hover { text-decoration: underline; }
        .source-manual { background: var(--bento-success-light); color: var(--bento-success); }
        .config-section { margin-bottom: 20px; }
        .config-section-title { font-size: 13px; font-weight: 700; color: var(--bento-text); margin-bottom: 10px; display: flex; align-items: center; gap: 6px; }
        .device-toggle { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: var(--bento-radius-xs); transition: background .15s; }
        .device-toggle:hover { background: var(--bento-primary-light); }
        .device-toggle label { flex: 1; font-size: 13px; color: var(--bento-text); cursor: pointer; display: flex; align-items: center; gap: 8px; }
        .device-toggle .dt-val { font-size: 11px; color: var(--bento-text-secondary); min-width: 60px; text-align: right; }
        .toggle-switch { position: relative; width: 36px; height: 20px; flex-shrink: 0; }
        .toggle-switch input { opacity: 0; width: 0; height: 0; }
        .toggle-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background: var(--bento-border); border-radius: 20px; transition: .2s; }
        .toggle-slider::before { content: ''; position: absolute; height: 16px; width: 16px; left: 2px; bottom: 2px; background: #fff; border-radius: 50%; transition: .2s; }
        .toggle-switch input:checked + .toggle-slider { background: var(--bento-primary); }
        .toggle-switch input:checked + .toggle-slider::before { transform: translateX(16px); }
        .config-input-row { display: flex; gap: 8px; align-items: center; margin-bottom: 8px; }
        .config-input-row label { font-size: 12px; color: var(--bento-text-secondary); min-width: 80px; font-weight: 500; }
        .config-input { padding: 6px 10px; border: 1.5px solid var(--bento-border); border-radius: var(--bento-radius-xs); font-size: 13px; background: var(--bento-card); color: var(--bento-text); font-family: 'Inter', sans-serif; }
        .config-input:focus { border-color: var(--bento-primary); outline: none; box-shadow: 0 0 0 3px var(--bento-primary-light); }
        .device-count { font-size: 11px; color: var(--bento-text-muted); font-weight: 400; }
        @media (max-width: 768px) {
          .tabs { flex-wrap: nowrap; overflow-x: auto; -webkit-overflow-scrolling: touch; gap: 2px; }
          .tab-btn { padding: 6px 10px; font-size: 12px; white-space: nowrap; }
          .card { padding: 14px; }
          .grid3 { grid-template-columns: repeat(2, 1fr); gap: 8px; }
          .grid2 { grid-template-columns: repeat(2, 1fr); gap: 8px; }
          .stat-value { font-size: 18px; }
          .stat-label { font-size: 10px; }
        }
        @media (max-width: 480px) {
          .tabs { gap: 1px; }
          .tab-btn { padding: 5px 8px; font-size: 11px; }
          .grid3 { grid-template-columns: 1fr; gap: 8px; }
          .grid2 { grid-template-columns: 1fr; gap: 8px; }
          .stat-value { font-size: 16px; }
        }
      

</style>

      <div class="card">
        <div class="header">
          <div class="header-icon">\u{1F4E7}</div>
          <div>
            <div class="header-title">${_esc(this._config.title)}</div>
            <div class="header-sub">${recipientDisplay} \u00A0\u2022\u00A0 <span id="price-display" style="cursor:pointer;color:var(--bento-primary);border-bottom:1px dashed var(--bento-primary)" title="${L ? 'Kliknij aby zmieni\u0107' : 'Click to change'}">${_esc(this._config.currency)} ${this._getTariffLabel()} \u270E</span></div>
          </div>
        </div>
        <div class="tabs" role="tablist">
          <button class="tab-btn ${this._activeTab === 'overview' ? 'active' : ''}" data-tab="overview" role="tab" aria-selected="${this._activeTab === 'overview'}">\u{1F4CA} Overview</button>
          <button class="tab-btn ${this._activeTab === 'schedule' ? 'active' : ''}" data-tab="schedule" role="tab" aria-selected="${this._activeTab === 'schedule'}">\u{1F4C5} Schedule</button>
          <button class="tab-btn ${this._activeTab === 'preview' ? 'active' : ''}" data-tab="preview" role="tab" aria-selected="${this._activeTab === 'preview'}">\u{1F4CB} Preview</button>
          <button class="tab-btn ${this._activeTab === 'send' ? 'active' : ''}" data-tab="send" role="tab" aria-selected="${this._activeTab === 'send'}">\u{1F4E4} Send Now</button>
          <button class="tab-btn ${this._activeTab === 'config' ? 'active' : ''}" data-tab="config" role="tab" aria-selected="${this._activeTab === 'config'}">\u2699\uFE0F Config</button>
        </div>
        <div id="tab-content"></div>
        ${OWN_SUPPORT_FOOTER}
      </div>
      <div class="toast" id="toast">
        </div>
    `
    this.shadowRoot.querySelectorAll('.tab-btn').forEach(t => {
      t.addEventListener('click', () => {
        this._activeTab = t.dataset.tab;
        history.replaceState(null, '', location.pathname + '#' + this._toolId + '/' + this._activeTab);
        this.shadowRoot.querySelectorAll('.tab-btn').forEach(x => x.classList.remove('active'));
        t.classList.add('active');
        this._renderTab();
      });
    });
    this._renderTab();
    this._bindEmailEvents();
    this._bindPriceEdit();
  }

  _bindEmailEvents() {
    const root = this.shadowRoot;
    const saveBtn = root.getElementById('email-save');
    const editBtn = root.getElementById('email-edit');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        const input = root.getElementById('email-input');
        if (input && input.value && input.value.includes('@')) {
          this._saveRecipient(input.value.trim());
        }
      });
      const input = root.getElementById('email-input');
      if (input) {
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && input.value && input.value.includes('@')) {
            this._saveRecipient(input.value.trim());
          }
        });
      }
    }
    if (editBtn) {
      editBtn.addEventListener('click', () => {
        this._saveToHelper('recipient', '');
        this._detectedRecipient = null;
        this._render();
      });
    }
  }

  _bindPriceEdit() {
    const root = this.shadowRoot;
    const priceEl = root.getElementById('price-display');
    if (!priceEl) return;
    priceEl.addEventListener('click', (e) => {
      e.preventDefault();
      const L = this._lang === 'pl';
      const cur = this._getAvgRate();
      // Replace the price display with an inline input
      const container = priceEl.parentElement;
      const origHtml = container.innerHTML;
      const inputHtml = `<span style="display:inline-flex;align-items:center;gap:4px">
        <span>${_esc(this._config.currency)}</span>
        <input type="number" id="price-input" value="${cur}" step="0.01" min="0" style="width:70px;padding:3px 6px;border:1.5px solid var(--bento-primary);border-radius:4px;font-size:12px;background:var(--bento-card);color:var(--bento-text);font-family:'Inter',sans-serif;text-align:center">
        <span>/kWh</span>
        <button id="price-save" class="btn btn-primary" style="padding:3px 10px;font-size:11px;margin:0" aria-label="Save">\u2714</button>
        <button id="price-cancel" class="btn" style="padding:3px 8px;font-size:11px;margin:0" aria-label="Cancel">\u2716</button>
      </span>`;
      // Find just the price part and replace
      const priceSpan = root.getElementById('price-display');
      priceSpan.outerHTML = inputHtml;
      const input = root.getElementById('price-input');
      const saveBtn = root.getElementById('price-save');
      const cancelBtn = root.getElementById('price-cancel');
      if (input) input.focus();
      const save = () => {
        const val = parseFloat(input.value);
        if (!isNaN(val) && val > 0) {
          this._config.energy_price = val;
          this._saveToHelper('price', String(val));
          this._render();
        }
      };
      if (saveBtn) saveBtn.addEventListener('click', save);
      if (cancelBtn) cancelBtn.addEventListener('click', () => this._render());
      if (input) input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') save();
        if (e.key === 'Escape') this._render();
      });
    });
  }

  _renderTab() {
    const el = this.shadowRoot.getElementById('tab-content');
    if (!el) return;
    switch (this._activeTab) {
      case 'overview': el.innerHTML = this._tabOverview(); this._attachOverviewEvents(); break;
      case 'schedule': el.innerHTML = this._tabSchedule(); this._attachScheduleEvents(); break;
      case 'preview':  el.innerHTML = this._tabPreview(); break;
      case 'send':     el.innerHTML = this._tabSend(); this._attachSendEvents(); break;
      case 'config':   el.innerHTML = this._tabConfig(); this._attachConfigEvents(); break;
    }
  }

  _updateLiveData() {
    if (this._activeTab !== 'send') {
      this._discoverEnergySensors();
      this._renderTab();
    }
  }

  _attachOverviewEvents() {
    this.shadowRoot.querySelectorAll('.overview-period-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = btn.dataset.period;
        this._overviewPeriod = p;
        this._devicePage = 0;
        // Refresh recorder stats if cache is older than 60s
        const cacheTime = this[`_periodCacheTime_${p}`] || 0;
        if (p !== 'total' && Date.now() - cacheTime > 60000) {
          this._fetchRecorderStats(p).then(() => this._renderTab()).catch(() => {});
        }
        this._renderTab();
      });
    });
    const prevBtn = this.shadowRoot.querySelector('[data-page-prev]');
    if (prevBtn) prevBtn.addEventListener('click', () => { this._devicePage = Math.max(0, (this._devicePage || 0) - 1); this._renderTab(); });
    const nextBtn = this.shadowRoot.querySelector('[data-page-next]');
    if (nextBtn) nextBtn.addEventListener('click', () => { this._devicePage = (this._devicePage || 0) + 1; this._renderTab(); });
  }

  _attachPeriodEvents() {
    this.shadowRoot.querySelectorAll('.period-btn').forEach(btn => {
      btn.addEventListener('click', () => { this._reportPeriod = btn.dataset.period; this._renderTab(); });
    });
  }

  // --- tabs ---

  _tabOverview() {
    const devData = this._getOverviewData();
    const isAuto = devData.length > 0 && devData[0].source === 'auto';
    const L = this._lang === 'pl';
    if (devData.length === 0 && !this._discoveryDone) {
      return `<div class="empty-state">
        <div class="big"><span class="spinner" style="width:32px;height:32px;border-width:3px;border-color:var(--bento-primary);border-top-color:transparent;"></span></div>
        <div class="title">${L ? 'Wyszukiwanie czujnik\u00F3w energii...' : 'Discovering energy sensors...'}</div>
        <div class="desc">${L
          ? 'Skanowanie urz\u0105dze\u0144 Home Assistant i konfiguracja ustawie\u0144. To potrwa chwil\u0119.'
          : 'Scanning Home Assistant devices and configuring settings. This will take a moment.'}</div>
      </div>`;
    }
    if (devData.length === 0) {
      return `<div class="empty-state">
        <div class="big">\u{1F50C}</div>
        <div class="title">${L ? 'Nie znaleziono czujnik\u00F3w energii' : 'No Energy Sensors Found'}</div>
        <div class="desc">${L
          ? 'Karta nie znalaz\u0142a \u017Cadnych czujnik\u00F3w energii w Home Assistant. Upewnij si\u0119, \u017Ce masz skonfigurowane urz\u0105dzenia z monitoringiem energii (np. Shelly, PZEM, smart plugi) lub dodaj je do HA Energy Dashboard.'
          : 'No energy sensors found in Home Assistant. Make sure you have energy monitoring devices configured (e.g., Shelly, PZEM, smart plugs) or add them to the HA Energy Dashboard.'}</div>
        <div style="margin-top:16px;"><a class="btn btn-primary" href="/config/energy" target="_blank">\u26A1 ${L ? 'Konfiguracja Energy' : 'Energy Config'}</a></div>
      </div>`;
    }
    const period = this._overviewPeriod || 'total';
    const periodLabels = {
      total: { lbl: 'Total', lblPl: '\u0141\u0105cznie', sub: '', subPl: '' },
      day:   { lbl: 'Today', lblPl: 'Dzisiaj', sub: 'Last 24h', subPl: 'Ostatnie 24h' },
      week:  { lbl: 'This Week', lblPl: 'Ten tydzie\u0144', sub: 'Last 7 days', subPl: 'Ostatnie 7 dni' },
      month: { lbl: 'This Month', lblPl: 'Ten miesi\u0105c', sub: 'Last 30 days', subPl: 'Ostatnie 30 dni' },
    };
    const pl = periodLabels[period];
    const periodLabel = L ? pl.lblPl : pl.lbl;
    let displayData;
    let periodNote = '';
    if (!isAuto && devData.length > 0 && devData[0].source === 'manual') {
      displayData = this._getOverviewDataForPeriod(period);
    } else if (isAuto && period !== 'total') {
      // Try to find period-specific sensors for auto-discovered devices
      try { displayData = this._getAutoDataForPeriod(period); } catch(e) { displayData = []; }
      const hasRealData = displayData.length > 0 && displayData.some(d => d.month > 0);
      if (!hasRealData) {
        displayData = devData;
        periodNote = L ? '(dane total \u2014 brak sensor\u00F3w per okres)' : '(total data \u2014 no per-period sensors)';
      }
    } else {
      displayData = devData;
    }
    const totalEnergy = displayData.reduce((s, d) => s + d.month, 0);
    const totalCost = isAuto ? totalEnergy * this._getAvgRate() : displayData.reduce((s, d) => s + d.cost, 0);
    const maxVal = Math.max(...displayData.map(x => x.month)) || 1;
    const periodBtns = ['day', 'week', 'month', 'total'].map(p => {
      const lb = p === 'total' ? (L ? 'Wszystko' : 'All') : p === 'day' ? '24h' : p === 'week' ? '7d' : '30d';
      return `<button class="overview-period-btn" data-period="${p}" style="padding:5px 12px;font-size:11px;border-radius:6px;cursor:pointer;border:1px solid var(--bento-border);background:${period === p ? 'var(--bento-primary)' : 'var(--bento-bg)'};color:${period === p ? '#fff' : 'var(--bento-text)'};font-weight:${period === p ? '600' : '400'};">${lb}</button>`;
    }).join('');
    return `
      ${isAuto ? `<div class="info-row">\u{1F50D}\u00A0 ${L ? 'Auto-discovery: znaleziono <b>' + displayData.length + '</b> urz\u0105dze\u0144 z czujnikami energii.' : 'Auto-discovery: found <b>' + displayData.length + '</b> devices with energy sensors.'} <span class="source-badge source-auto">AUTO</span>${periodNote ? `<br><span style="font-size:11px;color:var(--bento-warning)">${periodNote}</span>` : ''}</div>` : ''}
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <div class="section-title" style="margin:0;">\u{1F4CA} ${periodLabel}</div>
        <div style="display:flex;gap:4px;">${periodBtns}</div>
      </div>
      <div class="grid3">
        <div class="stat">
          <div class="stat-value" style="color:#F59E0B">${totalEnergy.toFixed(1)}</div>
          <div class="stat-label">kWh ${periodLabel}</div>
          <div class="stat-sub">${displayData.length} ${L ? 'urz\u0105dze\u0144' : 'devices'}</div>
        </div>
        <div class="stat">
          <div class="stat-value" style="color:#3B82F6">${totalCost.toFixed(2)}</div>
          <div class="stat-label">${_esc(this._config.currency)} ${L ? 'Koszt' : 'Cost'}</div>
          <div class="stat-sub">@ ${this._getTariffLabel()}</div>
        </div>
        <div class="stat">
          <div class="stat-value" style="color:#10B981">${displayData.length > 0 ? displayData[0].name.split(' ').slice(0,2).join(' ') : '-'}</div>
          <div class="stat-label">${L ? 'Najwi\u0119ksze zu\u017Cycie' : 'Top Consumer'}</div>
          <div class="stat-sub">${displayData.length > 0 ? displayData[0].month.toFixed(1) + ' kWh' : ''}</div>
        </div>
      </div>
      <div class="section-title">\u26A1 ${L ? 'Zu\u017Cycie wg urz\u0105dzenia' : 'Energy by Device'}</div>
      ${(() => {
        const page = this._devicePage || 0;
        const perPage = this._devicesPerPage || 20;
        const totalPages = Math.ceil(displayData.length / perPage);
        const pageData = displayData.slice(page * perPage, (page + 1) * perPage);
        const rows = pageData.map(d => {
          const pct = maxVal > 0 ? (d.month / maxVal * 100) : 0;
          const diff = d.month - d.lastMonth;
          const diffStr = d.lastMonth > 0 && diff !== 0 ? `<span class="${diff > 0 ? 'trend-up' : 'trend-down'}">${diff > 0 ? '+' : ''}${diff.toFixed(1)} kWh</span>` : '';
          const entityInfo = d.entity_id ? `<span style="font-size:10px;color:var(--bento-text-muted)" title="${d.entity_id}">${d.entity_id.split('.')[1].substring(0,20)}</span>` : '';
          return `<div class="device-row" title="${d.entity_id || d.name}">
            <div class="device-name">${d.name} ${entityInfo}</div>
            <div class="device-bar-wrap"><div class="device-bar" style="width:${pct}%"></div></div>
            <div class="device-val">${d.month.toFixed(1)} kWh</div>
            <div style="font-size:11px;color:var(--bento-text-secondary);min-width:60px;text-align:right">${diffStr}</div>
          </div>`;
        }).join('');
        const pagination = totalPages > 1 ? `
          <div class="pagination-row">
            <button class="pagination-btn" data-page-prev ${page === 0 ? 'disabled' : ''}>\u2190 ${L ? 'Poprzednia' : 'Prev'}</button>
            <span class="pagination-info">${L ? 'Strona' : 'Page'} ${page + 1} / ${totalPages}</span>
            <button class="pagination-btn" data-page-next ${page >= totalPages - 1 ? 'disabled' : ''}>${L ? 'Nast\u0119pna' : 'Next'} \u2192</button>
          </div>` : '';
        return rows + pagination;
      })()}`;
  }

  _tabSchedule() {
    const L = this._lang === 'pl';
    const recipient = this._getRecipient();
    const service = this._detectedService || this._config?.notify_service || '';
    const dailyId = 'automation.send_daily_energy_report';
    const weeklyId = 'automation.send_weekly_energy_report';
    const monthlyId = 'automation.send_monthly_energy_report';
    const dailyState = this._state(dailyId, 'missing');
    const weeklyState = this._state(weeklyId, 'missing');
    const monthlyState = this._state(monthlyId, 'missing');
    const exists = (s) => s !== 'missing' && s !== 'unavailable';
    const badge = (state) => {
      if (state === 'on') return '<span class="badge badge-ok">\u2705 Active</span>';
      if (state === 'off') return '<span class="badge badge-er">\u274C Disabled</span>';
      return '<span class="badge badge-wa">\u2795 ' + (L ? 'Nie utworzony' : 'Not Created') + '</span>';
    };
    const recipientInfo = recipient ? `\u{1F4E7} ${recipient}` : `\u{1F4E7} <i>${L ? 'Brak — ustaw email powy\u017Cej' : 'None — set email above'}</i>`;
    const sd = this._scheduleDefaults;
    const dayNames = L
      ? { mon: 'Poniedzia\u0142ek', tue: 'Wtorek', wed: '\u015Aroda', thu: 'Czwartek', fri: 'Pi\u0105tek', sat: 'Sobota', sun: 'Niedziela' }
      : { mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday', sun: 'Sunday' };
    const dayOptions = Object.entries(dayNames).map(([k, v]) => `<option value="${k}" ${sd.weekly_day === k ? 'selected' : ''}>${v}</option>`).join('');
    const weeklyDayLabel = dayNames[sd.weekly_day] || dayNames.mon;
    const scheduleCard = (icon, nameL, nameE, state, timeLabel, enableId, disableId, createId, timeInputId, timeValue, extraInputHtml) => {
      const name = L ? nameL : nameE;
      const ex = exists(state);
      return `<div class="schedule-card">
        <div class="schedule-row"><div class="schedule-name">${icon} ${name}</div>${badge(state)}</div>
        <div class="schedule-meta"><span>\u{1F552} ${timeLabel}</span><span>${recipientInfo}</span></div>
        <div style="display:flex;gap:8px;align-items:center;margin-top:10px;flex-wrap:wrap">
          <label style="font-size:12px;color:var(--bento-text-secondary);font-weight:500">${L ? 'Godzina' : 'Time'}:</label>
          <input type="time" id="${timeInputId}" value="${timeValue}" style="padding:5px 10px;border:1.5px solid var(--bento-border);border-radius:var(--bento-radius-xs);font-size:13px;background:var(--bento-card);color:var(--bento-text);font-family:'Inter',sans-serif;">
          ${extraInputHtml || ''}
        </div>
        <div class="btn-row">
          ${ex ? (state === 'on'
            ? `<button class="btn btn-ok" id="${disableId}">${L ? 'Wy\u0142\u0105cz' : 'Disable'}</button><button class="btn" id="update-${createId}">\u{1F504} ${L ? 'Aktualizuj' : 'Update'}</button>`
            : `<button class="btn btn-primary" id="${enableId}">${L ? 'W\u0142\u0105cz' : 'Enable'}</button><button class="btn" id="update-${createId}">\u{1F504} ${L ? 'Aktualizuj' : 'Update'}</button>`)
            : `<button class="btn btn-primary" id="${createId}">\u2795 ${L ? 'Utw\u00F3rz automatyzacj\u0119' : 'Create Automation'}</button>`}
        </div>
      </div>`;
    };
    return `
      ${this._renderSmtpSection()}
      ${!recipient && !service ? `<div class="info-row info-warn">\u26A0\uFE0F\u00A0 ${L
        ? '<b>Brak adresu email.</b> Ustaw email w polu powy\u017Cej lub domy\u015Blnego odbiorc\u0119 w <a href="/config/integrations/integration/ha_tools_email">Ustawienia \u2192 Urz\u0105dzenia i us\u0142ugi \u2192 HA Tools Email \u2192 Konfiguruj</a>.'
        : '<b>No email recipient.</b> Set an email in the field above or a default recipient in <a href="/config/integrations/integration/ha_tools_email">Settings \u2192 Devices &amp; services \u2192 HA Tools Email \u2192 Configure</a>.'}</div>` : ''}
      ${scheduleCard(
        '\u2600\uFE0F', 'Raport dzienny', 'Daily Report', dailyState,
        `${L ? 'Codziennie o' : 'Every day at'} ${sd.daily}`,
        'enable-daily', 'disable-daily', 'create-daily', 'time-daily', sd.daily, ''
      )}
      ${scheduleCard(
        '\u{1F4C6}', 'Raport tygodniowy', 'Weekly Report', weeklyState,
        `${weeklyDayLabel} ${L ? 'o' : 'at'} ${sd.weekly_time}`,
        'enable-weekly', 'disable-weekly', 'create-weekly', 'time-weekly', sd.weekly_time,
        `<label style="font-size:12px;color:var(--bento-text-secondary);font-weight:500;margin-left:8px">${L ? 'Dzie\u0144' : 'Day'}:</label>
         <select id="day-weekly" style="padding:5px 10px;border:1.5px solid var(--bento-border);border-radius:var(--bento-radius-xs);font-size:13px;background:var(--bento-card);color:var(--bento-text);font-family:'Inter',sans-serif">${dayOptions}</select>`
      )}
      ${scheduleCard(
        '\u{1F4C8}', 'Raport miesi\u0119czny', 'Monthly Report', monthlyState,
        `${L ? '1. dzie\u0144 miesi\u0105ca o' : '1st of month at'} ${sd.monthly_time}`,
        'enable-monthly', 'disable-monthly', 'create-monthly', 'time-monthly', sd.monthly_time, ''
      )}
      <div style="margin-top:12px;padding:12px 16px;background:rgba(59,130,246,0.08);border-left:3px solid var(--bento-primary,#3B82F6);border-radius:6px;font-size:13px;color:var(--bento-text);">
        <strong>\u2139\uFE0F ${L ? 'Info' : 'Info'}:</strong> ${L
          ? 'Ustawienia (email, serwis, godziny) s\u0105 zapisywane w Home Assistant i dzia\u0142aj\u0105 na ka\u017Cdym urz\u0105dzeniu.'
          : 'Settings (email, service, times) are stored in Home Assistant and work across all your devices.'}
      </div>`;
  }

  _tabPreview() {
    const L = this._lang === 'pl';
    if (!this._discoveryDone) {
      return `<div class="empty-state"><div class="big"><span class="spinner" style="width:32px;height:32px;border-width:3px;border-color:var(--bento-primary);border-top-color:transparent;"></span></div><div class="title">${L ? '\u0141adowanie danych...' : 'Loading data...'}</div></div>`;
    }
    const devices = this._devices();
    const autoDevices = this._discoveredDevices || [];
    const isAuto = devices.length === 0 && autoDevices.length > 0;
    const today = new Date().toISOString().split('T')[0];
    const recipient = this._getRecipient();
    const recipientLine = recipient || '—';
    const periods = [
      { key: 'day', icon: '\u2600\uFE0F', titleL: 'Raport dzienny', titleE: 'Daily Report', rangeL: 'Ostatnie 24h', rangeE: 'Last 24h' },
      { key: 'week', icon: '\u{1F4C6}', titleL: 'Raport tygodniowy', titleE: 'Weekly Report', rangeL: 'Ostatnie 7 dni', rangeE: 'Last 7 days' },
      { key: 'month', icon: '\u{1F4C8}', titleL: 'Raport miesi\u0119czny', titleE: 'Monthly Report', rangeL: 'Ostatnie 30 dni', rangeE: 'Last 30 days' },
    ];
    const getDevData = (period) => {
      if (devices.length > 0) {
        return devices.map(d => {
          let current = 0, previous = 0, cost = 0;
          if (period === 'day') { current = this._float(this._state(d.energy_day || d.energy_week, '0')); cost = current * this._getAvgRate(); }
          else if (period === 'month') { current = this._float(this._state(d.energy_month, '0')); previous = this._float(this._state(d.energy_last_month, '0')); cost = this._float(this._state(d.cost_month || d.cost_week, '0')); }
          else { current = this._float(this._state(d.energy_week, '0')); previous = this._float(this._state(d.energy_last_week, '0')); cost = this._float(this._state(d.cost_week, '0')); }
          return { name: d.name, current, previous, cost };
        }).sort((a, b) => b.current - a.current);
      }
      try { var periodData = this._getAutoDataForPeriod(period); } catch(e) { var periodData = []; }
      if (periodData && periodData.length > 0 && periodData.some(d => d.month > 0)) {
        return periodData.map(d => ({ name: d.name, current: d.month, previous: d.lastMonth || 0, cost: d.cost || d.month * this._getAvgRate(), hasPeriod: true })).sort((a, b) => b.current - a.current);
      }
      return autoDevices.map(d => ({ name: d.name, current: d.value_kwh, previous: 0, cost: d.value_kwh * this._getAvgRate(), hasPeriod: false })).sort((a, b) => b.current - a.current);
    };
    const renderReport = (p) => {
      const title = L ? p.titleL : p.titleE;
      const range = L ? p.rangeL : p.rangeE;
      const devData = getDevData(p.key);
      const totalEnergy = devData.reduce((s, d) => s + d.current, 0);
      const totalCost = devData.reduce((s, d) => s + d.cost, 0);
      const top5 = devData.slice(0, 5);
      const isPeriodData = devData.length > 0 && devData[0].hasPeriod;
      const periodNote = !isPeriodData && isAuto ? `<div style="font-size:11px;color:var(--bento-text-secondary);margin-bottom:6px;font-style:italic">\u26A0 ${L ? 'Brak sensor\u00F3w dla tego okresu \u2014 pokazano dane total' : 'No period-specific sensors found \u2014 showing total data'}</div>` : '';
      return `<div class="preview-box" style="margin-bottom:14px">
        <h3 style="margin:0 0 8px">${p.icon} ${title} \u2013 ${today}</h3>
        ${periodNote}
        <div style="font-size:12px;color:var(--bento-text-secondary);margin-bottom:10px">\u{1F4E7} ${recipientLine} \u00A0\u2022\u00A0 ${range} \u00A0\u2022\u00A0 ${devData.length} ${L ? 'urz.' : 'dev.'}</div>
        <div style="display:flex;gap:16px;margin-bottom:10px;flex-wrap:wrap">
          <div><span style="font-size:18px;font-weight:700;color:#F59E0B">${totalEnergy.toFixed(1)}</span> <span style="font-size:11px;color:var(--bento-text-secondary)">kWh</span></div>
          <div><span style="font-size:18px;font-weight:700;color:#3B82F6">${totalCost.toFixed(2)}</span> <span style="font-size:11px;color:var(--bento-text-secondary)">${_esc(this._config.currency)}</span></div>
        </div>
        <table class="preview-table">
          <thead><tr><th>${L ? 'Urz\u0105dzenie' : 'Device'}</th><th>kWh</th><th>${L ? 'Koszt' : 'Cost'} (${_esc(this._config.currency)})</th></tr></thead>
          <tbody>${top5.map(d => `<tr><td>${d.name}</td><td>${d.current.toFixed(2)}</td><td>${d.cost.toFixed(2)}</td></tr>`).join('')}
          ${devData.length > 5 ? `<tr><td colspan="3" style="text-align:center;color:var(--bento-text-secondary);font-size:11px">+ ${devData.length - 5} ${L ? 'wi\u0119cej urz\u0105dze\u0144' : 'more devices'}...</td></tr>` : ''}</tbody>
        </table>
      </div>`;
    };
    return `
      ${isAuto ? `<div class="info-row">\u{1F50D}\u00A0 ${L ? 'Auto-discovery: dane z sensor\u00F3w total.' : 'Auto-discovery: showing total sensor data.'}</div>` : ''}
      <div class="section-title" style="margin-top:0">\u{1F4CB} ${L ? 'Podgl\u0105d raport\u00F3w email' : 'Email Report Previews'}</div>
      ${periods.map(p => renderReport(p)).join('')}
      <div style="font-size:11px;color:var(--bento-text-secondary);margin-top:4px">${L ? 'Podgl\u0105d tre\u015Bci emaila. Rzeczywisty email zawiera pe\u0142n\u0105 tabel\u0119 HTML.' : 'Preview of email content. Actual email contains full HTML table.'}</div>`;
  }

  _tabSend() {
    const L = this._lang === 'pl';
    const smtpConfig = this._renderSmtpSection();
    const service = this._detectedService || this._config?.notify_service || '';
    return `
      <div class="info-row">\u{1F4E4}\u00A0 ${L ? 'R\u0119cznie wy\u015Blij raport energii poprzez ha_tools_email.' : 'Manually trigger an energy report via ha_tools_email.'}</div>
      ${smtpConfig}
      <div style="font-size:12px;color:var(--bento-text-secondary);margin:16px 0 12px;padding:10px;background:var(--bento-primary-light);border-radius:var(--bento-radius-xs)">${L ? '💡 Konfiguracja SMTP: <a href="/config/integrations/integration/ha_tools_email">Ustawienia \u2192 Urz\u0105dzenia i us\u0142ugi \u2192 HA Tools Email \u2192 Konfiguruj</a>' : '💡 SMTP settings: <a href="/config/integrations/integration/ha_tools_email">Settings \u2192 Devices &amp; services \u2192 HA Tools Email \u2192 Configure</a>'}</div>
      <div class="schedule-card">
        <div class="schedule-row"><div class="schedule-name">\u2600\uFE0F ${L ? 'Wy\u015Blij raport dzienny' : 'Send Daily Report Now'}</div><span class="badge badge-pr">Manual</span></div>
        <div id="last-daily" class="last-sent">${this._lastSent.daily ? 'Last sent: ' + this._lastSent.daily : ''}</div>
        <div class="btn-row"><button class="btn btn-primary" id="send-daily" aria-label="${L ? 'Wyślij raport dzienny' : 'Send Daily Report'}" ${this._sending ? 'disabled' : ''}>${this._sending ? '<span class="spinner"></span>Sending...' : '\u2600\uFE0F Send Daily'}</button></div>
      </div>
      <div class="schedule-card">
        <div class="schedule-row"><div class="schedule-name">\u{1F4C6} ${L ? 'Wy\u015Blij raport tygodniowy' : 'Send Weekly Report Now'}</div><span class="badge badge-pr">Manual</span></div>
        <div id="last-weekly" class="last-sent">${this._lastSent.weekly ? 'Last sent: ' + this._lastSent.weekly : ''}</div>
        <div class="btn-row"><button class="btn btn-primary" id="send-weekly" aria-label="${L ? 'Wyślij raport tygodniowy' : 'Send Weekly Report'}" ${this._sending ? 'disabled' : ''}>${this._sending ? '<span class="spinner"></span>Sending...' : '\u{1F4E4} Send Weekly'}</button></div>
      </div>
      <div class="schedule-card">
        <div class="schedule-row"><div class="schedule-name">\u{1F4C8} ${L ? 'Wy\u015Blij raport miesi\u0119czny' : 'Send Monthly Report Now'}</div><span class="badge badge-pr">Manual</span></div>
        <div id="last-monthly" class="last-sent">${this._lastSent.monthly ? 'Last sent: ' + this._lastSent.monthly : ''}</div>
        <div class="btn-row"><button class="btn btn-primary" id="send-monthly" aria-label="${L ? 'Wyślij raport miesięczny' : 'Send Monthly Report'}" ${this._sending ? 'disabled' : ''}>${this._sending ? '<span class="spinner"></span>Sending...' : '\u{1F4C8} Send Monthly'}</button></div>
      </div>
      <div class="schedule-card">
        <div class="schedule-row"><div class="schedule-name">\u{1F4E7} ${L ? 'Szybkie podsumowanie' : 'Quick Summary'}</div><span class="badge badge-ok">Instant</span></div>
        <div class="schedule-meta">${L ? 'Tekstowe podsumowanie aktualnych danych energii.' : 'Plain-text summary of current energy stats.'}</div>
        <div id="last-quick" class="last-sent">${this._lastSent.quick ? 'Last sent: ' + this._lastSent.quick : ''}</div>
        <div class="btn-row"><button class="btn btn-ok" id="send-quick" ${this._sending || !service ? 'disabled' : ''}>\u26A1 ${L ? 'Wy\u015Blij' : 'Send Quick Summary'}</button></div>
      </div>`;
  }

  _attachSendEvents() {
    const root = this.shadowRoot;
    const sendDaily = root.getElementById('send-daily');
    const sendWeekly = root.getElementById('send-weekly');
    const sendMonthly = root.getElementById('send-monthly');
    const sendQuick = root.getElementById('send-quick');
    if (sendDaily) sendDaily.addEventListener('click', () => this._sendReport('daily'));
    if (sendWeekly) sendWeekly.addEventListener('click', () => this._sendReport('weekly'));
    if (sendMonthly) sendMonthly.addEventListener('click', () => this._sendReport('monthly'));
    if (sendQuick) sendQuick.addEventListener('click', () => this._sendReport('quick'));
  }

  _tabConfig() {
    const L = this._lang === 'pl';
    const allDevices = this._discoveredDevices || [];
    const manual = this._devices();
    const isAuto = manual.length === 0 && allDevices.length > 0;
    const devices = isAuto
      ? allDevices.map(d => ({ key: d.key || d.entity_id, name: d.name, value: d.value_kwh, entity_id: d.entity_id }))
      : manual.map(d => ({ key: d.name, name: d.name, value: this._float(this._state(d.energy_month || d.energy_week, '0')), entity_id: '' }));
    devices.sort((a, b) => a.name.localeCompare(b.name));
    const excluded = this._excludedDevices;
    const enabledCount = devices.filter(d => !excluded.has(d.key)).length;

    const recipient = this._getRecipient();
    const price = this._getAvgRate();
    const currency = this._config.currency || 'PLN';

    return `
      <div class="config-section">
        <div class="config-section-title">\u{1F4E7} ${L ? 'Ustawienia email' : 'Email Settings'}</div>
        <div class="config-input-row">
          <label>${L ? 'Odbiorca' : 'Recipient'}:</label>
          <input type="email" id="cfg-email" class="config-input" value="${_esc(recipient)}" placeholder="your@email.com" style="flex:1">
          <button class="btn btn-primary" id="cfg-email-save" style="padding:6px 14px;font-size:12px">${L ? 'Zapisz' : 'Save'}</button>
        </div>
        <div class="config-input-row">
          <label>${L ? 'Stawka' : 'Price'}:</label>
          <input type="number" id="cfg-price" class="config-input" value="${_esc(price)}" step="0.01" min="0" style="width:80px">
          <span style="font-size:12px;color:var(--bento-text-secondary)">${currency}/kWh</span>
          <button class="btn btn-primary" id="cfg-price-save" style="padding:6px 14px;font-size:12px">${L ? 'Zapisz' : 'Save'}</button>
        </div>
      </div>

      <div class="config-section">
        <div class="config-section-title">\u{1F50C} ${L ? 'Urz\u0105dzenia w raportach' : 'Devices in Reports'} <span class="device-count">(${enabledCount}/${devices.length} ${L ? 'aktywnych' : 'active'})</span></div>
        <div style="margin-bottom:10px;display:flex;gap:8px">
          <button class="btn" id="cfg-select-all" style="font-size:11px;padding:4px 12px">${L ? 'Zaznacz wszystkie' : 'Select All'}</button>
          <button class="btn" id="cfg-deselect-all" style="font-size:11px;padding:4px 12px">${L ? 'Odznacz wszystkie' : 'Deselect All'}</button>
        </div>
        <div style="max-height:350px;overflow-y:auto;border:1px solid var(--bento-border);border-radius:var(--bento-radius-sm);padding:4px">
          ${devices.map(d => {
            const checked = !excluded.has(d.key);
            return `<div class="device-toggle">
              <div class="toggle-switch">
                <input type="checkbox" id="dev-${d.key}" data-key="${d.key}" ${checked ? 'checked' : ''}>
                <span class="toggle-slider"></span>
              </div>
              <label for="dev-${d.key}">${d.name}</label>
              <div class="dt-val">${d.value.toFixed(1)} kWh</div>
            </div>`;
          }).join('')}
          ${devices.length === 0 ? `<div style="text-align:center;padding:20px;color:var(--bento-text-secondary);font-size:13px">${L ? 'Brak wykrytych urz\u0105dze\u0144' : 'No devices detected'}</div>` : ''}
        </div>
      </div>

      <div class="config-section">
        <div class="config-section-title">\u{1F4BE} ${L ? 'Zapis ustawie\u0144' : 'Storage Info'}</div>
        <div style="font-size:12px;color:var(--bento-text-secondary);line-height:1.8">
          ${this._helpersReady
            ? `\u2705 ${L ? 'Ustawienia zapisywane w Home Assistant (input_text helpers). Dzia\u0142a na ka\u017Cdym urz\u0105dzeniu.' : 'Settings stored in Home Assistant (input_text helpers). Works across all devices.'}`
            : `\u26A0\uFE0F ${L ? 'Helpery HA niedost\u0119pne. Ustawienia zapisywane lokalnie w przegl\u0105darce.' : 'HA helpers unavailable. Settings saved locally in browser.'}`}
        </div>
      </div>`;
  }

  _attachConfigEvents() {
    const root = this.shadowRoot;
    // Email save
    const emailSave = root.getElementById('cfg-email-save');
    if (emailSave) emailSave.addEventListener('click', () => {
      const input = root.getElementById('cfg-email');
      if (input && input.value && input.value.includes('@')) {
        this._saveRecipient(input.value.trim());
        this._showToast('\u2705 ' + (this._lang === 'pl' ? 'Email zapisany' : 'Email saved'));
      }
    });
    // Price save
    const priceSave = root.getElementById('cfg-price-save');
    if (priceSave) priceSave.addEventListener('click', () => {
      const input = root.getElementById('cfg-price');
      const val = parseFloat(input?.value);
      if (!isNaN(val) && val > 0) {
        this._config.energy_price = val;
        this._saveToHelper('price', String(val));
        this._showToast('\u2705 ' + (this._lang === 'pl' ? 'Stawka zapisana' : 'Price saved'));
        this._render();
      }
    });
    // Device toggles
    root.querySelectorAll('.device-toggle input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', () => {
        const key = cb.dataset.key;
        if (cb.checked) {
          this._excludedDevices.delete(key);
        } else {
          this._excludedDevices.add(key);
        }
        this._saveExcludedDevices();
        // Update count
        const countEl = root.querySelector('.device-count');
        if (countEl) {
          const total = root.querySelectorAll('.device-toggle input').length;
          const active = root.querySelectorAll('.device-toggle input:checked').length;
          const L = this._lang === 'pl';
          countEl.textContent = `(${active}/${total} ${L ? 'aktywnych' : 'active'})`;
        }
      });
    });
    // Select/Deselect all
    const selectAll = root.getElementById('cfg-select-all');
    const deselectAll = root.getElementById('cfg-deselect-all');
    if (selectAll) selectAll.addEventListener('click', () => {
      this._excludedDevices.clear();
      this._saveExcludedDevices();
      this._renderTab();
    });
    if (deselectAll) deselectAll.addEventListener('click', () => {
      root.querySelectorAll('.device-toggle input[type="checkbox"]').forEach(cb => {
        this._excludedDevices.add(cb.dataset.key);
      });
      this._saveExcludedDevices();
      this._renderTab();
    });
  }

  _saveExcludedDevices() {
    const list = [...this._excludedDevices].join(',');
    this._saveToHelper('excluded', list);
  }

  _attachScheduleEvents() {
    const root = this.shadowRoot;
    const btnSmtpTest = root.getElementById('btn-smtp-test');
    if (btnSmtpTest) { btnSmtpTest.addEventListener('click', () => this._testSmtp()); }
    // Time inputs — save on change
    const timeInputs = [
      ['time-daily', 'daily_time', 'daily'],
      ['time-weekly', 'weekly_time', 'weekly_time'],
      ['time-monthly', 'monthly_time', 'monthly_time'],
    ];
    timeInputs.forEach(([id, helperKey, schedKey]) => {
      const input = root.getElementById(id);
      if (input) input.addEventListener('change', () => {
        this._scheduleDefaults[schedKey] = input.value;
        this._saveToHelper(helperKey, input.value);
        this._showToast('\u2705 ' + (this._lang === 'pl' ? 'Godzina zapisana' : 'Time saved'));
      });
    });
    const daySelect = root.getElementById('day-weekly');
    if (daySelect) daySelect.addEventListener('change', () => {
      this._scheduleDefaults.weekly_day = daySelect.value;
      this._saveToHelper('weekly_day', daySelect.value);
      this._showToast('\u2705 ' + (this._lang === 'pl' ? 'Dzie\u0144 zapisany' : 'Day saved'));
    });
    // Enable/disable existing automations
    const ids = [['enable-daily','disable-daily','automation.send_daily_energy_report'],['enable-weekly','disable-weekly','automation.send_weekly_energy_report'],['enable-monthly','disable-monthly','automation.send_monthly_energy_report']];
    ids.forEach(([en,dis,eid]) => {
      const eBtn = root.getElementById(en); const dBtn = root.getElementById(dis);
      if (eBtn) eBtn.addEventListener('click', () => this._toggleAuto(eid, true));
      if (dBtn) dBtn.addEventListener('click', () => this._toggleAuto(eid, false));
    });
    // Create automation buttons
    const createBtns = [
      ['create-daily', 'daily'],
      ['create-weekly', 'weekly'],
      ['create-monthly', 'monthly'],
    ];
    createBtns.forEach(([id, type]) => {
      const btn = root.getElementById(id);
      if (btn) btn.addEventListener('click', () => this._createAutomation(type));
    });
    // Update automation buttons
    const updateBtns = [
      ['update-create-daily', 'daily'],
      ['update-create-weekly', 'weekly'],
      ['update-create-monthly', 'monthly'],
    ];
    updateBtns.forEach(([id, type]) => {
      const btn = root.getElementById(id);
      if (btn) btn.addEventListener('click', () => this._createAutomation(type, true));
    });
  }

  // --- Automation creation ---

  async _createAutomation(type, update = false) {
    if (!this._hass) return;
    const recipient = this._getRecipient();
    if (!this._hasHaToolsEmail()) { this._showToast('\u274C ' + (this._lang === 'pl' ? 'ha_tools_email nie zainstalowany' : 'ha_tools_email not installed')); return; }
    if (!recipient) { this._showToast('\u274C ' + (this._lang === 'pl' ? 'Najpierw ustaw adres email' : 'Set email address first')); return; }
    const sd = this._scheduleDefaults;
    const L = this._lang === 'pl';
    const [dailyH, dailyM] = sd.daily.split(':').map(Number);
    const [weeklyH, weeklyM] = sd.weekly_time.split(':').map(Number);
    const [monthlyH, monthlyM] = sd.monthly_time.split(':').map(Number);
    const dayMap = { mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 0 };
    const configs = {
      daily: {
        alias: 'Send Daily Energy Report',
        id: 'send_daily_energy_report',
        trigger: [{ platform: 'time', at: `${String(dailyH).padStart(2,'0')}:${String(dailyM).padStart(2,'0')}:00` }],
        description: 'Auto-created by HA Energy Email card'
      },
      weekly: {
        alias: 'Send Weekly Energy Report',
        id: 'send_weekly_energy_report',
        trigger: [{ platform: 'time', at: `${String(weeklyH).padStart(2,'0')}:${String(weeklyM).padStart(2,'0')}:00` }],
        condition: [{ condition: 'time', weekday: [['sun','mon','tue','wed','thu','fri','sat'][dayMap[sd.weekly_day] || 1]] }],
        description: 'Auto-created by HA Energy Email card'
      },
      monthly: {
        alias: 'Send Monthly Energy Report',
        id: 'send_monthly_energy_report',
        trigger: [{ platform: 'time', at: `${String(monthlyH).padStart(2,'0')}:${String(monthlyM).padStart(2,'0')}:00` }],
        condition: [{ condition: 'template', value_template: '{{ now().day == 1 }}' }],
        description: 'Auto-created by HA Energy Email card'
      }
    };
    const cfg = configs[type];
    if (!cfg) return;
    // Build email with actual sensor data via Jinja templates
    const price = this._getAvgRate();
    const currency = this._config.currency || 'PLN';
    const typeName = type.charAt(0).toUpperCase() + type.slice(1);
    const periodMap = { daily: 'day', weekly: 'week', monthly: 'month' };
    const periodKey = periodMap[type] || 'day';
    // Get sensor list: prefer period-specific sensors, fallback to total
    let sensorList = [];
    const periodData = this._getAutoDataForPeriod(periodKey);
    if (periodData && periodData.length > 0) {
      sensorList = periodData.map(d => ({ name: d.name, entity: d.entity_id }));
    } else {
      const autoDevs = this._discoveredDevices || [];
      const manualDevs = this._devices();
      if (manualDevs.length > 0) {
        const sensorKey = type === 'daily' ? 'energy_day' : type === 'weekly' ? 'energy_week' : 'energy_month';
        sensorList = manualDevs.map(d => ({ name: d.name, entity: d[sensorKey] || d.energy_week || d.energy_month })).filter(d => d.entity);
      } else {
        sensorList = autoDevs.map(d => ({ name: d.name, entity: d.entity_id }));
      }
    }
    // Build Jinja template for the email body
    const sensorLines = sensorList.map(s =>
      `{{ '${s.name}' }}: {{ states('${s.entity}') | float(0) | round(2) }} kWh = {{ (states('${s.entity}') | float(0) * ${price}) | round(2) }} ${currency}`
    ).join('\\n');
    const totalExpr = sensorList.map(s => `states('${s.entity}') | float(0)`).join(' + ');
    const totalCostExpr = `(${totalExpr}) * ${price}`;
    const periodLabel = type === 'daily' ? (L ? 'Wczoraj / ostatnie 24h' : 'Yesterday / Last 24h')
      : type === 'weekly' ? (L ? 'Ostatnie 7 dni' : 'Last 7 days')
      : (L ? 'Ostatni miesi\u0105c' : 'Last month');
    const emailMsg = [
      `\u26A1 Energy ${typeName} Report`,
      `{{ now().strftime('%Y-%m-%d %H:%M') }}`,
      `${L ? 'Okres' : 'Period'}: ${periodLabel}`,
      `${L ? 'Urz\u0105dze\u0144' : 'Devices'}: ${sensorList.length}`,
      ``,
      `${L ? '\u0141\u0105cznie' : 'Total'}: {{ (${totalExpr}) | round(2) }} kWh = {{ (${totalCostExpr}) | round(2) }} ${currency}`,
      ``,
      `${L ? 'Szczeg\u00F3\u0142y' : 'Details'}:`,
      sensorLines,
      ``,
      `---`,
      `Generated by HA Energy Email card | ${this._getTariffLabel()}`
    ].join('\\n');
    const action = [{
      service: 'ha_tools_email.send',
      data: {
        subject: `\u26A1 Energy ${typeName} Report \u2013 {{ now().strftime('%Y-%m-%d') }}`,
        body: emailMsg,
        to: recipient
      }
    }];
    try {
      if (update) {
        // Delete old automation first, then create new
        try { await this._hass.callService('automation', 'turn_off', { entity_id: `automation.${cfg.id}` }); } catch(e) { console.debug('[ha-energy-email] caught:', e); }
      }
      await this._hass.callWS({
        type: 'config/automation/config',
        automation_id: cfg.id,
        ...cfg,
        action: action,
        mode: 'single'
      });
      this._showToast(`\u2705 ${update ? (L ? 'Automatyzacja zaktualizowana' : 'Automation updated') : (L ? 'Automatyzacja utworzona' : 'Automation created')}!`);
      // Wait for HA to register the automation, then refresh
      setTimeout(() => this._renderTab(), 2000);
    } catch (e) {
      this._showToast('\u274C Error: ' + (e.message || 'Failed to create automation'));
    }
  }

  // --- HA service calls ---

  async _toggleAuto(entity_id, enable) {
    if (!this._hass) return;
    try {
      await this._hass.callService('automation', enable ? 'turn_on' : 'turn_off', { entity_id });
      this._showToast(`\u2705 Automation ${enable ? 'enabled' : 'disabled'}`);
      setTimeout(() => this._renderTab(), 800);
    } catch (e) { this._showToast('\u274C Error: ' + (e.message || 'Unknown error')); }
  }

  async _sendReport(type) {
    if (!this._hass || this._sending) return;
    this._sending = true;
    this._renderTab(); this._attachSendEvents();
    const L = this._lang === 'pl';
    const recipient = this._getRecipient();
    const price = this._getAvgRate();
    const currency = this._config.currency || 'PLN';
    const dateStr = new Date().toISOString().split('T')[0];
    const nowStr = new Date().toLocaleString((this._lang === 'pl' ? 'pl-PL' : 'en-US'), { hour12: false });
    try {
      if (!this._hasHaToolsEmail()) throw new Error(L ? 'Integracja HA Tools Email nie jest zainstalowana. Zainstaluj j\u0105 z HACS i ustaw SMTP w Konfiguruj.' : 'The HA Tools Email integration is not installed. Install it from HACS and set up SMTP in Configure.');
      // Get device data — fetch from recorder for period reports
      const periodMap = { daily: 'day', weekly: 'week', monthly: 'month', quick: 'week' };
      const periodKey = periodMap[type] || 'week';
      const periodLabels = {
        daily: L ? 'Ostatnie 24h' : 'Last 24 hours',
        weekly: L ? 'Ostatnie 7 dni' : 'Last 7 days',
        monthly: L ? 'Ostatnie 30 dni' : 'Last 30 days',
        quick: L ? 'Podsumowanie' : 'Summary'
      };
      // Fetch fresh recorder stats
      await this._fetchRecorderStats(periodKey);
      let devices = [];
      const cached = this[`_periodCache_${periodKey}`];
      if (cached && cached.length > 0) {
        devices = this._filterExcluded(cached).sort((a, b) => b.month - a.month);
      } else {
        // Fallback to total data
        const auto = this._discoveredDevices || [];
        const manual = this._devices();
        if (manual.length > 0) {
          devices = manual.map(d => ({ name: d.name, month: this._float(this._state(d.energy_month || d.energy_week, '0')), cost: this._float(this._state(d.cost_month || d.cost_week, '0')) }));
        } else {
          devices = this._filterExcluded(auto.map(d => ({ name: d.name, month: d.value_kwh, cost: d.value_kwh * price }))).sort((a, b) => b.month - a.month);
        }
      }
      if (devices.length === 0) throw new Error(L ? 'Brak danych o energii' : 'No energy data available');
      const totalKwh = devices.reduce((s, d) => s + (d.month || 0), 0);
      const totalCost = devices.reduce((s, d) => s + (d.cost || d.month * price), 0);
      const topDevice = devices[0];
      // Build HTML email
      const typeName = { daily: L ? 'Dzienny' : 'Daily', weekly: L ? 'Tygodniowy' : 'Weekly', monthly: L ? 'Miesi\u0119czny' : 'Monthly', quick: L ? 'Podsumowanie' : 'Summary' }[type] || type;
      const deviceRows = devices.map((d, i) => {
        const kwh = (d.month || 0).toFixed(2);
        const cost = (d.cost || d.month * price).toFixed(2);
        const pct = totalKwh > 0 ? ((d.month / totalKwh) * 100).toFixed(0) : 0;
        const bg = i % 2 === 0 ? '#f8fafc' : '#ffffff';
        return `<tr style="background:${bg}"><td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;font-size:14px">${d.name}</td><td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:600">${kwh}</td><td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;text-align:right">${cost}</td><td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;text-align:right;color:#64748b">${pct}%</td></tr>`;
      }).join('');
      const html = `<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0">
        <div style="background:linear-gradient(135deg,#1e40af,#3b82f6);padding:24px 28px;color:#fff">
          <h1 style="margin:0;font-size:22px;font-weight:700">\u26A1 ${L ? 'Raport energii' : 'Energy Report'} \u2014 ${typeName}</h1>
          <p style="margin:6px 0 0;opacity:.85;font-size:14px">${dateStr} \u2022 ${periodLabels[type]} \u2022 ${devices.length} ${L ? 'urz.' : 'dev.'}</p>
        </div>
        <div style="padding:20px 28px">
          <div style="display:flex;gap:16px;margin-bottom:20px">
            <div style="flex:1;background:#fef3c7;border-radius:10px;padding:16px;text-align:center">
              <div style="font-size:28px;font-weight:700;color:#d97706">${totalKwh.toFixed(1)}</div>
              <div style="font-size:12px;color:#92400e;margin-top:2px">kWh</div>
            </div>
            <div style="flex:1;background:#dbeafe;border-radius:10px;padding:16px;text-align:center">
              <div style="font-size:28px;font-weight:700;color:#1d4ed8">${totalCost.toFixed(2)}</div>
              <div style="font-size:12px;color:#1e40af;margin-top:2px">${currency}</div>
            </div>
            <div style="flex:1;background:#d1fae5;border-radius:10px;padding:16px;text-align:center">
              <div style="font-size:16px;font-weight:700;color:#047857">${topDevice ? topDevice.name.split(' ').slice(0,2).join(' ') : '-'}</div>
              <div style="font-size:12px;color:#065f46;margin-top:2px">${L ? 'Top' : 'Top'}: ${topDevice ? topDevice.month.toFixed(1) : 0} kWh</div>
            </div>
          </div>
          <table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0">
            <thead><tr style="background:#f1f5f9">
              <th style="padding:10px 14px;text-align:left;font-size:12px;text-transform:uppercase;color:#64748b;letter-spacing:.5px">${L ? 'Urz\u0105dzenie' : 'Device'}</th>
              <th style="padding:10px 14px;text-align:right;font-size:12px;text-transform:uppercase;color:#64748b;letter-spacing:.5px">kWh</th>
              <th style="padding:10px 14px;text-align:right;font-size:12px;text-transform:uppercase;color:#64748b;letter-spacing:.5px">${currency}</th>
              <th style="padding:10px 14px;text-align:right;font-size:12px;text-transform:uppercase;color:#64748b;letter-spacing:.5px">%</th>
            </tr></thead>
            <tbody>${deviceRows}
            <tr style="background:#f1f5f9;font-weight:700">
              <td style="padding:12px 14px;font-size:14px">${L ? '\u0141\u0105cznie' : 'Total'}</td>
              <td style="padding:12px 14px;text-align:right">${totalKwh.toFixed(2)}</td>
              <td style="padding:12px 14px;text-align:right">${totalCost.toFixed(2)}</td>
              <td style="padding:12px 14px;text-align:right">100%</td>
            </tr></tbody>
          </table>
          <p style="margin:16px 0 0;font-size:11px;color:#94a3b8;text-align:center">${this._getTariffLabel()} \u2022 HA Energy Email Card</p>
        </div>
      </div>`;
      const title = `\u26A1 ${typeName} ${L ? 'raport energii' : 'Energy Report'} \u2013 ${dateStr}`;
      const plainText = `${typeName} ${L ? 'raport energii' : 'Energy Report'} - ${dateStr}\n${L ? '\u0141\u0105cznie' : 'Total'}: ${totalKwh.toFixed(2)} kWh / ${totalCost.toFixed(2)} ${currency}\n${devices.map(d => `${d.name}: ${(d.month||0).toFixed(2)} kWh`).join('\n')}`;
      // Built-in SMTP via ha_tools_email
      await this._sendViaHaToolsEmail(recipient || '', title, plainText, html);
      this._lastSent[type] = nowStr;
      this._showToast(`\u2705 ${typeName} ${L ? 'wys\u0142any!' : 'sent!'}`);
    } catch (e) { this._showToast('\u274C Error: ' + (e.message || 'Check HA logs')); }
    finally { this._sending = false; this._renderTab(); this._attachSendEvents(); }
  }

  // --- HA Tools Email (built-in SMTP) ---

  _hasHaToolsEmail() {
    return !!this._hass?.services?.ha_tools_email?.send;
  }

  async _sendViaHaToolsEmail(to, subject, body, html) {
    const data = { subject, body };
    if (html) data.html = html;
    if (to) data.to = to;
    await this._hass.callService('ha_tools_email', 'send', data);
  }

  // --- SMTP Configuration via ha_tools_email ---

  _renderSmtpSection() {
    const L = this._lang === 'pl';
    if (this._hasHaToolsEmail()) {
      return `<div class="smtp-section">
        <div class="smtp-header"><div class="smtp-icon">\u2705</div><div>
          <div class="smtp-title">${L ? 'SMTP skonfigurowany (ha_tools_email)' : 'SMTP Configured (ha_tools_email)'}</div>
          <div class="smtp-detail">${L ? 'Zmie\u0144 w' : 'Change in'} <b>${L ? '<a href="/config/integrations/integration/ha_tools_email">Ustawienia \u2192 Urz\u0105dzenia i us\u0142ugi \u2192 HA Tools Email \u2192 Konfiguruj</a>' : '<a href="/config/integrations/integration/ha_tools_email">Settings \u2192 Devices &amp; services \u2192 HA Tools Email \u2192 Configure</a>'}</b></div>
        </div></div>
        <div class="smtp-actions" style="margin-top:12px">
          <button class="btn btn-primary" id="btn-smtp-test">\uD83D\uDCE7 ${L ? 'Wy\u015Blij testowy email' : 'Send Test Email'}</button>
        </div>
      </div>`;
    }
    return `<div class="smtp-section smtp-missing">
      <div class="smtp-header"><div class="smtp-icon">\u26A0\uFE0F</div><div>
        <div class="smtp-title">${L ? 'SMTP nie skonfigurowany' : 'SMTP Not Configured'}</div>
        <div class="smtp-detail">${L ? 'Otw\u00F3rz' : 'Open'} <b>${L ? '<a href="/config/integrations/integration/ha_tools_email">Ustawienia \u2192 Urz\u0105dzenia i us\u0142ugi \u2192 HA Tools Email \u2192 Konfiguruj</a>' : '<a href="/config/integrations/integration/ha_tools_email">Settings \u2192 Devices &amp; services \u2192 HA Tools Email \u2192 Configure</a>'}</b></div>
      </div></div>
    </div>`;
  }

  async _testSmtp() {
    if (!this._hasHaToolsEmail()) { this._showToast('\u274C ' + (this._lang === 'pl' ? 'ha_tools_email nie zainstalowany' : 'ha_tools_email not installed')); return; }
    try {
      await this._hass.callService('ha_tools_email', 'test', {});
      this._showToast('\u2705 ' + (this._lang === 'pl' ? 'Testowy email wysy\u0142any!' : 'Test email sent!'));
    } catch (e) { this._showToast('\u274C SMTP test failed: ' + (e.message || 'Check HA logs')); }
  }

  _showToast(msg) {
    const toast = this.shadowRoot.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3500);
  }

  disconnectedCallback() {
    // Cleanup any active event listeners or timers
  }

  setActiveTab(tabId) {
    this._activeTab = tabId;
    this._render();
  }
}

if (!customElements.get('ha-energy-email')) customElements.define('ha-energy-email', HAEnergyEmail);
class HaEnergyEmailEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
  }
  setConfig(config) {
    this._config = { ...config };
    this._render();
  }
  _dispatch() {
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this._config }, bubbles: true, composed: true }));
  }
  _render() {
    this.shadowRoot.innerHTML = `
      <style>
            :host { display:block; padding:16px; }
            h3 { margin:0 0 16px; font-size:15px; font-weight:600; color:var(--bento-text, var(--primary-text-color,#1e293b)); }
            input { outline:none; transition:border-color .2s; }
            input:focus { border-color:var(--bento-primary, var(--primary-color,#3b82f6)); }
        </style>
      <h3>Energy Email Reports</h3>
            <div style="margin-bottom:12px;">
              <label style="display:block;font-weight:500;margin-bottom:4px;font-size:13px;">Title</label>
              <input type="text" id="cf_title" value="${_esc(this._config?.title || 'Energy Email Reports')}"
                style="width:100%;padding:8px 12px;border:1px solid var(--divider-color,#e2e8f0);border-radius:8px;background:var(--card-background-color,#fff);color:var(--primary-text-color,#1e293b);font-size:14px;box-sizing:border-box;">
            </div>
            </div>
            <div style="margin-bottom:12px;">
              <label style="display:block;font-weight:500;margin-bottom:4px;font-size:13px;">Currency</label>
              <input type="text" id="cf_currency" value="${_esc(this._config?.currency || 'PLN')}"
                style="width:100%;padding:8px 12px;border:1px solid var(--divider-color,#e2e8f0);border-radius:8px;background:var(--card-background-color,#fff);color:var(--primary-text-color,#1e293b);font-size:14px;box-sizing:border-box;">
            </div>
            <div style="margin-bottom:12px;">
              <label style="display:block;font-weight:500;margin-bottom:4px;font-size:13px;">Energy price</label>
              <input type="text" id="cf_energy_price" value="${_esc(this._config?.energy_price || '0.65')}"
                style="width:100%;padding:8px 12px;border:1px solid var(--divider-color,#e2e8f0);border-radius:8px;background:var(--card-background-color,#fff);color:var(--primary-text-color,#1e293b);font-size:14px;box-sizing:border-box;">
            </div>
    `;
        const f_title = this.shadowRoot.querySelector('#cf_title');
        if (f_title) f_title.addEventListener('input', (e) => {
          this._config = { ...this._config, title: e.target.value };
          this._dispatch();
        });
        const f_currency = this.shadowRoot.querySelector('#cf_currency');
        if (f_currency) f_currency.addEventListener('input', (e) => {
          this._config = { ...this._config, currency: e.target.value };
          this._dispatch();
        });
        const f_energy_price = this.shadowRoot.querySelector('#cf_energy_price');
        if (f_energy_price) f_energy_price.addEventListener('input', (e) => {
          this._config = { ...this._config, energy_price: e.target.value };
          this._dispatch();
        });
  }
  connectedCallback() { this._render(); }
}
if (!customElements.get('ha-energy-email-editor')) { customElements.define('ha-energy-email-editor', HaEnergyEmailEditor); }

})();

window.customCards = window.customCards || [];
window.customCards.push({ type: 'ha-energy-email', name: 'Energy Email Reports', description: 'Send energy reports via email. Auto-discovers energy sensors.', preview: true });
/* HA Tools split — ha-log-email v4.4.0 (2026-09-24) — single-tool standalone repo */
(function() {
'use strict';

const _esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);

// Component-local persistence retains this card's existing localStorage keys.
const haToolsPersistence = { _cache: {}, _hass: null, setHass(h) { this._hass = h; }, async save(k, d) { try { localStorage.setItem('ha-log-email-' + k, JSON.stringify(d)); } catch(e) { console.debug('[ha-log-email] caught:', e); } }, async load(k) { try { const r = localStorage.getItem('ha-log-email-' + k); return r ? JSON.parse(r) : null; } catch(e) { return null; } }, loadSync(k) { try { const r = localStorage.getItem('ha-log-email-' + k); return r ? JSON.parse(r) : null; } catch(e) { return null; } } };
const OWN_SUPPORT_FOOTER = `<div class="donate-section" data-source="own-card"><div class="donate-text"><h3>❤️ Support HA Tools Development</h3><p>If this tool makes your Home Assistant life easier, consider supporting the project.</p></div><div class="donate-buttons"><a class="donate-btn coffee" href="https://buymeacoffee.com/macsiem" target="_blank" rel="noopener noreferrer">☕ Buy Me a Coffee</a><a class="donate-btn paypal" href="https://www.paypal.com/donate/?hosted_button_id=Y967H4PLRBN8W" target="_blank" rel="noopener noreferrer">💳 PayPal</a></div></div>`;

/**
 * HA Log Email Card v4.4.0
 * Send periodic email summaries of HA errors and warnings.
 * Part of HA Tools Panel - Smart Reports
 * Author: Jeff (AI) for MacSiem
 */

/* ===== HA Tools split — inline shared infrastructure ===== */
// Component-local Bento CSS: independent of card load order.
const LOCAL_BENTO_CSS = `
/* ═══════════════════════════════════════════════
   HA Tools — Bento Design System v2.0 (Premium)
   ═══════════════════════════════════════════════ */

/* keyboard a11y */
:focus-visible { outline: 2px solid var(--bento-primary, #6366f1); outline-offset: 2px; border-radius: 3px; }

:host {
  /* Brand palette — diamond top, gradient-friendly */
  --bento-primary: #6366f1;
  --bento-primary-2: #8b5cf6;
  --bento-primary-3: #ec4899;
  --bento-primary-hover: #4f46e5;
  --bento-primary-light: rgba(99, 102, 241, 0.08);
  --bento-primary-glow: rgba(99, 102, 241, 0.35);
  --bento-success: #10B981;
  --bento-success-light: rgba(16, 185, 129, 0.10);
  --bento-success-border: rgba(16, 185, 129, 0.25);
  --bento-error: #EF4444;
  --bento-error-light: rgba(239, 68, 68, 0.10);
  --bento-error-border: rgba(239, 68, 68, 0.25);
  --bento-warning: #F59E0B;
  --bento-warning-light: rgba(245, 158, 11, 0.10);
  --bento-warning-border: rgba(245, 158, 11, 0.25);
  --bento-info: #06b6d4;
  --bento-info-light: rgba(6, 182, 212, 0.10);
  --bento-info-border: rgba(6, 182, 212, 0.25);

  /* Theme */
  --bento-bg:     var(--primary-background-color, #fafaf9);
  --bento-bg-2:   var(--card-background-color, #f5f5f4);
  --bento-card:   var(--card-background-color, #ffffff);
  --bento-glass:  rgba(255, 255, 255, 0.7);
  --bento-border: var(--divider-color, #e7e5e4);
  --bento-border-strong: rgba(0, 0, 0, 0.08);
  --bento-text:           var(--primary-text-color,   #0c0a09);
  --bento-text-secondary: var(--secondary-text-color, #57534e);
  --bento-text-muted:     var(--disabled-text-color,  #a8a29e);

  /* Radii */
  --bento-radius-xs: 8px;
  --bento-radius-sm: 12px;
  --bento-radius-md: 18px;
  --bento-radius-lg: 24px;
  --bento-radius-pill: 999px;

  /* Shadows — modern, layered */
  --bento-shadow-sm: 0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.02);
  --bento-shadow-md: 0 4px 12px rgba(0,0,0,0.05), 0 2px 6px rgba(0,0,0,0.03);
  --bento-shadow-lg: 0 24px 48px -12px rgba(0,0,0,0.10), 0 12px 24px -8px rgba(0,0,0,0.05);
  --bento-shadow-glow: 0 0 0 1px rgba(99,102,241,0.15), 0 8px 32px -8px rgba(99,102,241,0.25);

  /* Gradients */
  --bento-grad-primary: linear-gradient(135deg, #6366f1, #8b5cf6);
  --bento-grad-rainbow: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%);
  --bento-grad-success: linear-gradient(135deg, #10b981, #34d399);
  --bento-grad-error:   linear-gradient(135deg, #ef4444, #f87171);
  --bento-grad-warning: linear-gradient(135deg, #f59e0b, #fbbf24);

  /* Motion */
  --bento-trans-fast: 0.15s cubic-bezier(0.4, 0, 0.2, 1);
  --bento-trans:      0.25s cubic-bezier(0.4, 0, 0.2, 1);
  --bento-trans-slow: 0.4s cubic-bezier(0.4, 0, 0.2, 1);

  /* Typography */
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", system-ui, sans-serif;
  font-feature-settings: "cv11" 1, "ss01" 1;
  letter-spacing: -0.01em;
  display: block;
  color: var(--bento-text);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* ── Dark mode ───────────────────────────────── */
:host(.bento-dark) {
    --bento-bg:     var(--primary-background-color, #0a0a0f);
    --bento-bg-2:   var(--card-background-color,    #111119);
    --bento-card:   var(--card-background-color,    #16161f);
    --bento-glass:  rgba(22, 22, 31, 0.7);
    --bento-border: var(--divider-color,            #27272f);
    --bento-border-strong: rgba(255, 255, 255, 0.08);
    --bento-text:           var(--primary-text-color,   #fafaf9);
    --bento-text-secondary: var(--secondary-text-color, #d6d3d1);
    --bento-text-muted:     var(--disabled-text-color,  #78716c);
    --bento-primary:        #818cf8;
    --bento-primary-2:      #a78bfa;
    --bento-primary-3:      #f472b6;
    --bento-primary-light:  rgba(129, 140, 248, 0.12);
    --bento-primary-glow:   rgba(129, 140, 248, 0.45);
    --bento-success: #34d399;
    --bento-success-light:  rgba(52, 211, 153, 0.12);
    --bento-success-border: rgba(52, 211, 153, 0.30);
    --bento-error:   #f87171;
    --bento-error-light:    rgba(248, 113, 113, 0.12);
    --bento-error-border:   rgba(248, 113, 113, 0.30);
    --bento-warning: #fbbf24;
    --bento-warning-light:  rgba(251, 191, 36, 0.12);
    --bento-warning-border: rgba(251, 191, 36, 0.30);
    --bento-info:    #22d3ee;
    --bento-info-light:     rgba(34, 211, 238, 0.12);
    --bento-info-border:    rgba(34, 211, 238, 0.30);
    --bento-shadow-sm: 0 1px 2px rgba(0,0,0,0.4);
    --bento-shadow-md: 0 4px 12px rgba(0,0,0,0.4), 0 2px 6px rgba(0,0,0,0.2);
    --bento-shadow-lg: 0 24px 48px -12px rgba(0,0,0,0.6), 0 12px 24px -8px rgba(0,0,0,0.3);
    --bento-shadow-glow: 0 0 0 1px rgba(129,140,248,0.2), 0 8px 32px -8px rgba(129,140,248,0.5);
    --bento-grad-primary: linear-gradient(135deg, #818cf8, #a78bfa);
    --bento-grad-rainbow: linear-gradient(135deg, #818cf8, #a78bfa 50%, #f472b6);
    color-scheme: dark !important;
  }
:host(.bento-dark) .card, :host(.bento-dark) .card-container, :host(.bento-dark) .main-card, :host(.bento-dark) .panel-card {
    background: var(--bento-card) !important; color: var(--bento-text) !important; border-color: var(--bento-border) !important;
  }
:host(.bento-dark) input, :host(.bento-dark) select, :host(.bento-dark) textarea { background: var(--bento-bg-2); color: var(--bento-text); border-color: var(--bento-border); }
:host(.bento-dark) table th { background: var(--bento-bg-2); color: var(--bento-text-secondary); border-color: var(--bento-border); }
:host(.bento-dark) table td { color: var(--bento-text); border-color: var(--bento-border); }
:host(.bento-dark) pre, :host(.bento-dark) code { background: #1e1e2e !important; color: #e2e8f0 !important; }

/* ── Reset & motion preferences ──────────────── */
* { box-sizing: border-box; }
@media (prefers-reduced-motion: reduce) { * { animation-duration: 0s !important; transition-duration: 0s !important; } }

/* ── Main Card Wrapper ───────────────────────── */
.card {
  background: var(--bento-card);
  border: 1px solid var(--bento-border);
  border-radius: var(--bento-radius-md);
  box-shadow: var(--bento-shadow-md);
  color: var(--bento-text);
  font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif;
  position: relative;
  transition: box-shadow var(--bento-trans), border-color var(--bento-trans);
}

/* ── Header ──────────────────────────────────── */
.header {
  padding: 20px 24px 0;
  display: flex; align-items: center; gap: 12px;
}
.header-icon { font-size: 24px; }
.header-title {
  font-size: 18px; font-weight: 700; letter-spacing: -0.02em;
  color: var(--bento-text);
}
.header-badge {
  margin-left: auto;
  background: var(--bento-grad-primary); color: #fff;
  font-size: 11px; padding: 4px 10px; border-radius: var(--bento-radius-pill);
  font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;
  box-shadow: 0 4px 14px -2px var(--bento-primary-glow);
}
.content { padding: 20px 24px 24px; }

/* ── Tabs (modern pill style) ────────────────── */
.tabs, .tab-bar, .tab-nav, .tab-header {
  display: flex !important; gap: 4px !important;
  padding: 4px !important;
  background: var(--bento-bg-2) !important;
  border-radius: var(--bento-radius-pill) !important;
  margin-bottom: 20px !important;
  overflow: visible !important;
  -webkit-overflow-scrolling: touch !important;
  flex-wrap: wrap !important; border-bottom: 0 !important;
  width: 100%; max-width: 100%; box-sizing: border-box;
}
.tab, .tab-btn, .tab-button, .dtab {
  padding: 8px 16px !important;
  border: none !important; background: transparent !important; cursor: pointer !important;
  font-size: 13px !important; font-weight: 600 !important;
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, system-ui, sans-serif !important;
  color: var(--bento-text-secondary) !important;
  border-radius: var(--bento-radius-pill) !important;
  margin-bottom: 0 !important;
  transition: all var(--bento-trans) !important;
  white-space: nowrap !important; flex: 1 1 auto !important; text-align: center !important; min-height: 40px !important;
  letter-spacing: -0.005em !important;
}
.tab:hover, .tab-btn:hover, .tab-button:hover, .dtab:hover {
  color: var(--bento-text) !important;
  background: var(--bento-card) !important;
}
.tab.active, .tab-btn.active, .tab-button.active, .dtab.active {
  background: var(--bento-card) !important;
  color: var(--bento-primary) !important;
  box-shadow: var(--bento-shadow-sm) !important;
  font-weight: 700 !important;
}
.tab-content { display: block; }
.tab-content.active { animation: bentoFadeIn 0.35s cubic-bezier(0.4, 0, 0.2, 1); }
@keyframes bentoFadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ── Stat / KPI cards (premium) ──────────────── */
.stat-card, .stat-item, .metric-card, .kpi-card {
  background: var(--bento-bg-2) !important;
  border: 1px solid var(--bento-border) !important;
  border-radius: var(--bento-radius-sm) !important;
  padding: 18px !important;
  text-align: left !important;
  transition: transform var(--bento-trans), box-shadow var(--bento-trans), border-color var(--bento-trans);
  position: relative; overflow: hidden;
}
.stat-card::before, .metric-card::before, .kpi-card::before {
  content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
  background: var(--bento-grad-primary);
  opacity: 0; transition: opacity var(--bento-trans);
}
.stat-card:hover, .stat-item:hover, .metric-card:hover, .kpi-card:hover {
  transform: translateY(-2px); box-shadow: var(--bento-shadow-lg); border-color: var(--bento-primary-light);
}
.stat-card:hover::before, .metric-card:hover::before, .kpi-card:hover::before { opacity: 1; }
.stat-icon { font-size: 22px; margin-bottom: 6px; opacity: 0.85; }
.stat-value, .stat-val, .metric-value, .kpi-val {
  font-size: 26px; font-weight: 800; line-height: 1.1;
  letter-spacing: -0.02em; color: var(--bento-text);
  font-feature-settings: "tnum" 1;
}
.stat-label, .stat-lbl, .metric-label, .kpi-lbl {
  font-size: 11px; color: var(--bento-text-secondary);
  margin-top: 4px; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600;
}
.stat-num {
  font-size: 24px; font-weight: 800; color: var(--bento-primary);
  font-feature-settings: "tnum" 1; letter-spacing: -0.02em;
}
.stat-sub { font-size: 12px; color: var(--bento-text-muted); font-weight: 500; }

/* ── Overview grid ───────────────────────────── */
.overview-grid, .stats-grid, .summary-grid, .stat-cards, .kpi-grid, .metrics-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px; margin-bottom: 20px;
}

/* ── Section headers ─────────────────────────── */
.section-header, .section-title {
  display: flex; align-items: center; justify-content: space-between;
  position: relative; padding-left: 12px;
  font-size: 12px; font-weight: 700; color: var(--bento-text-secondary);
  text-transform: uppercase; letter-spacing: 0.08em;
  margin: 16px 0 10px;
}
.section-header::before, .section-title::before {
  content: ""; width: 4px; height: 4px; border-radius: 50%; background: var(--bento-primary);
  position: absolute; left: 0; top: 50%; transform: translateY(-50%); flex-shrink: 0;
}

/* ── Loading / Empty / Info ──────────────────── */
.loading-bar {
  height: 3px; border-radius: var(--bento-radius-pill);
  background: linear-gradient(90deg, var(--bento-primary), var(--bento-primary-2), transparent);
  background-size: 200% 100%;
  animation: bentoLoad 1.5s linear infinite; margin-bottom: 12px;
}
@keyframes bentoLoad { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.empty-state, .no-data, .no-results {
  text-align: center; color: var(--bento-text-secondary);
  padding: 40px 20px; font-size: 14px;
  background: var(--bento-bg-2); border-radius: var(--bento-radius-md);
  border: 1px dashed var(--bento-border);
}
.info-note, .tip-box {
  font-size: 13px; color: var(--bento-text-secondary);
  background: var(--bento-primary-light);
  border-radius: var(--bento-radius-sm); padding: 12px 14px;
  border-left: 3px solid var(--bento-primary); margin-top: 12px;
  line-height: 1.55;
}
.last-updated {
  font-size: 11px; color: var(--bento-text-muted);
  text-align: right; margin-top: 12px; font-feature-settings: "tnum" 1;
}

/* ── Buttons (premium) ───────────────────────── */
.refresh-btn {
  background: var(--bento-bg-2); border: 1px solid var(--bento-border);
  border-radius: var(--bento-radius-pill); padding: 6px 14px;
  font-size: 12px; color: var(--bento-text-secondary);
  cursor: pointer; font-weight: 600; transition: all var(--bento-trans);
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, system-ui, sans-serif;
}
.refresh-btn:hover {
  background: var(--bento-card); color: var(--bento-primary);
  border-color: var(--bento-primary); transform: translateY(-1px);
  box-shadow: var(--bento-shadow-sm);
}
.toggle-btn, .action-btn {
  background: var(--bento-grad-primary); border: none;
  border-radius: var(--bento-radius-xs); padding: 8px 16px;
  font-size: 13px; color: #fff; cursor: pointer; font-weight: 600;
  transition: all var(--bento-trans); font-family: "Inter", -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, system-ui, sans-serif;
  letter-spacing: -0.005em;
  box-shadow: 0 4px 12px -2px var(--bento-primary-glow);
}
.toggle-btn:hover, .action-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px -4px var(--bento-primary-glow);
}
.send-btn, .btn-primary {
  width: 100%;
  background: var(--bento-grad-primary); color: #fff;
  border: none; border-radius: var(--bento-radius-sm);
  padding: 12px 20px; font-size: 14px; font-weight: 700;
  cursor: pointer; font-family: "Inter", -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, system-ui, sans-serif;
  letter-spacing: -0.01em;
  transition: all var(--bento-trans);
  box-shadow: 0 4px 14px -2px var(--bento-primary-glow);
}
.send-btn:hover, .btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px -6px var(--bento-primary-glow);
}
.send-btn:active, .btn-primary:active { transform: translateY(0); }
.send-btn:disabled, .btn-primary:disabled {
  opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none;
}

/* ── Badges / Status (modern pill) ───────────── */
.badge, .status-badge, .tag, .chip {
  padding: 4px 12px; border-radius: var(--bento-radius-pill);
  font-size: 11px; font-weight: 700; display: inline-flex; align-items: center; gap: 5px;
  letter-spacing: 0.04em; text-transform: uppercase;
  border: 1px solid;
}
.badge-ok, .badge-success { background: var(--bento-success-light); color: var(--bento-success); border-color: var(--bento-success-border); }
.badge-er, .badge-error   { background: var(--bento-error-light);   color: var(--bento-error);   border-color: var(--bento-error-border); }
.badge-warn, .badge-warning { background: var(--bento-warning-light); color: var(--bento-warning); border-color: var(--bento-warning-border); }
.badge-info { background: var(--bento-info-light); color: var(--bento-info); border-color: var(--bento-info-border); }

.count-badge {
  font-size: 11px; font-weight: 700; padding: 3px 10px;
  border-radius: var(--bento-radius-pill); display: inline-flex; align-items: center;
  font-feature-settings: "tnum" 1;
}
.error-badge { background: var(--bento-error-light); color: var(--bento-error); border: 1px solid var(--bento-error-border); }
.warn-badge  { background: var(--bento-warning-light); color: var(--bento-warning); border: 1px solid var(--bento-warning-border); }
.info-badge  { background: var(--bento-primary-light); color: var(--bento-primary); border: 1px solid var(--bento-border); }
.ok-badge    { background: var(--bento-success-light); color: var(--bento-success); border: 1px solid var(--bento-success-border); }

/* ── Tables (modern) ─────────────────────────── */
table { width: 100%; border-collapse: separate; border-spacing: 0; }
th {
  background: var(--bento-bg-2); color: var(--bento-text-secondary);
  font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;
  padding: 12px 16px; text-align: left;
  border-bottom: 1px solid var(--bento-border);
}
th:first-child { border-top-left-radius: var(--bento-radius-sm); }
th:last-child  { border-top-right-radius: var(--bento-radius-sm); }
td {
  padding: 14px 16px; border-bottom: 1px solid var(--bento-border);
  color: var(--bento-text); font-size: 13px;
}
tr { transition: background var(--bento-trans-fast); }
tr:hover td { background: var(--bento-primary-light); }
tr:last-child td { border-bottom: 0; }

/* ── Forms / Inputs ──────────────────────────── */
input, select, textarea {
  padding: 10px 14px; border: 1.5px solid var(--bento-border);
  border-radius: var(--bento-radius-xs);
  background: var(--bento-card); color: var(--bento-text);
  font-size: 14px; font-family: "Inter", -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, system-ui, sans-serif;
  transition: all var(--bento-trans); outline: none;
  letter-spacing: -0.005em;
}
input:focus, select:focus, textarea:focus {
  border-color: var(--bento-primary);
  box-shadow: 0 0 0 4px var(--bento-primary-light);
}
input::placeholder, textarea::placeholder { color: var(--bento-text-muted); }

/* ── Code blocks ─────────────────────────────── */
code {
  background: var(--bento-bg-2); padding: 2px 6px;
  border-radius: 4px; font-size: 12px;
  font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
  border: 1px solid var(--bento-border);
}
pre {
  background: #1e1e2e; color: #e2e8f0;
  padding: 16px; border-radius: var(--bento-radius-sm);
  font-size: 12.5px; overflow-x: auto; line-height: 1.65;
  white-space: pre-wrap; word-break: break-word;
  font-family: "JetBrains Mono", ui-monospace, monospace;
  box-shadow: var(--bento-shadow-md);
}

/* ── Grid layouts ────────────────────────────── */
.schedule-grid, .send-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
}
.schedule-card, .send-card, .info-card {
  background: var(--bento-bg-2); border: 1px solid var(--bento-border);
  border-radius: var(--bento-radius-sm); padding: 16px;
  transition: all var(--bento-trans);
}
.schedule-card:hover, .send-card:hover, .info-card:hover {
  border-color: var(--bento-primary-light); transform: translateY(-1px);
  box-shadow: var(--bento-shadow-md);
}

/* ── Log entries ─────────────────────────────── */
.log-entry {
  display: flex; flex-wrap: wrap; align-items: flex-start;
  gap: 4px 8px; padding: 10px 12px;
  border-radius: var(--bento-radius-sm); margin-bottom: 6px;
  font-size: 12.5px; min-width: 0; overflow: hidden;
  border: 1px solid transparent; transition: all var(--bento-trans-fast);
}
.error-entry { background: var(--bento-error-light); border-color: var(--bento-error-border); }
.warn-entry  { background: var(--bento-warning-light); border-color: var(--bento-warning-border); }
.log-time { color: var(--bento-text-muted); font-feature-settings: "tnum" 1; flex-shrink: 0; font-family: "JetBrains Mono", monospace; }
.log-domain {
  font-weight: 700; flex-shrink: 1; min-width: 0; max-width: 100%;
  overflow: hidden; text-overflow: ellipsis; word-break: break-all;
}
.error-domain { color: var(--bento-error); }
.warn-domain  { color: var(--bento-warning); }
.log-msg {
  color: var(--bento-text-secondary); flex-basis: 100%;
  word-break: break-word; overflow-wrap: anywhere;
  white-space: pre-wrap; min-width: 0; line-height: 1.55;
}

/* ── Send status ─────────────────────────────── */
.send-status {
  padding: 12px 16px; border-radius: var(--bento-radius-sm);
  margin-top: 14px; font-size: 13px; font-weight: 600;
  text-align: center; letter-spacing: -0.005em;
  border: 1px solid;
}
.send-status.sending { background: var(--bento-primary-light); color: var(--bento-primary); border-color: var(--bento-border); }
.send-status.success { background: var(--bento-success-light); color: var(--bento-success); border-color: var(--bento-success-border); }
.send-status.error   { background: var(--bento-error-light);   color: var(--bento-error);   border-color: var(--bento-error-border); }

/* ── Scrollbar ───────────────────────────────── */
::-webkit-scrollbar { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--bento-border); border-radius: var(--bento-radius-pill); border: 2px solid transparent; background-clip: content-box; }
::-webkit-scrollbar-thumb:hover { background: var(--bento-text-muted); background-clip: content-box; }

/* ── Animations ──────────────────────────────── */
@keyframes bentoSpin  { to { transform: rotate(360deg); } }
@keyframes bentoPulse { 0%,100% { opacity: 1; } 50% { opacity: .5; } }
@keyframes bentoSlideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes bentoStaggerIn { from { opacity: 0; transform: translateY(12px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }

/* Apply stagger to grids of stat-cards */
.stats-grid > *, .overview-grid > *, .summary-grid > * {
  animation: bentoStaggerIn 0.35s cubic-bezier(0.4, 0, 0.2, 1) both;
}
.stats-grid > *:nth-child(1)  { animation-delay: 0.02s; }
.stats-grid > *:nth-child(2)  { animation-delay: 0.06s; }
.stats-grid > *:nth-child(3)  { animation-delay: 0.10s; }
.stats-grid > *:nth-child(4)  { animation-delay: 0.14s; }
.stats-grid > *:nth-child(5)  { animation-delay: 0.18s; }
.stats-grid > *:nth-child(6)  { animation-delay: 0.22s; }

/* ── Mobile — 768 px ─────────────────────────── */
@media (max-width: 768px) {
  .content { padding: 16px; }
  .header { padding: 16px 16px 0; }
  .tabs { gap: 2px !important; padding: 3px !important; }
  .tab, .tab-button, .tab-btn { padding: 6px 12px !important; font-size: 12px !important; }
  .overview-grid, .stats-grid, .summary-grid, .stat-cards, .kpi-grid, .metrics-grid {
    grid-template-columns: repeat(2, 1fr); gap: 10px;
  }
  .stat-value, .stat-val, .kpi-val, .metric-val { font-size: 22px; }
  .stat-label, .stat-lbl, .kpi-lbl, .metric-lbl { font-size: 10px; }
  .send-grid, .schedule-grid { grid-template-columns: 1fr; }
  .log-entry { flex-wrap: wrap; gap: 2px 6px; padding: 8px 10px; }
  .log-domain { max-width: 60%; font-size: 11.5px; }
  .log-msg { flex-basis: 100%; max-width: 100%; font-size: 11.5px; }
  pre { padding: 12px; font-size: 11.5px; }
  h2 { font-size: 18px; }
  h3 { font-size: 15px; }
  table { font-size: 12.5px; }
  th, td { padding: 10px 12px; }
}
@media (max-width: 480px) {
  .tabs { gap: 1px !important; padding: 2px !important; }
  .tab, .tab-button, .tab-btn { padding: 5px 10px !important; font-size: 11px !important; }
  .overview-grid, .stats-grid, .summary-grid { grid-template-columns: 1fr 1fr; }
  .stat-value, .stat-val, .kpi-val { font-size: 18px; }
}
`;

class HALogEmail extends HTMLElement {
  static getConfigElement() { return document.createElement('ha-log-email-editor'); }
  constructor() {
    super();
    this._toolId = this.tagName.toLowerCase().replace('ha-', '');
    this._lang = (navigator.language || '').startsWith('pl') ? 'pl' : 'en';
    this.attachShadow({ mode: 'open' });
    this._hass = null;
    this._config = {};
    this._centralRecipient = null;
    this._activeTab = 'overview';
    this._tabsScrollLeft = 0;
    this._logData = null;
    this._logHistory = [];
    try { const saved = sessionStorage.getItem('ha-log-email-history'); if (saved) this._logHistory = JSON.parse(saved); } catch(e) { console.debug('[ha-log-email] caught:', e); }
    this._maxHistory = 24;
    this._loading = false;
    this._firstRender = false;
    this._lastFetch = 0;
    this._sendStatus = null;
    // FUNC-2: Real-time error polling
    this._pollingEnabled = false;
    this._pollingTimer = null;
    this._pollingIntervalSec = 60;
    this._lastErrorCount = 0;
    this._lastErrorKeys = new Set();
    try {
      const pollCfg = localStorage.getItem('ha-tools-log-polling');
      if (pollCfg) {
        const p = JSON.parse(pollCfg);
        this._pollingEnabled = !!p.enabled;
        this._pollingIntervalSec = p.interval || 60;
      }
    } catch(e) { console.debug('[ha-log-email] caught:', e); }
  }

  _sanitize(str) {
    if (!str) return str;
    try { return decodeURIComponent(escape(str)); } catch(e) { return str; }
  }
  set hass(hass) {
    try {
      var _bg = (getComputedStyle(this).getPropertyValue('--card-background-color') || getComputedStyle(this).getPropertyValue('--primary-background-color') || '').trim();
      var _d = false;
      if (_bg) {
        var _h, _r, _g, _b, _m;
        if (_bg.charAt(0) === '#') { _h = _bg.slice(1); if (_h.length === 3) _h = _h.replace(/(.)/g, '$1$1'); _r = parseInt(_h.slice(0,2),16); _g = parseInt(_h.slice(2,4),16); _b = parseInt(_h.slice(4,6),16); }
        else { _m = _bg.match(/[\d.]+/g); if (_m) { _r = +_m[0]; _g = +_m[1]; _b = +_m[2]; } }
        if (_r != null) _d = (0.2126*_r + 0.7152*_g + 0.0722*_b) / 255 < 0.5;
      } else if (hass && hass.themes) { _d = !!hass.themes.darkMode; }
      this.classList.toggle('bento-dark', _d);
    } catch (e) {}

    if (hass?.language) this._lang = hass.language.startsWith('pl') ? 'pl' : 'en';    this._hass = hass;
    if (!hass) return;
    if (!this._firstRender) {
      this._firstRender = true;
      this._fetchLogData();
      this._render();
    }
  }

  get _t() {
    const T = {
      pl: {
        title: 'Log Email',
        loading: 'Wczytywanie...',
        noData: 'Brak danych',
        error: 'B\u0142\u0105d',
        send: 'Wy\u015Blij',
        test: 'Test',
        errors: 'B\u0142\u0119dy',
        warnings: 'Ostrze\u017Cenia',
        info: 'Informacje',
        lastFetch: 'Ostatnie pobranie',
        sendEmail: 'Wy\u015Blij email',
        emailSent: 'Email wys\u0142any',
        emailFailed: 'B\u0142\u0105d wysy\u0142ki',
        smtpOk: 'SMTP skonfigurowany',
        smtpFail: 'B\u0142\u0105d SMTP',
        newErrorsNotif: (n) => `\u26A0\uFE0F ${n} nowy(ch) b\u0142\u0119d\u00F3w w system_log`,
        locale: (this._lang === 'pl' ? 'pl-PL' : 'en-US'),
      },
      en: {
        title: 'Log Email',
        loading: 'Loading...',
        noData: 'No data',
        error: 'Error',
        send: 'Send',
        test: 'Test',
        errors: 'Errors',
        warnings: 'Warnings',
        info: 'Info',
        lastFetch: 'Last fetch',
        sendEmail: 'Send email',
        emailSent: 'Email sent',
        emailFailed: 'Email failed',
        smtpOk: 'SMTP configured',
        smtpFail: 'SMTP error',
        newErrorsNotif: (n) => `\u26A0\uFE0F ${n} new error(s) in system_log`,
        locale: 'en-US',
      },
    };
    return T[this._lang] || T.en;
  }

  setConfig(config) {
    this._config = {
      title: config.title || 'Log Email Summary',
      email_recipient: config.email_recipient || '',
      show_errors: config.show_errors !== false,
      show_warnings: config.show_warnings !== false,
      max_entries: config.max_entries || 50,
      ...config
    };
    this._loadCentralRecipient();
  }

  async _loadCentralRecipient() {
    if (!this._hass || !this._hasHaToolsEmail()) return;
    try {
      // get_config is SupportsResponse.ONLY — must pass returnResponse=true
      // (signature: callService(domain, service, data, target, notifyOnError, returnResponse))
      // and read the payload from result.response.
      const resp = await this._hass.callService('ha_tools_email', 'get_config', {}, undefined, false, true);
      if (resp?.response?.default_recipient && !this._config.email_recipient) {
        this._centralRecipient = resp.response.default_recipient;
        this._render();
      }
    } catch(e) { /* ignore if service not available */ }
  }

  getCardSize() { return 5; }

  getGridOptions() { return { rows: 6, columns: 12, min_rows: 3, min_columns: 6 }; }

  static getStubConfig() {
    return {
      type: 'custom:ha-log-email',
      title: 'Log Email Summary',
      email_recipient: 'your@email.com'
    };
  }

  async _fetchLogData() {
    if (!this._hass) return;
    this._loading = true;
    this._render();
    try {
      const logs = await this._hass.callWS({ type: 'system_log/list' });
      if (Array.isArray(logs)) {
        const now = Date.now();
        const h24 = 24 * 60 * 60 * 1000;
        const recent = logs.filter(e => {
          const ts = e.timestamp ? e.timestamp * 1000 : 0;
          return (now - ts) < h24;
        });
        const errors = recent.filter(e => e.level === 'ERROR' || e.level === 'CRITICAL');
        const warnings = recent.filter(e => e.level === 'WARNING');
        const mapEntry = function(e) {
          return {
            message: Array.isArray(e.message) ? e.message.join(' ') : String(e.message || ''),
            domain: e.name || (Array.isArray(e.source) ? e.source[0] : 'unknown'),
            when: e.timestamp ? new Date(e.timestamp * 1000).toISOString() : '',
            count: e.count || 1,
            level: e.level
          };
        };
        this._logData = {
          errors: errors.slice(0, this._config.max_entries).map(mapEntry),
          warnings: warnings.slice(0, this._config.max_entries).map(mapEntry),
          total: recent.length,
          allLogs: logs.length,
          fetchedAt: new Date().toISOString()
        };
      }
    } catch (err) {
      console.warn('[ha-log-email] system_log/list failed:', err);
      this._logData = this._getLogFromSensor();
    }
    this._loading = false;
    this._lastFetch = Date.now();
    // D2: Save snapshot to history
    if (this._logData && this._logData.errors) {
      const snapshot = { ts: new Date().toISOString(), errors: this._logData.errors.length, warnings: this._logData.warnings.length, total: this._logData.total };
      this._logHistory.unshift(snapshot);
      if (this._logHistory.length > this._maxHistory) this._logHistory.pop();
      try { sessionStorage.setItem('ha-log-email-history', JSON.stringify(this._logHistory)); } catch(e) { console.debug('[ha-log-email] caught:', e); }
    }
    this._render();
    // FUNC-2: start polling if enabled on first successful fetch
    if (this._pollingEnabled && !this._pollingTimer) this._startPolling();
  }

  // FUNC-2: Real-time error polling
  _startPolling() {
    this._stopPolling();
    this._pollingEnabled = true;
    this._savePollingConfig();
    // Snapshot current errors as baseline
    if (this._logData?.errors) {
      this._lastErrorKeys = new Set(this._logData.errors.map(e => (Array.isArray(e.message) ? e.message.join(' ') : String(e.message || '')) + '|' + (e.name || '')));
      this._lastErrorCount = this._logData.errors.length;
    }
    this._pollingTimer = setInterval(() => this._pollForNewErrors(), this._pollingIntervalSec * 1000);
  }

  _stopPolling() {
    if (this._pollingTimer) {
      clearInterval(this._pollingTimer);
      this._pollingTimer = null;
    }
    this._pollingEnabled = false;
    this._savePollingConfig();
  }

  _savePollingConfig() {
    try {
      localStorage.setItem('ha-tools-log-polling', JSON.stringify({
        enabled: this._pollingEnabled,
        interval: this._pollingIntervalSec
      }));
    } catch(e) { console.debug('[ha-log-email] caught:', e); }
  }

  async _pollForNewErrors() {
    if (!this._hass) return;
    try {
      const logs = await this._hass.callWS({ type: 'system_log/list' });
      if (!Array.isArray(logs)) return;
      const now = Date.now();
      const h1 = 60 * 60 * 1000;
      const recentErrors = logs
        .filter(e => (e.level === 'ERROR' || e.level === 'CRITICAL') && e.timestamp && (now - e.timestamp * 1000) < h1);
      const newErrors = recentErrors.filter(e => {
        const key = (Array.isArray(e.message) ? e.message.join(' ') : String(e.message || '')) + '|' + (e.name || '');
        return !this._lastErrorKeys.has(key);
      });
      if (newErrors.length > 0) {
        // Update baseline
        this._lastErrorKeys = new Set(recentErrors.map(e => (Array.isArray(e.message) ? e.message.join(' ') : String(e.message || '')) + '|' + (e.name || '')));
        this._lastErrorCount = recentErrors.length;
        // Send HA persistent notification
        try {
          await this._hass.callService('persistent_notification', 'create', {
            title: this._t.newErrorsNotif(newErrors.length),
            message: newErrors.slice(0, 3).map(e => `**${e.name || 'unknown'}**: ${(Array.isArray(e.message) ? e.message[0] : String(e.message || '')).substring(0, 150)}`).join('\n\n'),
            notification_id: 'ha_log_email_poll_' + Date.now()
          });
        } catch(notifErr) {
          console.warn('[ha-log-email] Could not create notification:', notifErr);
        }
        // Also refresh the log data display
        this._fetchLogData();
      }
      this._lastPollTime = Date.now();
    } catch(e) {
      console.warn('[ha-log-email] Polling error:', e);
    }
  }

    _getLogFromSensor() {
    if (!this._hass) return null;
    const sensor = this._hass.states['sensor.ha_log_summary'];
    if (!sensor) return {
      errors: [],
      warnings: [],
      total: 0,
      note: 'Sensor sensor.ha_log_summary not found. Install log_email.yaml package.',
      fetchedAt: new Date().toISOString()
    };
    const attrs = sensor.attributes || {};
    return {
      errors: attrs.errors || [],
      warnings: attrs.warnings || [],
      total: attrs.total || 0,
      lastUpdated: sensor.last_updated,
      fetchedAt: new Date().toISOString()
    };
  }

  // ── HA Tools Email (built-in SMTP) ────────────────────────────────
  _hasHaToolsEmail() {
    return !!this._hass?.services?.ha_tools_email?.send;
  }

  async _sendViaHaToolsEmail(to, subject, body, html) {
    const data = { subject, body };
    if (html) data.html = html;
    if (to) data.to = to;
    await this._hass.callService('ha_tools_email', 'send', data);
  }

  async _testSmtp() {
    if (!this._hass) return;
    if (!this._hasHaToolsEmail()) {
      this._smtpStatus = { ok: false, error: (this._lang === 'pl' ? 'ha_tools_email nie zainstalowany' : 'ha_tools_email not installed') };
      return;
    }
    this._smtpTesting = true;
    this._render();
    try {
      await this._hass.callService('ha_tools_email', 'test', {});
      this._smtpStatus = { ok: true, service: 'ha_tools_email', time: new Date().toLocaleTimeString((this._lang === 'pl' ? 'pl-PL' : 'en-US')) };
    } catch (e) {
      this._smtpStatus = { ok: false, error: e.message || 'Unknown error' };
    }
    this._smtpTesting = false;
    this._render();
  }

  _renderSmtpSection() {
    if (this._hasHaToolsEmail()) {
      const statusBadge = this._smtpStatus
        ? (this._smtpStatus.ok
          ? '<span class="badge-ok">\u2705 Test OK (' + this._smtpStatus.time + ')</span>'
          : '<span class="badge-er">\u274C ' + this._smtpStatus.error + '</span>')
        : '';
      return '<div class="smtp-section">' +
        '<div class="smtp-header">' +
          '<span class="smtp-icon">\u2709\uFE0F</span>' +
          '<div>' +
            '<div class="smtp-title">' + (this._lang === 'pl' ? '\u2705 SMTP skonfigurowany (ha_tools_email)' : '\u2705 SMTP configured (ha_tools_email)') + '</div>' +
            '<div class="smtp-sub">' + (this._lang === 'pl' ? 'Zmie\u0144 w <b><a href="/config/integrations/integration/ha_tools_email">Ustawienia \u2192 Urz\u0105dzenia i us\u0142ugi \u2192 HA Tools Email \u2192 Konfiguruj</a></b>' : 'Change in <b><a href="/config/integrations/integration/ha_tools_email">Settings \u2192 Devices &amp; services \u2192 HA Tools Email \u2192 Configure</a></b>') + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="smtp-actions">' +
          '<button class="send-btn" id="btn-smtp-test" aria-label="' + (this._lang === 'pl' ? 'Wyślij email testowy' : 'Send test email') + '" style="width:auto;padding:8px 16px" ' + (this._smtpTesting ? 'disabled' : '') + '>' +
            (this._smtpTesting ? (this._lang === 'pl' ? '\u23F3 Wysyłam...' : '\u23F3 Sending...') : (this._lang === 'pl' ? '\u{1F4E8} Wyślij test' : '\u{1F4E8} Send test')) +
          '</button>' +
          statusBadge +
        '</div>' +
      '</div>';
    }
    return '<div class="smtp-section smtp-missing">' +
      '<div class="smtp-header">' +
        '<span class="smtp-icon">\u26A0\uFE0F</span>' +
        '<div class="smtp-info">' +
          '<div class="smtp-title">' + (this._lang === 'pl' ? '\u26A0\uFE0F SMTP nie skonfigurowany' : '\u26A0\uFE0F SMTP not configured') + '</div>' +
          '<div class="smtp-sub">' + (this._lang === 'pl' ? 'Otw\u00F3rz <b><a href="/config/integrations/integration/ha_tools_email">Ustawienia \u2192 Urz\u0105dzenia i us\u0142ugi \u2192 HA Tools Email \u2192 Konfiguruj</a></b>' : 'Open <b><a href="/config/integrations/integration/ha_tools_email">Settings \u2192 Devices &amp; services \u2192 HA Tools Email \u2192 Configure</a></b>') + '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }
  async _sendEmailNow(period) {
    if (!this._hass) return;
    if (!this._hasHaToolsEmail()) {
      this._sendStatus = { status: 'error', period, error: (this._lang === 'pl' ? 'Integracja HA Tools Email nie jest zainstalowana. Zainstaluj j\u0105 z HACS, dodaj w Urz\u0105dzeniach i us\u0142ugach i ustaw SMTP w Konfiguruj.' : 'The HA Tools Email integration is not installed. Install it from HACS, add it in Devices & services, then set up SMTP in Configure.') };
      this._render(); return;
    }
    this._sendStatus = { status: 'sending', period };
    this._render();
    try {
      const data = this._logData;
      const errors = data ? (data.errors || []) : [];
      const warnings = data ? (data.warnings || []) : [];
      const now = new Date().toLocaleString((this._lang === 'pl' ? 'pl-PL' : 'en-US'));
      const subject = period === 'daily'
        ? (this._lang === 'pl' ? 'HA Log - Raport dzienny (' + now + ')' : 'HA Log - Daily Report (' + now + ')')
        : (this._lang === 'pl' ? 'HA Log - Raport tygodniowy (' + now + ')' : 'HA Log - Weekly Report (' + now + ')');
      var body = '<h2>' + subject + '</h2>';
      body += '<p>Errors: <strong>' + errors.length + '</strong> | Warnings: <strong>' + warnings.length + '</strong></p>';
      if (errors.length > 0) {
        body += '<h3 style="color:#ef4444">Errors</h3><ul>';
        errors.forEach(function(e) { body += '<li><b>' + (e.domain||'') + '</b>: ' + (e.message||'').substring(0,200) + ' (x' + (e.count||1) + ')</li>'; });
        body += '</ul>';
      }
      if (warnings.length > 0) {
        body += '<h3 style="color:#f59e0b">Warnings</h3><ul>';
        warnings.forEach(function(e) { body += '<li><b>' + (e.domain||'') + '</b>: ' + (e.message||'').substring(0,200) + ' (x' + (e.count||1) + ')</li>'; });
        body += '</ul>';
      }
      if (errors.length === 0 && warnings.length === 0) body += '<p style="color:#10b981">System czysty.</p>';
      body += '<hr><p style="font-size:11px;color:#999">HA Tools Log Email</p>';
      const to = this._config.email_recipient || this._centralRecipient || '';
      await this._sendViaHaToolsEmail(to, subject, body, body);
      this._sendStatus = { status: 'success', period, time: new Date().toLocaleTimeString((this._lang === 'pl' ? 'pl-PL' : 'en-US')) };
    } catch (err) {
      this._sendStatus = { status: 'error', period, error: (err.message || 'Unknown error') };
    }
    this._render();
  }

    _getScheduleState(entityId) {
    if (!this._hass || !this._hass.states[entityId]) return 'unknown';
    return this._hass.states[entityId].state;
  }

  async _toggleAutomation(entityId) {
    if (!this._hass) return;
    try {
      const state = this._getScheduleState(entityId);
      await this._hass.callService('automation',
        state === 'on' ? 'turn_off' : 'turn_on',
        { entity_id: entityId }
      );
      setTimeout(() => this._render(), 500);
    } catch (e) {
      console.error('[ha-log-email] Toggle automation failed:', e);
    }
  }

  _buildEmailPreview() {
    const data = this._logData;
    if (!data) return '<p style="color:var(--bento-text-secondary)">No log data loaded yet. Click refresh.</p>';

    const errors = data.errors || [];
    const warnings = data.warnings || [];
    const date = new Date().toLocaleString((this._lang === 'pl' ? 'pl-PL' : 'en-US'), { timeZone: 'Europe/Warsaw' });

    return `
      <div style="font-family:Arial,sans-serif;background:#1a1a2e;color:#e2e8f0;padding:16px;border-radius:8px;font-size:13px;max-height:300px;overflow-y:auto">
        <h3 style="margin:0 0 8px;color:#3b82f6">\uD83D\uDEA8 Home Assistant Log Summary</h3>
        <p style="margin:0 0 8px;color:#94a3b8">Generated: ${date}</p>
        
        <div style="margin-bottom:12px">
          <h4 style="color:#ef4444;margin:0 0 6px">\u274C Errors (${errors.length})</h4>
          ${errors.length === 0 ? '<p style="color:#10b981">\u2705 No errors in last 24h</p>' :
            errors.slice(0, 10).map(e => `
              <div style="background:#2d1b1b;border-left:3px solid #ef4444;padding:6px 8px;margin-bottom:4px;border-radius:0 4px 4px 0">
                <span style="color:#94a3b8;font-size:11px">${e.when ? new Date(e.when).toLocaleTimeString((this._lang === 'pl' ? 'pl-PL' : 'en-US')) : ''}</span>
                ${e.domain ? `<span style="color:#f87171;font-size:11px"> [${e.domain}]</span>` : ''}
                <div style="margin-top:2px">${(e.message || '').substring(0, 120)}${(e.message || '').length > 120 ? '...' : ''}</div>
              </div>
            `).join('') + (errors.length > 10 ? `<p style="color:#94a3b8;font-size:11px">...and ${errors.length - 10} more</p>` : '')
          }
        </div>
        
        <div>
          <h4 style="color:#f59e0b;margin:0 0 6px">\u26A0\uFE0F Warnings (${warnings.length})</h4>
          ${warnings.length === 0 ? '<p style="color:#10b981">\u2705 No warnings in last 24h</p>' :
            warnings.slice(0, 10).map(e => `
              <div style="background:#2d2410;border-left:3px solid #f59e0b;padding:6px 8px;margin-bottom:4px;border-radius:0 4px 4px 0">
                <span style="color:#94a3b8;font-size:11px">${e.when ? new Date(e.when).toLocaleTimeString((this._lang === 'pl' ? 'pl-PL' : 'en-US')) : ''}</span>
                ${e.domain ? `<span style="color:#fbbf24;font-size:11px"> [${e.domain}]</span>` : ''}
                <div style="margin-top:2px">${(e.message || '').substring(0, 120)}${(e.message || '').length > 120 ? '...' : ''}</div>
              </div>
            `).join('') + (warnings.length > 10 ? `<p style="color:#94a3b8;font-size:11px">...and ${warnings.length - 10} more</p>` : '')
          }
        </div>
      </div>
    `;
  }

  _render() {
    if (!this._hass) return;
    const data = this._logData;
    const errors = data ? (data.errors || []) : [];
    const warnings = data ? (data.warnings || []) : [];
    const totalErrors = errors.length;
    const totalWarnings = warnings.length;
    const statusColor = totalErrors > 0 ? '#ef4444' : totalWarnings > 5 ? '#f59e0b' : '#10b981';
    const statusLabel = totalErrors > 0 ? `${totalErrors} error${totalErrors > 1 ? 's' : ''}` :
                        totalWarnings > 0 ? `${totalWarnings} warning${totalWarnings > 1 ? 's' : ''}` : 'Clean';

    const dailyEntityId = 'automation.ha_tools_log_email_daily';
    const weeklyEntityId = 'automation.ha_tools_log_email_weekly';
    const dailyAuto = this._getScheduleState(dailyEntityId);
    const weeklyAuto = this._getScheduleState(weeklyEntityId);

    const tabs = [
      { id: 'overview', label: 'Overview', icon: '\uD83D\uDCCA' },
      { id: 'schedule', label: 'Schedule', icon: '\uD83D\uDCC5' },
      { id: 'preview', label: 'Preview', icon: '\uD83D\uDC41\uFE0F' },
      { id: 'send', label: 'Send Now', icon: '\uD83D\uDCE7' },
      { id: 'history', label: 'History', icon: '\uD83D\uDCDC' }
    ];

    const sendStatusHTML = this._sendStatus ? (() => {
      const s = this._sendStatus;
      if (s.status === 'sending') return `<div class="send-status sending">\u23F3 Sending ${s.period} log email...</div>`;
      if (s.status === 'success') return `<div class="send-status success">\u2705 ${s.period} log email sent at ${s.time}</div>`;
      if (s.status === 'error') return `<div class="send-status error">\u274C Send failed: ${s.error}</div>`;
      return '';
    })() : '';

    const smtpHtml = this._renderSmtpSection();
    let tabContent = '';

    if (this._activeTab === 'overview') {
      tabContent = `
        <div class="overview-grid">
          <div class="stat-card ${totalErrors > 0 ? 'stat-error' : 'stat-ok'}">
            <div class="stat-icon">\u274C</div>
            <div class="stat-value">${totalErrors}</div>
            <div class="stat-label">Errors (24h)</div>
          </div>
          <div class="stat-card ${totalWarnings > 5 ? 'stat-warn' : 'stat-ok'}">
            <div class="stat-icon">\u26A0\uFE0F</div>
            <div class="stat-value">${totalWarnings}</div>
            <div class="stat-label">Warnings (24h)</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">\uD83D\uDCDD</div>
            <div class="stat-value">${data ? (data.total || totalErrors + totalWarnings) : '—'}</div>
            <div class="stat-label">Total entries</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">\uD83D\uDFE2</div>
            <div class="stat-value" style="color:${statusColor}">${statusLabel}</div>
            <div class="stat-label">Status</div>
          </div>
        </div>

        <div class="section-header">
          <span>Recent Errors</span>

        </div>
        ${this._loading ? '<div class="loading-bar"></div>' : ''}
        ${errors.length === 0 && !this._loading ?
          '<div class="empty-state">\u2705 No errors found in logbook for last 24h</div>' :
          errors.slice(0, 5).map(e => `
            <div class="log-entry error-entry">
              <span class="log-time">${e.when ? new Date(e.when).toLocaleTimeString((this._lang === 'pl' ? 'pl-PL' : 'en-US')) : 'unknown'}</span>
              <span class="log-domain error-domain">${e.domain || 'unknown'}</span>
              <span class="log-msg">${(e.message || '').substring(0, 100)}${(e.message || '').length > 100 ? '…' : ''}</span>
            </div>
          `).join('')
        }

        <div class="section-header" style="margin-top:12px">Recent Warnings</div>
        ${warnings.length === 0 && !this._loading ?
          '<div class="empty-state">\u2705 No warnings found in last 24h</div>' :
          warnings.slice(0, 3).map(e => `
            <div class="log-entry warn-entry">
              <span class="log-time">${e.when ? new Date(e.when).toLocaleTimeString((this._lang === 'pl' ? 'pl-PL' : 'en-US')) : 'unknown'}</span>
              <span class="log-domain warn-domain">${e.domain || 'unknown'}</span>
              <span class="log-msg">${(e.message || '').substring(0, 100)}${(e.message || '').length > 100 ? '…' : ''}</span>
            </div>
          `).join('')
        }

        ${data && data.fetchedAt ? `<div class="last-updated">Last fetched: ${new Date(data.fetchedAt).toLocaleTimeString((this._lang === 'pl' ? 'pl-PL' : 'en-US'))}</div>` : ''}
        ${data && data.note ? `<div class="info-note">\u2139\uFE0F ${data.note}</div>` : ''}
      `;
    } else if (this._activeTab === 'schedule') {
      tabContent = `
        <div class="schedule-grid">
          <div class="schedule-card">
            <div class="schedule-title">\uD83D\uDDD3\uFE0F Daily Report</div>
            <div class="schedule-desc">Every day at 07:00 — errors + warnings summary</div>
            <div class="schedule-row">
              <span class="schedule-status ${dailyAuto === 'on' ? 'status-on' : 'status-off'}">
                ${dailyAuto === 'on' ? '\uD83D\uDFE2 Active' : dailyAuto === 'off' ? '\u26AB Disabled' : '\u2795 Not created'}
              </span>
              ${dailyAuto === 'unknown' ? '' : `<button class="toggle-btn" id="btn-daily-toggle">${dailyAuto === 'on' ? 'Disable' : 'Enable'}</button>`}
            </div>
          </div>

          <div class="schedule-card">
            <div class="schedule-title">\uD83D\uDCC6 Weekly Report</div>
            <div class="schedule-desc">Every Monday at 07:30 — full week log digest</div>
            <div class="schedule-row">
              <span class="schedule-status ${weeklyAuto === 'on' ? 'status-on' : 'status-off'}">
                ${weeklyAuto === 'on' ? '\uD83D\uDFE2 Active' : weeklyAuto === 'off' ? '\u26AB Disabled' : '\u2795 Not created'}
              </span>
              ${weeklyAuto === 'unknown' ? '' : `<button class="toggle-btn" id="btn-weekly-toggle">${weeklyAuto === 'on' ? 'Disable' : 'Enable'}</button>`}
            </div>
          </div>
        </div>
        ${(dailyAuto === 'unknown' || weeklyAuto === 'unknown') ? `
          <div class="info-note" style="margin-top:8px">\u2139\uFE0F ${this._lang === 'pl'
            ? 'Karta log-email wysy\u0142a digest, ale nie tworzy automatyzacji harmonogramu. Dodaj automatyzacj\u0119 wo\u0142aj\u0105c\u0105 ha_tools_email o wybranej porze (przyk\u0142ad w README) \u2014 jej stan pojawi si\u0119 tutaj do w\u0142\u0105czania/wy\u0142\u0105czania.'
            : 'The log-email card sends the digest, but does not create the schedule automation. Add an automation that calls ha_tools_email at your chosen time (see README) \u2014 it will then appear here to enable/disable.'}</div>
        ` : ''}

        <div class="section-header">SMTP Service</div>
        <div class="info-card" style="padding:12px">
        </div>
        <div class="section-header" style="margin-top:10px">Recipient</div>
        <div class="info-card">
          <span>\uD83D\uDCE7 ${this._config.email_recipient ? _esc(this._config.email_recipient) : (this._centralRecipient ? '<span style="color:var(--bento-text-secondary)">' + (this._lang === 'pl' ? 'Domyślnie z Ustawień' : 'Default from Settings') + ' ' + _esc(this._centralRecipient) + '</span>' : '<span style="color:var(--bento-text-muted)">' + (this._lang === 'pl' ? 'Nie ustawiony \u2014 dodaj email_recipient w konfiguracji karty lub Ustawienia' : 'Not set \u2014 add email_recipient in card configuration or Settings') + '</span>')}</span>
        </div>

        
      `;
    } else if (this._activeTab === 'preview') {
      tabContent = `
        <div class="section-header">
          <span>Email Preview</span>
          <button class="refresh-btn" id="btn-refresh-preview" aria-label="Refresh log data">\uD83D\uDD04 Refresh Data</button>
        </div>
        ${this._loading ? '<div class="loading-bar"></div>' : ''}
        ${this._buildEmailPreview()}
        ${data ? `<div class="last-updated">Based on data from: ${new Date(data.fetchedAt).toLocaleTimeString((this._lang === 'pl' ? 'pl-PL' : 'en-US'))}</div>` : ''}
      `;
    } else if (this._activeTab === 'send') {
      tabContent = `
        <div class="send-grid">
          <div class="send-card">
            <div class="send-icon">\uD83D\uDCC5</div>
            <div class="send-title">Daily Summary</div>
            <div class="send-desc">Errors + warnings from last 24 hours</div>
            <div class="send-counts">
              <span class="count-badge error-badge">${totalErrors} errors</span>
              <span class="count-badge warn-badge">${totalWarnings} warnings</span>
            </div>
            <button class="send-btn" id="btn-send-daily" aria-label="Send daily log email">Send Daily Email</button>
          </div>
          <div class="send-card">
            <div class="send-icon">\uD83D\uDCC6</div>
            <div class="send-title">Weekly Digest</div>
            <div class="send-desc">Full week log summary</div>
            <div class="send-counts">
              <span class="count-badge info-badge">7 days</span>
            </div>
            <button class="send-btn" id="btn-send-weekly" aria-label="Send weekly log email">Send Weekly Email</button>
          </div>
        </div>
        ${sendStatusHTML}
        <div class="section-header" style="margin-top:16px">Recipient</div>
        <div class="info-card">\uD83D\uDCE7 ${_esc(this._config.email_recipient || '')}</div>
        <div class="info-note" style="margin-top:8px">
          ${this._lang === 'pl' ? 'ℹ️ Wysyła email bezpośrednio przez ha_tools_email (centralna konfiguracja). Nie wymaga osobnych automatyzacji.' : 'ℹ️ Sends email directly via ha_tools_email (central config). No separate automations required.'}
        </div>

        <div class="section-header" style="margin-top:20px">Instant Error Notification</div>
        <div class="info-card" style="padding:16px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
            <div>
              <p style="margin:0;font-weight:600;font-size:13px">🔔 Live error polling</p>
              <p style="margin:4px 0 0;font-size:11px;color:var(--bento-text-secondary,#64748B)">
                ${this._pollingEnabled ? (this._lang === 'pl' ? '🟢 Aktywne — sprawdzanie co ' : '🟢 Active — checking every ') + this._pollingIntervalSec + 's' : (this._lang === 'pl' ? '⚫ Wyłączone' : '⚫ Disabled')}
              </p>
            </div>
            <div style="display:flex;gap:6px;align-items:center;">
              <select id="poll-interval" style="padding:4px 8px;border-radius:6px;font-size:11px;border:1px solid var(--bento-border,#e2e8f0);background:var(--bento-bg,#f8fafc);color:var(--bento-text,#1e293b);">
                ${[30,60,120,300].map(s => `<option value="${s}" ${this._pollingIntervalSec === s ? 'selected' : ''}>${s < 60 ? s + 's' : (s/60) + 'min'}</option>`).join('')}
              </select>
              <button class="toggle-btn" id="btn-poll-toggle" style="padding:6px 14px;font-size:11px;">
                ${this._pollingEnabled ? (this._lang === 'pl' ? 'Wyłącz' : 'Disable') : (this._lang === 'pl' ? 'Włącz' : 'Enable')}
              </button>
              ${this._pollingEnabled && this._lastPollTime ? '<span style="font-size:10px;color:var(--bento-text-secondary,#64748B);margin-left:6px">last: ' + new Date(this._lastPollTime).toLocaleTimeString() + '</span>' : ''}
            </div>
          </div>
          <p style="margin:0 0 8px 0;font-size:11px;color:var(--bento-text-secondary,#64748B)">
            ${this._lang === 'pl' ? 'Polling wysyła persistent_notification w HA przy wykryciu nowego ERROR. Alternatywnie użyj automatyzacji:' : 'Polling sends a persistent_notification in HA when a new ERROR is detected. Alternatively, use an automation:'}
          </p>
          <p style="margin:0 0 8px 0;font-weight:600;font-size:13px">${this._lang === 'pl' ? 'Automatyczne powiadomienia przy nowym bledzie' : 'Automatic notifications on new errors'}</p>
          <p style="margin:0 0 12px 0;font-size:12px;color:var(--bento-text-secondary)">
            ${this._lang === 'pl' ? 'Skopiuj poniższą automatyzację do <code>automations.yaml</code> aby otrzymywać natychmiastowy email/powiadomienie przy każdym nowym ERROR w system_log.' : 'Copy the automation below into <code>automations.yaml</code> to receive an instant email/notification for every new ERROR in system_log.'}
          </p>
          <details style="margin-top:8px">
            <summary style="cursor:pointer;font-weight:600;font-size:12px;color:var(--bento-primary)">${this._lang === 'pl' ? 'Pokaż YAML automatyzacji' : 'Show automation YAML'}</summary>
            <pre style="background:#1e293b;color:#e2e8f0;padding:12px;border-radius:8px;font-size:11px;overflow-x:auto;line-height:1.5;margin-top:8px">alias: "Log Email - Instant Error Alert"
description: "${this._lang === 'pl' ? 'Wyślij powiadomienie przy nowym błędzie w system_log' : 'Send notification on new system_log error'}"
trigger:
  - platform: event
    event_type: system_log_event
    event_data:
      level: ERROR
condition:
  - condition: template
    value_template: >
      {{ (as_timestamp(now()) - as_timestamp(
        state_attr('automation.log_email_instant_error_alert','last_triggered')
        | default(0))) > 300 }}
action:
  - service: persistent_notification.create
    data:
      title: "HA Error Detected"
      message: "{{ trigger.event.data.message[:200] }}"
      notification_id: "log_error_{{ now().timestamp()|int }}"
mode: queued
max: 3</pre>
          </details>
        </div>
      `;
    }

    if (this._activeTab === 'history') {
      tabContent = this._renderHistory();
    }

    this.shadowRoot.innerHTML = `
      <style>${LOCAL_BENTO_CSS}
/* === HA Tools split — premium banners (donate / intro / prereq) === */

/* Donation footer — diamond top */
.donate-section {  margin: 24px 0 4px; padding: 20px 24px; position: relative; overflow: hidden;  background: linear-gradient(135deg, rgba(99,102,241,0.06), rgba(236,72,153,0.06));  border: 1px solid rgba(99,102,241,0.18); border-radius: var(--bento-radius-md, 18px);  display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 18px;  font-family: 'Inter', -apple-system, sans-serif;}
.donate-section::before {  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;  background: linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899);}
.donate-section .donate-text { flex: 1; min-width: 240px; }
.donate-section h3 {  margin: 0 0 6px; font-size: 16px; font-weight: 700; letter-spacing: -0.02em;  background: linear-gradient(135deg, #6366f1, #ec4899);  -webkit-background-clip: text; background-clip: text; color: transparent;}
.donate-section p { margin: 0; font-size: 13px; line-height: 1.55; color: var(--bento-text-secondary, #57534e); letter-spacing: -0.005em; }
.donate-buttons { display: flex; gap: 10px; flex-wrap: wrap; }
.donate-btn {  display: inline-flex; align-items: center; gap: 6px; padding: 10px 18px;  border-radius: 12px; font-weight: 700; font-size: 13px; letter-spacing: -0.005em;  text-decoration: none; transition: transform 0.2s cubic-bezier(0.4,0,0.2,1), box-shadow 0.2s, filter 0.2s;  border: 1px solid transparent;}
.donate-btn:hover { transform: translateY(-2px); filter: brightness(1.05); }
.donate-btn.coffee {  background: linear-gradient(135deg, #FFDD00, #FFC700); color: #000;  box-shadow: 0 4px 14px -2px rgba(255, 221, 0, 0.4);}
.donate-btn.coffee:hover { box-shadow: 0 8px 24px -4px rgba(255, 221, 0, 0.55); }
.donate-btn.paypal {  background: linear-gradient(135deg, #0070ba, #005ea6); color: #fff;  box-shadow: 0 4px 14px -2px rgba(0, 112, 186, 0.45);}
.donate-btn.paypal:hover { box-shadow: 0 8px 24px -4px rgba(0, 112, 186, 0.6); }
:host(.bento-dark) .donate-section { background: linear-gradient(135deg, rgba(129,140,248,0.10), rgba(244,114,182,0.10)); border-color: rgba(129,140,248,0.25); }
:host(.bento-dark) .donate-section h3 { background: linear-gradient(135deg, #a5b4fc, #f9a8d4); -webkit-background-clip: text; background-clip: text; color: transparent; }
:host(.bento-dark) .donate-section p { color: #d6d3d1; }
@media (max-width: 600px) {  .donate-section { flex-direction: column; text-align: center; padding: 18px; }  .donate-buttons { justify-content: center; width: 100%; } }

/* Prereq banner — premium */
.prereq-banner {  display: flex; align-items: flex-start; gap: 14px; padding: 16px 20px;  border-radius: var(--bento-radius-sm, 12px); margin: 0 0 16px;  font-size: 13px; line-height: 1.55; border: 1px solid;  font-family: 'Inter', sans-serif; letter-spacing: -0.005em;  position: relative; overflow: hidden;}
.prereq-banner::before {  content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;}
.prereq-banner.prereq-error { background: rgba(239,68,68,0.06); border-color: rgba(239,68,68,0.25); color: #991b1b; }
.prereq-banner.prereq-error::before { background: linear-gradient(180deg, #ef4444, #f87171); }
.prereq-banner.prereq-info  { background: rgba(99,102,241,0.06); border-color: rgba(99,102,241,0.25); color: #4338ca; }
.prereq-banner.prereq-info::before  { background: linear-gradient(180deg, #6366f1, #8b5cf6); }
.prereq-banner .prereq-icon { font-size: 22px; line-height: 1; padding-top: 2px; flex-shrink: 0; }
.prereq-banner .prereq-text { flex: 1; min-width: 0; }
.prereq-banner .prereq-text strong { font-weight: 700; letter-spacing: -0.01em; }
.prereq-banner code {  background: rgba(0,0,0,0.06); padding: 1px 7px; border-radius: 5px;  font-size: 12px; font-family: 'JetBrains Mono', ui-monospace, monospace;  border: 1px solid rgba(0,0,0,0.08);}
.prereq-banner .prereq-cta {  display: inline-flex; align-items: center; padding: 8px 16px; border-radius: 10px;  background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #fff !important;  text-decoration: none; font-weight: 700; font-size: 12.5px; flex-shrink: 0;  letter-spacing: -0.005em;  box-shadow: 0 4px 14px -2px rgba(99,102,241,0.45);  transition: all 0.2s cubic-bezier(0.4,0,0.2,1);}
.prereq-banner .prereq-cta:hover { transform: translateY(-1px); box-shadow: 0 8px 24px -4px rgba(99,102,241,0.6); }
:host(.bento-dark) .prereq-banner.prereq-error { background: rgba(248,113,113,0.10); border-color: rgba(248,113,113,0.30); color: #fca5a5; }
:host(.bento-dark) .prereq-banner.prereq-info { background: rgba(129,140,248,0.10); border-color: rgba(129,140,248,0.30); color: #c7d2fe; }
:host(.bento-dark) .prereq-banner code { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.10); }
@media (max-width: 600px) {  .prereq-banner { flex-direction: column; align-items: stretch; padding-left: 20px; }  .prereq-banner .prereq-cta { align-self: flex-start; } }

/* First-run intro banner — premium */
.intro-banner {  position: relative; padding: 18px 52px 18px 22px; margin: 0 0 18px;  background: linear-gradient(135deg, rgba(99,102,241,0.08), rgba(236,72,153,0.06));  border: 1px solid rgba(99,102,241,0.20);  border-radius: var(--bento-radius-sm, 12px);  font-size: 13px; line-height: 1.55; overflow: hidden;  font-family: 'Inter', sans-serif; letter-spacing: -0.005em;  animation: bentoSlideIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);}
.intro-banner::before {  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;  background: linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899);}
.intro-banner .intro-headline {  font-weight: 700; font-size: 14.5px; margin-bottom: 10px; letter-spacing: -0.02em;  background: linear-gradient(135deg, #6366f1, #ec4899);  -webkit-background-clip: text; background-clip: text; color: transparent;  display: flex; align-items: center; gap: 8px;}
.intro-banner .intro-steps {  margin: 8px 0 0; padding: 0; list-style: none; counter-reset: introstep;}
.intro-banner .intro-steps li {  margin-bottom: 8px; line-height: 1.55; color: var(--bento-text, #0c0a09);  padding-left: 32px; position: relative; counter-increment: introstep;  font-size: 12.5px;}
.intro-banner .intro-steps li::before {  content: counter(introstep); position: absolute; left: 0; top: -1px;  width: 22px; height: 22px; border-radius: 50%;  background: var(--bento-card, #fff); border: 1px solid rgba(99,102,241,0.25);  display: flex; align-items: center; justify-content: center;  font-size: 11px; font-weight: 800; color: #6366f1;  font-family: 'JetBrains Mono', ui-monospace, monospace;  font-feature-settings: 'tnum' 1;}
.intro-banner .intro-dismiss {  position: absolute; top: 12px; right: 14px;  background: var(--bento-card, transparent); border: 1px solid var(--bento-border, transparent);  cursor: pointer; font-size: 14px; line-height: 1;  color: var(--bento-text-secondary, #64748B);  padding: 4px 8px; border-radius: 999px;  transition: all 0.15s ease;}
.intro-banner .intro-dismiss:hover {  background: var(--bento-bg-2, #e7e5e4); color: var(--bento-text, #0c0a09);  transform: rotate(90deg);}
:host(.bento-dark) .intro-banner { background: linear-gradient(135deg, rgba(129,140,248,0.14), rgba(244,114,182,0.10)); border-color: rgba(129,140,248,0.30); }
:host(.bento-dark) .intro-banner .intro-headline { background: linear-gradient(135deg, #a5b4fc, #f9a8d4); -webkit-background-clip: text; background-clip: text; color: transparent; }
:host(.bento-dark) .intro-banner .intro-steps li { color: #fafaf9; }
:host(.bento-dark) .intro-banner .intro-steps li::before { background: #16161f; border-color: rgba(129,140,248,0.35); color: #a5b4fc; }
:host(.bento-dark) .intro-banner .intro-dismiss { background: #16161f; border-color: #27272f; color: #d6d3d1; }
:host(.bento-dark) .intro-banner .intro-dismiss:hover { background: #27272f; color: #fafaf9; }


        
/* ===== BENTO DESIGN SYSTEM (local fallback) ===== */

:host {
  --bento-primary: #3B82F6;
  --bento-primary-hover: #2563EB;
  --bento-primary-light: rgba(59, 130, 246, 0.08);
  --bento-success: #10B981;
  --bento-success-light: rgba(16, 185, 129, 0.08);
  --bento-error: #EF4444;
  --bento-error-light: rgba(239, 68, 68, 0.08);
  --bento-warning: #F59E0B;
  --bento-warning-light: rgba(245, 158, 11, 0.08);
  --bento-bg: var(--primary-background-color, #F8FAFC);
  --bento-card: var(--card-background-color, #FFFFFF);
  --bento-border: var(--divider-color, #E2E8F0);
  --bento-text: var(--primary-text-color, #1E293B);
  --bento-text-secondary: var(--secondary-text-color, #64748B);
  --bento-text-muted: var(--disabled-text-color, #94A3B8);
  --bento-radius-xs: 6px;
  --bento-radius-sm: 10px;
  --bento-radius-md: 16px;
  --bento-shadow-sm: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06);
  --bento-shadow-md: 0 4px 12px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.04);
  --bento-shadow-lg: 0 8px 25px rgba(0,0,0,0.06), 0 4px 10px rgba(0,0,0,0.04);
  --bento-transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

:host {
          --bg: var(--bento-bg); --card: var(--bento-card); --border: var(--bento-border);
          --text: var(--bento-text); --text2: var(--bento-text-secondary); --text3: var(--bento-text-muted);
          --primary: var(--bento-primary); --success: var(--bento-success); --error: var(--bento-error);
          --warning: var(--bento-warning); --radius: var(--bento-radius-sm); --radius-sm: var(--bento-radius-xs);
          display: block; font-family: Inter, sans-serif;
          color-scheme: light dark;
        }
        :host(.bento-dark) {
            --bg: #0f172a; --card: #1e293b; --border: #334155;
            --text: #f1f5f9; --text2: #94a3b8; --text3: #64748b;
          }
        * { box-sizing: border-box; }
        .card { background: var(--bento-card); border-radius: var(--bento-radius-md); overflow: visible; max-width: 100%; box-sizing: border-box; }
        .header { padding: 16px 20px 0; display: flex; align-items: center; gap: 10px; }
        .header-icon { font-size: 22px; }
        .header-title { font-size: 16px; font-weight: 700; color: var(--bento-text); }
        .header-badge { margin-left: auto; background: var(--bento-border); color: var(--bento-text-secondary); font-size: 11px; padding: 3px 8px; border-radius: 20px; font-weight: 500; }
        .tabs { display: flex; border-bottom: 1px solid var(--bento-border); margin-top: 12px; }
        .tab-btn { flex: 1; padding: 10px 4px; font-size: 12px; font-weight: 600; text-align: center; cursor: pointer; color: var(--bento-text-secondary); border: none; background: none; transition: all .2s; }
        .tab-btn:hover { color: var(--bento-primary); }
        .tab-btn.active { color: var(--bento-primary); border-bottom: 2px solid var(--bento-primary); margin-bottom: -1px; }
        .content { padding: 16px; }

        .overview-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; margin-bottom: 16px; }
        .stat-card { background: var(--bento-bg); border-radius: var(--bento-radius-sm); padding: 10px 8px; text-align: center; border: 1px solid var(--bento-border); }
        .stat-card.stat-error { border-color: #ef444440; background: #ef444408; }
        .stat-card.stat-warn { border-color: #f59e0b40; background: #f59e0b08; }
        .stat-card.stat-ok { border-color: #10b98140; background: #10b98108; }
        .stat-icon { font-size: 18px; margin-bottom: 4px; }
        .stat-value { font-size: 20px; font-weight: 700; color: var(--bento-text); }
        .stat-label { font-size: 10px; text-transform: uppercase; color: var(--bento-text-secondary); letter-spacing: 0.3px; margin-top: 2px; }

        .section-header { display: flex; align-items: center; justify-content: space-between; font-size: 12px; font-weight: 600; color: var(--bento-text-secondary); text-transform: uppercase; letter-spacing: .5px; margin: 12px 0 8px; }
        .loading-bar { height: 3px; background: linear-gradient(90deg, var(--bento-primary), transparent); border-radius: 2px; animation: load 1s infinite; margin-bottom: 8px; }
        @keyframes load { 0%{background-position:0} 100%{background-position:200px} }

        .log-entry { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 4px 6px; padding: 8px; border-radius: var(--bento-radius-sm); margin-bottom: 4px; font-size: 12px; min-width: 0; overflow: hidden; }
        .error-entry { background: #ef444408; border: 1px solid #ef444420; }
        .warn-entry { background: #f59e0b08; border: 1px solid #f59e0b20; }
        .log-time { color: var(--bento-text-muted); flex-shrink: 0; }
        .log-domain { font-weight: 600; flex-shrink: 1; min-width: 0; max-width: 100%; overflow: hidden; text-overflow: ellipsis; word-break: break-all; }
        .error-domain { color: #ef4444; }
        .warn-domain { color: #f59e0b; }
        .log-msg { color: var(--bento-text-secondary); flex-basis: 100%; word-break: break-word; overflow-wrap: anywhere; white-space: pre-wrap; min-width: 0; }
        .empty-state { text-align: center; color: var(--bento-text-secondary); padding: 16px; font-size: 13px; background: var(--bento-bg); border-radius: var(--bento-radius-sm); }
        .last-updated { font-size: 11px; color: var(--bento-text-muted); text-align: right; margin-top: 8px; }
        .info-note { font-size: 12px; color: var(--bento-text-secondary); background: var(--bento-bg); border-radius: var(--bento-radius-sm); padding: 8px 10px; border-left: 3px solid var(--bento-primary); margin-top: 8px; }

        .refresh-btn { background: var(--bento-border); border: none; border-radius: 6px; padding: 4px 10px; font-size: 11px; color: var(--bento-text-secondary); cursor: pointer; font-weight: 500; }
        .refresh-btn:hover { background: var(--bento-primary); color: white; }

        .schedule-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .schedule-card { background: var(--bento-bg); border: 1px solid var(--bento-border); border-radius: var(--bento-radius-sm); padding: 12px; overflow: hidden; word-break: break-word; }
        .schedule-title { font-weight: 600; font-size: 14px; color: var(--bento-text); margin-bottom: 4px; }
        .schedule-desc { font-size: 12px; color: var(--bento-text-secondary); line-height: 1.4; margin-bottom: 10px; }
        .schedule-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
        .schedule-status { font-size: 12px; font-weight: 600; }
        .status-on { color: #10b981; }
        .status-off { color: var(--bento-text-muted); }
        .toggle-btn { background: var(--bento-primary); border: none; border-radius: 6px; padding: 5px 12px; font-size: 12px; color: white; cursor: pointer; font-weight: 500; }
        .toggle-btn:hover { opacity: .85; }
        .info-card { background: var(--bento-bg); border: 1px solid var(--bento-border); border-radius: var(--bento-radius-sm); padding: 12px; font-size: 13px; color: var(--bento-text-secondary); }
        .setup-steps { line-height: 1.8; }
        .setup-steps p { margin: 6px 0; }
        .setup-steps pre { background: var(--bento-card); border: 1px solid var(--bento-border); border-radius: 4px; padding: 8px; font-size: 12px; color: var(--bento-primary); margin: 4px 0; overflow-x: auto; }
        code { background: var(--bento-border); padding: 1px 4px; border-radius: 3px; font-size: 12px; }

        .smtp-section { background: var(--bento-bg); border: 1px solid var(--bento-border); border-radius: 12px; padding: 14px; margin-bottom: 14px; }
    .smtp-missing { border-color: #f59e0b40; background: #fef3c710; }
    .smtp-header { display: flex; align-items: center; gap: 10px; }
    .smtp-icon { font-size: 22px; }
    .smtp-title { font-weight: 700; font-size: 13px; color: var(--bento-text); }
    .smtp-sub { font-size: 11px; color: var(--bento-text-secondary); margin-top: 2px; }
    .smtp-sub code { background: var(--bento-border); padding: 1px 5px; border-radius: 4px; font-size: 10px; }
    .smtp-actions { display: flex; align-items: center; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
    .smtp-guide { margin-top: 12px; font-size: 12px; line-height: 1.6; color: var(--bento-text-secondary); }
    .smtp-guide p { margin: 6px 0; }
    .smtp-guide code { background: var(--bento-border); padding: 1px 5px; border-radius: 3px; font-size: 11px; }
    .badge-ok { color: #10b981; font-size: 12px; font-weight: 600; }
    .badge-er { color: #ef4444; font-size: 12px; font-weight: 600; }
    .send-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .send-card { background: var(--bento-bg); border: 1px solid var(--bento-border); border-radius: var(--bento-radius-sm); padding: 16px; text-align: center; }
        .send-icon { font-size: 28px; margin-bottom: 6px; }
        .send-title { font-weight: 700; color: var(--bento-text); margin-bottom: 4px; }
        .send-desc { font-size: 12px; color: var(--bento-text-secondary); margin-bottom: 10px; }
        .send-counts { display: flex; gap: 6px; justify-content: center; margin-bottom: 12px; flex-wrap: wrap; }
        .count-badge { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 20px; }
        .error-badge { background: #ef444420; color: #ef4444; }
        .warn-badge { background: #f59e0b20; color: #f59e0b; }
        .info-badge { background: #3b82f620; color: #3b82f6; }
        .send-btn { width: 100%; background: var(--bento-primary); color: white; border: none; border-radius: 8px; padding: 10px; font-size: 13px; font-weight: 600; cursor: pointer; transition: .2s; }
        .send-btn:hover { background: #2563eb; transform: translateY(-1px); }
        .send-btn:active { transform: translateY(0); }
        .send-status { padding: 10px 14px; border-radius: var(--bento-radius-sm); margin-top: 12px; font-size: 13px; font-weight: 500; text-align: center; }
        .send-status.sending { background: #3b82f620; color: #3b82f6; }
        .send-status.success { background: #10b98120; color: #10b981; }
        .send-status.error { background: #ef444420; color: #ef4444; }
      
        /* === MOBILE FIX === */
        
        .tabs, .tab-bar { scrollbar-width: thin; scrollbar-color: var(--bento-border, #E2E8F0) transparent; }
        .tabs::-webkit-scrollbar, .tab-bar::-webkit-scrollbar { height: 4px; }
        .tabs::-webkit-scrollbar-track, .tab-bar::-webkit-scrollbar-track { background: transparent; }
        .tabs::-webkit-scrollbar-thumb, .tab-bar::-webkit-scrollbar-thumb { background: var(--bento-border, #E2E8F0); border-radius: 4px; }
@media (max-width: 768px) {
          .card { overflow: hidden; }
          .content { overflow: hidden; padding: 12px; }
          .log-entry { flex-wrap: wrap; gap: 2px 6px; }
          .log-domain { max-width: 60%; font-size: 11px; }
          .log-msg { flex-basis: 100%; max-width: 100%; overflow-wrap: anywhere; font-size: 11px; }
          .overview-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
          .send-grid { grid-template-columns: 1fr; }
          .schedule-grid { grid-template-columns: 1fr; }
          .schedule-card { padding: 10px; }
          .toggle-btn { font-size: 11px; padding: 4px 10px; }
          pre { white-space: pre-wrap; word-break: break-all; max-width: calc(100vw - 80px); overflow-x: auto; }
          .tabs { flex-wrap: nowrap; overflow-x: auto; -webkit-overflow-scrolling: touch; gap: 2px; }
          .tab-btn, .tab-btn, .tab-btn { padding: 6px 10px; font-size: 12px; white-space: nowrap; }
          .card, .card-container { padding: 14px; }
          .stats, .stats-grid, .summary-grid, .stat-cards, .kpi-grid, .metrics-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
          .stat-val, .kpi-val, .metric-val { font-size: 18px; }
          .stat-lbl, .kpi-lbl, .metric-lbl { font-size: 10px; }
          .panels, .board { flex-direction: column; }
          .column { min-width: unset; }
          h2 { font-size: 18px; }
          h3 { font-size: 15px; }
        }
        @media (max-width: 480px) {
          .tabs { gap: 1px; }
          .tab-btn, .tab-btn, .tab-btn { padding: 5px 8px; font-size: 11px; }
          .stats, .stats-grid, .summary-grid, .stat-cards, .kpi-grid, .metrics-grid { grid-template-columns: 1fr 1fr; }
          .stat-val, .kpi-val, .metric-val { font-size: 16px; }
          .stat-icon { font-size: 16px; }
          .stat-value { font-size: 16px; }
          .overview-grid { gap: 6px; }
        }
      

</style>

      <ha-card class="card">
        <div class="header">
          <span class="header-icon">\uD83D\uDEA8</span>
          <span class="header-title">${_esc(this._config.title || 'Log Email Summary')}</span>
          <span class="header-badge" style="background:${totalErrors > 0 ? '#ef444420' : '#10b98120'};color:${totalErrors > 0 ? '#ef4444' : '#10b981'}">${statusLabel}</span>
        
        </div>

        <div class="tabs">
          ${tabs.map(t => `
            <button class="tab-btn ${this._activeTab === t.id ? 'active' : ''}" data-tab="${t.id}">
              ${t.icon} ${t.label}
            </button>
          `).join('')}
        </div>

        <div class="content">
          ${tabContent}
        </div>
        ${OWN_SUPPORT_FOOTER}
      </ha-card>
    `;

    // Restore tabs scroll position
    if (this._tabsScrollLeft) {
      requestAnimationFrame(() => {
        const tabsEl = this.shadowRoot.querySelector('.tabs');
        if (tabsEl) tabsEl.scrollLeft = this._tabsScrollLeft;
      });
    }

    // Bind events
    this.shadowRoot.querySelectorAll('.tab-btn').forEach(el => {
      el.addEventListener('click', (e) => {
        const tabsEl = this.shadowRoot.querySelector('.tabs');
        this._tabsScrollLeft = tabsEl ? tabsEl.scrollLeft : 0;
        this._activeTab = e.currentTarget.dataset.tab;
        history.replaceState(null, '', location.pathname + '#' + this._toolId + '/' + this._activeTab);
        this._render();
      });
    });

    // btn-refresh removed

    const btnRefreshPreview = this.shadowRoot.getElementById('btn-refresh-preview');
    if (btnRefreshPreview) btnRefreshPreview.addEventListener('click', () => this._fetchLogData());

    // Schedule toggle buttons
    const btnDailyToggle = this.shadowRoot.getElementById('btn-daily-toggle');
    if (btnDailyToggle) btnDailyToggle.addEventListener('click', () => this._toggleAutomation('automation.ha_tools_log_email_daily'));
    const btnWeeklyToggle = this.shadowRoot.getElementById('btn-weekly-toggle');
    if (btnWeeklyToggle) btnWeeklyToggle.addEventListener('click', () => this._toggleAutomation('automation.ha_tools_log_email_weekly'));

    

    const btnSmtpTest = this.shadowRoot.getElementById('btn-smtp-test');
    if (btnSmtpTest) {
      btnSmtpTest.addEventListener('click', () => this._testSmtp());
    }
    const btnSendDaily = this.shadowRoot.getElementById('btn-send-daily');
    if (btnSendDaily) btnSendDaily.addEventListener('click', () => this._sendEmailNow('daily'));

    const btnSendWeekly = this.shadowRoot.getElementById('btn-send-weekly');
    if (btnSendWeekly) btnSendWeekly.addEventListener('click', () => this._sendEmailNow('weekly'));

    // FUNC-2: Polling toggle
    const btnPollToggle = this.shadowRoot.getElementById('btn-poll-toggle');
    if (btnPollToggle) {
      btnPollToggle.addEventListener('click', () => {
        if (this._pollingEnabled) { this._stopPolling(); } else {
          const sel = this.shadowRoot.getElementById('poll-interval');
          if (sel) this._pollingIntervalSec = parseInt(sel.value) || 60;
          this._startPolling();
        }
        this._render();
      });
    }
    const pollIntervalSel = this.shadowRoot.getElementById('poll-interval');
    if (pollIntervalSel) {
      pollIntervalSel.addEventListener('change', (e) => {
        this._pollingIntervalSec = parseInt(e.target.value) || 60;
        if (this._pollingEnabled) { this._startPolling(); }
        this._savePollingConfig();
      });
    }

  }

  _renderHistory() {
    if (!this._logHistory || this._logHistory.length === 0) {
      return '<div class="empty-state"><div style="font-size:48px;opacity:0.5;margin-bottom:12px;">📜</div><h3 style="margin:8px 0 4px;">No History Yet</h3><p>Log snapshots are saved each time data is fetched. History persists during the browser session.</p></div>';
    }
    let html = '<div class="section-title">📊 Log Fetch History (last ' + this._logHistory.length + ' snapshots)</div>';
    html += '<table style="width:100%;border-collapse:collapse;font-size:13px;">';
    html += '<thead><tr><th style="text-align:left;padding:8px;border-bottom:2px solid var(--bento-border,#e2e8f0);">Time</th><th style="text-align:center;padding:8px;border-bottom:2px solid var(--bento-border,#e2e8f0);">Errors</th><th style="text-align:center;padding:8px;border-bottom:2px solid var(--bento-border,#e2e8f0);">Warnings</th><th style="text-align:center;padding:8px;border-bottom:2px solid var(--bento-border,#e2e8f0);">Total</th></tr></thead><tbody>';
    this._logHistory.forEach(s => {
      const dt = new Date(s.ts);
      const time = dt.toLocaleTimeString() + ' ' + dt.toLocaleDateString();
      const errColor = s.errors > 0 ? 'var(--bento-error,#ef4444)' : 'var(--bento-success,#22c55e)';
      html += '<tr><td style="padding:6px 8px;border-bottom:1px solid var(--bento-border,#e2e8f0);">' + time + '</td>';
      html += '<td style="text-align:center;padding:6px 8px;border-bottom:1px solid var(--bento-border,#e2e8f0);color:' + errColor + ';font-weight:600;">' + s.errors + '</td>';
      html += '<td style="text-align:center;padding:6px 8px;border-bottom:1px solid var(--bento-border,#e2e8f0);color:var(--bento-warning,#f59e0b);font-weight:600;">' + s.warnings + '</td>';
      html += '<td style="text-align:center;padding:6px 8px;border-bottom:1px solid var(--bento-border,#e2e8f0);">' + s.total + '</td></tr>';
    });
    html += '</tbody></table>';
    html += '<div style="margin-top:12px;padding:10px;background:rgba(59,130,246,0.06);border-radius:8px;font-size:12px;color:var(--bento-text-secondary,#64748b);">💡 History is stored in browser sessionStorage and resets when the tab is closed. Each automatic/manual refresh adds a snapshot.</div>';
    return html;
  }

  disconnectedCallback() {
    if (this._pollingTimer) {
      clearInterval(this._pollingTimer);
      this._pollingTimer = null;
    }
  }

  setActiveTab(tabId) {
    this._activeTab = tabId;
    this._render();
  }
}

if (!customElements.get('ha-log-email')) customElements.define('ha-log-email', HALogEmail);

window.customElements.whenDefined('ha-log-email').then(() => {
  console.log('[ha-log-email] v4.4.0 registered');
});

class HaLogEmailEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._config = {};
  }
  setConfig(config) {
    this._config = { ...config };
    this._render();
  }
  _dispatch() {
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this._config }, bubbles: true, composed: true }));
  }
  _render() {
    this.shadowRoot.innerHTML = `
      <style>
            :host { display:block; padding:16px; }
            h3 { margin:0 0 16px; font-size:15px; font-weight:600; color:var(--bento-text, var(--primary-text-color,#1e293b)); }
            input { outline:none; transition:border-color .2s; }
            input:focus { border-color:var(--bento-primary, var(--primary-color,#3b82f6)); }
        </style>
      <h3>Log Email Summary</h3>
            <div style="margin-bottom:12px;">
              <label style="display:block;font-weight:500;margin-bottom:4px;font-size:13px;">Title</label>
              <input type="text" id="cf_title" value="${_esc(this._config?.title || 'Log Email Summary')}"
                style="width:100%;padding:8px 12px;border:1px solid var(--divider-color,#e2e8f0);border-radius:8px;background:var(--card-background-color,#fff);color:var(--primary-text-color,#1e293b);font-size:14px;box-sizing:border-box;">
            </div>
            <div style="margin-bottom:12px;">
              <label style="display:block;font-weight:500;margin-bottom:4px;font-size:13px;">Email recipient (override)</label>
              <input type="text" id="cf_email_recipient" value="${_esc(this._config?.email_recipient || '')}"
                style="width:100%;padding:8px 12px;border:1px solid var(--divider-color,#e2e8f0);border-radius:8px;background:var(--card-background-color,#fff);color:var(--primary-text-color,#1e293b);font-size:14px;box-sizing:border-box;">
              <div style="font-size:11px;color:var(--bento-text-secondary);margin-top:4px;">${this._lang === 'pl' ? 'Pozostaw puste, aby u\u017cy\u0107 ustawienia centralnego' : 'Leave empty to use central setting'}</div>
            </div>
    `;
        const f_title = this.shadowRoot.querySelector('#cf_title');
        if (f_title) f_title.addEventListener('input', (e) => {
          this._config = { ...this._config, title: e.target.value };
          this._dispatch();
        });
        const f_email_recipient = this.shadowRoot.querySelector('#cf_email_recipient');
        if (f_email_recipient) f_email_recipient.addEventListener('input', (e) => {
          this._config = { ...this._config, email_recipient: e.target.value };
          this._dispatch();
        });
  }
  connectedCallback() { this._render(); }
}
if (!customElements.get('ha-log-email-editor')) { customElements.define('ha-log-email-editor', HaLogEmailEditor); }

})();

window.customCards = window.customCards || [];
window.customCards.push({ type: 'ha-log-email', name: 'Log Email Summary', description: 'Email digest of HA errors and warnings', preview: false });
/**
 * Home Assistant Smart Reports Card
 * Recorder-backed energy reports, automation statistics, and system overview.
 * Version: 4.0.0
 */

(function registerHASmartReports() {
  'use strict';

  if (customElements.get('ha-smart-reports')) return;

  const VERSION = '4.0.0';
  const VALID_PERIODS = new Set(['1d', '7d', '30d']);
  const ENERGY_UNITS = new Set(['Wh', 'kWh', 'MWh']);

  function uniqueById(items) {
    const seen = new Set();
    return items.filter((item) => {
      if (!item.statistic_id || seen.has(item.statistic_id)) return false;
      seen.add(item.statistic_id);
      return true;
    });
  }

  function normalizeConfiguredSource(value, role, provenance) {
    if (typeof value === 'string') {
      const statisticId = value.trim();
      return statisticId ? {
        statistic_id: statisticId,
        label: null,
        role,
        provenance,
        included_in_stat: null,
      } : null;
    }
    if (!value || typeof value !== 'object') return null;
    const rawId = value.statistic_id || value.stat_consumption || value.stat_energy_from || value.stat_cost;
    const statisticId = typeof rawId === 'string' ? rawId.trim() : '';
    if (!statisticId) return null;
    const included = typeof value.included_in_stat === 'string' && value.included_in_stat.trim()
      ? value.included_in_stat.trim()
      : null;
    return {
      statistic_id: statisticId,
      label: typeof value.label === 'string' && value.label.trim()
        ? value.label.trim()
        : (typeof value.name === 'string' && value.name.trim() ? value.name.trim() : null),
      role,
      provenance,
      included_in_stat: included,
    };
  }

  function normalizeList(value, role, provenance) {
    const list = Array.isArray(value) ? value : (value == null ? [] : [value]);
    return uniqueById(list.map((item) => normalizeConfiguredSource(item, role, provenance)).filter(Boolean));
  }

  function asDate(value) {
    if (value instanceof Date) return new Date(value.getTime());
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date : null;
  }

  function numericTime(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    const date = asDate(value);
    return date ? date.getTime() : null;
  }

  class HASmartReports extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._hass = null;
      this._config = {
        title: 'Smart Reports',
        show_energy: true,
        show_automations: true,
        show_system: true,
        energy_source_mode: 'dashboard',
        energy_total_statistics: [],
        energy_device_statistics: [],
        energy_cost_statistics: [],
        energy_entity: null,
        energy_price: null,
        currency: null,
      };
      this._activeTab = 'energy';
      this._period = '7d';
      this._connected = false;
      this._scaffoldRendered = false;
      this._refreshTimer = null;
      this._refreshThrottleMs = 10000;
      this._lastRefreshStartedAt = 0;
      this._energyRequestGeneration = 0;
      this._energyViewState = { status: 'idle' };
      this._now = () => new Date();
    }

    connectedCallback() {
      this._connected = true;
      this._renderScaffold();
      this._syncTabs();
      if (this._hass) this._scheduleRefresh(true);
    }

    disconnectedCallback() {
      this._connected = false;
      if (this._refreshTimer !== null) clearTimeout(this._refreshTimer);
      this._refreshTimer = null;
      this._invalidateEnergyRequest();
    }

    set hass(hass) {
      this._hass = hass;
      this._syncTheme();
      if (this._connected && hass) this._scheduleRefresh(false);
    }

    get hass() {
      return this._hass;
    }

    setConfig(config) {
      const next = config && typeof config === 'object' ? config : {};
      const hasRate = Object.prototype.hasOwnProperty.call(next, 'energy_price');
      const currency = typeof next.currency === 'string' && next.currency.trim() ? next.currency.trim() : null;
      this._config = {
        title: typeof next.title === 'string' && next.title.trim() ? next.title.trim() : 'Smart Reports',
        show_energy: next.show_energy !== false,
        show_automations: next.show_automations !== false,
        show_system: next.show_system !== false,
        energy_source_mode: next.energy_source_mode === 'explicit' ? 'explicit' : 'dashboard',
        energy_total_statistics: Array.isArray(next.energy_total_statistics) ? next.energy_total_statistics : [],
        energy_device_statistics: Array.isArray(next.energy_device_statistics) ? next.energy_device_statistics : [],
        energy_cost_statistics: Array.isArray(next.energy_cost_statistics) ? next.energy_cost_statistics : [],
        energy_entity: typeof next.energy_entity === 'string' && next.energy_entity.trim() ? next.energy_entity.trim() : null,
        energy_price: hasRate && typeof next.energy_price === 'number' && Number.isFinite(next.energy_price) && next.energy_price >= 0
          ? next.energy_price
          : null,
        currency,
      };
      if (this._scaffoldRendered) {
        this._invalidateEnergyRequest();
        this._syncTabs();
        this._scheduleRefresh(true);
      }
    }

    getCardSize() { return 5; }

    getGridOptions() { return { rows: 5, columns: 12, min_rows: 3, min_columns: 6 }; }

    static getStubConfig() { return { title: 'Smart Reports', energy_source_mode: 'dashboard' }; }

    static getConfigElement() { return document.createElement('ha-smart-reports-editor'); }

    _renderScaffold() {
      if (this._scaffoldRendered) return;
      this.shadowRoot.innerHTML = `
        <style>
          :host{--sr-primary:var(--primary-color,#3b82f6);--sr-card:var(--card-background-color,var(--ha-card-background,#fff));--sr-text:var(--primary-text-color,#172033);--sr-muted:var(--secondary-text-color,#667085);--sr-border:var(--divider-color,#d9e0ea);--sr-good:#15803d;--sr-warn:#b45309;--sr-bad:#b42318;display:block;color:var(--sr-text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}*{box-sizing:border-box}.card{background:var(--sr-card);border:1px solid var(--sr-border);border-radius:16px;overflow:hidden}.header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:18px 20px 12px}h2,h3,p{margin:0}h2{font-size:20px}h3{font-size:15px}.tabs{display:flex;gap:4px;padding:0 16px;border-bottom:1px solid var(--sr-border);overflow-x:auto}button,select{font:inherit}button{cursor:pointer}button:focus-visible,select:focus-visible,a:focus-visible{outline:2px solid var(--sr-primary);outline-offset:2px}.tab{border:0;border-bottom:3px solid transparent;background:transparent;color:var(--sr-muted);padding:10px 12px}.tab.active{color:var(--sr-primary);border-bottom-color:var(--sr-primary);font-weight:650}.toolbar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;padding:14px 20px 0}.toolbar-actions{display:flex;flex-wrap:wrap;gap:8px}.control,.action{min-height:38px;border:1px solid var(--sr-border);border-radius:9px;background:var(--sr-card);color:var(--sr-text);padding:8px 11px}.action.primary{background:var(--sr-primary);border-color:var(--sr-primary);color:#fff}.action:disabled{cursor:not-allowed;opacity:.45}.pane{padding:20px;min-height:220px}.state{display:grid;gap:12px;place-items:start;padding:22px;border:1px solid var(--sr-border);border-radius:12px}.state[role="status"]{border-left:4px solid var(--sr-primary)}.state.partial{border-left-color:var(--sr-warn)}.state.error{border-left-color:var(--sr-bad)}.summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}.metric{border:1px solid var(--sr-border);border-radius:12px;padding:14px}.metric-label,.muted{color:var(--sr-muted);font-size:12px}.metric-value{margin-top:5px;font-size:23px;font-weight:720}.section{margin-top:18px}.list{display:grid;gap:8px;margin-top:10px}.row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;border-bottom:1px solid var(--sr-border);padding:9px 2px}.row.child{padding-left:24px}.row-name{overflow-wrap:anywhere}.status-ready{color:var(--sr-good)}.warning{color:var(--sr-warn)}.fixed-link{color:var(--sr-primary)}.donate-section{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:10px;border-top:1px solid var(--sr-border);padding:13px 18px;color:var(--sr-muted);font-size:12px}.donate-section a{color:var(--sr-primary);text-decoration:none}[hidden]{display:none!important}@media(max-width:520px){.header,.toolbar{align-items:stretch;flex-direction:column}.toolbar-actions{width:100%}.action{flex:1}}
        </style>
        <ha-card class="card">
          <div class="header"><h2 id="title"></h2><span class="muted">Recorder-backed</span></div>
          <nav class="tabs" id="tabs" aria-label="Report sections">
            <button class="tab" type="button" data-tab="energy">Energy</button>
            <button class="tab" type="button" data-tab="automations">Automations</button>
            <button class="tab" type="button" data-tab="system">System</button>
          </nav>
          <div class="toolbar" id="energyToolbar">
            <label>Period <select class="control" id="periodSelect" aria-label="Energy report period"><option value="1d">Today</option><option value="7d">7 days</option><option value="30d">30 days</option></select></label>
            <div class="toolbar-actions"><button class="action" type="button" id="exportCsvBtn" disabled>Export CSV</button><button class="action primary" type="button" id="exportJsonBtn" disabled>Export JSON</button></div>
          </div>
          <main class="pane" id="content"></main>
          <footer class="donate-section" data-source="own-card"><span>Support HA Tools</span><a href="https://buymeacoffee.com/macsiem" target="_blank" rel="noopener noreferrer">Buy me a coffee</a><a href="https://www.paypal.com/donate/?hosted_button_id=Y967H4PLRBN8W" target="_blank" rel="noopener noreferrer">PayPal</a></footer>
        </ha-card>`;
      this._scaffoldRendered = true;
      this.shadowRoot.getElementById('periodSelect').value = this._period;
      this.shadowRoot.getElementById('periodSelect').addEventListener('change', (event) => {
        const period = VALID_PERIODS.has(event.target.value) ? event.target.value : '7d';
        if (period === this._period) return;
        this._period = period;
        this._invalidateEnergyRequest();
        this._scheduleRefresh(true);
      });
      for (const button of this.shadowRoot.querySelectorAll('[data-tab]')) button.addEventListener('click', () => this._selectTab(button.dataset.tab));
      this.shadowRoot.getElementById('exportJsonBtn').addEventListener('click', () => this._downloadExport('json'));
      this.shadowRoot.getElementById('exportCsvBtn').addEventListener('click', () => this._downloadExport('csv'));
    }

    _syncTheme() {
      if (this._hass) this.classList.toggle('bento-dark', Boolean(this._hass.themes && this._hass.themes.darkMode));
    }

    _availableTabs() {
      const result = [];
      if (this._config.show_energy) result.push('energy');
      if (this._config.show_automations) result.push('automations');
      if (this._config.show_system) result.push('system');
      return result;
    }

    _syncTabs() {
      if (!this._scaffoldRendered) return;
      const available = this._availableTabs();
      if (!available.includes(this._activeTab)) this._activeTab = available[0] || null;
      this.shadowRoot.getElementById('title').textContent = this._config.title;
      this.shadowRoot.getElementById('tabs').hidden = available.length === 0;
      for (const button of this.shadowRoot.querySelectorAll('[data-tab]')) {
        const tab = button.dataset.tab;
        button.hidden = !available.includes(tab);
        button.classList.toggle('active', tab === this._activeTab);
        button.setAttribute('aria-selected', String(tab === this._activeTab));
      }
      this.shadowRoot.getElementById('energyToolbar').hidden = this._activeTab !== 'energy';
      if (this._activeTab === null) {
        const container = this.shadowRoot.getElementById('content');
        container.replaceChildren(this._stateBlock('Enable at least one report section.', 'Turn on Energy, Automations, or System in the card configuration.', '', 'status'));
      } else if (this._activeTab === 'energy') this._renderEnergyState();
      else if (this._activeTab === 'automations') this._renderAutomations();
      else this._renderSystem();
    }

    _selectTab(tab) {
      if (!this._availableTabs().includes(tab) || tab === this._activeTab) return;
      if (this._activeTab === 'energy') this._invalidateEnergyRequest();
      this._activeTab = tab;
      this._syncTabs();
      this._scheduleRefresh(true);
    }

    _scheduleRefresh(immediate) {
      if (!this._connected || !this._hass) return;
      if (immediate && this._refreshTimer !== null) {
        clearTimeout(this._refreshTimer);
        this._refreshTimer = null;
      }
      if (this._refreshTimer !== null) return;
      const elapsed = Date.now() - this._lastRefreshStartedAt;
      const delay = immediate ? 0 : Math.max(0, this._refreshThrottleMs - elapsed);
      this._refreshTimer = setTimeout(() => {
        this._refreshTimer = null;
        this._runRefresh();
      }, delay);
    }

    async _runRefresh() {
      if (!this._connected || !this._hass) return;
      this._lastRefreshStartedAt = Date.now();
      try {
        if (this._activeTab === null) return;
        if (this._activeTab === 'energy') await this._loadEnergy();
        else if (this._activeTab === 'automations') this._renderAutomations();
        else this._renderSystem();
      } catch (error) {
        if (this._activeTab === 'energy' && this._connected) this._setEnergyViewState(this._errorState(error, this._periodDescriptor()));
      }
    }

    _errorState(error, period) {
      return {
        status: this._classifyError(error),
        code: error && error.code != null ? String(error.code) : 'unknown_error',
        period,
        source_mode: this._config.energy_source_mode === 'explicit' ? 'explicit' : 'energy_dashboard',
        total: { value: null, unit: 'kWh', source_statistic_ids: [] },
        cost: { value: null, currency: null, method: 'unavailable', rate: null, source_statistic_ids: [], reason: 'request_failed' },
        devices: [], total_sources: [], cost_sources: [], warnings: [],
      };
    }

    _invalidateEnergyRequest() { this._energyRequestGeneration += 1; }

    _isCurrentEnergyRequest(generation) { return this._connected && this.isConnected && this._activeTab === 'energy' && generation === this._energyRequestGeneration; }

    _classifyError(error) {
      const code = error && error.code != null ? String(error.code).toLowerCase() : '';
      const message = error && error.message ? String(error.message).toLowerCase() : '';
      if (code === '401' || code === '403' || code.includes('unauthorized') || message.includes('unauthorized') || message.includes('forbidden')) return 'permission_denied';
      if (code === '404' || code === 'unknown_command' || message.includes('unknown command')) return 'unsupported';
      return 'error';
    }

    _timeZone() {
      const configured = this._hass && this._hass.config && this._hass.config.time_zone;
      if (typeof configured === 'string' && configured) return configured;
      try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (_error) { return 'UTC'; }
    }

    _partsInZone(date, timeZone) {
      const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(date);
      const result = {};
      for (const part of parts) if (part.type !== 'literal') result[part.type] = Number(part.value);
      return result;
    }

    _zonedDateTimeToUtc(parts, timeZone) {
      const target = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour || 0, parts.minute || 0, parts.second || 0, 0);
      let guess = target;
      for (let iteration = 0; iteration < 4; iteration += 1) {
        const actual = this._partsInZone(new Date(guess), timeZone);
        const represented = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute, actual.second, 0);
        const delta = target - represented;
        guess += delta;
        if (delta === 0) break;
      }
      return new Date(guess);
    }

    _addCalendarDays(parts, days) {
      const shifted = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
      return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() };
    }

    _zonedDayBounds(parts, timeZone) {
      const next = this._addCalendarDays(parts, 1);
      return { start: this._zonedDateTimeToUtc({ ...parts, hour: 0, minute: 0, second: 0 }, timeZone), end: this._zonedDateTimeToUtc({ ...next, hour: 0, minute: 0, second: 0 }, timeZone) };
    }

    _calendarWindow(key, nowValue, timeZone) {
      const now = asDate(nowValue) || new Date();
      const safeKey = VALID_PERIODS.has(key) ? key : '7d';
      const local = this._partsInZone(now, timeZone);
      const daysBack = safeKey === '1d' ? 0 : (safeKey === '30d' ? 29 : 6);
      const startDate = this._addCalendarDays(local, -daysBack);
      return { key: safeKey, start: this._zonedDateTimeToUtc({ ...startDate, hour: 0, minute: 0, second: 0 }, timeZone), end: now, time_zone: timeZone };
    }

    _periodDescriptor() {
      const window = this._calendarWindow(this._period, this._now(), this._timeZone());
      return { key: window.key, start: window.start.toISOString(), end: window.end.toISOString(), time_zone: window.time_zone };
    }

    async _dashboardSources(generation) {
      const prefs = await this._hass.callWS({ type: 'energy/get_prefs' });
      if (!this._isCurrentEnergyRequest(generation)) return null;
      const totals = []; const costs = []; const devices = []; const costCoverage = new Map();
      const add = (target, value, role) => {
        const normalized = normalizeConfiguredSource(value, role, 'energy_dashboard');
        if (normalized) target.push(normalized);
        return normalized;
      };
      const addGridFlow = (totalValue, costValue) => {
        const total = add(totals, totalValue, 'total');
        if (!total) return;
        const cost = add(costs, costValue, 'cost');
        costCoverage.set(total.statistic_id, Boolean(cost) || costCoverage.get(total.statistic_id) === true);
      };
      const energySources = prefs && Array.isArray(prefs.energy_sources) ? prefs.energy_sources : [];
      for (const source of energySources) {
        if (!source || source.type !== 'grid') continue;
        const hasDirectImport = typeof source.stat_energy_from === 'string' && source.stat_energy_from.trim();
        if (hasDirectImport) addGridFlow(source.stat_energy_from, source.stat_cost);
        else if (Array.isArray(source.flow_from)) for (const flow of source.flow_from) {
          addGridFlow(flow && (flow.stat_energy_from || flow.stat_energy), flow && flow.stat_cost);
        }
      }
      const consumption = prefs && Array.isArray(prefs.device_consumption) ? prefs.device_consumption : [];
      for (const device of consumption) {
        const normalized = normalizeConfiguredSource(device, 'device', 'energy_dashboard');
        if (normalized) devices.push(normalized);
      }
      let uniqueCosts = uniqueById(costs);
      const uniqueTotals = uniqueById(totals);
      if (uniqueTotals.some((total) => costCoverage.get(total.statistic_id) !== true)) {
        try {
          const info = await this._hass.callWS({ type: 'energy/info' });
          if (!this._isCurrentEnergyRequest(generation)) return null;
          const mapping = info && info.cost_sensors && typeof info.cost_sensors === 'object' ? info.cost_sensors : {};
          const discovered = [...uniqueCosts];
          for (const total of uniqueTotals) {
            if (costCoverage.get(total.statistic_id) === true) continue;
            const exact = mapping[total.statistic_id];
            const mapped = add(discovered, exact && (exact.statistic_id || exact.entity_id || exact), 'cost');
            costCoverage.set(total.statistic_id, Boolean(mapped));
          }
          uniqueCosts = uniqueById(discovered);
        } catch (error) {
          if (!this._isCurrentEnergyRequest(generation)) return null;
          if (this._classifyError(error) === 'permission_denied') throw error;
        }
      }
      const uniqueDevices = uniqueById(devices);
      const hasAnyMappedCost = [...costCoverage.values()].some(Boolean);
      const costConfigurationIncomplete = hasAnyMappedCost && [...costCoverage.values()].some((covered) => !covered);
      return { source_mode: 'energy_dashboard', totals: uniqueTotals, devices: uniqueDevices, costs: uniqueCosts, cost_configuration_incomplete: costConfigurationIncomplete, warnings: [], ordered: uniqueById([...uniqueTotals, ...uniqueCosts, ...uniqueDevices]) };
    }

    _explicitSources() {
      let totals = normalizeList(this._config.energy_total_statistics, 'total', 'explicit');
      if (totals.length === 0 && this._config.energy_entity) totals = normalizeList([this._config.energy_entity], 'total', 'legacy_energy_entity');
      const invalidTotals = totals.filter((source) => source.included_in_stat);
      totals = totals.filter((source) => !source.included_in_stat);
      const devices = normalizeList(this._config.energy_device_statistics, 'device', 'explicit');
      const costs = normalizeList(this._config.energy_cost_statistics, 'cost', 'explicit');
      return { source_mode: 'explicit', totals, devices, costs, warnings: invalidTotals.map((source) => `included_in_stat is only valid for device sources: ${source.statistic_id}`), ordered: uniqueById([...totals, ...devices, ...costs]) };
    }

    _metadataMap(response) {
      if (Array.isArray(response)) {
        const result = {};
        for (const entry of response) if (entry && typeof entry.statistic_id === 'string') result[entry.statistic_id] = entry;
        return result;
      }
      return response && typeof response === 'object' ? response : {};
    }

    _metadataUnit(metadata) {
      if (!metadata || typeof metadata !== 'object') return null;
      const unit = metadata.statistics_unit_of_measurement != null ? metadata.statistics_unit_of_measurement : metadata.unit_of_measurement;
      return typeof unit === 'string' && unit ? unit : null;
    }

    _summarizeSeries(series, metadata, window, role, expectedCurrency) {
      const unit = this._metadataUnit(metadata);
      if (!metadata || metadata.has_sum !== true) return { status: 'unsupported', value: null, unit };
      const unitClass = metadata.unit_class == null ? null : String(metadata.unit_class);
      if (role !== 'cost' && (!ENERGY_UNITS.has(unit) || (unitClass !== null && unitClass !== 'energy'))) return { status: 'unsupported', value: null, unit, reason: 'incompatible_energy_metadata' };
      if (role === 'cost' && (!unit || (unitClass !== null && unitClass !== 'currency') || typeof expectedCurrency !== 'string' || unit !== expectedCurrency)) return { status: 'unsupported', value: null, unit, reason: 'incompatible_currency_metadata' };
      const normalizedUnit = role === 'cost' ? unit : 'kWh';
      if (!Array.isArray(series) || series.length === 0) return { status: 'no_data', value: null, unit: normalizedUnit, reason: 'no_data' };
      const buckets = series.map((bucket) => ({ start: numericTime(bucket && bucket.start), end: numericTime(bucket && bucket.end), change: bucket && bucket.change }));
      if (buckets.some((bucket) => bucket.start === null || bucket.end === null || bucket.end <= bucket.start)) return { status: 'invalid', value: null, unit: normalizedUnit, reason: 'invalid_bucket' };
      buckets.sort((left, right) => left.start - right.start);
      const windowStart = window && asDate(window.start); const windowEnd = window && asDate(window.end);
      let effectiveBuckets = buckets;
      let startMs = null; let endMs = null;
      if (windowStart && windowEnd && windowEnd > windowStart) {
        startMs = windowStart.getTime(); endMs = windowEnd.getTime();
        if (buckets.some((bucket) => bucket.end < startMs || bucket.start > endMs)) return { status: 'invalid', value: null, unit: normalizedUnit, reason: 'outside_requested_window' };
        effectiveBuckets = buckets.filter((bucket) => bucket.end > startMs && bucket.start < endMs);
        if (effectiveBuckets.length === 0) return { status: 'no_data', value: null, unit: normalizedUnit, reason: 'no_data' };
      }
      if (effectiveBuckets.some((bucket) => bucket.change === undefined || bucket.change === null)) return { status: 'partial', value: null, unit: normalizedUnit, reason: 'missing_change' };
      if (effectiveBuckets.some((bucket) => typeof bucket.change !== 'number' || !Number.isFinite(bucket.change))) return { status: 'invalid', value: null, unit: normalizedUnit };
      if (role !== 'cost' && effectiveBuckets.some((bucket) => bucket.change < 0)) return { status: 'invalid', value: null, unit: normalizedUnit };
      for (let index = 1; index < effectiveBuckets.length; index += 1) {
        if (effectiveBuckets[index].start < effectiveBuckets[index - 1].end) return { status: 'invalid', value: null, unit: normalizedUnit };
        if (effectiveBuckets[index].start - effectiveBuckets[index - 1].end > 1000) return { status: 'partial', value: null, unit: normalizedUnit };
      }
      if (startMs !== null && endMs !== null) {
        if (effectiveBuckets[0].start - startMs > 3601000 || endMs - effectiveBuckets[effectiveBuckets.length - 1].end > 3601000) return { status: 'partial', value: null, unit: normalizedUnit, reason: 'incomplete_coverage' };
      }
      let value = effectiveBuckets.reduce((sum, bucket) => sum + bucket.change, 0);
      if (role !== 'cost') {
        if (unit === 'Wh') value /= 1000;
        else if (unit === 'MWh') value *= 1000;
      }
      return Number.isFinite(value) ? { status: 'ready', value, unit: normalizedUnit } : { status: 'invalid', value: null, unit: normalizedUnit };
    }

    _buildDeviceRows(sources) {
      const byId = new Map(sources.map((source) => [source.statistic_id, source]));
      const missingParentIds = new Set(sources.filter((source) => source.included_in_stat && !byId.has(source.included_in_stat)).map((source) => source.statistic_id));
      let relationshipStatus = missingParentIds.size > 0 ? 'nested_parent_missing' : 'valid';
      const visitState = new Map();
      const visit = (source) => {
        const current = visitState.get(source.statistic_id) || 0;
        if (current === 1) return false;
        if (current === 2) return true;
        visitState.set(source.statistic_id, 1);
        if (source.included_in_stat) {
          const parent = byId.get(source.included_in_stat);
          if (parent && !visit(parent)) return false;
        }
        visitState.set(source.statistic_id, 2);
        return true;
      };
      if (sources.some((source) => !visit(source))) relationshipStatus = 'invalid_relationship';
      if (relationshipStatus === 'invalid_relationship') return { rows: sources.map((source) => ({ ...source, relationship_status: 'invalid_relationship', depth: 0 })), relationship_status: relationshipStatus, top_ranking_available: false };
      if (relationshipStatus === 'nested_parent_missing') return {
        rows: sources.map((source) => ({ ...source, relationship_status: missingParentIds.has(source.statistic_id) ? 'nested_parent_missing' : 'valid', depth: missingParentIds.has(source.statistic_id) ? 1 : 0 })),
        relationship_status: relationshipStatus,
        top_ranking_available: false,
      };
      const children = new Map();
      for (const source of sources) if (source.included_in_stat) {
        if (!children.has(source.included_in_stat)) children.set(source.included_in_stat, []);
        children.get(source.included_in_stat).push(source);
      }
      const valueOrder = (left, right) => (right.status === 'ready' ? right.value : Number.NEGATIVE_INFINITY) - (left.status === 'ready' ? left.value : Number.NEGATIVE_INFINITY) || left.statistic_id.localeCompare(right.statistic_id);
      const roots = sources.filter((source) => !source.included_in_stat).sort(valueOrder); const rows = [];
      const append = (source, depth) => { rows.push({ ...source, depth }); for (const child of (children.get(source.statistic_id) || []).sort(valueOrder)) append(child, depth + 1); };
      for (const root of roots) append(root, 0);
      return { rows, relationship_status: 'valid', top_ranking_available: true };
    }

    _calculateCost(total, costSources, config) {
      const configured = Array.isArray(costSources) ? costSources : [];
      if (configured.length > 0) {
        if (configured.some((source) => source.reason === 'incompatible_currency_metadata')) return { value: null, currency: null, method: 'unavailable', rate: null, source_statistic_ids: configured.map((source) => source.statistic_id), reason: 'currency_mismatch' };
        if (configured.some((source) => source.status !== 'ready')) return { value: null, currency: null, method: 'unavailable', rate: null, source_statistic_ids: configured.map((source) => source.statistic_id), reason: 'partial_cost' };
        const currencies = [...new Set(configured.map((source) => source.unit))];
        if (currencies.length !== 1) return { value: null, currency: null, method: 'unavailable', rate: null, source_statistic_ids: configured.map((source) => source.statistic_id), reason: 'currency_mismatch' };
        return { value: configured.reduce((sum, source) => sum + source.value, 0), currency: currencies[0], method: 'cost_statistics', rate: null, source_statistic_ids: configured.map((source) => source.statistic_id), reason: null };
      }
      if (typeof config.energy_price !== 'number' || !Number.isFinite(config.energy_price) || config.energy_price < 0) return { value: null, currency: config.currency || null, method: 'unavailable', rate: null, source_statistic_ids: [], reason: 'missing_rate' };
      if (typeof config.currency !== 'string' || !config.currency.trim()) return { value: null, currency: null, method: 'unavailable', rate: config.energy_price, source_statistic_ids: [], reason: 'missing_currency' };
      if (!total || typeof total.value !== 'number' || !Number.isFinite(total.value)) return { value: null, currency: config.currency, method: 'unavailable', rate: config.energy_price, source_statistic_ids: [], reason: 'energy_data_unavailable' };
      return { value: total.value * config.energy_price, currency: config.currency, method: 'flat_rate_estimate', rate: config.energy_price, source_statistic_ids: Array.isArray(total.source_statistic_ids) ? [...total.source_statistic_ids] : [], reason: null };
    }

    async _loadEnergy() {
      const generation = ++this._energyRequestGeneration;
      const period = this._periodDescriptor();
      const mode = this._config.energy_source_mode === 'explicit' ? 'explicit' : 'energy_dashboard';
      this._setEnergyViewState({ status: 'loading', period, source_mode: mode, total: { value: null, unit: 'kWh', source_statistic_ids: [] }, cost: { value: null, currency: null, method: 'unavailable', rate: null, source_statistic_ids: [], reason: 'loading' }, devices: [], warnings: [] });
      try {
        const selection = mode === 'explicit' ? this._explicitSources() : await this._dashboardSources(generation);
        if (!selection || !this._isCurrentEnergyRequest(generation)) return;
        if (selection.totals.length === 0) {
          this._setEnergyViewState({ status: 'not_configured', period, source_mode: selection.source_mode, total: { value: null, unit: 'kWh', source_statistic_ids: [] }, cost: { value: null, currency: null, method: 'unavailable', rate: null, source_statistic_ids: [], reason: 'not_configured' }, devices: [], total_sources: [], cost_sources: [], warnings: [...(selection.warnings || [])] });
          return;
        }
        const ids = selection.ordered.map((source) => source.statistic_id);
        const metadataResponse = await this._hass.callWS({ type: 'recorder/get_statistics_metadata', statistic_ids: ids });
        if (!this._isCurrentEnergyRequest(generation)) return;
        const statisticsResponse = await this._hass.callWS({ type: 'recorder/statistics_during_period', start_time: period.start, end_time: period.end, statistic_ids: ids, period: 'hour', types: ['change'] });
        if (!this._isCurrentEnergyRequest(generation)) return;
        const metadataById = this._metadataMap(metadataResponse); const statisticsById = statisticsResponse && typeof statisticsResponse === 'object' ? statisticsResponse : {};
        const window = { start: new Date(period.start), end: new Date(period.end) };
        const expectedCurrency = this._hass && this._hass.config && this._hass.config.currency;
        const roleReferences = [...selection.totals, ...selection.costs, ...selection.devices];
        const summaryByRole = new Map(roleReferences.map((source) => [`${source.role}:${source.statistic_id}`, this._summarizeSeries(statisticsById[source.statistic_id], metadataById[source.statistic_id], window, source.role, expectedCurrency)]));
        const materialize = (source) => ({ ...source, ...summaryByRole.get(`${source.role}:${source.statistic_id}`), label: source.label || source.statistic_id });
        const totalSources = selection.totals.map(materialize);
        const costSources = selection.costs.map(materialize);
        const deviceSources = selection.devices.map(materialize);
        let status = 'ready';
        if (totalSources.every((source) => source.status === 'no_data')) status = 'no_data';
        else if (totalSources.every((source) => source.status === 'unsupported')) status = 'unsupported';
        else if (totalSources.some((source) => source.status !== 'ready')) status = 'partial';
        const completeTotal = status === 'ready'
          ? { status: 'ready', value: totalSources.reduce((sum, source) => sum + source.value, 0), unit: 'kWh', source_statistic_ids: totalSources.map((source) => source.statistic_id) }
          : { status, value: null, unit: 'kWh', source_statistic_ids: totalSources.map((source) => source.statistic_id) };
        let cost = this._calculateCost(completeTotal, costSources, this._config);
        if (selection.cost_configuration_incomplete) cost = { value: null, currency: null, method: 'unavailable', rate: null, source_statistic_ids: costSources.map((source) => source.statistic_id), reason: 'partial_cost' };
        if (status !== 'ready') {
          const reason = status === 'no_data' ? 'no_data' : (status === 'unsupported' ? 'unsupported_source' : 'partial_energy');
          cost = { ...cost, value: null, method: 'unavailable', reason };
        }
        const deviceModel = this._buildDeviceRows(deviceSources);
        const deviceDataStatus = deviceSources.some((source) => source.status !== 'ready') ? 'partial' : 'ready';
        const warnings = [...(selection.warnings || [])];
        if (deviceModel.relationship_status !== 'valid') warnings.push(deviceModel.relationship_status);
        this._setEnergyViewState({ status, period, source_mode: selection.source_mode, total: completeTotal, cost, devices: deviceModel.rows, total_sources: totalSources, cost_sources: costSources, device_data_status: deviceDataStatus, device_relationship_status: deviceModel.relationship_status, top_ranking_available: deviceModel.top_ranking_available, warnings });
      } catch (error) {
        if (this._isCurrentEnergyRequest(generation)) this._setEnergyViewState(this._errorState(error, period));
      }
    }

    _setEnergyViewState(state) { this._energyViewState = state; if (this._scaffoldRendered && this._activeTab === 'energy') this._renderEnergyState(); }

    _stateBlock(title, detail, className, role) {
      const block = document.createElement('section'); block.className = `state ${className || ''}`.trim(); if (role) block.setAttribute('role', role);
      const heading = document.createElement('h3'); heading.textContent = title; block.appendChild(heading);
      if (detail) { const paragraph = document.createElement('p'); paragraph.className = 'muted'; paragraph.textContent = detail; block.appendChild(paragraph); }
      return block;
    }

    _renderEnergyState() {
      if (!this._scaffoldRendered) return;
      const container = this.shadowRoot.getElementById('content'); const state = this._energyViewState || { status: 'idle' };
      const exportable = ['ready', 'partial', 'no_data'].includes(state.status);
      this.shadowRoot.getElementById('exportJsonBtn').disabled = !exportable; this.shadowRoot.getElementById('exportCsvBtn').disabled = !exportable; container.replaceChildren();
      if (state.status === 'loading' || state.status === 'idle') { container.appendChild(this._stateBlock('Loading recorder statistics…', 'This report uses recorded changes for the selected local-calendar period.', '', 'status')); return; }
      if (state.status === 'not_configured') {
        const block = this._stateBlock('Configure Energy Dashboard or select explicit statistics.', 'Smart Reports does not discover sensors by substring and does not use live entity states.', '', 'status');
        for (const warningText of state.warnings || []) { const warning = document.createElement('p'); warning.className = 'warning'; warning.textContent = warningText; block.appendChild(warning); }
        const link = document.createElement('a'); link.className = 'fixed-link'; link.href = '/config/energy'; link.textContent = 'Open Energy configuration'; block.appendChild(link); container.appendChild(block); return;
      }
      if (state.status === 'unsupported') { container.appendChild(this._stateBlock('Recorder statistics are unavailable on this Home Assistant instance.', 'Check recorder support and the selected statistic metadata.', 'error', 'alert')); return; }
      if (state.status === 'permission_denied') { container.appendChild(this._stateBlock('Your account cannot read the selected statistics.', 'Use an account with recorder statistics access.', 'error', 'alert')); return; }
      if (state.status === 'error') {
        const block = this._stateBlock('Couldn’t load energy statistics.', 'The previous period is not shown as current data.', 'error', 'alert');
        const details = document.createElement('details'); const summary = document.createElement('summary'); summary.textContent = 'Technical details'; const code = document.createElement('code'); code.textContent = state.code == null ? 'unknown_error' : String(state.code); details.append(summary, code); block.appendChild(details);
        const retry = document.createElement('button'); retry.type = 'button'; retry.className = 'action'; retry.textContent = 'Retry'; retry.addEventListener('click', () => this._scheduleRefresh(true), { once: true }); block.appendChild(retry); container.appendChild(block); return;
      }
      if (state.status === 'no_data') { container.appendChild(this._stateBlock('No recorded energy change in this period.', 'Measured zero is rendered separately; this state means no recorder samples were available.', '', 'status')); return; }
      if (state.status === 'partial') container.appendChild(this._stateBlock('Partial data — totals and cost are withheld.', 'At least one required statistic was missing, invalid, incomplete, or used an incompatible currency.', 'partial', 'status'));
      if (!['ready', 'partial'].includes(state.status)) return;
      const period = state.period || {}; const context = document.createElement('p'); context.className = 'muted report-context';
      const timeZone = period.time_zone || this._timeZone();
      const periodLabel = period.key === '1d' ? 'Today' : (period.key === '30d' ? '30 days' : (period.key === '7d' ? '7 days' : (period.key || '—')));
      context.textContent = `Period: ${periodLabel} · ${this._formatPeriodDate(period.start, timeZone)} – ${this._formatPeriodDate(period.end, timeZone)} · Time zone: ${timeZone} · Sources: ${(state.total_sources || []).length} total, ${(state.cost_sources || []).length} cost`;
      context.dataset.periodStart = period.start || '';
      context.dataset.periodEnd = period.end || '';
      context.title = `Exact recorder window: ${period.start || '—'} → ${period.end || '—'}`;
      container.appendChild(context);
      const summary = document.createElement('section'); summary.className = 'summary';
      summary.appendChild(this._metric('Grid import', `${this._formatNumber(state.total.value, 1)} ${state.total.unit || 'kWh'}`));
      const costLabel = state.cost && state.cost.method === 'cost_statistics' ? 'Actual cost' : (state.cost && state.cost.method === 'flat_rate_estimate' ? 'Estimated cost' : 'Cost unavailable');
      const costValue = state.cost && typeof state.cost.value === 'number' ? `${this._formatNumber(state.cost.value, 2)} ${state.cost.currency || ''}`.trim() : '—';
      summary.appendChild(this._metric(costLabel, costValue)); container.appendChild(summary);
      const deviceSection = document.createElement('section'); deviceSection.className = 'section'; const deviceHeading = document.createElement('h3'); deviceHeading.textContent = state.top_ranking_available === false ? 'Device breakdown unavailable' : (state.device_data_status === 'partial' ? 'Reported devices — partial' : 'Device breakdown'); deviceSection.appendChild(deviceHeading);
      const list = document.createElement('div'); list.className = 'list';
      for (const device of state.devices || []) {
        const row = document.createElement('div'); row.className = `row${device.depth > 0 ? ' child' : ''}`; const name = document.createElement('span'); name.className = 'row-name'; name.textContent = device.label || device.statistic_id; const value = document.createElement('span'); value.className = device.status === 'ready' ? 'status-ready' : 'warning'; value.textContent = device.status === 'ready' ? `${this._formatNumber(device.value, 1)} ${device.unit || 'kWh'}` : device.status; row.append(name, value); list.appendChild(row);
      }
      if ((state.devices || []).length === 0) { const empty = document.createElement('p'); empty.className = 'muted'; empty.textContent = 'No device statistics are configured.'; list.appendChild(empty); }
      deviceSection.appendChild(list); container.appendChild(deviceSection);
      const evidence = document.createElement('section'); evidence.className = 'section';
      const evidenceHeading = document.createElement('h3'); evidenceHeading.textContent = 'Source evidence'; evidence.appendChild(evidenceHeading);
      const evidenceList = document.createElement('div'); evidenceList.className = 'list';
      for (const source of [...(state.total_sources || []), ...(state.cost_sources || [])]) {
        const row = document.createElement('div'); row.className = 'row';
        const name = document.createElement('span'); name.className = 'row-name'; const sourceLabel = source.label || source.statistic_id; name.textContent = sourceLabel === source.statistic_id ? source.statistic_id : `${sourceLabel} (${source.statistic_id})`;
        const detail = document.createElement('span'); detail.className = source.status === 'ready' ? 'status-ready' : 'warning'; detail.textContent = source.reason ? `${source.status}: ${source.reason}` : source.status;
        row.append(name, detail); evidenceList.appendChild(row);
      }
      for (const warningText of state.warnings || []) { const warning = document.createElement('p'); warning.className = 'warning'; warning.textContent = warningText; evidenceList.appendChild(warning); }
      evidence.appendChild(evidenceList); container.appendChild(evidence);
    }

    _metric(labelText, valueText) {
      const metric = document.createElement('div'); metric.className = 'metric'; const label = document.createElement('div'); label.className = 'metric-label'; label.textContent = labelText; const value = document.createElement('div'); value.className = 'metric-value'; value.textContent = valueText; metric.append(label, value); return metric;
    }

    _formatNumber(value, digits) {
      if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
      try { return new Intl.NumberFormat(this._hass && this._hass.language ? this._hass.language : navigator.language, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value); } catch (_error) { return value.toFixed(digits); }
    }

    _formatPeriodDate(value, timeZone) {
      const date = asDate(value);
      if (!date) return '—';
      const language = this._hass && this._hass.language ? this._hass.language : navigator.language;
      try { return new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeZone }).format(date); } catch (_error) { return date.toISOString().slice(0, 10); }
    }

    _timeAgo(value) {
      const date = asDate(value);
      if (!date) return 'Never';
      const now = asDate(this._now()) || new Date();
      const difference = Math.max(0, now.getTime() - date.getTime());
      if (difference < 60000) return 'now';
      if (difference < 3600000) return `${Math.floor(difference / 60000)}m`;
      if (difference < 86400000) return `${Math.floor(difference / 3600000)}h`;
      return `${Math.floor(difference / 86400000)}d`;
    }

    _renderAutomations() {
      if (!this._scaffoldRendered || this._activeTab !== 'automations') return;
      const container = this.shadowRoot.getElementById('content'); container.replaceChildren(); const states = this._hass && this._hass.states ? this._hass.states : {};
      const automations = Object.entries(states).filter(([entityId]) => entityId.startsWith('automation.')).map(([entityId, state]) => ({ entity_id: entityId, label: state && state.attributes && state.attributes.friendly_name ? String(state.attributes.friendly_name) : entityId, state: state && state.state != null ? String(state.state) : 'unknown', last_triggered: state && state.attributes ? state.attributes.last_triggered : null })).sort((left, right) => {
        const leftTime = asDate(left.last_triggered); const rightTime = asDate(right.last_triggered);
        if (leftTime && rightTime) return rightTime - leftTime;
        if (leftTime) return -1;
        if (rightTime) return 1;
        return left.label.localeCompare(right.label);
      });
      const now = asDate(this._now()) || new Date();
      const active = automations.filter((automation) => automation.state === 'on').length;
      const disabled = automations.filter((automation) => automation.state === 'off').length;
      const triggeredToday = automations.filter((automation) => {
        const triggered = asDate(automation.last_triggered);
        return triggered && now - triggered < 86400000;
      }).length;
      const summary = document.createElement('div'); summary.className = 'summary'; summary.append(this._metric('Total automations', String(automations.length)), this._metric('Active', String(active)), this._metric('Disabled', String(disabled)), this._metric('Triggered today', String(triggeredToday))); container.appendChild(summary);
      const heading = document.createElement('h3'); heading.className = 'section'; heading.textContent = 'Recent activity'; container.appendChild(heading); const list = document.createElement('div'); list.className = 'list';
      for (const automation of automations.slice(0, 10)) { const row = document.createElement('div'); row.className = 'row'; const name = document.createElement('span'); name.className = 'row-name'; name.textContent = automation.label; const status = document.createElement('span'); status.textContent = `${this._timeAgo(automation.last_triggered)} · ${automation.state}`; row.append(name, status); list.appendChild(row); }
      if (automations.length === 0) { const empty = document.createElement('p'); empty.className = 'muted'; empty.textContent = 'No automation entities are available.'; list.appendChild(empty); }
      container.appendChild(list);
    }

    _renderSystem() {
      if (!this._scaffoldRendered || this._activeTab !== 'system') return;
      const container = this.shadowRoot.getElementById('content'); container.replaceChildren(); const states = this._hass && this._hass.states ? this._hass.states : {}; const entries = Object.entries(states);
      const unavailable = entries.filter(([, state]) => state && state.state === 'unavailable').length; const unknown = entries.filter(([, state]) => state && state.state === 'unknown').length; const domains = new Map();
      for (const [entityId] of entries) { const domain = entityId.split('.')[0]; domains.set(domain, (domains.get(domain) || 0) + 1); }
      const heading = document.createElement('h3'); heading.textContent = 'System overview'; container.appendChild(heading); const summary = document.createElement('div'); summary.className = 'summary section';
      for (const [label, value] of [['Entities', entries.length], ['Unavailable', unavailable], ['Unknown', unknown], ['Domains', domains.size]]) summary.appendChild(this._metric(label, String(value)));
      container.appendChild(summary); const list = document.createElement('div'); list.className = 'list section';
      for (const [domain, count] of [...domains.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))) { const row = document.createElement('div'); row.className = 'row'; const label = document.createElement('span'); label.textContent = domain; const value = document.createElement('span'); value.textContent = String(count); row.append(label, value); list.appendChild(row); }
      container.appendChild(list);
      const healthHeading = document.createElement('h3'); healthHeading.className = 'section'; healthHeading.textContent = 'Health check'; container.appendChild(healthHeading);
      const health = document.createElement('div'); health.className = 'list'; const divisor = Math.max(entries.length, 1);
      for (const [labelText, valueText] of [
        ['Entity availability', `${(((entries.length - unavailable) / divisor) * 100).toFixed(1)}%`],
        ['Known states', `${(((entries.length - unknown) / divisor) * 100).toFixed(1)}%`],
        ['Total entities', String(entries.length)],
        ['Unavailable', String(unavailable)],
        ['Unknown', String(unknown)],
      ]) {
        const row = document.createElement('div'); row.className = 'row'; const label = document.createElement('span'); label.textContent = labelText; const value = document.createElement('span'); value.textContent = valueText; row.append(label, value); health.appendChild(row);
      }
      container.appendChild(health);
    }

    _buildExportDocument(nowValue) {
      const state = this._energyViewState || {}; const period = state.period || this._periodDescriptor(); const total = state.total || {}; const cost = state.cost || {}; const generated = asDate(nowValue) || new Date();
      return {
        schema_version: 2,
        generated_at: generated.toISOString(),
        period: { key: period.key || this._period, start: period.start || null, end: period.end || null, time_zone: period.time_zone || this._timeZone() },
        source_mode: state.source_mode || (this._config.energy_source_mode === 'explicit' ? 'explicit' : 'energy_dashboard'),
        energy: {
          status: state.status || 'error',
          total: { label: 'Grid import', value: typeof total.value === 'number' && Number.isFinite(total.value) ? total.value : null, unit: total.unit || 'kWh', source_statistic_ids: Array.isArray(total.source_statistic_ids) ? [...total.source_statistic_ids] : [] },
          cost: { value: typeof cost.value === 'number' && Number.isFinite(cost.value) ? cost.value : null, currency: cost.currency || null, method: cost.method || 'unavailable', rate: typeof cost.rate === 'number' && Number.isFinite(cost.rate) ? cost.rate : null, source_statistic_ids: Array.isArray(cost.source_statistic_ids) ? [...cost.source_statistic_ids] : [], reason: cost.reason || null },
          total_sources: (state.total_sources || []).map((source) => this._exportSource(source)),
          cost_sources: (state.cost_sources || []).map((source) => this._exportSource(source)),
          devices: (state.devices || []).map((device) => ({ statistic_id: device.statistic_id, label: device.label || device.statistic_id, value: typeof device.value === 'number' && Number.isFinite(device.value) ? device.value : null, unit: device.unit || 'kWh', status: device.status || 'invalid', provenance: device.provenance || 'unknown', included_in_stat: device.included_in_stat || null })),
          warnings: Array.isArray(state.warnings) ? state.warnings.map(String) : [],
        },
      };
    }

    _exportSource(source) {
      return { statistic_id: source.statistic_id, label: source.label || source.statistic_id, role: source.role, value: typeof source.value === 'number' && Number.isFinite(source.value) ? source.value : null, unit: source.unit || null, status: source.status || 'invalid', provenance: source.provenance || 'unknown', included_in_stat: source.included_in_stat || null, reason: source.reason || null };
    }

    _csvCell(value) {
      let text = value == null ? '' : String(value); let forceQuote = false;
      if (/^[=+\-@]/.test(text)) { text = `'${text}`; forceQuote = true; }
      return forceQuote || /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    }

    _buildCsv(documentValue) {
      const report = documentValue || this._buildExportDocument(this._now());
      const header = ['schema_version', 'generated_at', 'period_key', 'period_start', 'period_end', 'time_zone', 'section', 'metric', 'statistic_id', 'label', 'value', 'unit', 'status', 'provenance', 'included_in_stat', 'reason'];
      const base = [report.schema_version, report.generated_at, report.period.key, report.period.start, report.period.end, report.period.time_zone]; const rows = [header];
      rows.push([...base, 'energy', 'total', report.energy.total.source_statistic_ids.join('|'), report.energy.total.label, report.energy.total.value, report.energy.total.unit, report.energy.status, report.source_mode, '', '']);
      rows.push([...base, 'energy', 'cost', report.energy.cost.source_statistic_ids.join('|'), report.energy.cost.method, report.energy.cost.value, report.energy.cost.currency, report.energy.cost.value == null ? (report.energy.cost.reason || 'unavailable') : 'ready', report.energy.cost.method, '', report.energy.cost.reason]);
      for (const source of report.energy.total_sources || []) rows.push([...base, 'energy', 'total_source', source.statistic_id, source.label, source.value, source.unit, source.status, source.provenance, source.included_in_stat, source.reason]);
      for (const source of report.energy.cost_sources || []) rows.push([...base, 'energy', 'cost_source', source.statistic_id, source.label, source.value, source.unit, source.status, source.provenance, source.included_in_stat, source.reason]);
      for (const device of report.energy.devices) rows.push([...base, 'energy', 'device', device.statistic_id, device.label, device.value, device.unit, device.status, device.provenance, device.included_in_stat, '']);
      return `${rows.map((row) => row.map((value) => this._csvCell(value)).join(',')).join('\n')}\n`;
    }

    _downloadExport(format) {
      const state = this._energyViewState || {}; if (!['ready', 'partial', 'no_data'].includes(state.status)) return;
      const report = this._buildExportDocument(this._now()); this._lastExportDocument = report; this._lastDownloadedExport = report; const isJson = format === 'json'; const contents = isJson ? `${JSON.stringify(report, null, 2)}\n` : this._buildCsv(report); const blob = new Blob([contents], { type: isJson ? 'application/json' : 'text/csv' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = `smart-report-${report.period.key}.${isJson ? 'json' : 'csv'}`; anchor.click(); URL.revokeObjectURL(url);
    }
  }

  class HASmartReportsEditor extends HTMLElement {
    constructor() { super(); this.attachShadow({ mode: 'open' }); this._config = {}; }
    setConfig(config) { this._config = config && typeof config === 'object' ? { ...config } : {}; this._render(); }
    set hass(hass) { this._hass = hass; }
    _render() {
      this.shadowRoot.replaceChildren();
      const style = document.createElement('style'); style.textContent = ':host{display:grid;gap:12px;padding:12px;color:var(--primary-text-color,#172033);font-family:system-ui,sans-serif}label{display:grid;gap:5px}input{font:inherit;padding:9px;border:1px solid var(--divider-color,#d9e0ea);border-radius:8px;background:var(--card-background-color,#fff);color:inherit}input:focus-visible{outline:2px solid var(--primary-color,#3b82f6);outline-offset:2px}';
      const field = (id, labelText, key) => { const label = document.createElement('label'); label.textContent = labelText; const input = document.createElement('input'); input.id = id; input.value = typeof this._config[key] === 'string' ? this._config[key] : ''; input.addEventListener('input', () => { this._config = { ...this._config, [key]: input.value }; this._dispatch(); }); label.appendChild(input); return label; };
      this.shadowRoot.append(style, field('cf_title', 'Title', 'title'), field('cf_currency', 'Currency', 'currency'));
    }
    _dispatch() { this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: { ...this._config } }, bubbles: true, composed: true })); }
  }

  customElements.define('ha-smart-reports', HASmartReports);
  customElements.define('ha-smart-reports-editor', HASmartReportsEditor);
  window.customCards = window.customCards || [];
  if (!window.customCards.some((card) => card.type === 'ha-smart-reports')) window.customCards.push({ type: 'ha-smart-reports', name: 'Smart Reports', description: 'Recorder-backed energy, automation, and system reports', preview: true, documentationURL: 'https://github.com/MacSiem/ha-smart-reports' });
  console.info(`%c HA-SMART-REPORTS %c v${VERSION} `, 'color: white; background: #2563eb; font-weight: 700;', 'color: #2563eb; background: #dbeafe;');
})();

console.info('%c HA Tools — Email & Reports %c v4.4.0 — 3 cards bundled',
  'background:#3b82f6;color:#fff;font-weight:bold;padding:2px 6px;border-radius:4px 0 0 4px;',
  'background:#e0f2fe;color:#1e40af;font-weight:bold;padding:2px 6px;border-radius:0 4px 4px 0;');
