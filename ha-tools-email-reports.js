/* GENERATED FILE — DO NOT EDIT
 * HA Tools Email Reports bundle v4.5.3
 * ha-energy-email.js — MacSiem/ha-tools-email-reports/ha-energy-email.js v4.5.1 sha256:e0c46328584577871e891487d8cd327211b063c0e24bd49fab47de0c6977bad5
 * ha-log-email.js — MacSiem/ha-tools-email-reports/ha-log-email.js v4.4.1 sha256:9c99d37b718ec97ea0a84fa13d3e260e614228716403835a36b64d0d54c8735f
 * ha-smart-reports.js — MacSiem/ha-smart-reports/ha-smart-reports.js v4.1.2 sha256:2b6421a515e8209e9a115c80f2659a842fe58359441cb669f7795a8908e44ed8
 */
/* HA Tools split — ha-energy-email compatibility shim v4.5.1 (2026-09-29) */
(function() {
'use strict';

/*
 * The Energy Email card now lives in Energy Optimizer (HACS default), which is its
 * single maintained source. This file keeps existing `type: custom:ha-energy-email`
 * cards working for people who installed HA Tools Email & Reports:
 *
 *  - If Energy Optimizer is loaded first, it owns `ha-energy-email` and this file
 *    defines nothing.
 *  - If this file is loaded first, it defines a thin wrapper that renders Energy
 *    Optimizer's card (`ha-energy-optimizer-email`) as soon as it is available, in
 *    either load order, and otherwise explains how to install Energy Optimizer.
 */
const TAG = 'ha-energy-email';
const IMPL = 'ha-energy-optimizer-email';
const NOTICE_DELAY_MS = 4000;
const _esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);

class HAEnergyEmailShim extends HTMLElement {
  static getConfigElement() {
    const Impl = customElements.get(IMPL);
    return Impl && typeof Impl.getConfigElement === 'function' ? Impl.getConfigElement() : undefined;
  }

  static getStubConfig() {
    const Impl = customElements.get(IMPL);
    return Impl && typeof Impl.getStubConfig === 'function' ? Impl.getStubConfig() : {};
  }

  constructor() {
    super();
    this._config = {};
    this._hass = null;
    this._inner = null;
    this._noticeTimer = null;
    this._waiting = false;
    this._noticeShown = false;
    this.attachShadow({ mode: 'open' });
  }

  setConfig(config) {
    this._config = config && typeof config === 'object' ? { ...config } : {};
    if (this._inner && typeof this._inner.setConfig === 'function') this._inner.setConfig(this._config);
  }

  set hass(hass) {
    this._hass = hass;
    if (this._inner) this._inner.hass = hass;
    else if (this._noticeShown) this._renderNotice();
  }

  get hass() { return this._hass; }

  connectedCallback() {
    if (this._inner) {
      if (!this._inner.isConnected) this.shadowRoot.replaceChildren(this._inner);
      return;
    }
    this.style.display = 'block';
    if (customElements.get(IMPL)) { this._mountImpl(); return; }
    if (!this._noticeShown && !this.shadowRoot.firstChild) this._renderPlaceholder();
    if (!this._waiting) {
      this._waiting = true;
      customElements.whenDefined(IMPL).then(() => { if (this.isConnected) this._mountImpl(); });
    }
    if (this._noticeTimer == null) {
      this._noticeTimer = setTimeout(() => {
        this._noticeTimer = null;
        if (!this._inner && this.isConnected) this._renderNotice();
      }, NOTICE_DELAY_MS);
    }
  }

  disconnectedCallback() {
    if (this._noticeTimer != null) { clearTimeout(this._noticeTimer); this._noticeTimer = null; }
  }

  _mountImpl() {
    if (this._inner) return;
    if (this._noticeTimer != null) { clearTimeout(this._noticeTimer); this._noticeTimer = null; }
    const inner = document.createElement(IMPL);
    try { inner.setConfig(this._config); } catch (e) { console.warn('[ha-energy-email] setConfig failed:', e); }
    if (this._hass) inner.hass = this._hass;
    this._noticeShown = false;
    this.shadowRoot.replaceChildren(inner);
    this._inner = inner;
  }

  _renderPlaceholder() {
    const card = document.createElement('ha-card');
    card.innerHTML = '<div style="padding:16px;color:var(--secondary-text-color)">Energy Email…</div>';
    this.shadowRoot.replaceChildren(card);
  }

  _renderNotice() {
    this._noticeShown = true;
    const pl = String((this._hass && this._hass.language) || (navigator.language || 'en')).toLowerCase().startsWith('pl');
    const title = pl ? 'Karta Energy Email jest teraz w Energy Optimizer' : 'The Energy Email card now lives in Energy Optimizer';
    const body = pl
      ? 'Zainstaluj <b>Energy Optimizer</b> z HACS (katalog domyślny), a następnie odśwież stronę. Ta karta zacznie działać bez zmian w konfiguracji.'
      : 'Install <b>Energy Optimizer</b> from HACS (default catalog), then reload the page. This card will start working with no configuration changes.';
    const card = document.createElement('ha-card');
    card.innerHTML = `<div style="padding:16px;line-height:1.5"><div style="font-weight:600;margin-bottom:6px">${_esc(title)}</div><div style="color:var(--secondary-text-color)">${body}</div></div>`;
    this.shadowRoot.replaceChildren(card);
  }

  getCardSize() { return this._inner && typeof this._inner.getCardSize === 'function' ? this._inner.getCardSize() : 2; }

  getGridOptions() {
    return this._inner && typeof this._inner.getGridOptions === 'function'
      ? this._inner.getGridOptions()
      : { columns: 12, min_rows: 2, min_columns: 6 };
  }
}

if (!customElements.get(TAG)) customElements.define(TAG, HAEnergyEmailShim);

window.customCards = window.customCards || [];
if (!window.customCards.some(c => c.type === TAG)) {
  window.customCards.push({ type: TAG, name: 'Energy Email Reports', description: 'Energy usage reports by email (provided by Energy Optimizer).', preview: false });
}

})();
/* HA Tools split — ha-log-email v4.4.1 (2026-09-29) — single-tool standalone repo */
(function() {
'use strict';

const _esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);

// Keep the 200 UTF-16-unit limit without emitting half of a valid pair.
// Raw JSON strings can also contain lone surrogates; replace those for UTF-8 MIME.
const _logEmailExcerpt = (text) => {
  let end = Math.min(text.length, 200);
  const last = text.charCodeAt(end - 1);
  const next = text.charCodeAt(end);
  if (end < text.length && last >= 0xD800 && last <= 0xDBFF && next >= 0xDC00 && next <= 0xDFFF) end--;
  return text.substring(0, end).replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDFFF]/g,
    pair => pair.length === 2 ? pair : '\uFFFD');
};

// BEGIN vendored ha-tools-email-history factory
// Pure ES-module factory. Vendor this function inside each consumer's own IIFE.
// Neither the controller nor renderer sends, saves, retries, or reads on open.
function createHaToolsEmailHistory({ escape = value => String(value == null ? '' : value).replace(/[&<>"']/g,
  c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]), clock = () => Date.now(),
  setTimer = setTimeout, clearTimer = clearTimeout, changed = () => {} } = {}) {
  const kinds = new Set(['manual', 'test', 'log_digest', 'energy_report']);
  const cadences = new Set(['daily', 'weekly', 'monthly']);
  const outcomes = new Set(['accepted_by_smtp', 'preparation_failed', 'authentication_failed',
    'recipients_refused', 'partial_acceptance', 'tls_failed', 'transport_outcome_unknown',
    'send_failed', 'cancelled_outcome_unknown', 'outcome_unknown']);
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const periodPattern = /^(daily:\d{4}-\d{2}-\d{2}|weekly:\d{4}-W\d{2}|monthly:\d{4}-\d{2})$/;
  let epoch = 0, context = null, pending = null, cancelPending = null;
  const empty = status => ({ status, attempts: [], limit: 128, retentionDays: 90, observedAt: null });
  const controller = { state: empty('idle'), timeoutMs: 10000 };
  const publish = state => { controller.state = state; changed(); };
  controller.discard = () => {
    epoch++;
    if (cancelPending) cancelPending();
    cancelPending = null; pending = null;
    publish(empty('idle'));
  };
  controller.setContext = hass => {
    const next = { admin: hass?.user?.is_admin === true,
      user: hass?.user?.id ?? hass?.user, connection: hass?.connection ?? null,
      online: !!hass && hass.connected !== false && hass.connection?.connected !== false,
      timezone: typeof hass?.config?.time_zone === 'string' ? hass.config.time_zone : null };
    if (context && (context.admin !== next.admin || context.user !== next.user ||
      context.connection !== next.connection || context.online !== next.online)) controller.discard();
    context = next;
    return next.admin && next.online;
  };
  function decode(value) {
    if (!value || value.schema !== 1 || value.limit !== 128 || value.retention_days !== 90 ||
      !Array.isArray(value.attempts)) return empty('unconfirmed');
    const now = clock(), cutoff = now - 90 * 86400000, seen = new Set(), rows = [];
    let partial = value.attempts.length > 128;
    for (const raw of value.attempts.slice(0, 128)) {
      const stamp = typeof raw?.timestamp === 'string' && raw.timestamp.length <= 64 &&
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(raw.timestamp) ? Date.parse(raw.timestamp) : NaN;
      if (!raw || typeof raw.id !== 'string' || !uuid.test(raw.id) ||
        !Number.isFinite(stamp) || stamp < cutoff || stamp > now || seen.has(raw.id.toLowerCase())) {
        partial = true; continue;
      }
      seen.add(raw.id.toLowerCase());
      const source = ['manual', 'schedule', 'unknown'].includes(raw.source) ? raw.source : 'unknown';
      const kind = kinds.has(raw.kind) ? raw.kind : null;
      const cadence = cadences.has(raw.cadence) ? raw.cadence : null;
      const period = typeof raw.period === 'string' && periodPattern.test(raw.period) ? raw.period : null;
      const scheduleRef = typeof raw.schedule_ref === 'string' && /^[0-9a-f]{64}$/.test(raw.schedule_ref) ? raw.schedule_ref : null;
      const recipientCount = Number.isInteger(raw.recipient_count) && raw.recipient_count >= 0 && raw.recipient_count <= 100000 ? raw.recipient_count : null;
      const outcome = outcomes.has(raw.outcome) ? raw.outcome : 'outcome_unknown';
      if (source !== raw.source || kind !== raw.kind || cadence !== raw.cadence || period !== raw.period ||
        scheduleRef !== raw.schedule_ref || recipientCount !== raw.recipient_count || outcome !== raw.outcome) partial = true;
      rows.push({ id: raw.id, timestamp: raw.timestamp, source, kind, cadence, period,
        schedule_ref: scheduleRef, recipient_count: recipientCount, outcome });
    }
    return { ...empty(partial ? 'partial' : 'ready'), attempts: rows, observedAt: new Date(now).toISOString() };
  }
  controller.refresh = hass => {
    if (!controller.setContext(hass)) return Promise.resolve(controller.state);
    if (pending) return pending;
    const token = ++epoch;
    publish(empty('loading'));
    let timer;
    const invalidated = new Promise(resolve => { cancelPending = () => resolve({ stale: true }); });
    const deadline = new Promise(resolve => { timer = setTimer(() => resolve({ timeout: true }), controller.timeoutMs); });
    const read = Promise.resolve().then(() => {
      if (token !== epoch) return { stale: true };
      return hass.callWS({ type: 'ha_tools_email/get_attempt_history' });
    }).then(value => ({ value }), () => ({ failed: true }));
    pending = Promise.race([read, deadline, invalidated]).then(result => {
      clearTimer(timer);
      if (token !== epoch) return controller.state;
      pending = null; cancelPending = null;
      if (result.stale) return controller.state;
      publish(result.timeout ? empty('unconfirmed') : result.failed ? empty('error') : decode(result.value));
      // The request epoch changes after the timeout; late results have no side effects.
      epoch++;
      return controller.state;
    });
    return pending;
  };
  controller.render = (language = 'en') => {
    const pl = language === 'pl', state = controller.state;
    let timezone = context?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    try { new Intl.DateTimeFormat('en', { timeZone: timezone }).format(); }
    catch (_) { timezone = 'UTC'; }
    const labels = pl ? ['Data', 'Źródło', 'Rodzaj', 'Częstotliwość', 'Okres', 'Odbiorcy (liczba)', 'Wynik'] :
      ['Date', 'Source', 'Kind', 'Cadence', 'Period', 'Recipient count', 'Outcome'];
    const text = {
      idle: pl ? 'Nie sprawdzono. Odśwież, aby odczytać historię serwera.' : 'Not checked. Refresh to read server history.',
      loading: pl ? 'Wczytywanie historii serwera…' : 'Loading server history…',
      error: pl ? 'Historia niedostępna. Możesz ponownie odczytać dane.' : 'History unavailable. You can read the data again.',
      unconfirmed: pl ? 'Odczyt niepotwierdzony. Nie pokazujemy wcześniejszych wierszy.' : 'Read unconfirmed. Previous rows are not shown.',
      partial: pl ? 'Częściowy odczyt: pokazano wyłącznie poprawne metadane.' : 'Partial read: only valid metadata is shown.',
      ready: state.attempts.length ? (pl ? 'Odczytano zachowaną historię.' : 'Retained history read.') :
        (pl ? 'Brak zachowanych prób wysyłki.' : 'No retained send attempts.')
    };
    const date = stamp => {
      const dt = new Date(stamp);
      return `${dt.toLocaleString(pl ? 'pl-PL' : 'en-US', { timeZone: timezone })} (${stamp})`;
    };
    const range = state.attempts.map(row => row.timestamp).sort((a, b) => Date.parse(a) - Date.parse(b));
    const outcomeLabels = pl ? {
      accepted_by_smtp: 'Przyjęte przez serwer SMTP', preparation_failed: 'Błąd przygotowania',
      authentication_failed: 'Błąd uwierzytelnienia', recipients_refused: 'Odbiorcy odrzuceni',
      partial_acceptance: 'Częściowe przyjęcie przez SMTP', tls_failed: 'Błąd TLS',
      transport_outcome_unknown: 'Nieznany wynik transportu', send_failed: 'Błąd wysyłania',
      cancelled_outcome_unknown: 'Przerwano; wynik nieznany', outcome_unknown: 'Wynik nieznany'
    } : {
      accepted_by_smtp: 'Accepted by SMTP server', preparation_failed: 'Preparation failed',
      authentication_failed: 'Authentication failed', recipients_refused: 'Recipients refused',
      partial_acceptance: 'Partial SMTP acceptance', tls_failed: 'TLS failed',
      transport_outcome_unknown: 'Transport outcome unknown', send_failed: 'Send failed',
      cancelled_outcome_unknown: 'Cancelled; outcome unknown', outcome_unknown: 'Outcome unknown'
    };
    const sourceLabels = pl ? { manual: 'Ręcznie', schedule: 'Harmonogram', unknown: 'Nieznane' } :
      { manual: 'Manual', schedule: 'Scheduled', unknown: 'Unknown' };
    const kindLabels = pl ? { manual: 'Wiadomość', test: 'Test', log_digest: 'Raport dziennika', energy_report: 'Raport energii' } :
      { manual: 'Message', test: 'Test', log_digest: 'Log digest', energy_report: 'Energy report' };
    const cadenceLabels = pl ? { daily: 'Codziennie', weekly: 'Co tydzień', monthly: 'Co miesiąc' } :
      { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' };
    const periodLabel = value => {
      if (value === null) return '—';
      const [cadence, key] = value.split(':');
      const prefix = pl ? { daily: 'Dzień', weekly: 'Tydzień', monthly: 'Miesiąc' } :
        { daily: 'Day', weekly: 'Week', monthly: 'Month' };
      return `${prefix[cadence]} ${key}`;
    };
    const rows = state.attempts.map(row => [date(row.timestamp), sourceLabels[row.source], kindLabels[row.kind] ?? '—', cadenceLabels[row.cadence] ?? '—',
      periodLabel(row.period), row.recipient_count ?? '—', outcomeLabels[row.outcome]]);
    return `<section class="attempt-history" aria-label="${pl ? 'Historia prób SMTP' : 'SMTP attempt history'}">
      <h3>${pl ? 'Serwerowa historia prób wysyłki' : 'Server send attempt history'}</h3>
      <p>${pl ? 'Metadane prób z serwera Home Assistant. Przyjęcie przez SMTP nie potwierdza dostarczenia. Wyniki nieznane i częściowe nie uruchamiają ponownej wysyłki.' :
        'Attempt metadata from your Home Assistant server. SMTP acceptance does not confirm delivery. Unknown and partial outcomes do not trigger another send.'}</p>
      <p>${pl ? 'Strefa czasu widoku' : 'Display timezone'}: ${escape(timezone)}.</p>
      <p>${pl ? 'Maksymalnie 128 prób / 90 dni. To zachowany zakres, nie pełna historia.' : 'At most 128 attempts / 90 days. This is the retained range, not a complete history.'}</p>
      <p>${pl ? 'Odczytano o' : 'Read at'}: ${state.observedAt ? escape(date(state.observedAt)) : '—'}. ${pl ? 'Zakres dotyczy chwili odczytu.' : 'The range describes the time of this read.'}</p>
      <p>${pl ? 'Najstarsza' : 'Oldest'}: ${range.length ? escape(date(range[0])) : '—'} · ${pl ? 'Najnowsza' : 'Newest'}: ${range.length ? escape(date(range[range.length - 1])) : '—'}</p>
      <div class="history-actions"><button type="button" id="history-refresh" ${state.status === 'loading' ? 'aria-busy="true"' : ''}>${pl ? 'Odśwież historię' : 'Refresh history'}</button>
      <button type="button" id="history-discard">${pl ? 'Odrzuć odczyt' : 'Discard read'}</button></div>
      <p role="status" aria-live="polite">${text[state.status]}</p>
      ${rows.length ? `<table class="history-records" role="table"><caption>${pl ? 'Zachowane metadane prób' : 'Retained attempt metadata'}</caption><thead role="rowgroup"><tr role="row">${labels.map(label => `<th scope="col" role="columnheader">${label}</th>`).join('')}</tr></thead>
        <tbody role="rowgroup">${rows.map((cells, index) => {
          const row = state.attempts[index];
          return `<tr role="row" data-attempt-id="${escape(row.id)}" data-source="${escape(row.source)}" data-kind="${escape(row.kind ?? '')}" data-cadence="${escape(row.cadence ?? '')}" data-period="${escape(row.period ?? '')}" data-outcome="${escape(row.outcome)}">${cells.map((cell, i) => `<td role="cell" data-label="${labels[i]}">${escape(cell)}</td>`).join('')}</tr>`;
        }).join('')}</tbody></table>` : ''}
    </section>`;
  };
  return controller;
}
// END vendored ha-tools-email-history factory

// Component-local persistence retains this card's existing localStorage keys.
const haToolsPersistence = { _cache: {}, _hass: null, setHass(h) { this._hass = h; }, async save(k, d) { try { localStorage.setItem('ha-log-email-' + k, JSON.stringify(d)); } catch(e) { console.debug('[ha-log-email] caught:', e); } }, async load(k) { try { const r = localStorage.getItem('ha-log-email-' + k); return r ? JSON.parse(r) : null; } catch(e) { return null; } }, loadSync(k) { try { const r = localStorage.getItem('ha-log-email-' + k); return r ? JSON.parse(r) : null; } catch(e) { return null; } } };
const OWN_SUPPORT_FOOTER = `<div class="donate-section" data-source="own-card" style="margin:8px 0 0;padding:4px 0;background:none;border:0;box-shadow:none;min-height:0;display:flex;gap:8px;align-items:center;flex-wrap:wrap;flex-direction:row;justify-content:flex-start;text-align:left"><a href="https://buymeacoffee.com/macsiem" target="_blank" rel="noopener noreferrer" style="font-size:11px;color:var(--secondary-text-color,#64748b);font-weight:400;text-decoration:underline">Optional support for HA Tools</a><button type="button" class="support-dismiss" aria-label="Dismiss support link" style="margin-left:auto;padding:2px 6px;min-height:0;line-height:1;border:0;background:none;color:var(--secondary-text-color,#64748b);cursor:pointer">×</button></div>`;
const LOG_EMAIL_SUPPORT_KEY = 'ha-log-email-support-dismissed';
const logEmailSupportDismissed = () => { try { return localStorage.getItem(LOG_EMAIL_SUPPORT_KEY) === '1'; } catch (_) { return false; } };

/**
 * HA Log Email Card v4.4.1
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
    this._lang = /^pl(?:[-_]|$)/i.test(navigator.language || 'en') ? 'pl' : 'en';
    this.attachShadow({ mode: 'open' });
    this._hass = null;
    this._config = {};
    this._centralRecipient = null;
    this._activeTab = 'overview';
    this._tabsScrollLeft = 0;
    this._logData = null;
    this._logHistory = [];
    // Browser counts are separate from server SMTP metadata. Never restore raw objects.
    this._legacyBrowserCounts = this._readBrowserCounts('ha-log-email-history');
    this._retainedLogs = null;
    this._logFilters = { severity: 'all', source: 'all', period: '24h' };
    this._dataEpoch = 0;
    this._dataContext = null;
    this._logReadToken = 0;
    this._attemptHistory = createHaToolsEmailHistory({ escape: _esc, changed: () => this._render() });
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

    const previous = this._hass;
    const oldContext = this._dataContext || (previous ? this._captureLogContext(previous) : null);
    const newContext = this._captureLogContext(hass);
    const previousAdmin = oldContext?.admin;
    const online = value => this._captureLogContext(value).online;
    const identityChanged = !!oldContext && (oldContext.user !== newContext.user || oldContext.connection !== newContext.connection ||
      oldContext.admin !== newContext.admin || oldContext.online !== newContext.online);
    this._dataContext = newContext;
    const language = hass?.locale?.language || hass?.language || navigator.language || 'en';
    const nextLang = /^pl(?:[-_]|$)/i.test(language) ? 'pl' : 'en';
    const languageChanged = nextLang !== this._lang;
    this._lang = nextLang;
    this._hass = hass;
    if (identityChanged || !online(hass) || hass?.user?.is_admin !== true) {
      this._dataEpoch++;
      this._logReadToken++;
      this._loading = false;
      this._logData = null;
      this._retainedLogs = null;
      this._logHistory = [];
      this._browserCountsLegacy = false;
      this._centralRecipient = null;
      this._lastErrorKeys = new Set();
      if (this._pollingTimer) clearInterval(this._pollingTimer);
      this._pollingTimer = null;
    }
    this._attemptHistory.setContext(hass);
    if (!previous && hass?.user?.is_admin === true && online(hass)) {
      const key = this._browserCountsKey();
      this._logHistory = key ? this._readBrowserCounts(key) : [];
      // Old unscoped counts remain useful only in this first browser context, with an explicit label.
      if (!this._logHistory.length && this._legacyBrowserCounts.length) {
        this._logHistory = this._legacyBrowserCounts;
        this._browserCountsLegacy = true;
      }
    }
    this._legacyBrowserCounts = [];
    if (!this._firstRender && hass) {
      this._firstRender = true;
      if (hass.user?.is_admin === true && online(hass)) this._fetchLogData();
      this._render();
    } else if (identityChanged || !hass || languageChanged) this._render();
    else if (previousAdmin !== hass?.user?.is_admin) this._render();
  }

  get _t() {
    const T = {
      pl: {
        overview: "Przegląd",
        schedule: "Harmonogram",
        preview: "Podgląd",
        sendNow: "Wyślij teraz",
        history: "Historia",
        dailyReport: "Raport dzienny",
        weeklyReport: "Raport tygodniowy",
        active: "Aktywny",
        disabled: "Wyłączony",
        notCreated: "Nie utworzono",
        enable: "Włącz",
        disable: "Wyłącz",
        dailySummary: "Podsumowanie dnia",
        weeklyDigest: "Podsumowanie tygodnia",
        sendDaily: "Wyślij raport dzienny",
        sendWeekly: "Wyślij raport tygodniowy",
        recipient: "Odbiorca",
        smtpService: "Konfiguracja SMTP",
        emailPreview: "Podgląd wiadomości",
        refreshData: "Odśwież dane",
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
        overview: "Overview",
        schedule: "Schedule",
        preview: "Preview",
        sendNow: "Send Now",
        history: "History",
        dailyReport: "Daily Report",
        weeklyReport: "Weekly Report",
        active: "Active",
        disabled: "Disabled",
        notCreated: "Not created",
        enable: "Enable",
        disable: "Disable",
        dailySummary: "Daily Summary",
        weeklyDigest: "Weekly Digest",
        sendDaily: "Send Daily Email",
        sendWeekly: "Send Weekly Email",
        recipient: "Recipient",
        smtpService: "SMTP Service",
        emailPreview: "Email Preview",
        refreshData: "Refresh Data",
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

  _countLabel(count, kind) {
    if (this._lang !== 'pl') return `${count} ${kind}${count === 1 ? '' : 's'}`;
    const forms = ({
      error: ['błąd', 'błędy', 'błędów'], warning: ['ostrzeżenie', 'ostrzeżenia', 'ostrzeżeń'],
      'unique problem': ['unikalny problem', 'unikalne problemy', 'unikalnych problemów'],
      occurrence: ['wystąpienie', 'wystąpienia', 'wystąpień'],
      'current snapshot row': ['wiersz bieżącego odczytu', 'wiersze bieżącego odczytu', 'wierszy bieżącego odczytu']
    })[kind];
    const few = count % 10 >= 2 && count % 10 <= 4 && !(count % 100 >= 12 && count % 100 <= 14);
    return `${count} ${forms[count === 1 ? 0 : few ? 1 : 2]}`;
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
    if (this._hass) this._render();
  }

  async _loadCentralRecipient() {
    if (!this._hass?.user?.is_admin || !this._hasHaToolsEmail()) return;
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

  getGridOptions() { return { columns: 12, min_rows: 3, min_columns: 6 }; }

  static getStubConfig() {
    return {
      type: 'custom:ha-log-email',
      title: 'Log Email Summary',
      email_recipient: 'your@email.com'
    };
  }

  _browserCountsKey() {
    return typeof this._hass?.user?.id === 'string' ? 'ha-log-email-history:' + this._hass.user.id : null;
  }

  _readBrowserCounts(key) {
    try {
      const saved = JSON.parse(sessionStorage.getItem(key) || '[]');
      return Array.isArray(saved) ? saved.slice(0, 24).filter(row => row && typeof row.ts === 'string' &&
        Number.isFinite(Date.parse(row.ts)) && Date.parse(row.ts) <= Date.now() && ['errors', 'warnings', 'total'].every(k => Number.isSafeInteger(row[k]) && row[k] >= 0))
        .map(({ ts, errors, warnings, total }) => ({ ts, errors, warnings, total })) : [];
    } catch (_) { return []; }
  }

  _captureLogContext(hass) {
    return { admin: hass?.user?.is_admin === true, user: hass?.user?.id ?? hass?.user,
      connection: hass?.connection ?? null, online: !!hass && hass.connected !== false && hass.connection?.connected !== false };
  }

  _refreshAttemptHistory() {
    if (!this._dataContext) this._dataContext = this._captureLogContext(this._hass);
    return this._attemptHistory.refresh(this._hass);
  }
  _discardAttemptHistory() { this._attemptHistory.discard(); }

  // Identity uses exact structured values. Presentation excerpts never affect grouping.
  _exactLogValue(value) {
    if (value === undefined) return ['undefined'];
    if (value === null) return ['null'];
    if (Array.isArray(value)) return ['array', value.map(item => this._exactLogValue(item))];
    if (typeof value === 'object') return ['object', Object.keys(value).sort().map(key => [key, this._exactLogValue(value[key])])];
    return [typeof value, value];
  }

  _groupRetainedLogs(logs, now) {
    const groups = new Map();
    for (const raw of logs) {
      if (!raw || typeof raw !== 'object') continue;
      const stamp = typeof raw.timestamp === 'number' && Number.isFinite(raw.timestamp) ? raw.timestamp * 1000 : NaN;
      if (!Number.isFinite(stamp) || !Number.isFinite(new Date(stamp).getTime()) || stamp > now) continue;
      const supplied = ['id', 'entry_id', 'key', 'hash'].find(key =>
        typeof raw[key] === 'string' || (typeof raw[key] === 'number' && Number.isFinite(raw[key])));
      const backendIdentity = supplied ? raw[supplied] : null;
      const identity = supplied ? JSON.stringify(['backend', supplied, backendIdentity]) :
        JSON.stringify(['exact', ...['level', 'name', 'source', 'message', 'exception'].map(key =>
          [Object.prototype.hasOwnProperty.call(raw, key), this._exactLogValue(raw[key])])]);
      const sourceKey = JSON.stringify([this._exactLogValue(raw.name), this._exactLogValue(raw.source)]);
      const source = [typeof raw.name === 'string' ? raw.name : '',
        Array.isArray(raw.source) ? raw.source.map(value => String(value)).join(':') : typeof raw.source === 'string' ? raw.source : ''].filter(Boolean).join(' · ') || 'unknown';
      const count = Number.isSafeInteger(raw.count) && raw.count >= 0 ? raw.count : null;
      const first = typeof raw.first_occurred === 'number' && Number.isFinite(raw.first_occurred) ? raw.first_occurred * 1000 : stamp;
      const firstStamp = first <= stamp && Number.isFinite(new Date(first).getTime()) ? first : stamp;
      const existing = groups.get(identity);
      if (existing) {
        // A repeated stable backend row is the same HA aggregate, not another occurrence.
        existing.count = existing.count == null || count == null ? null : supplied ? Math.max(existing.count, count) : existing.count + count;
        if (!Number.isSafeInteger(existing.count)) existing.count = null;
        if (supplied && stamp >= existing.stamp) {
          existing.sourceKey = sourceKey;
          existing.domain = source;
          existing.level = typeof raw.level === 'string' ? raw.level : 'unknown';
          existing.message = Array.isArray(raw.message) ? raw.message.map(value => String(value)).join(' ') : String(raw.message ?? '');
        }
        existing.firstStamp = Math.min(existing.firstStamp, firstStamp);
        existing.stamp = Math.max(existing.stamp, stamp);
        existing.when = new Date(existing.stamp).toISOString();
      } else {
        groups.set(identity, { identity, backendIdentity, sourceKey, domain: source, level: typeof raw.level === 'string' ? raw.level : 'unknown',
          message: Array.isArray(raw.message) ? raw.message.map(value => String(value)).join(' ') : String(raw.message ?? ''),
          count, stamp, firstStamp, when: new Date(stamp).toISOString() });
      }
    }
    return [...groups.values()].sort((a, b) => b.stamp - a.stamp || a.identity.localeCompare(b.identity));
  }

  _logEntryCap() {
    const cap = Number(this._config.max_entries);
    return Number.isFinite(cap) && cap >= 1 ? Math.min(Math.floor(cap), 500) : 50;
  }

  _retainedModel(filters = this._logFilters, tab = this._activeTab) {
    const duration = { '24h': 86400000, '7d': 7 * 86400000, '30d': 30 * 86400000 };
    const period = Object.prototype.hasOwnProperty.call(duration, filters.period) ? filters.period : '24h';
    const now = Date.now(), cap = this._logEntryCap();
    if (!Array.isArray(this._retainedLogs)) {
      const data = this._logData;
      const canShow = !!data && !data.unavailable && period === '24h';
      const rows = canShow ? [...(Array.isArray(data.errors) ? data.errors : []).map(row => ({ ...row, level: row.level || 'ERROR' })),
        ...(Array.isArray(data.warnings) ? data.warnings : []).map(row => ({ ...row, level: row.level || 'WARNING' }))].map((row, index) => ({
          identity: 'sensor:' + index, sourceKey: JSON.stringify(String(row.domain || row.name || 'unknown')),
          domain: String(row.domain || row.name || 'unknown'), message: Array.isArray(row.message) ? row.message.join(' ') : String(row.message ?? ''),
          level: row.level, count: Number.isSafeInteger(row.count) && row.count >= 0 ? row.count : null, when: typeof row.when === 'string' && Number.isFinite(Date.parse(row.when)) && Date.parse(row.when) <= now ? row.when : ''
        })) : [];
      return this._filterLogModel(rows, filters, tab, { period, cap, partial: true, source: data && !data.unavailable ? 'sensor.ha_log_summary' : 'system_log/list / sensor.ha_log_summary (unavailable)',
        currentOnly: true, unavailable: !canShow, first: null, last: null });
    }
    const retained = this._retainedLogs.filter(row => row.stamp <= now);
    const range = retained.flatMap(row => [row.firstStamp, row.stamp]).filter(stamp => Number.isFinite(stamp) && stamp <= now);
    const candidates = retained.filter(row => row.stamp >= now - duration[period]);
    return this._filterLogModel(candidates, filters, tab, { period, cap, partial: false, source: 'system_log/list', currentOnly: false,
      unavailable: false, first: range.length ? Math.min(...range) : null, last: range.length ? Math.max(...range) : null });
  }

  _filterLogModel(candidates, filters, tab, metadata) {
    const filtered = candidates.filter(row => (filters.severity === 'all' || row.level === filters.severity) &&
      (filters.source === 'all' || row.sourceKey === filters.source) &&
      (tab !== 'errors' || ['ERROR', 'CRITICAL'].includes(row.level)) && (tab !== 'warnings' || row.level === 'WARNING'));
    const rows = filtered.slice(0, metadata.cap);
    const occurrences = rows.some(row => row.count == null) ? null : rows.reduce((sum, row) => sum + row.count, 0);
    return { ...metadata, rows, unique: rows.length, occurrences: Number.isSafeInteger(occurrences) ? occurrences : null,
      filteredUnique: filtered.length, sources: [...new Map(candidates.map(row => [row.sourceKey, row.domain])).entries()],
      severities: [...new Set(candidates.map(row => row.level))].sort() };
  }

  async _fetchLogData() {
    const hass = this._hass;
    if (hass?.user?.is_admin !== true || hass.connected === false || hass.connection?.connected === false) return;
    if (!this._dataContext) this._dataContext = this._captureLogContext(hass);
    const epoch = this._dataEpoch, readToken = ++this._logReadToken;
    const current = () => epoch === this._dataEpoch && readToken === this._logReadToken && this._hass?.user?.is_admin === true;
    this._loading = true;
    this._render();
    try {
      const logs = await hass.callWS({ type: 'system_log/list' });
      if (!current()) return;
      if (!Array.isArray(logs)) throw new Error('invalid_log_response');
      const now = Date.now();
      this._retainedLogs = this._groupRetainedLogs(logs, now);
      // Preserve daily/weekly report buckets and the existing per-severity send cap.
      // UI filters do not change the prepared report periods or payload.
      const split = duration => {
        const rows = this._retainedLogs.filter(row => row.stamp >= now - duration && row.stamp <= now);
        return { errors: rows.filter(row => ['ERROR', 'CRITICAL'].includes(row.level)).slice(0, this._logEntryCap()),
          warnings: rows.filter(row => row.level === 'WARNING').slice(0, this._logEntryCap()), total: rows.length };
      };
      this._logData = { ...split(86400000), weekly: split(7 * 86400000), allLogs: logs.length, fetchedAt: new Date(now).toISOString() };
    } catch (_) {
      if (!current()) return;
      this._retainedLogs = null;
      this._logData = this._getLogFromSensor();
    }
    if (!current()) return;
    this._loading = false;
    this._lastFetch = Date.now();
    if (this._logData && this._logData.errors) {
      const snapshot = { ts: new Date().toISOString(), errors: this._logData.errors.length, warnings: this._logData.warnings.length, total: this._logData.total };
      this._logHistory.unshift(snapshot);
      this._logHistory = this._logHistory.slice(0, this._maxHistory);
      const key = this._browserCountsKey();
      if (key) try { sessionStorage.setItem(key, JSON.stringify(this._logHistory.map(({ ts, errors, warnings, total }) => ({ ts, errors, warnings, total })))); } catch (_) {}
    }
    this._render();
    // Preserve the existing explicitly enabled alerts setting.
    if (this._pollingEnabled && !this._pollingTimer) this._startPolling();
  }

  // FUNC-2: Real-time error polling
  _startPolling() {
    if (!this._hass?.user?.is_admin) return;
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
    if (!this._hass?.user?.is_admin) return;
    try {
      const logs = await this._hass.callWS({ type: 'system_log/list' });
      if (!this._hass?.user?.is_admin) return;
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
    if (!sensor || sensor.state === 'unavailable' || sensor.state === 'unknown') return {
      unavailable: true,
      note: 'Sensor sensor.ha_log_summary not found. Install log_email.yaml package.',
      fetchedAt: new Date().toISOString()
    };
    const attrs = sensor.attributes || {};
    return {
      errors: Array.isArray(attrs.errors) ? attrs.errors : [],
      warnings: Array.isArray(attrs.warnings) ? attrs.warnings : [],
      total: Number.isSafeInteger(attrs.total) && attrs.total >= 0 ? attrs.total : (Array.isArray(attrs.errors) ? attrs.errors.length : 0) + (Array.isArray(attrs.warnings) ? attrs.warnings.length : 0),
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
          : '<span class="badge-er">\u274C ' + _esc(this._smtpStatus.error) + '</span>')
        : '';
      return '<div class="smtp-section">' +
        '<div class="smtp-header">' +
          '<span class="smtp-icon">\u2709\uFE0F</span>' +
          '<div>' +
            '<div class="smtp-title">' + (this._lang === 'pl' ? 'HA Tools Email dostępne' : 'HA Tools Email available') + '</div>' +
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
          '<div class="smtp-title">' + (this._lang === 'pl' ? 'Integracja HA Tools Email nie jest zainstalowana.' : 'The HA Tools Email integration is not installed.') + '</div>' +
          '<div class="smtp-sub">' + (this._lang === 'pl' ? 'Zainstaluj ją z <a href="/hacs">HACS</a>, dodaj w <a href="/config/integrations">Urządzenia i usługi</a>, następnie ustaw SMTP w Konfiguruj.' : 'Install it from <a href="/hacs">HACS</a>, add it in <a href="/config/integrations">Devices &amp; services</a>, then set up SMTP in Configure.') + '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }
  async _sendEmailNow(period) {
    if (!this._hass?.user?.is_admin) return;
    if (this._sendStatus?.status === 'sending') return;
    const data = period === 'weekly' ? this._logData?.weekly : this._logData;
    if (!data || data.unavailable) {
      this._sendStatus = { status: 'error', period, error: period === 'weekly' ? (this._lang === 'pl' ? 'Dane tygodniowe dziennika są niedostępne. Odśwież dziennik systemowy.' : 'Weekly log data is unavailable. Refresh the system log.') : (this._lang === 'pl' ? 'Dane dziennika są niedostępne.' : 'Log data is unavailable.') };
      this._render();
      return;
    }
    if (!this._hasHaToolsEmail()) {
      this._sendStatus = { status: 'error', period, error: (this._lang === 'pl' ? 'Integracja HA Tools Email nie jest zainstalowana. Zainstaluj j\u0105 z HACS, dodaj w Urz\u0105dzeniach i us\u0142ugach i ustaw SMTP w Konfiguruj.' : 'The HA Tools Email integration is not installed. Install it from HACS, add it in Devices & services, then set up SMTP in Configure.') };
      this._render(); return;
    }
    this._sendStatus = { status: 'sending', period };
    this._render();
    try {
      const errors = data ? (data.errors || []) : [];
      const warnings = data ? (data.warnings || []) : [];
      const now = new Date().toLocaleString((this._lang === 'pl' ? 'pl-PL' : 'en-US'));
      const subject = period === 'daily'
        ? (this._lang === 'pl' ? 'HA Log - Raport dzienny (' + now + ')' : 'HA Log - Daily Report (' + now + ')')
        : (this._lang === 'pl' ? 'HA Log - Raport tygodniowy (' + now + ')' : 'HA Log - Weekly Report (' + now + ')');
      var body = '<h2>' + subject + '</h2>';
      if (period === 'weekly') body += '<p>' + (this._lang === 'pl' ? 'Zachowane wpisy z ostatnich 7 dni. Historia może być ograniczona przez Home Assistant; obowiązuje limit wpisów karty.' : 'Retained entries from the last 7 days. Home Assistant may limit history; the card entry limit applies.') + '</p>';
      body += '<p>Errors: <strong>' + errors.length + '</strong> | Warnings: <strong>' + warnings.length + '</strong></p>';
      if (errors.length > 0) {
        body += '<h3 style="color:#ef4444">Errors</h3><ul>';
        errors.forEach(function(e) { body += '<li><b>' + _esc(e.domain||'') + '</b>: ' + _esc(_logEmailExcerpt(e.message||'')) + ' (x' + _esc(e.count == null ? '—' : e.count) + ')</li>'; });
        body += '</ul>';
      }
      if (warnings.length > 0) {
        body += '<h3 style="color:#f59e0b">Warnings</h3><ul>';
        warnings.forEach(function(e) { body += '<li><b>' + _esc(e.domain||'') + '</b>: ' + _esc(_logEmailExcerpt(e.message||'')) + ' (x' + _esc(e.count == null ? '—' : e.count) + ')</li>'; });
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
    if (!data || data.unavailable) return '<p style="color:var(--bento-text-secondary)">Log data unavailable.</p>';

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
                ${e.domain ? `<span style="color:#f87171;font-size:11px"> [${_esc(e.domain)}]</span>` : ''}
                <div style="margin-top:2px">${_esc((e.message || '').substring(0, 120))}${(e.message || '').length > 120 ? '...' : ''}</div>
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
                ${e.domain ? `<span style="color:#fbbf24;font-size:11px"> [${_esc(e.domain)}]</span>` : ''}
                <div style="margin-top:2px">${_esc((e.message || '').substring(0, 120))}${(e.message || '').length > 120 ? '...' : ''}</div>
              </div>
            `).join('') + (warnings.length > 10 ? `<p style="color:#94a3b8;font-size:11px">...and ${warnings.length - 10} more</p>` : '')
          }
        </div>
      </div>
    `;
  }

  _render() {
    const focused = this.shadowRoot.activeElement;
    const focusId = focused?.id;
    const focusTab = focused?.dataset?.tab;
    if (!this._hass || this._hass.connected === false || this._hass.connection?.connected === false) {
      this.shadowRoot.innerHTML = `<ha-card style="padding:20px"><p>${this._lang === 'pl' ? 'Brak połączenia. Dane odrzucono.' : 'Disconnected. Data discarded.'}</p></ha-card>`;
      return;
    }
    if (this._hass.user?.is_admin !== true) {
      this.shadowRoot.innerHTML = `<ha-card style="padding:20px"><strong>${_esc(this._config.title || 'Log Email Summary')}</strong><p>${this._lang === 'pl' ? 'Dziennik systemowy i wysyłanie raportów są dostępne tylko dla administratora.' : 'System logs and report controls require an administrator.'}</p></ha-card>`;
      return;
    }
    const logView = ['overview', 'errors', 'warnings'].includes(this._activeTab);
    const data = this._logData;
    const retained = logView ? this._retainedModel() : null;
    const unavailable = !data || data.unavailable || (logView && retained.unavailable);
    const errors = retained ? retained.rows.filter(row => ['ERROR', 'CRITICAL'].includes(row.level)) : data ? (data.errors || []) : [];
    const warnings = retained ? retained.rows.filter(row => row.level === 'WARNING') : data ? (data.warnings || []) : [];
    const totalErrors = errors.length;
    const totalWarnings = warnings.length;
    let statusLabel;
    if (this._activeTab === 'history') statusLabel = this._lang === 'pl' ? 'Historia prób SMTP' : 'SMTP attempt history';
    else if (unavailable) statusLabel = this._lang === 'pl' ? 'Niedostępne' : 'Unavailable';
    else if (retained && totalErrors > 0) statusLabel = this._countLabel(totalErrors, 'error');
    else if (retained && totalWarnings > 0) statusLabel = this._countLabel(totalWarnings, 'warning');
    else if (retained?.partial) statusLabel = this._lang === 'pl' ? 'Częściowe dane' : 'Partial data';
    else if (retained) statusLabel = this._lang === 'pl' ? 'Brak zachowanych problemów' : 'No retained problems';
    else statusLabel = totalErrors > 0 ? this._countLabel(totalErrors, 'error') : totalWarnings > 0 ? this._countLabel(totalWarnings, 'warning') :
      (this._lang === 'pl' ? 'Brak zachowanych problemów' : 'No retained problems');

    const dailyEntityId = 'automation.ha_tools_log_email_daily';
    const weeklyEntityId = 'automation.ha_tools_log_email_weekly';
    const dailyAuto = this._getScheduleState(dailyEntityId);
    const weeklyAuto = this._getScheduleState(weeklyEntityId);

    const tabs = [
      { id: 'overview', label: this._t.overview, icon: '\uD83D\uDCCA' },
      { id: 'errors', label: this._t.errors, icon: '❌' },
      { id: 'warnings', label: this._t.warnings, icon: '⚠️' },
      { id: 'schedule', label: this._t.schedule, icon: '\uD83D\uDCC5' },
      { id: 'preview', label: this._t.preview, icon: '\uD83D\uDC41\uFE0F' },
      { id: 'send', label: this._t.sendNow, icon: '\uD83D\uDCE7' },
      { id: 'history', label: this._t.history, icon: '\uD83D\uDCDC' }
    ];

    const sendStatusHTML = this._sendStatus ? (() => {
      const s = this._sendStatus;
      if (s.status === 'sending') return `<div class="send-status sending">\u23F3 ${this._lang === 'pl' ? 'Wysyłanie raportu dziennika' : 'Sending log email'} (${s.period === 'daily' ? this._t.dailyReport : this._t.weeklyReport})...</div>`;
      if (s.status === 'success') return `<div class="send-status success">\u2705 ${this._lang === 'pl' ? 'Raport dziennika wysłany o' : 'Log email sent at'} ${s.time}</div>`;
      if (s.status === 'error') return `<div class="send-status error">\u274C ${this._t.emailFailed}: ${_esc(s.error)}</div>`;
      return '';
    })() : '';

    const smtpHtml = this._renderSmtpSection();
    let tabContent = '';

    if (['overview', 'errors', 'warnings'].includes(this._activeTab)) {
      tabContent = this._renderRetainedLogs();
    } else if (this._activeTab === 'schedule') {
      tabContent = `
        <div class="schedule-grid">
          <div class="schedule-card">
            <div class="schedule-title">\uD83D\uDDD3\uFE0F ${this._t.dailyReport}</div>
            <div class="schedule-desc">${this._lang === 'pl' ? 'Dzienny raport błędów i ostrzeżeń. Czas wysyłki ustala Twoja automatyzacja.' : 'Daily errors and warnings summary. Your automation sets the sending time.'}</div>
            <div class="schedule-row">
              <span class="schedule-status ${dailyAuto === 'on' ? 'status-on' : 'status-off'}">
                ${dailyAuto === 'on' ? '\uD83D\uDFE2 ' + this._t.active : dailyAuto === 'off' ? '\u26AB ' + this._t.disabled : '\u2795 ' + this._t.notCreated}
              </span>
              ${dailyAuto === 'unknown' ? '' : `<button class="toggle-btn" id="btn-daily-toggle">${dailyAuto === 'on' ? this._t.disable : this._t.enable}</button>`}
            </div>
          </div>

          <div class="schedule-card">
            <div class="schedule-title">\uD83D\uDCC6 ${this._t.weeklyReport}</div>
            <div class="schedule-desc">${this._lang === 'pl' ? 'Zachowane wpisy dziennika z ostatnich 7 dni. Home Assistant może ograniczać historię. Dzień i czas wysyłki ustala Twoja automatyzacja.' : 'Retained log entries from the last 7 days. Home Assistant may limit history. Your automation sets the sending day and time.'}</div>
            <div class="schedule-row">
              <span class="schedule-status ${weeklyAuto === 'on' ? 'status-on' : 'status-off'}">
                ${weeklyAuto === 'on' ? '\uD83D\uDFE2 ' + this._t.active : weeklyAuto === 'off' ? '\u26AB ' + this._t.disabled : '\u2795 ' + this._t.notCreated}
              </span>
              ${weeklyAuto === 'unknown' ? '' : `<button class="toggle-btn" id="btn-weekly-toggle">${weeklyAuto === 'on' ? this._t.disable : this._t.enable}</button>`}
            </div>
          </div>
        </div>
        ${(dailyAuto === 'unknown' || weeklyAuto === 'unknown') ? `
          <div class="info-note" style="margin-top:8px">\u2139\uFE0F ${this._lang === 'pl'
            ? 'Karta log-email wysy\u0142a digest, ale nie tworzy automatyzacji harmonogramu. Dodaj automatyzacj\u0119 wo\u0142aj\u0105c\u0105 ha_tools_email o wybranej porze (przyk\u0142ad w README) \u2014 jej stan pojawi si\u0119 tutaj do w\u0142\u0105czania/wy\u0142\u0105czania.'
            : 'The log-email card sends the digest, but does not create the schedule automation. Add an automation that calls ha_tools_email at your chosen time (see README) \u2014 it will then appear here to enable/disable.'}</div>
        ` : ''}

        <div class="section-header">${this._t.smtpService}</div>
        <div class="info-card" style="padding:12px">${smtpHtml}
        </div>
        <div class="section-header" style="margin-top:10px">${this._t.recipient}</div>
        <div class="info-card">
          <span>\uD83D\uDCE7 ${this._config.email_recipient ? _esc(this._config.email_recipient) : (this._centralRecipient ? '<span style="color:var(--bento-text-secondary)">' + (this._lang === 'pl' ? 'Domyślnie z Ustawień' : 'Default from Settings') + ' ' + _esc(this._centralRecipient) + '</span>' : '<span style="color:var(--bento-text-muted)">' + (this._lang === 'pl' ? 'Nie ustawiony \u2014 dodaj email_recipient w konfiguracji karty lub Ustawienia' : 'Not set \u2014 add email_recipient in card configuration or Settings') + '</span>')}</span>
        </div>

        
      `;
    } else if (this._activeTab === 'preview') {
      tabContent = `
        <div class="section-header">
          <span>${this._t.emailPreview}</span>
          <button class="refresh-btn" id="btn-refresh-preview" aria-label="${this._t.refreshData}">\uD83D\uDD04 ${this._t.refreshData}</button>
        </div>
        ${this._loading ? '<div class="loading-bar"></div>' : ''}
        ${this._buildEmailPreview()}
        ${data ? `<div class="last-updated">${this._lang === 'pl' ? 'Dane odczytane o:' : 'Based on data from:'} ${new Date(data.fetchedAt).toLocaleTimeString((this._lang === 'pl' ? 'pl-PL' : 'en-US'))}</div>` : ''}
      `;
    } else if (this._activeTab === 'send') {
      tabContent = `
        <div class="send-grid">
          <div class="send-card">
            <div class="send-icon">\uD83D\uDCC5</div>
            <div class="send-title">${this._t.dailySummary}</div>
            <div class="send-desc">${this._lang === 'pl' ? 'Błędy i ostrzeżenia z ostatnich 24 godzin' : 'Errors + warnings from last 24 hours'}</div>
            <div class="send-counts">
              <span class="count-badge error-badge">${this._lang === 'pl' ? this._countLabel(totalErrors, 'error') : totalErrors + ' errors'}</span>
              <span class="count-badge warn-badge">${this._lang === 'pl' ? this._countLabel(totalWarnings, 'warning') : totalWarnings + ' warnings'}</span>
            </div>
            <button class="send-btn" id="btn-send-daily" aria-label="${this._t.sendDaily}" ${this._sendStatus?.status === 'sending' ? 'disabled' : ''}>${this._t.sendDaily}</button>
          </div>
          <div class="send-card">
            <div class="send-icon">\uD83D\uDCC6</div>
            <div class="send-title">${this._t.weeklyDigest}</div>
            <div class="send-desc">${this._lang === 'pl' ? 'Zachowane wpisy z ostatnich 7 dni; historia może być ograniczona' : 'Retained entries from the last 7 days; history may be limited'}</div>
            <div class="send-counts">
              <span class="count-badge info-badge">${this._lang === 'pl' ? '7 dni' : '7 days'}</span>
            </div>
            <button class="send-btn" id="btn-send-weekly" aria-label="${this._t.sendWeekly}" ${this._sendStatus?.status === 'sending' ? 'disabled' : ''}>${this._t.sendWeekly}</button>
          </div>
        </div>
        ${sendStatusHTML}
        <div class="section-header" style="margin-top:16px">${this._t.recipient}</div>
        <div class="info-card">\uD83D\uDCE7 ${_esc(this._config.email_recipient || '')}</div>
        <div class="info-note" style="margin-top:8px">
          ${this._lang === 'pl' ? 'ℹ️ Wysyła email bezpośrednio przez ha_tools_email (centralna konfiguracja). Nie wymaga osobnych automatyzacji.' : 'ℹ️ Sends email directly via ha_tools_email (central config). No separate automations required.'}
        </div>

        <div class="section-header" style="margin-top:20px">${this._lang === 'pl' ? 'Natychmiastowe powiadomienie o błędzie' : 'Instant Error Notification'}</div>
        <div class="info-card" style="padding:16px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
            <div>
              <p style="margin:0;font-weight:600;font-size:13px">🔔 ${this._lang === 'pl' ? 'Bieżące sprawdzanie błędów' : 'Live error polling'}</p>
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
              ${this._pollingEnabled && this._lastPollTime ? '<span style="font-size:10px;color:var(--bento-text-secondary,#64748B);margin-left:6px">' + (this._lang === 'pl' ? 'ostatnio: ' : 'last: ') + new Date(this._lastPollTime).toLocaleTimeString(this._t.locale) + '</span>' : ''}
            </div>
          </div>
          <p style="margin:0 0 8px 0;font-size:11px;color:var(--bento-text-secondary,#64748B)">
            ${this._lang === 'pl' ? 'Polling wysyła persistent_notification w HA przy wykryciu nowego ERROR. Alternatywnie użyj automatyzacji:' : 'Polling sends a persistent_notification in HA when a new ERROR is detected. Alternatively, use an automation:'}
          </p>
          <p style="margin:0 0 8px 0;font-weight:600;font-size:13px">${this._lang === 'pl' ? 'Automatyczne powiadomienia przy nowym błędzie' : 'Automatic notifications on new errors'}</p>
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
.donate-section:not([data-source="own-card"])::before {  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;  background: linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899);}
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
      

/* Text controls use readable foregrounds in both HA themes. Muted colour is
   reserved for disabled controls, not the current schedule state or links. */
:host {
  --log-email-action-bg: #1d4ed8;
  --log-email-link: #1d4ed8;
  --log-email-error: #b91c1c;
  --log-email-warning: #92400e;
  --log-email-success: #047857;
}
:host(.bento-dark) {
  --log-email-action-bg: #4338ca;
  --log-email-link: #c7d2fe;
  --log-email-error: #fecaca;
  --log-email-warning: #fde68a;
  --log-email-success: #a7f3d0;
}
.content a, .content a:visited, .tab-btn.active, .tab-btn:hover,
.setup-steps pre, .send-status.sending, .info-badge { color: var(--log-email-link); }
.content a { text-decoration: underline; }
.tab-btn.active, .tab-btn:hover { color: var(--log-email-link) !important; }
.toggle-btn, .send-btn, .send-btn:hover, .refresh-btn:hover {
  background: var(--log-email-action-bg); color: #fff;
}
.toggle-btn:hover { opacity: 1; }
.status-on, .badge-ok, .send-status.success { color: var(--log-email-success); }
.badge-er, .error-domain, .error-badge, .send-status.error { color: var(--log-email-error); }
.warn-domain, .warn-badge { color: var(--log-email-warning); }
.status-off, .log-time, .last-updated, .stat-sub { color: var(--bento-text); }
.header-badge { color: var(--bento-text) !important; }

/* Container width, not browser width, determines the alternate record layout. */
.card { display: block; container: log-email-card / inline-size; min-width: 0; }
.card .tabs { flex-wrap: wrap; overflow: visible; }
.card button, .card select, .card .tab-btn { min-height: 44px !important; min-width: 44px !important; box-sizing: border-box; }
.card :is(button, select, a):focus-visible { outline: 3px solid var(--log-email-link); outline-offset: 3px; }
.native-tabs { display: none; padding: 12px; color: var(--bento-text); }
.native-tabs select { width: 100%; }
.log-filters, .history-actions { display: flex; flex-wrap: wrap; align-items: end; gap: 12px; margin-block: 12px; }
.log-filters label { display: grid; gap: 4px; min-width: 0; flex: 1 1 120px; }
.card select, .history-actions button { border: 1px solid var(--bento-border); border-radius: 8px; padding: 8px; background: var(--bento-card); color: var(--bento-text); max-width: 100%; }
.retained-logs, .attempt-history, .browser-snapshots { overflow-wrap: anywhere; min-width: 0; }
.retained-logs p, .attempt-history p, .browser-snapshots p { color: var(--bento-text-secondary); line-height: 1.6; }
.history-records { width: 100%; border-collapse: collapse; table-layout: fixed; color: var(--bento-text); }
.history-records caption { text-align: left; font-weight: 600; padding-block: 12px; }
.history-records th, .history-records td { text-align: left; padding: 10px 8px; border-bottom: 1px solid var(--bento-border); vertical-align: top; overflow-wrap: anywhere; }
.log-model-counts { font-weight: 600; }
@container log-email-card (max-width: 499px) {
  .history-records, .history-records tbody, .history-records tr, .history-records td { display: block; width: auto; }
  .history-records thead { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip-path: inset(50%); }
  .history-records tr { border: 1px solid var(--bento-border); border-radius: 10px; margin-block: 12px; padding: 8px; }
  .history-records td { display: grid; grid-template-columns: minmax(80px, 35%) minmax(0, 1fr); gap: 8px; }
  .history-records td::before { content: attr(data-label); font-weight: 600; }
}
@container log-email-card (max-width: 279px) {
  .native-tabs { display: block; }
  .card .tabs { display: none !important; }
  .history-records td { grid-template-columns: 1fr; }
  .history-actions button { width: 100%; }
}
</style>

      <ha-card class="card">
        <div class="header">
          <span class="header-icon">\uD83D\uDEA8</span>
          <span class="header-title">${_esc(this._config.title || 'Log Email Summary')}</span>
          <span class="header-badge" style="background:var(--bento-bg-2);color:var(--bento-text)">${statusLabel}</span>
        
        </div>

        <label class="native-tabs" for="log-tab-select">${this._lang === 'pl' ? 'Widok' : 'View'}<select id="log-tab-select">${tabs.map(t => `<option value="${t.id}" ${this._activeTab === t.id ? 'selected' : ''}>${t.label}</option>`).join('')}</select></label>
        <div class="tabs" aria-label="${this._lang === 'pl' ? 'Widok' : 'View'}">
          ${tabs.map(t => `
            <button type="button" class="tab-btn ${this._activeTab === t.id ? 'active' : ''}" data-tab="${t.id}" aria-pressed="${this._activeTab === t.id}">
              ${t.icon} ${t.label}
            </button>
          `).join('')}
        </div>

        <div class="content">
          ${tabContent}
        </div>
        ${this._hass?.user?.is_admin && this._config?.show_support !== false && !logEmailSupportDismissed() ? OWN_SUPPORT_FOOTER : ''}
      </ha-card>
    `;

    this.shadowRoot.querySelector('.support-dismiss')?.addEventListener('click', () => {
      try { localStorage.setItem(LOG_EMAIL_SUPPORT_KEY, '1'); } catch (_) {}
      this.shadowRoot.querySelector('.donate-section[data-source="own-card"]')?.remove();
    });

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

    const tabSelect = this.shadowRoot.getElementById('log-tab-select');
    tabSelect?.addEventListener('change', event => this.setActiveTab(event.target.value));
    this.shadowRoot.getElementById('history-refresh')?.addEventListener('click', () => this._refreshAttemptHistory());
    this.shadowRoot.getElementById('history-discard')?.addEventListener('click', () => this._discardAttemptHistory());
    this.shadowRoot.getElementById('log-refresh')?.addEventListener('click', () => this._fetchLogData());
    for (const key of ['severity', 'source', 'period']) {
      this.shadowRoot.getElementById('log-' + key)?.addEventListener('change', event => {
        this._logFilters = { ...this._logFilters, [key]: event.target.value };
        this._render();
      });
    }

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

    if (focusId) this.shadowRoot.getElementById(focusId)?.focus({ preventScroll: true });
    else if (focusTab) {
      const tab = [...this.shadowRoot.querySelectorAll('[data-tab]')].find(el => el.dataset.tab === focusTab);
      const target = tab?.getBoundingClientRect().width ? tab : this.shadowRoot.getElementById('log-tab-select');
      target?.focus({ preventScroll: true });
    }

  }

  _renderRetainedLogs() {
    const pl = this._lang === 'pl', model = this._retainedModel();
    const rangeDate = stamp => stamp == null || !Number.isFinite(new Date(stamp).getTime()) ? '—' : new Date(stamp).toLocaleString(pl ? 'pl-PL' : 'en-US') + ' (' + new Date(stamp).toISOString() + ')';
    const select = (key, label, options) => `<label for="log-${key}">${label}<select id="log-${key}">${options.map(([value, text]) =>
      `<option value="${_esc(value)}" ${this._logFilters[key] === value ? 'selected' : ''}>${_esc(text)}</option>`).join('')}</select></label>`;
    const severities = [...new Set(['ERROR', 'CRITICAL', 'WARNING', ...model.severities, this._logFilters.severity])].filter(value => value !== 'all');
    const sources = [...model.sources];
    if (this._logFilters.source !== 'all' && !sources.some(([value]) => value === this._logFilters.source)) sources.push([this._logFilters.source, pl ? 'Wybrane źródło (brak w tym okresie)' : 'Selected source (absent in this period)']);
    const labels = pl ? ['Poziom', 'Źródło', 'Ostatnie wystąpienie', 'Komunikat', 'Wystąpienia (HA)'] :
      ['Severity', 'Source', 'Last occurrence', 'Message', 'Occurrences (HA)'];
    return `<section class="retained-logs" aria-label="${pl ? 'Zachowany dziennik' : 'Retained log'}">
      <div class="log-filters">
        ${select('severity', pl ? 'Poziom' : 'Severity', [['all', pl ? 'Wszystkie' : 'All'], ...severities.map(value => [value, value])])}
        ${select('source', pl ? 'Źródło' : 'Source', [['all', pl ? 'Wszystkie źródła' : 'All sources'], ...sources])}
        ${select('period', pl ? 'Zachowany okres' : 'Retained period', [['24h', '24 h'], ['7d', pl ? '7 dni' : '7 days'], ['30d', pl ? '30 dni' : '30 days']])}
        <button type="button" class="refresh-btn" id="log-refresh">${this._t.refreshData}</button>
      </div>
      <p>${pl ? 'Źródło' : 'Source'}: ${_esc(model.source)}. ${pl ? 'Limit' : 'Limit'} max_entries: ${model.cap}. ${pl ? 'Wybrany okres' : 'Selected period'}: ${_esc(model.period)}.</p>
      <p>${pl ? 'Pierwszy zachowany' : 'First retained'}: ${_esc(rangeDate(model.first))} · ${pl ? 'Ostatni zachowany' : 'Last retained'}: ${_esc(rangeDate(model.last))}</p>
      <p>${model.partial && (!this._logData || this._logData.unavailable) ? (pl ? 'Dane dziennika niedostępne lub jeszcze niesprawdzone. Nie pokazujemy wcześniejszych wierszy.' : 'Log data unavailable or not checked yet. Previous rows are not shown.') : model.partial ? (pl ? 'Częściowe dane — tylko bieżący odczyt sensora. Nie stanowi historii dla wybranego zachowanego okresu.' : 'Partial — current sensor snapshot only. This cannot establish the selected retained period.') :
        (pl ? 'Zachowane dane Home Assistant, nie pełna historia. Okres filtruje ostatni znany czas. Licznik HA może obejmować wcześniejsze powtórzenia; nie dowodzi liczby wystąpień wyłącznie w tym okresie.' :
        'Home Assistant retained data, not a complete history. The period filters the last known time. HA aggregate counts can include older repetitions; they do not establish occurrences exclusively within this period.')}</p>
      <p class="log-model-counts">${this._countLabel(model.unavailable ? '—' : model.unique, model.partial ? 'current snapshot row' : 'unique problem')} · ${this._countLabel(model.unavailable || model.occurrences == null ? '—' : model.occurrences, 'occurrence')}
        ${model.filteredUnique > model.unique ? ` · ${pl ? 'pokazano' : 'shown'} ${model.unique}/${model.filteredUnique} (${pl ? 'limit karty' : 'card cap'})` : ''}</p>
      ${this._loading ? `<p role="status">${this._t.loading}</p>` : ''}
      ${!model.rows.length ? `<p role="status">${pl ? 'Brak zachowanych wpisów dla wybranego okresu i filtrów.' : 'No retained entries for the selected period and filters.'}</p>` :
        `<table class="history-records" role="table"><caption>${pl ? 'Wyświetlone problemy' : 'Displayed problems'}</caption><thead role="rowgroup"><tr role="row">${labels.map(label => `<th scope="col" role="columnheader">${label}</th>`).join('')}</tr></thead><tbody role="rowgroup">
        ${model.rows.map(row => `<tr role="row">${[row.level, row.domain, row.when ? rangeDate(Date.parse(row.when)) : '—', row.message, row.count ?? '—'].map((value, i) => `<td role="cell" data-label="${labels[i]}">${_esc(value)}</td>`).join('')}</tr>`).join('')}
        </tbody></table>`}
    </section>`;
  }

  _renderHistory() {
    const pl = this._lang === 'pl';
    const labels = pl ? ['Czas odczytu', 'Błędy (wpisy)', 'Ostrzeżenia (wpisy)', 'Razem (wpisy)'] :
      ['Read time', 'Errors (entries)', 'Warnings (entries)', 'Total (entries)'];
    const rows = (Array.isArray(this._logHistory) ? this._logHistory : []).filter(row => row && typeof row.ts === 'string' &&
      Number.isFinite(Date.parse(row.ts)) && Date.parse(row.ts) <= Date.now() && ['errors', 'warnings', 'total'].every(key => Number.isSafeInteger(row[key]) && row[key] >= 0)).slice(0, 24);
    return this._attemptHistory.render(this._lang) + `<section class="browser-snapshots">
      <h3>${pl ? 'Odczyty dziennika w sesji przeglądarki' : 'Browser session log snapshots'} (${rows.length})</h3>
      <p>${pl ? 'Lokalne liczniki odczytów, nie próby SMTP ani dowód dostarczenia. Maksymalnie 24 odczyty w sesji przeglądarki.' :
        'Local read counts, not SMTP attempts or evidence of delivery. At most 24 snapshots in the browser session.'}
      ${this._browserCountsLegacy ? (pl ? ' Starsze liczniki nie mają potwierdzonej tożsamości użytkownika.' : ' Legacy counts have no confirmed user identity.') : ''}</p>
      ${rows.length ? `<table class="history-records" role="table"><caption>${pl ? 'Lokalne odczyty liczników' : 'Local count snapshots'}</caption><thead role="rowgroup"><tr role="row">${labels.map(label => `<th scope="col" role="columnheader">${label}</th>`).join('')}</tr></thead><tbody role="rowgroup">${rows.map(row =>
        `<tr role="row">${[new Date(row.ts).toLocaleString(pl ? 'pl-PL' : 'en-US'), row.errors, row.warnings, row.total].map((value, i) => `<td role="cell" data-label="${labels[i]}">${_esc(value)}</td>`).join('')}</tr>`).join('')}</tbody></table>` :
        `<p>${pl ? 'Brak lokalnych odczytów.' : 'No local snapshots.'}</p>`}
    </section>`;
  }

  disconnectedCallback() {
    this._dataEpoch++;
    this._logReadToken++;
    this._retainedLogs = null;
    this._logData = null;
    this._logHistory = [];
    this._attemptHistory.discard();
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
  console.log('[ha-log-email] v4.4.1 registered');
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
              <label style="display:block;font-weight:500;margin-bottom:4px;font-size:13px;">${this._lang === 'pl' ? 'Tytuł' : 'Title'}</label>
              <input type="text" id="cf_title" value="${_esc(this._config?.title || 'Log Email Summary')}"
                style="width:100%;padding:8px 12px;border:1px solid var(--divider-color,#e2e8f0);border-radius:8px;background:var(--card-background-color,#fff);color:var(--primary-text-color,#1e293b);font-size:14px;box-sizing:border-box;">
            </div>
            <div style="margin-bottom:12px;">
              <label style="display:block;font-weight:500;margin-bottom:4px;font-size:13px;">${this._lang === 'pl' ? 'Odbiorca email (zamiast ustawienia centralnego)' : 'Email recipient (override)'}</label>
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
 * Version: 4.1.2
 */

(function registerHASmartReports() {
  'use strict';

  if (customElements.get('ha-smart-reports')) return;

  const VERSION = '4.1.2';
  const VALID_PERIODS = new Set(['1d', '7d', '30d']);
  const ENERGY_UNITS = new Set(['Wh', 'kWh', 'MWh']);

  const PL = Object.freeze({
    "Energy report views": "Widoki raportu energii",
    "Summary": "Podsumowanie",
    "Devices": "Urządzenia",
    "Costs": "Koszty",
    "Partial history — recorded values only.": "Niepełna historia — tylko zarejestrowane wartości.",
    "Today starts reporting after its first completed hour.": "Raport dzisiejszy pojawi się po pierwszej zakończonej godzinie.",
    "Recorded energy by device": "Zarejestrowana energia urządzeń",
    "Recorded consumption by day": "Zarejestrowane zużycie po dniach",
    "source hours": "godzin źródeł",
    "Striped days have incomplete history; empty days are not measured zero.": "Dni w paski mają niepełną historię; puste dni nie oznaczają zmierzonego zera.",
    "Device values have their own coverage; nested devices are included in their parent.": "Urządzenia mają własny zakres danych; urządzenie podrzędne jest zawarte w nadrzędnym.",
    "See all devices": "Zobacz wszystkie urządzenia",
    "Cost history": "Historia kosztów",
    "Explicit flat-rate estimate": "Szacunek z jawnej stałej taryfy",
    "Cost samples have their own history; the current tariff is not applied to past energy.": "Próbki kosztów mają własną historię; bieżąca taryfa nie jest stosowana do wcześniejszego zużycia.",
    "No recorded cost source is configured.": "Nie skonfigurowano źródła zarejestrowanych kosztów.",
    "Current entities by domain": "Bieżące encje według domen",
    "Current state snapshot, not historical energy.": "Bieżący stan systemu, bez historii energii.",
    "Source mode": "Tryb źródeł",
    "Energy Dashboard": "Panel energii",
    "Explicit statistics": "Wybrane statystyki",
    "Total statistic IDs": "Identyfikatory statystyk zużycia",
    "Device statistic IDs": "Identyfikatory statystyk urządzeń",
    "Cost statistic IDs": "Identyfikatory statystyk kosztów",
    "One statistic ID per line. Advanced labels and parent relationships can be configured in YAML.": "Jeden identyfikator statystyki na wiersz. Własne etykiety i powiązania nadrzędne można skonfigurować w YAML.",
    "Recorder-backed": "Na podstawie danych rejestratora",
    "Report sections": "Sekcje raportu",
    "Energy": "Energia",
    "Automations": "Automatyzacje",
    "System": "System",
    "Period": "Okres",
    "Energy report period": "Okres raportu energii",
    "Today": "Dzisiaj",
    "7 days": "7 dni",
    "30 days": "30 dni",
    "Export CSV": "Eksport CSV",
    "Export JSON": "Eksport JSON",
    "Optional support for HA Tools": "Dobrowolne wsparcie HA Tools",
    "Dismiss support link": "Ukryj odnośnik wsparcia",
    "Enable at least one report section.": "Włącz co najmniej jedną sekcję raportu.",
    "Turn on Energy, Automations, or System in the card configuration.": "Włącz Energię, Automatyzacje lub System w konfiguracji karty.",
    "Loading recorder statistics…": "Wczytywanie statystyk rejestratora…",
    "This report uses recorded changes for the selected local-calendar period.": "Raport wykorzystuje zarejestrowane zmiany z wybranego okresu według lokalnego kalendarza.",
    "Configure Energy Dashboard or select explicit statistics.": "Skonfiguruj panel energii lub wybierz statystyki.",
    "Smart Reports does not discover sensors by substring and does not use live entity states.": "Smart Reports nie wyszukuje czujników po fragmencie nazwy i nie korzysta z bieżących stanów encji.",
    "Open Energy configuration": "Otwórz konfigurację energii",
    "Recorder statistics are unavailable on this Home Assistant instance.": "Statystyki rejestratora są niedostępne w tej instancji Home Assistant.",
    "Check recorder support and the selected statistic metadata.": "Sprawdź obsługę rejestratora i metadane wybranych statystyk.",
    "Your account cannot read the selected statistics.": "Twoje konto nie może odczytać wybranych statystyk.",
    "Use an account with recorder statistics access.": "Użyj konta z dostępem do statystyk rejestratora.",
    "Couldn’t load energy statistics.": "Nie udało się wczytać statystyk energii.",
    "The previous period is not shown as current data.": "Dane z poprzedniego okresu nie są wyświetlane jako bieżące.",
    "Technical details": "Szczegóły techniczne",
    "Retry": "Ponów",
    "No recorded energy change in this period.": "Brak zarejestrowanych zmian energii w tym okresie.",
    "Measured zero is rendered separately; this state means no recorder samples were available.": "Zmierzone zero jest wyświetlane osobno; ten stan oznacza brak próbek rejestratora.",
    "Partial data — totals and cost are withheld.": "Dane częściowe — suma i koszt nie są wyświetlane.",
    "At least one required statistic was missing, invalid, incomplete, or used an incompatible currency.": "Co najmniej jedna wymagana statystyka była brakująca, nieprawidłowa, niepełna lub używała niezgodnej waluty.",
    "Time zone": "Strefa czasowa",
    "Sources": "Źródła",
    "total": "suma",
    "cost": "koszt",
    "Exact recorder window": "Dokładny zakres rejestratora",
    "Grid import": "Pobór z sieci",
    "Recorded consumption": "Zarejestrowane zużycie",
    "Recorded cost": "Zarejestrowany koszt",
    "Sources with data": "Źródła z danymi",
    "Complete sources": "Źródła z pełną historią",
    "Recorded values cover available samples only; gaps are not zero.": "Zarejestrowane wartości obejmują tylko dostępne próbki; braki nie oznaczają zera.",
    "Actual cost": "Rzeczywisty koszt",
    "Estimated cost": "Szacowany koszt",
    "Cost unavailable": "Koszt niedostępny",
    "Device breakdown unavailable": "Zestawienie urządzeń niedostępne",
    "Reported devices — partial": "Urządzenia w raporcie — dane częściowe",
    "Device breakdown": "Zestawienie urządzeń",
    "No device statistics are configured.": "Nie skonfigurowano statystyk urządzeń.",
    "Source evidence": "Dane źródłowe",
    "day_suffix": " dn.",
    "Never": "Nigdy",
    "now": "teraz",
    "Total automations": "Wszystkie automatyzacje",
    "Active": "Aktywne",
    "Disabled": "Wyłączone",
    "Triggered today": "Uruchomione dzisiaj",
    "Recent activity": "Ostatnia aktywność",
    "No automation entities are available.": "Brak dostępnych encji automatyzacji.",
    "System overview": "Przegląd systemu",
    "Entities": "Encje",
    "Unavailable": "Niedostępne",
    "Unknown": "Nieznane",
    "Domains": "Domeny",
    "Health check": "Stan systemu",
    "Entity availability": "Dostępność encji",
    "Known states": "Znane stany",
    "Total entities": "Wszystkie encje",
    "Title": "Tytuł",
    "Currency": "Waluta",
    "on": "włączona",
    "off": "wyłączona",
    "unknown": "nieznany",
    "unavailable": "niedostępny",
    "ready": "gotowe",
    "partial": "częściowe",
    "no_data": "brak danych",
    "invalid": "nieprawidłowe",
    "unsupported_unit": "nieobsługiwana jednostka",
    "missing_statistics": "brak statystyk",
    "incomplete_period": "niepełny okres",
    "missing_metadata": "brak metadanych",
    "missing_rate": "brak stawki",
    "unsupported": "nieobsługiwane",
    "incompatible_energy_metadata": "niezgodne metadane energii",
    "incompatible_currency_metadata": "niezgodne metadane waluty",
    "invalid_bucket": "nieprawidłowy przedział",
    "outside_requested_window": "poza wybranym zakresem",
    "missing_change": "brak danych zmiany",
    "incomplete_coverage": "niepełne pokrycie okresu",
    "invalid_relationship": "nieprawidłowe powiązanie urządzeń",
    "nested_parent_missing": "brak nadrzędnego źródła urządzenia",
    "currency_mismatch": "niezgodna waluta",
    "partial_cost": "niepełne dane kosztu",
    "missing_currency": "brak waluty",
    "energy_data_unavailable": "dane energii niedostępne",
    "included_in_stat is only valid for device sources: ": "included_in_stat jest dozwolone tylko dla źródeł urządzeń: "
});

  function languageOf(hass) {
    return (hass && hass.locale && hass.locale.language) || (hass && hass.language) || navigator.language || 'en';
  }

  function translate(hass, text) {
    const language = languageOf(hass);
    if (/^pl(?:[-_]|$)/i.test(language) && Object.prototype.hasOwnProperty.call(PL, text)) return PL[text];
    return text === 'day_suffix' ? 'd' : text;
  }

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
      this._energyView = 'summary';
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
      this._syncTheme();
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
      const language = languageOf(hass);
      const languageChanged = language !== this._language;
      this._language = language;
      this._hass = hass;
      this._syncTheme();
      this._syncSupport();
      if (languageChanged && this._scaffoldRendered) {
        this._syncLabels();
        this._syncTabs();
      }
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
        show_support: next.show_support !== false,
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
        this._syncSupport();
        this._invalidateEnergyRequest();
        this._syncTabs();
        this._scheduleRefresh(true);
      }
    }

    getCardSize() { return 5; }

    getGridOptions() { return { columns: 12, min_rows: 3, min_columns: 6 }; }

    static getStubConfig() { return { title: 'Smart Reports', energy_source_mode: 'dashboard' }; }

    static getConfigElement() { return document.createElement('ha-smart-reports-editor'); }

    _renderScaffold() {
      if (this._scaffoldRendered) return;
      this.shadowRoot.innerHTML = `
        <style>
          :host{--sr-primary:var(--primary-color,#3b82f6);--sr-card:var(--card-background-color,var(--ha-card-background,#fff));--sr-text:var(--primary-text-color,#172033);--sr-muted:var(--secondary-text-color,#667085);--sr-border:var(--divider-color,#d9e0ea);--sr-good:#15803d;--sr-warn:#b45309;--sr-bad:#b42318;display:block;color:var(--sr-text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}*{box-sizing:border-box}.card{background:var(--sr-card);border:1px solid var(--sr-border);border-radius:16px;overflow:hidden}.header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:18px 20px 12px}h2,h3,p{margin:0}h2{font-size:20px}h3{font-size:15px}.tabs{display:flex;gap:4px;padding:0 16px;border-bottom:1px solid var(--sr-border);overflow-x:auto}button,select{font:inherit}button{cursor:pointer}button:focus-visible,select:focus-visible,a:focus-visible{outline:2px solid var(--sr-primary);outline-offset:2px}.tab{border:0;border-bottom:3px solid transparent;background:transparent;color:var(--sr-muted);padding:10px 12px}.tab.active{color:var(--sr-primary);border-bottom-color:var(--sr-primary);font-weight:650}.toolbar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;padding:14px 20px 0}.toolbar-actions{display:flex;flex-wrap:wrap;gap:8px}.control,.action{min-height:38px;border:1px solid var(--sr-border);border-radius:9px;background:var(--sr-card);color:var(--sr-text);padding:8px 11px}.action.primary{background:var(--sr-primary);border-color:var(--sr-primary);color:#fff}.action:disabled{cursor:not-allowed;opacity:.45}.pane{padding:20px;min-height:220px}.state{display:grid;gap:12px;place-items:start;padding:22px;border:1px solid var(--sr-border);border-radius:12px}.state[role="status"]{border-left:4px solid var(--sr-primary)}.state.partial{border-left-color:var(--sr-warn)}.state.error{border-left-color:var(--sr-bad)}.summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}.metric{border:1px solid var(--sr-border);border-radius:12px;padding:14px}.metric-label,.muted{color:var(--sr-muted);font-size:12px}.metric-value{margin-top:5px;font-size:23px;font-weight:720}.section{margin-top:18px}.list{display:grid;gap:8px;margin-top:10px}.row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;border-bottom:1px solid var(--sr-border);padding:9px 2px}.row.child{padding-left:24px}.row-name{overflow-wrap:anywhere}.status-ready{color:var(--sr-good)}.warning{color:var(--sr-warn)}.fixed-link{color:var(--sr-primary)}.donate-section{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:10px;border-top:1px solid var(--sr-border);padding:13px 18px;color:var(--sr-muted);font-size:12px}.donate-section a{color:var(--sr-primary);text-decoration:none}[hidden]{display:none!important}@media(max-width:520px){.header,.toolbar{align-items:stretch;flex-direction:column}.toolbar-actions{width:100%}.action{flex:1}}
          .report-views{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}.report-views [aria-selected="true"]{border-color:var(--sr-primary);color:var(--sr-primary);font-weight:650}.bar-chart{display:grid;gap:12px}.chart-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:5px 12px}.chart-row.child{margin-left:20px}.bar-track{grid-column:1/-1;height:9px;background:var(--sr-border);border-radius:5px;overflow:hidden}.bar-fill{background:var(--sr-primary);height:100%;border-radius:4px}.chart-row small{grid-column:1/-1}.daily-history{display:flex;gap:8px;overflow-x:auto;padding:16px 2px 8px;max-width:100%}.day-column{display:grid;gap:6px;text-align:center;flex:0 0 40px;color:var(--sr-muted);font-size:11px}.day-track{height:100px;display:flex;align-items:flex-end;background:var(--sr-border);border-radius:4px;overflow:hidden}.day-track .bar-fill{width:100%}.day-column.partial .day-track{background:repeating-linear-gradient(135deg,transparent 0 4px,var(--sr-border) 4px 7px)}.day-column.partial .bar-fill{background:repeating-linear-gradient(135deg,var(--sr-primary) 0 4px,var(--sr-border) 4px 7px)}.day-column.no_data .day-track{background:repeating-linear-gradient(135deg,transparent 0 4px,var(--sr-border) 4px 7px)}.cost-source{font-size:12px;line-height:1.6;margin-top:8px;overflow-wrap:anywhere}.report-context{margin-bottom:14px;line-height:1.6}summary{cursor:pointer;overflow-wrap:anywhere}.daily-history:focus-visible,summary:focus-visible{outline:2px solid var(--sr-primary);outline-offset:2px}
          :host(.bento-dark){--sr-good:#4ade80;--sr-warn:#fbbf24;--sr-bad:#f87171}
        </style>
        <ha-card class="card">
          <div class="header"><h2 id="title"></h2><span class="muted" id="recorderLabel">${this._t("Recorder-backed")}</span></div>
          <nav class="tabs" id="tabs" aria-label="${this._t("Report sections")}">
            <button class="tab" type="button" data-tab="energy">${this._t("Energy")}</button>
            <button class="tab" type="button" data-tab="automations">${this._t("Automations")}</button>
            <button class="tab" type="button" data-tab="system">${this._t("System")}</button>
          </nav>
          <div class="toolbar" id="energyToolbar">
            <label><span id="periodLabel">${this._t("Period")}</span> <select class="control" id="periodSelect" aria-label="${this._t("Energy report period")}"><option value="1d">${this._t("Today")}</option><option value="7d">${this._t("7 days")}</option><option value="30d">${this._t("30 days")}</option></select></label>
            <div class="toolbar-actions"><button class="action" type="button" id="exportCsvBtn" disabled>${this._t("Export CSV")}</button><button class="action primary" type="button" id="exportJsonBtn" disabled>${this._t("Export JSON")}</button></div>
          </div>
          <main class="pane" id="content"></main>
          <footer class="donate-section" data-source="own-card" style="margin:8px 0 0;padding:4px 0;background:none;border:0;box-shadow:none;min-height:0;display:flex;gap:8px;align-items:center;flex-wrap:wrap;flex-direction:row;justify-content:flex-start;text-align:left"><a href="https://buymeacoffee.com/macsiem" target="_blank" rel="noopener noreferrer" style="font-size:11px;color:var(--secondary-text-color,#64748b);font-weight:400;text-decoration:underline">${this._t("Optional support for HA Tools")}</a><button type="button" class="support-dismiss" aria-label="${this._t("Dismiss support link")}" style="margin-left:auto;padding:2px 6px;min-height:0;line-height:1;border:0;background:none;color:var(--secondary-text-color,#64748b);cursor:pointer">×</button></footer>
        </ha-card>`;
      this._scaffoldRendered = true;
      this.shadowRoot.querySelector('.support-dismiss').addEventListener('click', () => {
        try { localStorage.setItem('ha-smart-reports-support-dismissed', '1'); } catch (_) {}
        this._syncSupport();
      });
      this._syncSupport();
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

    _t(text) { return translate(this._hass, text); }

    _warningText(text) {
      const prefix = 'included_in_stat is only valid for device sources: ';
      return typeof text === 'string' && text.startsWith(prefix)
        ? this._t(prefix) + text.slice(prefix.length) : this._t(text);
    }

    _syncLabels() {
      const root = this.shadowRoot;
      root.getElementById('recorderLabel').textContent = this._t('Recorder-backed');
      root.getElementById('tabs').setAttribute('aria-label', this._t('Report sections'));
      for (const button of root.querySelectorAll('[data-tab]')) {
        button.textContent = this._t({ energy: 'Energy', automations: 'Automations', system: 'System' }[button.dataset.tab]);
      }
      root.getElementById('periodLabel').textContent = this._t('Period');
      const select = root.getElementById('periodSelect');
      select.setAttribute('aria-label', this._t('Energy report period'));
      for (const option of select.options) option.textContent = this._t({ '1d': 'Today', '7d': '7 days', '30d': '30 days' }[option.value]);
      root.getElementById('exportCsvBtn').textContent = this._t('Export CSV');
      root.getElementById('exportJsonBtn').textContent = this._t('Export JSON');
      root.querySelector('.donate-section a').textContent = this._t('Optional support for HA Tools');
      root.querySelector('.support-dismiss').setAttribute('aria-label', this._t('Dismiss support link'));
    }

    _syncTheme() {
      let dark = Boolean(this._hass && this._hass.themes && this._hass.themes.darkMode);
      const surface = this.shadowRoot.querySelector('.card');
      if (this.isConnected && surface) {
        // HA custom themes can be dark while themes.darkMode remains false.
        // Reading the rendered surface also resolves aliases and CSS color syntax.
        const background = getComputedStyle(surface).backgroundColor;
        const rgb = background.match(/^rgba?\(\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\s*\)$/);
        if (rgb && (rgb[4] === undefined || Number(rgb[4]) === 1)) {
          const brightness = (0.2126 * Number(rgb[1]) + 0.7152 * Number(rgb[2]) + 0.0722 * Number(rgb[3])) / 255;
          dark = brightness < 0.5;
        }
      }
      this.classList.toggle('bento-dark', dark);
    }

    _syncSupport() {
      if (!this._scaffoldRendered) return;
      let dismissed = false;
      try { dismissed = localStorage.getItem('ha-smart-reports-support-dismissed') === '1'; } catch (_) {}
      this.shadowRoot.querySelector('.donate-section[data-source="own-card"]').hidden = !this._hass?.user?.is_admin || this._config.show_support === false || dismissed;
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
      const start = this._zonedDateTimeToUtc({ ...startDate, hour: 0, minute: 0, second: 0 }, timeZone);
      const end = new Date(Math.max(start.getTime(), Math.floor(now.getTime() / 3600000) * 3600000));
      return { key: safeKey, start, end, time_zone: timeZone };
    }

    _periodDescriptor() {
      const window = this._calendarWindow(this._period, this._now(), this._timeZone());
      return { key: window.key, start: window.start.toISOString(), end: window.end.toISOString(), time_zone: window.time_zone };
    }

    async _dashboardSources(generation) {
      let prefs;
      try {
        prefs = await this._hass.callWS({ type: 'energy/get_prefs' });
      } catch (error) {
        // Core reports an unconfigured Energy Dashboard as not_found / No prefs.
        // This applies only to preference discovery, never Recorder failures.
        if (!error || error.code !== 'not_found') throw error;
        prefs = null;
      }
      if (!this._isCurrentEnergyRequest(generation)) return null;
      const totals = []; const costs = []; const devices = []; const costCoverage = new Map();
      const costParents = new Map();
      const linkCost = (cost, total) => {
        if (!cost) return;
        if (!costParents.has(cost.statistic_id)) costParents.set(cost.statistic_id, new Set());
        costParents.get(cost.statistic_id).add(total.statistic_id);
      };
      const add = (target, value, role) => {
        const normalized = normalizeConfiguredSource(value, role, 'energy_dashboard');
        if (normalized) target.push(normalized);
        return normalized;
      };
      const addGridFlow = (totalValue, costValue) => {
        const total = add(totals, totalValue, 'total');
        if (!total) return;
        const cost = add(costs, costValue, 'cost');
        linkCost(cost, total);
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
            linkCost(mapped, total);
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
      const linkedCosts = uniqueCosts.map(cost => ({ ...cost, energy_statistic_ids: Array.from(costParents.get(cost.statistic_id) || []) }));
      return { source_mode: 'energy_dashboard', totals: uniqueTotals, devices: uniqueDevices, costs: linkedCosts, cost_configuration_incomplete: costConfigurationIncomplete, warnings: [], ordered: uniqueById([...uniqueTotals, ...linkedCosts, ...uniqueDevices]) };
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
      const complete = this._summarizeCompleteSeries(series, metadata, window, role, expectedCurrency);
      const result = { ...complete, recorded_value: null, coverage: null };
      if (!['ready', 'partial', 'no_data'].includes(complete.status)) return result;
      const start = numericTime(window && window.start); const end = numericTime(window && window.end);
      if (start === null || end === null || end < start) return result;
      const buckets = (Array.isArray(series) ? series : []).map(bucket => ({ start: numericTime(bucket.start), end: numericTime(bucket.end), change: bucket.change })).sort((a, b) => a.start - b.start);
      if (buckets.some((bucket, index) => bucket.start === null || bucket.end === null || bucket.end <= bucket.start || (index > 0 && bucket.start < buckets[index - 1].end) || (bucket.change != null && (typeof bucket.change !== 'number' || !Number.isFinite(bucket.change) || (role !== 'cost' && bucket.change < 0))))) return result;
      const observed = buckets.filter(bucket => bucket.start >= start && bucket.end <= end && typeof bucket.change === 'number');
      let value = observed.reduce((sum, bucket) => sum + bucket.change, 0);
      const unit = this._metadataUnit(metadata);
      if (role !== 'cost') value *= unit === 'Wh' ? 0.001 : (unit === 'MWh' ? 1000 : 1);
      result.recorded_value = observed.length > 0 && Number.isFinite(value) ? value : null;
      result.coverage = { observed_hours: observed.reduce((hours, bucket) => hours + (bucket.end - bucket.start) / 3600000, 0), expected_hours: (end - start) / 3600000, first_sample: observed.length ? new Date(observed[0].start).toISOString() : null, last_sample: observed.length ? new Date(observed[observed.length - 1].end).toISOString() : null };
      return result;
    }

    _summarizeCompleteSeries(series, metadata, window, role, expectedCurrency) {
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
        // A boundary gap or a straddling bucket cannot represent the requested total.
        if (Math.abs(effectiveBuckets[0].start - startMs) > 1000 || Math.abs(endMs - effectiveBuckets[effectiveBuckets.length - 1].end) > 1000) return { status: 'partial', value: null, unit: normalizedUnit, reason: 'incomplete_coverage' };
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
      const previous = this._energyViewState;
      const reportConfig = JSON.stringify([this._config.energy_source_mode, this._config.energy_total_statistics, this._config.energy_device_statistics, this._config.energy_cost_statistics, this._config.energy_entity, this._config.energy_price, this._config.currency]);
      const sameWindow = this._energyReportConfig === reportConfig && previous && ['ready', 'partial', 'no_data'].includes(previous.status) && previous.source_mode === mode && previous.period && previous.period.key === period.key && previous.period.start === period.start && previous.period.end === period.end && previous.period.time_zone === period.time_zone;
      if (!sameWindow) this._setEnergyViewState({ status: 'loading', period, source_mode: mode, total: { value: null, unit: 'kWh', source_statistic_ids: [] }, cost: { value: null, currency: null, method: 'unavailable', rate: null, source_statistic_ids: [], reason: 'loading' }, devices: [], warnings: [] });
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
        const statisticsResponse = new Date(period.end) <= new Date(period.start) ? {} : await this._hass.callWS({ type: 'recorder/statistics_during_period', start_time: period.start, end_time: period.end, statistic_ids: ids, period: 'hour', types: ['change'] });
        if (!this._isCurrentEnergyRequest(generation)) return;
        const metadataById = this._metadataMap(metadataResponse); const statisticsById = statisticsResponse && typeof statisticsResponse === 'object' ? statisticsResponse : {};
        const window = { start: new Date(period.start), end: new Date(period.end) };
        const expectedCurrency = this._hass && this._hass.config && this._hass.config.currency;
        const roleReferences = [...selection.totals, ...selection.costs, ...selection.devices];
        const summaryByRole = new Map(roleReferences.map((source) => [`${source.role}:${source.statistic_id}`, this._summarizeSeries(statisticsById[source.statistic_id], metadataById[source.statistic_id], window, source.role, expectedCurrency)]));
        const materialize = (source) => {
          const entity = this._hass.states && this._hass.states[source.statistic_id];
          const friendlyName = entity && entity.attributes && entity.attributes.friendly_name;
          const metadataName = metadataById[source.statistic_id] && metadataById[source.statistic_id].name;
          const relatedNames = (source.energy_statistic_ids || []).map(id => this._hass.states?.[id]?.attributes?.friendly_name || metadataById[id]?.name || id);
          const label = [source.label, friendlyName, metadataName, relatedNames.length ? relatedNames.join(' / ') : null].find(value => typeof value === 'string' && value.trim());
          return { ...source, ...summaryByRole.get(`${source.role}:${source.statistic_id}`), label: label || source.statistic_id };
        };
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
        const recordedTotal = this._recordedSubtotal(totalSources, 'kWh');
        const recordedCost = this._recordedSubtotal(costSources, expectedCurrency);
        const daily = this._dailyEnergySeries(period, totalSources, statisticsById, metadataById);
        this._energyReportConfig = reportConfig;
        this._setEnergyViewState({ status, period, source_mode: selection.source_mode, total: completeTotal, cost, recorded_total: recordedTotal, recorded_cost: recordedCost, daily, devices: deviceModel.rows, total_sources: totalSources, cost_sources: costSources, device_data_status: deviceDataStatus, device_relationship_status: deviceModel.relationship_status, top_ranking_available: deviceModel.top_ranking_available, warnings });
      } catch (error) {
        if (this._isCurrentEnergyRequest(generation)) this._setEnergyViewState(this._errorState(error, period));
      }
    }

    _dailyEnergySeries(period, sources, statistics, metadata) {
      const start = asDate(period.start); const end = asDate(period.end);
      if (!start || !end || end <= start) return [];
      const days = []; let parts = this._partsInZone(start, period.time_zone);
      for (let count = 0; count < 31; count += 1) {
        const bounds = this._zonedDayBounds(parts, period.time_zone);
        const dayStart = new Date(Math.max(start.getTime(), bounds.start.getTime()));
        const dayEnd = new Date(Math.min(end.getTime(), bounds.end.getTime()));
        if (dayEnd <= dayStart) break;
        const summaries = sources.map(source => {
          if (!['ready', 'partial', 'no_data'].includes(source.status)) return { status: source.status, recorded_value: null, coverage: null };
          const buckets = (statistics[source.statistic_id] || []).filter(bucket => numericTime(bucket.start) >= dayStart.getTime() && numericTime(bucket.end) <= dayEnd.getTime());
          return this._summarizeSeries(buckets, metadata[source.statistic_id], { start: dayStart, end: dayEnd }, 'total');
        });
        const measured = summaries.filter(source => typeof source.recorded_value === 'number' && Number.isFinite(source.recorded_value));
        const value = measured.reduce((sum, source) => sum + source.recorded_value, 0);
        const complete = sources.length > 0 && summaries.every(source => source.status === 'ready');
        days.push({ start: dayStart.toISOString(), end: dayEnd.toISOString(), value: complete ? value : null, recorded_value: measured.length && Number.isFinite(value) ? value : null, unit: 'kWh', status: complete ? 'ready' : (measured.length ? 'partial' : 'no_data'), observed_source_hours: summaries.reduce((sum, source) => sum + (source.coverage ? source.coverage.observed_hours : 0), 0), expected_source_hours: sources.length * (dayEnd - dayStart) / 3600000 });
        if (bounds.end >= end) break;
        parts = this._addCalendarDays(parts, 1);
      }
      return days;
    }

    _renderEnergyViews(container) {
      const nav = document.createElement('nav'); nav.className = 'report-views'; nav.setAttribute('role', 'tablist'); nav.setAttribute('aria-label', this._t('Energy report views'));
      for (const [key, label] of [['summary', 'Summary'], ['devices', 'Devices'], ['costs', 'Costs']]) {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'action'; button.textContent = this._t(label); button.dataset.energyView = key; button.setAttribute('role', 'tab'); button.setAttribute('aria-selected', String(this._energyView === key));
        button.addEventListener('click', () => { this._energyView = key; this._renderEnergyState(); this.shadowRoot.querySelector('[data-energy-view][aria-selected="true"]')?.focus(); });
        nav.appendChild(button);
      }
      container.appendChild(nav);
      if (this._focusedEnergyView) nav.querySelector(`[data-energy-view="${this._focusedEnergyView}"]`)?.focus();
    }

    _coverageText(source) {
      const coverage = source.coverage;
      return coverage ? `${this._formatNumber(coverage.observed_hours, 0)} / ${this._formatNumber(coverage.expected_hours, 0)} h · ${this._t(source.status)}` : this._t(source.status || 'no_data');
    }

    _barChart(rows, label, unit) {
      const chart = document.createElement('section'); chart.className = 'bar-chart section'; chart.setAttribute('aria-label', this._t(label));
      const finite = row => typeof row.recorded_value === 'number' && Number.isFinite(row.recorded_value) ? row.recorded_value : (row.status === 'ready' && typeof row.value === 'number' && Number.isFinite(row.value) ? row.value : null);
      const maximum = Math.max(0, ...rows.map(row => finite(row) || 0));
      for (const source of rows) {
        const row = document.createElement('div'); row.className = `chart-row${source.depth > 0 ? ' child' : ''}`;
        const name = document.createElement('span'); name.className = 'row-name'; name.textContent = source.label || source.statistic_id;
        const measured = finite(source); const value = document.createElement('span'); value.textContent = `${this._formatNumber(measured, unit ? 2 : 0)}${unit ? ` ${unit}` : ''}`;
        const track = document.createElement('div'); track.className = 'bar-track';
        const bar = document.createElement('div'); bar.className = 'bar-fill'; bar.style.width = `${maximum > 0 && measured !== null ? Math.max(0, Math.min(100, measured / maximum * 100)) : 0}%`;
        if (measured !== null) { track.setAttribute('role', 'meter'); track.setAttribute('aria-label', name.textContent); track.setAttribute('aria-valuemin', '0'); track.setAttribute('aria-valuemax', String(Math.max(maximum, measured))); track.setAttribute('aria-valuenow', String(measured)); track.setAttribute('aria-valuetext', `${value.textContent} · ${this._coverageText(source)}`); }
        track.appendChild(bar); row.append(name, value, track);
        if (unit) { const coverage = document.createElement('small'); coverage.className = source.status === 'ready' ? 'muted' : 'warning'; coverage.textContent = this._coverageText(source); row.appendChild(coverage); }
        chart.appendChild(row);
      }
      return chart;
    }

    _renderDailyChart(container, state) {
      const days = state.daily || [];
      if (!days.length) return;
      const heading = document.createElement('h3'); heading.className = 'section'; heading.textContent = this._t('Recorded consumption by day'); container.appendChild(heading);
      const chart = document.createElement('section'); chart.className = 'daily-history'; chart.setAttribute('role', 'region'); chart.setAttribute('aria-label', this._t('Recorded consumption by day')); chart.tabIndex = 0;
      const max = Math.max(0, ...days.map(day => day.recorded_value || 0));
      for (const day of days) {
        const item = document.createElement('div'); item.className = `day-column ${day.status}`;
        const text = `${this._formatPeriodDate(day.start, state.period.time_zone)} · ${this._formatNumber(day.recorded_value, 2)} kWh · ${this._t(day.status)} · ${this._formatNumber(day.observed_source_hours, 0)} / ${this._formatNumber(day.expected_source_hours, 0)} ${this._t('source hours')}`;
        item.setAttribute('role', 'img'); item.setAttribute('aria-label', text); item.title = text;
        const value = document.createElement('small'); value.textContent = this._formatNumber(day.recorded_value, 2);
        const track = document.createElement('div'); track.className = 'day-track'; const bar = document.createElement('div'); bar.className = 'bar-fill'; bar.style.height = `${max > 0 && day.recorded_value != null ? Math.max(0, Math.min(100, day.recorded_value / max * 100)) : 0}%`; track.appendChild(bar);
        const label = document.createElement('small'); label.textContent = new Intl.DateTimeFormat(languageOf(this._hass), { day: 'numeric', month: 'numeric', timeZone: state.period.time_zone }).format(new Date(day.start));
        item.append(value, track, label); chart.appendChild(item);
      }
      container.appendChild(chart);
      const note = document.createElement('p'); note.className = 'muted'; note.textContent = this._t('Striped days have incomplete history; empty days are not measured zero.'); container.appendChild(note);
    }

    _renderCostCoverage(container, state) {
      const section = document.createElement('section'); section.className = 'cost-coverage section';
      const heading = document.createElement('h3'); heading.textContent = this._t('Cost history'); section.appendChild(heading);
      const note = document.createElement('p'); note.className = 'muted'; note.textContent = state.cost && state.cost.method === 'flat_rate_estimate' ? `${this._t('Explicit flat-rate estimate')}: ${this._formatNumber(state.cost.rate, 4)} ${state.cost.currency}/kWh` : this._t('Cost samples have their own history; the current tariff is not applied to past energy.'); section.appendChild(note);
      for (const source of state.cost_sources || []) {
        const row = document.createElement('p'); row.className = 'cost-source';
        const value = source.recorded_value == null ? source.value : source.recorded_value;
        row.textContent = `${source.label || source.statistic_id}: ${this._formatNumber(value, 2)} ${source.unit || ''} · ${this._coverageText(source)}`;
        if (source.coverage && source.coverage.first_sample) row.textContent += ` · ${this._formatPeriodDate(source.coverage.first_sample, state.period.time_zone)} – ${this._formatPeriodDate(source.coverage.last_sample, state.period.time_zone)}`;
        section.appendChild(row);
      }
      if (!(state.cost_sources || []).length && (!state.cost || state.cost.method !== 'flat_rate_estimate')) { const empty = document.createElement('p'); empty.className = 'muted'; empty.textContent = this._t('No recorded cost source is configured.'); section.appendChild(empty); }
      container.appendChild(section);
    }


    _recordedSubtotal(sources, unit) {
      const measured = sources.filter(source => source.unit === unit && typeof source.recorded_value === 'number' && Number.isFinite(source.recorded_value));
      const value = measured.reduce((sum, source) => sum + source.recorded_value, 0);
      return { value: measured.length > 0 && Number.isFinite(value) ? value : null, unit: unit || null, status: sources.length === 0 ? 'no_data' : (sources.every(source => source.status === 'ready') ? 'ready' : 'partial'), sources_with_data: measured.length, complete_sources: sources.filter(source => source.status === 'ready').length, configured_sources: sources.length, source_statistic_ids: measured.map(source => source.statistic_id) };
    }

    _setEnergyViewState(state) {
      if (JSON.stringify(state) === JSON.stringify(this._energyViewState)) return;
      this._energyViewState = state;
      if (this._scaffoldRendered && this._activeTab === 'energy') this._renderEnergyState();
    }

    _stateBlock(title, detail, className, role) {
      const block = document.createElement('section'); block.className = `state ${className || ''}`.trim(); if (role) block.setAttribute('role', role);
      const heading = document.createElement('h3'); heading.textContent = this._t(title); block.appendChild(heading);
      if (detail) { const paragraph = document.createElement('p'); paragraph.className = 'muted'; paragraph.textContent = this._t(detail); block.appendChild(paragraph); }
      return block;
    }

    _renderEnergyState() {
      if (!this._scaffoldRendered) return;
      const container = this.shadowRoot.getElementById('content'); const state = this._energyViewState || { status: 'idle' };
      const exportable = ['ready', 'partial', 'no_data'].includes(state.status);
      this._focusedEnergyView = this.shadowRoot.activeElement && this.shadowRoot.activeElement.dataset.energyView;
      this.shadowRoot.getElementById('exportJsonBtn').disabled = !exportable; this.shadowRoot.getElementById('exportCsvBtn').disabled = !exportable; container.replaceChildren();
      if (state.status === 'loading' || state.status === 'idle') { container.appendChild(this._stateBlock('Loading recorder statistics…', 'This report uses recorded changes for the selected local-calendar period.', '', 'status')); return; }
      if (state.status === 'not_configured') {
        const block = this._stateBlock('Configure Energy Dashboard or select explicit statistics.', 'Smart Reports does not discover sensors by substring and does not use live entity states.', '', 'status');
        for (const warningText of state.warnings || []) { const warning = document.createElement('p'); warning.className = 'warning'; warning.textContent = this._warningText(warningText); block.appendChild(warning); }
        const link = document.createElement('a'); link.className = 'fixed-link'; link.href = '/config/energy'; link.textContent = this._t('Open Energy configuration'); block.appendChild(link); container.appendChild(block); return;
      }
      if (state.status === 'unsupported') { container.appendChild(this._stateBlock('Recorder statistics are unavailable on this Home Assistant instance.', 'Check recorder support and the selected statistic metadata.', 'error', 'alert')); return; }
      if (state.status === 'permission_denied') { container.appendChild(this._stateBlock('Your account cannot read the selected statistics.', 'Use an account with recorder statistics access.', 'error', 'alert')); return; }
      if (state.status === 'error') {
        const block = this._stateBlock('Couldn’t load energy statistics.', 'The previous period is not shown as current data.', 'error', 'alert');
        const details = document.createElement('details'); const summary = document.createElement('summary'); summary.textContent = this._t('Technical details'); const code = document.createElement('code'); code.textContent = state.code == null ? 'unknown_error' : String(state.code); details.append(summary, code); block.appendChild(details);
        const retry = document.createElement('button'); retry.type = 'button'; retry.className = 'action'; retry.textContent = this._t('Retry'); retry.addEventListener('click', () => this._scheduleRefresh(true), { once: true }); block.appendChild(retry); container.appendChild(block); return;
      }
      if (!['ready', 'partial', 'no_data'].includes(state.status)) return;
      const period = state.period || {}; const context = document.createElement('p'); context.className = 'muted report-context';
      const timeZone = period.time_zone || this._timeZone();
      const periodLabel = this._t(period.key === '1d' ? 'Today' : (period.key === '30d' ? '30 days' : (period.key === '7d' ? '7 days' : (period.key || '—'))));
      context.textContent = `${this._t('Period')}: ${periodLabel} · ${this._formatPeriodDate(period.start, timeZone)} – ${this._formatPeriodDate(period.end, timeZone)} · ${this._t('Time zone')}: ${timeZone} · ${this._t('Sources')}: ${(state.total_sources || []).length} ${this._t('total')}, ${(state.cost_sources || []).length} ${this._t('cost')}`;
      context.dataset.periodStart = period.start || '';
      context.dataset.periodEnd = period.end || '';
      context.title = `${this._t('Exact recorder window')}: ${period.start || '—'} → ${period.end || '—'}`;
      container.appendChild(context);
      if (state.status === 'no_data') {
        container.appendChild(this._stateBlock('No recorded energy change in this period.', 'Measured zero is rendered separately; this state means no recorder samples were available.', '', 'status'));
        if (period.start === period.end) { const note = document.createElement('p'); note.className = 'muted section'; note.textContent = this._t('Today starts reporting after its first completed hour.'); container.appendChild(note); }
        return;
      }
      this._renderEnergyViews(container);
      if (state.status === 'partial') container.appendChild(this._stateBlock('Partial history — recorded values only.', 'At least one required statistic was missing, invalid, incomplete, or used an incompatible currency.', 'partial', 'status'));
      const summary = document.createElement('section'); summary.className = 'summary';
      const recordedTotal = state.recorded_total || {};
      const recordedCost = state.recorded_cost || {};
      summary.appendChild(this._metric(state.status === 'partial' ? 'Recorded consumption' : 'Grid import', `${this._formatNumber(state.status === 'partial' ? recordedTotal.value : state.total.value, 2)} ${state.total.unit || 'kWh'}`));
      const costLabel = state.cost && state.cost.method === 'cost_statistics' ? 'Actual cost' : (state.cost && state.cost.method === 'flat_rate_estimate' ? 'Estimated cost' : 'Cost unavailable');
      const costValue = state.cost && typeof state.cost.value === 'number' ? `${this._formatNumber(state.cost.value, 2)} ${state.cost.currency || ''}`.trim() : '—';
      summary.appendChild(this._metric(state.cost && state.cost.value == null && recordedCost.value != null ? 'Recorded cost' : costLabel, state.cost && state.cost.value == null && recordedCost.value != null ? `${this._formatNumber(recordedCost.value, 2)} ${recordedCost.unit || ''}` : costValue));
      summary.appendChild(this._metric('Sources with data', `${recordedTotal.sources_with_data || 0} / ${(state.total_sources || []).length}`));
      summary.appendChild(this._metric('Complete sources', `${recordedTotal.complete_sources || 0} / ${(state.total_sources || []).length}`));
      container.appendChild(summary);
      if (state.status === 'partial' || recordedCost.status === 'partial') { const note = document.createElement('p'); note.className = 'muted section'; note.textContent = this._t('Recorded values cover available samples only; gaps are not zero.'); container.appendChild(note); }
      if (this._energyView === 'summary') this._renderDailyChart(container, state);
      if (this._energyView !== 'costs') {
        const heading = document.createElement('h3'); heading.className = 'section'; heading.textContent = this._t(state.top_ranking_available === false ? 'Device breakdown unavailable' : (state.device_data_status === 'partial' ? 'Reported devices — partial' : 'Device breakdown')); container.appendChild(heading);
        const devices = state.devices || [];
        if (devices.length) {
          container.appendChild(this._barChart(this._energyView === 'summary' ? devices.slice(0, 6) : devices, 'Recorded energy by device', 'kWh'));
          const note = document.createElement('p'); note.className = 'muted'; note.textContent = this._t('Device values have their own coverage; nested devices are included in their parent.'); container.appendChild(note);
          if (this._energyView === 'summary' && devices.length > 6) { const all = document.createElement('button'); all.type = 'button'; all.className = 'action section'; all.textContent = this._t('See all devices'); all.addEventListener('click', () => { this._energyView = 'devices'; this._renderEnergyState(); }); container.appendChild(all); }
        } else { const empty = document.createElement('p'); empty.className = 'muted section'; empty.textContent = this._t('No device statistics are configured.'); container.appendChild(empty); }
      }
      if (this._energyView !== 'devices') this._renderCostCoverage(container, state);
      const evidence = document.createElement('details'); evidence.className = 'section source-evidence';
      const evidenceHeading = document.createElement('summary'); evidenceHeading.textContent = this._t('Source evidence'); evidence.appendChild(evidenceHeading);
      const evidenceList = document.createElement('div'); evidenceList.className = 'list';
      for (const source of [...(state.total_sources || []), ...(state.cost_sources || [])]) {
        const row = document.createElement('div'); row.className = 'row';
        const name = document.createElement('span'); name.className = 'row-name'; const sourceLabel = source.label || source.statistic_id; name.textContent = sourceLabel === source.statistic_id ? source.statistic_id : `${sourceLabel} (${source.statistic_id})`;
        const detail = document.createElement('span'); detail.className = source.status === 'ready' ? 'status-ready' : 'warning'; detail.textContent = source.reason ? `${this._t(source.status)}: ${this._t(source.reason)}` : this._t(source.status);
        row.append(name, detail); evidenceList.appendChild(row);
      }
      for (const warningText of state.warnings || []) { const warning = document.createElement('p'); warning.className = 'warning'; warning.textContent = this._warningText(warningText); evidenceList.appendChild(warning); }
      evidence.appendChild(evidenceList); container.appendChild(evidence);
    }

    _metric(labelText, valueText) {
      const metric = document.createElement('div'); metric.className = 'metric'; const label = document.createElement('div'); label.className = 'metric-label'; label.textContent = this._t(labelText); const value = document.createElement('div'); value.className = 'metric-value'; value.textContent = valueText; metric.append(label, value); return metric;
    }

    _formatNumber(value, digits) {
      if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
      try { return new Intl.NumberFormat(languageOf(this._hass), { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value); } catch (_error) { return value.toFixed(digits); }
    }

    _formatPeriodDate(value, timeZone) {
      const date = asDate(value);
      if (!date) return '—';
      const language = languageOf(this._hass);
      try { return new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(date); } catch (_error) { return date.toISOString().slice(0, 10); }
    }

    _timeAgo(value) {
      if (value == null) return this._t('Never');
      const date = asDate(value);
      if (!date) return this._t('Never');
      const now = asDate(this._now()) || new Date();
      const difference = Math.max(0, now.getTime() - date.getTime());
      if (difference < 60000) return this._t('now');
      if (difference < 3600000) return `${Math.floor(difference / 60000)}m`;
      if (difference < 86400000) return `${Math.floor(difference / 3600000)}h`;
      return `${Math.floor(difference / 86400000)}${this._t('day_suffix')}`;
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
      const timeZone = this._timeZone();
      const todayStart = this._zonedDayBounds(this._partsInZone(now, timeZone), timeZone).start;
      const active = automations.filter((automation) => automation.state === 'on').length;
      const disabled = automations.filter((automation) => automation.state === 'off').length;
      const triggeredToday = automations.filter((automation) => {
        const triggered = asDate(automation.last_triggered);
        return triggered && triggered >= todayStart && triggered <= now;
      }).length;
      const summary = document.createElement('div'); summary.className = 'summary'; summary.append(this._metric('Total automations', String(automations.length)), this._metric('Active', String(active)), this._metric('Disabled', String(disabled)), this._metric('Triggered today', String(triggeredToday))); container.appendChild(summary);
      const heading = document.createElement('h3'); heading.className = 'section'; heading.textContent = this._t('Recent activity'); container.appendChild(heading); const list = document.createElement('div'); list.className = 'list';
      for (const automation of automations.slice(0, 10)) { const row = document.createElement('div'); row.className = 'row'; const name = document.createElement('span'); name.className = 'row-name'; name.textContent = automation.label; const status = document.createElement('span'); status.textContent = `${this._timeAgo(automation.last_triggered)} · ${this._t(automation.state)}`; row.append(name, status); list.appendChild(row); }
      if (automations.length === 0) { const empty = document.createElement('p'); empty.className = 'muted'; empty.textContent = this._t('No automation entities are available.'); list.appendChild(empty); }
      container.appendChild(list);
    }

    _renderSystem() {
      if (!this._scaffoldRendered || this._activeTab !== 'system') return;
      const container = this.shadowRoot.getElementById('content'); container.replaceChildren(); const states = this._hass && this._hass.states ? this._hass.states : {}; const entries = Object.entries(states);
      const unavailable = entries.filter(([, state]) => state && state.state === 'unavailable').length; const unknown = entries.filter(([, state]) => state && state.state === 'unknown').length; const domains = new Map();
      for (const [entityId] of entries) { const domain = entityId.split('.')[0]; domains.set(domain, (domains.get(domain) || 0) + 1); }
      const heading = document.createElement('h3'); heading.textContent = this._t('System overview'); container.appendChild(heading); const summary = document.createElement('div'); summary.className = 'summary section';
      for (const [label, value] of [['Entities', entries.length], ['Unavailable', unavailable], ['Unknown', unknown], ['Domains', domains.size]]) summary.appendChild(this._metric(label, String(value)));
      container.appendChild(summary); const list = document.createElement('div'); list.className = 'list section';
      for (const [domain, count] of [...domains.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))) { const row = document.createElement('div'); row.className = 'row'; const label = document.createElement('span'); label.textContent = domain; const value = document.createElement('span'); value.textContent = String(count); row.append(label, value); list.appendChild(row); }
      container.appendChild(this._barChart([...domains.entries()].sort((a,b) => b[1] - a[1]).map(([label, value]) => ({ label, value, status: 'ready' })), 'Current entities by domain', ''));
      const snapshotNote = document.createElement('p'); snapshotNote.className = 'muted section'; snapshotNote.textContent = this._t('Current state snapshot, not historical energy.'); container.appendChild(snapshotNote);
      const healthHeading = document.createElement('h3'); healthHeading.className = 'section'; healthHeading.textContent = this._t('Health check'); container.appendChild(healthHeading);
      const health = document.createElement('div'); health.className = 'list'; const divisor = Math.max(entries.length, 1);
      for (const [labelText, valueText] of [
        ['Entity availability', `${(((entries.length - unavailable) / divisor) * 100).toFixed(1)}%`],
        ['Known states', `${(((entries.length - unknown) / divisor) * 100).toFixed(1)}%`],
        ['Total entities', String(entries.length)],
        ['Unavailable', String(unavailable)],
        ['Unknown', String(unknown)],
      ]) {
        const row = document.createElement('div'); row.className = 'row'; const label = document.createElement('span'); label.textContent = this._t(labelText); const value = document.createElement('span'); value.textContent = valueText; row.append(label, value); health.appendChild(row);
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
          recorded_total: state.recorded_total || null,
          recorded_cost: state.recorded_cost || null,
          daily: state.daily || [],
          total_sources: (state.total_sources || []).map((source) => this._exportSource(source)),
          cost_sources: (state.cost_sources || []).map((source) => this._exportSource(source)),
          devices: (state.devices || []).map((device) => ({ recorded_value: device.recorded_value == null ? null : device.recorded_value, coverage: device.coverage || null, statistic_id: device.statistic_id, label: device.label || device.statistic_id, value: typeof device.value === 'number' && Number.isFinite(device.value) ? device.value : null, unit: device.unit || 'kWh', status: device.status || 'invalid', provenance: device.provenance || 'unknown', included_in_stat: device.included_in_stat || null })),
          warnings: Array.isArray(state.warnings) ? state.warnings.map(String) : [],
        },
      };
    }

    _exportSource(source) {
      return { statistic_id: source.statistic_id, label: source.label || source.statistic_id, role: source.role, value: typeof source.value === 'number' && Number.isFinite(source.value) ? source.value : null, recorded_value: typeof source.recorded_value === 'number' && Number.isFinite(source.recorded_value) ? source.recorded_value : null, coverage: source.coverage || null, unit: source.unit || null, status: source.status || 'invalid', provenance: source.provenance || 'unknown', included_in_stat: source.included_in_stat || null, reason: source.reason || null };
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
      for (const metric of ['recorded_total', 'recorded_cost']) {
        const value = report.energy[metric];
        if (value && value.status === 'partial' && value.value != null) rows.push([...base, 'energy', metric, value.source_statistic_ids.join('|'), metric, value.value, value.unit, 'partial', 'recorder_available_samples', '', 'incomplete_coverage']);
      }
      for (const source of report.energy.total_sources || []) rows.push([...base, 'energy', 'total_source', source.statistic_id, source.label, source.value, source.unit, source.status, source.provenance, source.included_in_stat, source.reason]);
      for (const source of report.energy.cost_sources || []) rows.push([...base, 'energy', 'cost_source', source.statistic_id, source.label, source.value, source.unit, source.status, source.provenance, source.included_in_stat, source.reason]);
      for (const [kind, sources] of [['total_source', report.energy.total_sources], ['cost_source', report.energy.cost_sources], ['device', report.energy.devices]]) {
        for (const source of sources || []) {
          if (source.status !== 'ready' && source.recorded_value != null) rows.push([...base, 'energy', `recorded_${kind}`, source.statistic_id, source.label, source.recorded_value, source.unit, source.status, 'recorder_available_samples', source.included_in_stat, source.reason || 'incomplete_coverage']);
          if (source.coverage) for (const [key, unit] of [['observed_hours', 'h'], ['expected_hours', 'h'], ['first_sample', 'UTC'], ['last_sample', 'UTC']]) rows.push([...base, 'energy', `${kind}_${key}`, source.statistic_id, source.label, source.coverage[key], unit, source.status, 'recorder_available_samples', source.included_in_stat, source.reason || '']);
        }
      }
      for (const day of report.energy.daily || []) rows.push([...base, 'energy', 'recorded_day', '', `${day.start} / ${day.end}`, day.recorded_value, 'kWh', day.status, 'recorder_available_samples', '', `${day.observed_source_hours}/${day.expected_source_hours} source hours`]);
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
    set hass(hass) {
      const language = languageOf(hass);
      const changed = language !== this._language;
      this._language = language; this._hass = hass;
      if (changed) this._render();
    }
    _render() {
      this.shadowRoot.replaceChildren();
      const style = document.createElement('style'); style.textContent = ':host{display:grid;gap:12px;padding:12px;color:var(--primary-text-color,#172033);font-family:system-ui,sans-serif}label{display:grid;gap:5px}input{font:inherit;padding:9px;border:1px solid var(--divider-color,#d9e0ea);border-radius:8px;background:var(--card-background-color,#fff);color:inherit}input:focus-visible,textarea:focus-visible,select:focus-visible{outline:2px solid var(--primary-color,#3b82f6);outline-offset:2px}[hidden]{display:none!important}';
      const field = (id, labelText, key) => { const label = document.createElement('label'); label.textContent = translate(this._hass, labelText); const input = document.createElement('input'); input.id = id; input.value = typeof this._config[key] === 'string' ? this._config[key] : ''; input.addEventListener('input', () => { this._config = { ...this._config, [key]: input.value }; this._dispatch(); }); label.appendChild(input); return label; };
      this.shadowRoot.append(style, field('cf_title', 'Title', 'title'), field('cf_currency', 'Currency', 'currency'));
      const modeLabel = document.createElement('label'); modeLabel.textContent = translate(this._hass, 'Source mode');
      const mode = document.createElement('select'); mode.id = 'cf_source_mode'; mode.style.cssText = 'font:inherit;padding:9px;background:var(--card-background-color,#fff);color:inherit;border:1px solid var(--divider-color,#d9e0ea);border-radius:8px';
      for (const [value, text] of [['dashboard', 'Energy Dashboard'], ['explicit', 'Explicit statistics']]) { const option = document.createElement('option'); option.value = value; option.textContent = translate(this._hass, text); mode.appendChild(option); }
      mode.value = this._config.energy_source_mode === 'explicit' ? 'explicit' : 'dashboard'; modeLabel.appendChild(mode); this.shadowRoot.appendChild(modeLabel);
      const sources = document.createElement('section'); sources.style.cssText = 'display:grid;gap:12px'; sources.hidden = mode.value !== 'explicit';
      for (const [key, title] of [['energy_total_statistics', 'Total statistic IDs'], ['energy_device_statistics', 'Device statistic IDs'], ['energy_cost_statistics', 'Cost statistic IDs']]) {
        const label = document.createElement('label'); label.textContent = translate(this._hass, title);
        const input = document.createElement('textarea'); input.rows = 3; input.style.cssText = 'font:inherit;width:100%;box-sizing:border-box;padding:9px;background:var(--card-background-color,#fff);color:inherit;border:1px solid var(--divider-color,#d9e0ea);border-radius:8px';
        input.value = (Array.isArray(this._config[key]) ? this._config[key] : []).map(value => typeof value === 'string' ? value : value && value.statistic_id).filter(value => typeof value === 'string').join('\n');
        input.addEventListener('change', () => {
          const previous = new Map((Array.isArray(this._config[key]) ? this._config[key] : []).filter(Boolean).map(value => [typeof value === 'string' ? value : value.statistic_id, value]));
          const ids = [...new Set(input.value.split(/[\n,]/).map(value => value.trim()).filter(Boolean))];
          this._config = { ...this._config, [key]: ids.map(id => previous.get(id) || id) }; this._dispatch();
        }); label.appendChild(input); sources.appendChild(label);
      }
      const note = document.createElement('p'); note.textContent = translate(this._hass, 'One statistic ID per line. Advanced labels and parent relationships can be configured in YAML.'); note.style.fontSize = '12px'; sources.appendChild(note); this.shadowRoot.appendChild(sources);
      mode.addEventListener('change', () => { this._config = { ...this._config, energy_source_mode: mode.value }; sources.hidden = mode.value !== 'explicit'; this._dispatch(); });
    }
    _dispatch() { this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: { ...this._config } }, bubbles: true, composed: true })); }
  }

  customElements.define('ha-smart-reports', HASmartReports);
  customElements.define('ha-smart-reports-editor', HASmartReportsEditor);
  window.customCards = window.customCards || [];
  if (!window.customCards.some((card) => card.type === 'ha-smart-reports')) window.customCards.push({ type: 'ha-smart-reports', name: 'Smart Reports', description: 'Recorder-backed energy, automation, and system reports', preview: true, documentationURL: 'https://github.com/MacSiem/ha-smart-reports' });
  console.info(`%c HA-SMART-REPORTS %c v${VERSION} `, 'color: white; background: #2563eb; font-weight: 700;', 'color: #2563eb; background: #dbeafe;');
})();

console.info('%c HA Tools — Email & Reports %c v4.5.3 — Log Email + Smart Reports (+ Energy Email compatibility)',
  'background:#3b82f6;color:#fff;font-weight:bold;padding:2px 6px;border-radius:4px 0 0 4px;',
  'background:#e0f2fe;color:#1e40af;font-weight:bold;padding:2px 6px;border-radius:0 4px 4px 0;');
