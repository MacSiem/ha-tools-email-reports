/* GENERATED FILE — DO NOT EDIT
 * HA Tools Email Reports bundle v4.5.3
 * ha-energy-email.js — MacSiem/ha-tools-email-reports/ha-energy-email.js v4.5.1 sha256:e0c46328584577871e891487d8cd327211b063c0e24bd49fab47de0c6977bad5
 * ha-log-email.js — MacSiem/ha-tools-email-reports/ha-log-email.js v4.4.1 sha256:8f86fb63fed410f1aedbeb43cc4691bf6846e0ef99b8b04b66fcb0024167c427
 * ha-smart-reports.js — MacSiem/ha-smart-reports/ha-smart-reports.js v4.2.0 sha256:e00cfab9bb0f04e3aecb9f28ee031feee65ce9e4e6dc76f6d37763d4e3048373
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

// BEGIN vendored ha-tools-ui factory
// HA Tools v3: vendored inside each consumer's own closure, never a window API.
function createUiV3({ language = 'en' } = {}) {
  const pl = String(language).startsWith('pl');
  const states = {
    success: ['Success', 'Sukces', '✓'],
    partial: ['Partial', 'Częściowo', '½'],
    unconfirmed: ['Unconfirmed', 'Niepotwierdzony', '?'],
    error: ['Error', 'Błąd', '✕'],
    not_checked: ['Not checked', 'Nie sprawdzono', '–'],
    no_data: ['No data', 'Brak danych', '∅'],
  };
  const status = (value) => {
    const code = typeof value === 'string' && Object.hasOwn(states, value) ? value : 'not_checked';
    const row = states[code];
    return { code, label: row[pl ? 1 : 0], icon: row[2], countsAsSuccess: code === 'success' };
  };
  const statusHtml = (value) => {
    const result = status(value);
    return `<span class="ht-result-state ht-result-state--${result.code}" data-result-state="${result.code}"><span aria-hidden="true">${result.icon}</span> ${result.label}</span>`;
  };
  const css = `
.ht-result-state { display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border:1px solid currentColor;border-radius:6px;font-size:12px;line-height:1.4;white-space:normal; }
.ht-result-state--success { color:#237b3d;background:rgba(35,123,61,.10); }
.ht-result-state--partial { color:#966400;background:rgba(150,100,0,.10); }
.ht-result-state--unconfirmed { color:#ad5200;background:rgba(173,82,0,.10); }
.ht-result-state--error { color:#c32b2b;background:rgba(195,43,43,.10); }
.ht-result-state--not_checked,.ht-result-state--no_data { color:var(--secondary-text-color,#666);background:transparent; }
.ht-result-state--no_data { border-style:dashed; }
:host(.bento-dark) .ht-result-state--success { color:#81cf99; }
:host(.bento-dark) .ht-result-state--partial { color:#efd080; }
:host(.bento-dark) .ht-result-state--unconfirmed { color:#ffb97b; }
:host(.bento-dark) .ht-result-state--error { color:#ff9999; }
`;
  return { status, statusHtml, css };
}
// END vendored ha-tools-ui factory

// BEGIN vendored ha-tools-email-schedules factory
// Pure frontend controller; the existing integration owns scheduling and DST.
// Vendor the exported factory inside consumer IIFEs; no global or second scheduler.
function createHaToolsEmailSchedules({ changed = () => {}, timeoutMs = 8000,
  kind = 'log_digest', recipientEditor = false, projectPreview = null, contextLost = () => {} } = {}) {
  if (!['log_digest', 'energy_report'].includes(kind)) throw new Error('Unsupported schedule kind');
  // Addresses are deliberately separate from controller metadata/history/export.
  recipientEditor = recipientEditor === true && kind === 'energy_report';
  let privateRows = new Map(), privateDraft = null, pendingRecipients = null;
  let connectionOffline = false, browserOffline = globalThis.navigator?.onLine === false, watchedConnection = null;
  let unwatch = () => {};
  const recipients = value => {
    if (!Array.isArray(value) || value.length > 128 || value.some(v => typeof v !== 'string' || !v.trim() || v.length > 255 || /[\r\n]/.test(v)))
      throw { code: 'invalid_recipients' };
    return [...value];
  };
  const editable = ['id', 'kind', 'cadence', 'time', 'enabled', 'timezone', 'weekday', 'month_day'];
  let hass = null, context = null, epoch = 0, checked = false, rows = [], draft = null;
  let reading = null, writing = false, previewing = null, pendingExpected = null, preview = null;
  let status = { state: 'not_checked', reason: 'initial' }, previewStatus = { state: 'not_checked', reason: 'initial' };
  const cancellations = new Set();
  const capture = value => ({ user: value?.user?.id ?? value?.user ?? null, admin: value?.user?.is_admin === true,
    connection: value?.connection ?? null, online: !!value && !browserOffline && !connectionOffline && value.connected !== false && value.connection?.connected !== false });
  const allowed = () => !!hass && context?.admin && context?.online && !browserOffline && !connectionOffline && hass.user?.is_admin === true && hass.connected !== false && hass.connection?.connected !== false;
  const notify = () => changed();
  const reset = () => {
    epoch++; for (const cancel of [...cancellations]) cancel(); cancellations.clear();
    checked = false; rows = []; draft = null; privateRows = new Map(); privateDraft = null; pendingRecipients = null; reading = null; writing = false; previewing = null;
    pendingExpected = null; preview = null; status = { state: 'not_checked', reason: 'initial' };
    previewStatus = { state: 'not_checked', reason: 'initial' };
  };
  const request = (source, message, holder = null) => new Promise((resolve, reject) => {
    let done = false;
    const finish = (fn, value) => { if (done) return; done = true; clearTimeout(timer); cancellations.delete(cancel); fn(value); };
    const cancel = () => finish(reject, { code: 'stale_context' });
    const timer = setTimeout(() => finish(reject, { code: 'request_timeout' }), timeoutMs);
    cancellations.add(cancel);
    if (holder) holder.cancel = cancel;
    Promise.resolve().then(() => { if (!done && allowed()) return source.callWS(message); if (!done) throw { code: 'stale_context' }; }).then(value => finish(resolve, value), error => finish(reject, error));
  });
  const same = (expected, actual) => expected.deleted ? !actual : !!actual && editable.every(key =>
    Object.prototype.hasOwnProperty.call(expected, key) ? actual[key] === expected[key] : key !== 'timezone' || actual[key] === undefined) &&
    (pendingRecipients === null || JSON.stringify(pendingRecipients) === JSON.stringify(privateRows.get(expected.id)));
  const cleanRows = result => {
    if (!result || !Array.isArray(result.schedules) || result.schedules.length > 500) throw { code: 'invalid_response' };
    const ids = new Set(), nextPrivate = new Map();
    const cleanList = result.schedules.map(raw => {
      if (!raw || typeof raw.id !== 'string' || !/^[\w.:-]{1,255}$/.test(raw.id) || ids.has(raw.id) || typeof raw.kind !== 'string') throw { code: 'invalid_response' };
      ids.add(raw.id);
      // Only allowlisted calendar metadata is exposed; arbitrary stored fields stay on the server.
      if (recipientEditor && raw.kind === kind) nextPrivate.set(raw.id, recipients(raw.recipients ?? []));
      const clean = { id: raw.id, kind: ['log_digest', 'energy_report'].includes(raw.kind) ? raw.kind : 'unknown' };
      if (raw.kind === kind) {
        for (const key of editable.filter(key => !['id', 'kind'].includes(key))) if (Object.prototype.hasOwnProperty.call(raw, key)) clean[key] = raw[key];
        if (raw.timezone !== undefined && typeof raw.timezone !== 'string') throw { code: 'invalid_response' };
        if (raw.weekday !== undefined && (!Number.isInteger(raw.weekday) || raw.weekday < 0 || raw.weekday > 6)) throw { code: 'invalid_response' };
        if (raw.month_day !== undefined && (!Number.isInteger(raw.month_day) || raw.month_day < 1 || raw.month_day > 31)) throw { code: 'invalid_response' };
        if (raw.timezone) try { new Intl.DateTimeFormat('en', { timeZone: raw.timezone }); } catch (_) { throw { code: 'invalid_response' }; }
        clean.next_fire = typeof raw.next_fire === 'string' && /^\d{4}-\d{2}-\d{2}T[\d:.]+(?:Z|[+-]\d{2}:\d{2})$/.test(raw.next_fire) && Number.isFinite(Date.parse(raw.next_fire)) ? raw.next_fire : null;
        clean.effective_timezone = null;
        if (typeof raw.effective_timezone === 'string' && raw.effective_timezone.length <= 128)
          try { new Intl.DateTimeFormat('en', { timeZone: raw.effective_timezone }); clean.effective_timezone = raw.effective_timezone; } catch (_) {}
      }
      if (raw.kind === kind && (!['daily', 'weekly', 'monthly'].includes(raw.cadence) ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(raw.time) || typeof raw.enabled !== 'boolean')) throw { code: 'invalid_response' };
      return clean;
    });
    privateRows = nextPrivate;
    return cleanList;
  };
  const unavailable = error => ['unknown_command', 'not_found'].includes(error?.code);
  const read = () => {
    if (!allowed()) return Promise.resolve();
    if (typeof hass.callWS !== 'function') { checked = true; status = { state: 'not_checked', reason: 'unavailable' }; notify(); return Promise.resolve(); }
    if (reading) return reading.promise;
    const token = { epoch, promise: null }, source = hass;
    reading = token; checked = true; status = { state: pendingExpected ? 'unconfirmed' : 'not_checked', reason: 'loading' };
    token.promise = (async () => {
      try {
        const response = await request(source, { type: 'ha_tools_email/list_schedules' }, token);
        if (epoch !== token.epoch || reading !== token || !allowed()) return;
        rows = cleanRows(response);
        if (pendingExpected) {
          if (same(pendingExpected, rows.find(row => row.id === pendingExpected.id))) {
            const deleted = pendingExpected.deleted;
            pendingExpected = null; pendingRecipients = null; privateDraft = null; draft = null; status = { state: 'success', reason: deleted ? 'deleted' : 'saved' };
          } else status = { state: 'unconfirmed', reason: 'readback_mismatch' };
        } else status = { state: rows.some(row => row.kind === kind) ? 'success' : 'no_data', reason: 'loaded' };
      } catch (error) {
        if (epoch !== token.epoch || reading !== token || !allowed()) return;
        rows = []; privateRows.clear();
        status = { state: pendingExpected ? 'unconfirmed' : 'not_checked',
          reason: unavailable(error) ? 'unavailable' : error?.code === 'request_timeout' ? 'read_timeout' : 'read_failed' };
      } finally { if (epoch === token.epoch && reading === token) { reading = null; notify(); } }
    })();
    notify(); return token.promise;
  };
  const validate = value => {
    if (!['daily', 'weekly', 'monthly'].includes(value.cadence) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value.time)) throw { code: 'invalid_fields' };
    if (value.timezone) {
      if (value.timezone.length > 128 || /^(posix\/|right\/)|^(localtime|posixrules)$/.test(value.timezone)) throw { code: 'invalid_timezone' };
      try { new Intl.DateTimeFormat('en', { timeZone: value.timezone }); } catch (_) { throw { code: 'invalid_timezone' }; }
    }
    if (value.cadence === 'weekly' && (!Number.isInteger(value.weekday) || value.weekday < 0 || value.weekday > 6)) throw { code: 'invalid_fields' };
    if (value.cadence === 'monthly' && (!Number.isInteger(value.month_day) || value.month_day < 1 || value.month_day > 31)) throw { code: 'invalid_fields' };
  };
  const save = async () => {
    if (!allowed() || !draft || writing || reading || pendingExpected || !['success', 'no_data', 'error'].includes(status.state)) return;
    let expected;
    try {
      validate(draft);
      expected = { id: draft.id, kind, cadence: draft.cadence, time: draft.time, enabled: draft.enabled === true };
      if (draft.timezone) expected.timezone = draft.timezone;
      if (draft.cadence === 'weekly') expected.weekday = draft.weekday;
      if (draft.cadence === 'monthly') expected.month_day = draft.month_day;
      if (recipientEditor && privateDraft !== null) expected.recipients = recipients(privateDraft);
    } catch (error) { status = { state: 'error', reason: error.code || 'invalid_fields' }; notify(); return; }
    const useHaTimezone = !!rows.find(row => row.id === draft.id)?.timezone && !draft.timezone;
    const requestEpoch = epoch, source = hass;
    pendingRecipients = expected.recipients ? [...expected.recipients] : null;
    pendingExpected = Object.fromEntries(Object.entries(expected).filter(([key]) => key !== 'recipients')); writing = true; status = { state: 'not_checked', reason: 'saving' }; notify();
    try {
      await request(source, { type: 'ha_tools_email/set_schedule', action: 'upsert', schedule: useHaTimezone ? { ...expected, use_ha_timezone: true } : expected });
      if (requestEpoch !== epoch || !allowed()) return;
      // The acknowledgement (and its embedded schedules) cannot confirm storage: use a separate read.
      await read();
    } catch (error) {
      if (requestEpoch !== epoch || !allowed()) return;
      const rejected = ['invalid_payload', 'unauthorized', 'unknown_command', 'not_found'].includes(error?.code);
      if (rejected) { pendingExpected = null; pendingRecipients = null; }
      status = { state: rejected ? 'error' : 'unconfirmed', reason: rejected ? 'save_rejected' : 'write_unknown' };
    } finally { if (requestEpoch === epoch) { writing = false; notify(); } }
  };
  const previewRead = () => {
    if (!allowed() || previewing || writing) return previewing?.promise || Promise.resolve();
    const selection = draft || rows.find(row => row.kind === kind);
    if (!selection) return Promise.resolve();
    try { validate(selection); } catch (error) { previewStatus = { state: 'error', reason: error.code }; notify(); return Promise.resolve(); }
    const token = { epoch, promise: null }, source = hass;
    const message = { type: 'ha_tools_email/' + (kind === 'energy_report' ? 'preview_energy_report' : 'preview_log_digest'), cadence: selection.cadence };
    if (kind === 'energy_report') message.calendar_period = true;
    if (selection.timezone) message.timezone = selection.timezone;
    previewing = token; preview = null; previewStatus = { state: 'not_checked', reason: 'loading' };
    token.promise = (async () => {
      try {
        const response = await request(source, message, token);
        if (epoch !== token.epoch || previewing !== token || !allowed()) return;
        if (kind === 'energy_report') {
          if (typeof projectPreview !== 'function') throw { code: 'invalid_response' };
          const projected = projectPreview(response, message);
          if (!projected || !['success', 'partial', 'no_data'].includes(projected.state)) throw { code: 'invalid_response' };
          preview = projected.value; previewStatus = { state: projected.state, reason: 'loaded' };
          return;
        }
        if (!response || response.cadence !== message.cadence || !(response.total === null || (Number.isInteger(response.total) && response.total >= 0)) ||
          typeof response.period?.from !== 'string' || typeof response.period?.to !== 'string' ||
          response.period.semantics !== 'previous_completed_calendar_period' || typeof response.effective_timezone !== 'string' ||
          response.source?.name !== 'system_log' || response.source.count_semantics !== 'retained_aggregates' ||
          typeof response.source.complete !== 'boolean' || !Number.isInteger(response.source.retained_entries) ||
          response.source.retained_entries < 0) throw { code: 'invalid_response' };
        preview = { cadence: response.cadence, total: response.total,
          unique_problems: Number.isInteger(response.unique_problems) && response.unique_problems >= 0 ? response.unique_problems : null,
          counts_complete: response.counts_complete === true,
          period: { from: response.period.from, to: response.period.to, semantics: response.period.semantics },
          effective_timezone: response.effective_timezone,
          source: { name: response.source.name, complete: response.source.complete, count_semantics: response.source.count_semantics, retained_entries: response.source.retained_entries } };
        previewStatus = { state: response.source.complete ? (response.source.retained_entries ? 'success' : 'no_data') : 'partial', reason: 'loaded' };
      } catch (error) {
        if (epoch !== token.epoch || previewing !== token || !allowed()) return;
        preview = null; previewStatus = { state: 'not_checked', reason: unavailable(error) ? 'unavailable' : 'read_failed' };
      } finally { if (epoch === token.epoch && previewing === token) { previewing = null; notify(); } }
    })();
    notify(); return token.promise;
  };
  return {
    setContext(value) {
      if (watchedConnection !== (value?.connection ?? null)) {
        unwatch(); connectionOffline = false; watchedConnection = value?.connection ?? null;
        const source = watchedConnection;
        const disconnect = () => { if (watchedConnection !== source) return; connectionOffline = true; reset(); if (context) context.online = false; contextLost(); notify(); };
        const ready = () => { if (watchedConnection !== source) return; connectionOffline = false; reset(); if (context) context.online = !browserOffline && hass?.connected !== false; contextLost(); notify(); };
        const offline = () => { browserOffline = true; reset(); if (context) context.online = false; contextLost(); notify(); };
        const online = () => { browserOffline = false; reset(); if (context) context.online = !connectionOffline && hass?.connected !== false && source?.connected !== false; contextLost(); notify(); };
        source?.addEventListener?.('disconnected', disconnect); source?.addEventListener?.('ready', ready);
        globalThis.addEventListener?.('offline', offline); globalThis.addEventListener?.('online', online);
        unwatch = () => { source?.removeEventListener?.('disconnected', disconnect); source?.removeEventListener?.('ready', ready);
          globalThis.removeEventListener?.('offline', offline); globalThis.removeEventListener?.('online', online); };
      }
      const next = capture(value);
      if (!context || Object.keys(next).some(key => next[key] !== context[key]) || !next.admin || !next.online) reset();
      hass = value; context = next;
    },
    discard() { unwatch(); watchedConnection = null; reset(); hass = null; context = null; },
    online() { return allowed(); },
    recipientsFor(id) { return allowed() && recipientEditor && privateRows.has(id) ? [...privateRows.get(id)] : null; },
    recipientModel() { return allowed() && recipientEditor && draft && privateDraft !== null ? [...privateDraft] : null; },
    updateRecipients(value) {
      if (!allowed() || !recipientEditor || !draft || writing || pendingExpected) return;
      privateDraft = [...value];
    },
    ensureRead() { if (!checked && allowed()) return read(); },
    refresh() { if (!writing) return read(); },
    edit(id) {
      if (!allowed() || writing || pendingExpected || reading || !['success', 'no_data', 'error'].includes(status.state)) return;
      const row = rows.find(value => value.id === id && value.kind === kind);
      if (!row) return;
      previewing?.cancel?.(); previewing = null;
      privateDraft = recipientEditor ? [...(privateRows.get(id) || [])] : null;
      draft = { ...row, timezone: row.timezone || '', weekday: row.weekday ?? 0, month_day: row.month_day ?? 1 };
      preview = null; previewStatus = { state: 'not_checked', reason: 'initial' }; notify();
    },
    create() {
      if (!allowed() || reading || writing || pendingExpected || !['success', 'no_data'].includes(status.state)) return;
      // New IDs are allocated only after the explicit New action, never on open.
      let id;
      try {
        if (globalThis.crypto?.randomUUID) id = globalThis.crypto.randomUUID();
        else {
          const bytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
          bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
          const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
          id = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
        }
      } catch (_) { status = { state: 'error', reason: 'id_unavailable' }; notify(); return; }
      previewing?.cancel?.(); previewing = null;
      privateDraft = recipientEditor ? [] : null;
      draft = { id, kind, cadence: 'daily', time: '08:00', enabled: false,
        timezone: '', weekday: 0, month_day: 1 };
      preview = null; previewStatus = { state: 'not_checked', reason: 'initial' }; notify();
    },
    update(key, value) {
      if (!allowed() || !draft || writing || pendingExpected || !editable.includes(key) || ['id', 'kind'].includes(key)) return;
      draft = { ...draft, [key]: value };
      // A preview belongs to its exact selection; invalidate callbacks after an edit.
      if (previewing) { previewing.cancel?.(); previewing = null; }
      preview = null; previewStatus = { state: 'not_checked', reason: 'initial' };
    },
    cancel() { draft = null; privateDraft = null; preview = null; previewing?.cancel?.(); previewing = null; previewStatus = { state: 'not_checked', reason: 'initial' }; notify(); },
    save, preview: previewRead,
    async remove(id) {
      if (!allowed() || reading || writing || pendingExpected || !rows.some(row => row.id === id && row.kind === kind) || !['success', 'no_data', 'error'].includes(status.state)) return;
      const requestEpoch = epoch, source = hass;
      pendingExpected = { id, deleted: true }; pendingRecipients = null; writing = true;
      status = { state: 'not_checked', reason: 'saving' }; notify();
      try {
        await request(source, { type: 'ha_tools_email/set_schedule', action: 'delete', schedule_id: id });
        if (requestEpoch === epoch && allowed()) await read();
      } catch (error) {
        if (requestEpoch !== epoch || !allowed()) return;
        const rejected = ['invalid_payload', 'unauthorized', 'unknown_command', 'not_found'].includes(error?.code);
        if (rejected) pendingExpected = null;
        status = { state: rejected ? 'error' : 'unconfirmed', reason: rejected ? 'save_rejected' : 'write_unknown' };
      } finally { if (requestEpoch === epoch) { writing = false; notify(); } }
    },
    model() { return { rows: rows.map(row => ({ ...row })), draft: draft ? { ...draft } : null, status: { ...status },
      reading: !!reading, writing, locked: !!pendingExpected, previewing: !!previewing,
      preview: preview ? { ...preview } : null, previewStatus: { ...previewStatus } }; }
  };
}
// END vendored ha-tools-email-schedules factory

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

// W3: adapt Device Health's container-local native records to the existing log tables.
// Move original value nodes only; disclosure and width changes never read or send.
function _disconnectLogRecords(card) {
  card._logRecordsObserver?.disconnect();
  card._logRecordsObserver = null;
}
function _logSnapshotKey(card, row) {
  // Local DOM identity follows the actual snapshot object, even at equal timestamps.
  card._logSnapshotKeys ||= new WeakMap();
  if (!card._logSnapshotKeys.has(row)) {
    card._logSnapshotSequence = (card._logSnapshotSequence || 0) + 1;
    card._logSnapshotKeys.set(row, String(card._logSnapshotSequence));
  }
  return card._logSnapshotKeys.get(row);
}
function _rememberLogRecords(card) {
  if (card._logRecordsEpoch !== card._dataEpoch) {
    card._logRecordsEpoch = card._dataEpoch;
    card._logRecordsOpen = new Set();
  }
  const root = card.shadowRoot, active = root.activeElement;
  root.querySelectorAll('.ht-log-records > details').forEach(detail => {
    if (detail.open) card._logRecordsOpen.add(detail.dataset.recordKey);
    else card._logRecordsOpen.delete(detail.dataset.recordKey);
  });
  return active?.closest('[data-log-record-key]')?.dataset.logRecordKey ||
    active?.closest('.ht-log-records > details')?.dataset.recordKey || null;
}
function _bindLogRecords(card, focusKey) {
  const root = card.shadowRoot, doc = card.ownerDocument;
  const specifications = [
    ['logs', '.retained-logs table.history-records', [3], [0, 1]],
    ['attempts', '.attempt-history table.history-records', [2, 0], [6]],
    ['snapshots', '.browser-snapshots table.history-records', [0], [1, 2, 3]]
  ];
  const mounts = [];
  for (const [kind, selector, nameIndices, stateIndices] of specifications) {
    const table = root.querySelector(selector);
    if (!table) continue;
    const layout = doc.createElement('div'); layout.className = 'ht-log-layout';
    const list = doc.createElement('div'); list.className = 'ht-log-records'; list.hidden = true;
    const caption = doc.createElement('p'); caption.className = 'log-record-caption';
    caption.textContent = table.caption?.textContent || ''; list.append(caption);
    table.before(layout); layout.append(table, list);
    const headers = Array.from(table.tHead.rows[0].cells, cell => cell.textContent.trim());
    const items = Array.from(table.tBodies[0].rows, row => {
      const key = JSON.stringify([kind, card._dataEpoch, row.dataset.attemptId || row.dataset.logIdentity || row.dataset.snapshotKey]);
      row.dataset.logRecordKey = key;
      const cells = Array.from(row.cells);
      const detail = doc.createElement('details'); detail.dataset.recordKey = key;
      const summary = doc.createElement('summary');
      const name = doc.createElement('strong');
      name.textContent = nameIndices.map(index => cells[index].textContent).join(' · ');
      const state = doc.createElement('span'); state.className = 'log-record-state';
      state.textContent = stateIndices.map(index => stateIndices.length === 1 ? cells[index].textContent : headers[index] + ': ' + cells[index].textContent).join(' · ');
      summary.append(name, state); detail.append(summary);
      const fields = doc.createElement('dl'); fields.className = 'record-fields'; detail.append(fields);
      const values = cells.map((cell, index) => {
        const label = doc.createElement('dt'); label.textContent = headers[index];
        const value = doc.createElement('dd'); fields.append(label, value);
        return { cell, value, nodes:Array.from(cell.childNodes) };
      });
      detail.open = card._logRecordsOpen.has(key);
      detail.addEventListener('toggle', () => {
        if (!detail.isConnected || card._logRecordsEpoch !== card._dataEpoch) return;
        if (detail.open) card._logRecordsOpen.add(key); else card._logRecordsOpen.delete(key);
      });
      list.append(detail);
      return { key, row, detail, summary, values };
    });
    const mount = { kind, layout, table, list, items, narrow:false };
    mount.apply = width => {
      if (!Number.isFinite(width) || width <= 0) return;
      const narrow = width < 500;
      if (narrow === mount.narrow) return;
      const active = root.activeElement;
      const focused = items.find(item => item.row.contains(active) || item.detail.contains(active));
      if (narrow) list.hidden = false; else table.hidden = false;
      items.forEach(item => item.values.forEach(({cell,value,nodes}) => (narrow ? value : cell).append(...nodes)));
      mount.narrow = narrow;
      if (focused) {
        const target = narrow ? focused.summary : focused.row;
        if (!narrow) target.tabIndex = -1;
        target.focus({preventScroll:true});
      }
      table.hidden = narrow; list.hidden = !narrow;
    };
    mounts.push(mount);
  }
  card._logRecordsMounts = mounts;
  if (typeof ResizeObserver === 'function' && card.isConnected && mounts.length) {
    card._logRecordWidths ||= new Map();
    const epoch = card._dataEpoch;
    const observer = new ResizeObserver(entries => {
      if (!card.isConnected || card._logRecordsObserver !== observer || card._dataEpoch !== epoch) return;
      for (const entry of entries) {
        const mount = mounts.find(item => item.layout === entry.target);
        if (!mount) continue;
        if (Number.isFinite(entry.contentRect.width) && entry.contentRect.width > 0) card._logRecordWidths.set(mount.kind, entry.contentRect.width);
        mount.apply(entry.contentRect.width);
      }
    });
    card._logRecordsObserver = observer;
    mounts.forEach(mount => {
      const style = getComputedStyle(mount.layout);
      const width = mount.layout.getBoundingClientRect().width - (parseFloat(style.paddingLeft)||0) - (parseFloat(style.paddingRight)||0) - (parseFloat(style.borderLeftWidth)||0) - (parseFloat(style.borderRightWidth)||0);
      mount.apply(width > 0 ? width : card._logRecordWidths.get(mount.kind));
      observer.observe(mount.layout);
    });
  }
  if (focusKey) {
    const mount = mounts.find(mount => mount.items.some(item => item.key === focusKey));
    const item = mount?.items.find(item => item.key === focusKey);
    if (item) {
      const target = mount.narrow ? item.summary : item.row;
      if (!mount.narrow) target.tabIndex = -1;
      target.focus({preventScroll:true});
    } else root.querySelector('#log-severity,#history-refresh')?.focus({preventScroll:true});
  }
}
const _LOG_RECORD_CSS = `
.ht-log-layout { min-width:0; max-width:100%; }
.ht-log-layout [hidden] { display:none !important; }
.ht-log-records > details { margin-block:12px; border:1px solid var(--bento-border); border-radius:10px; overflow-wrap:anywhere; }
.ht-log-records summary { cursor:pointer; min-width:44px; min-height:44px; padding:12px; box-sizing:border-box; }
.ht-log-records summary strong,.log-record-state { display:block; min-width:0; white-space:normal; overflow-wrap:anywhere; }
.log-record-state { margin-top:6px; color:var(--bento-text-secondary); font-size:12px; line-height:1.5; }
.ht-log-records .record-fields { display:grid; grid-template-columns:minmax(0,1fr); gap:4px; margin:0 12px 12px; }
.ht-log-records dt { color:var(--bento-text-secondary); font-size:12px; margin-top:8px; }
.ht-log-records dd { margin:0; min-width:0; overflow-wrap:anywhere; }
.ht-log-records summary:focus-visible { outline:3px solid var(--bento-primary); outline-offset:2px; }
.log-record-caption { font-weight:600; }
`;

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
    this._serverSchedules = createHaToolsEmailSchedules({ changed: () => this._render() });
    this._maxHistory = 24;
    this._loading = false;
    this._firstRender = false;
    this._lastFetch = 0;
    this._sendStatus = null;
    this._smtpStatus = null;
    this._emailEpoch = 0;
    this._emailRequest = null;
    this._legacyRequest = null;
    this._legacyStatus = null;
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
    this._bindEmailContext();
    if (identityChanged || !online(hass) || hass?.user?.is_admin !== true) {
      this._scheduleSaveFocus = null;
      this._invalidateEmailResults();
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
    this._serverSchedules.setContext(hass);
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
    else if (previousAdmin !== hass?.user?.is_admin || this._activeTab === 'schedule') this._render();
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
    if (this._hass) this._render();
  }

  async _loadCentralRecipient() {
    if (this._hass?.user?.is_admin !== true || !this._hasHaToolsEmail()) return;
    const hass = this._hass, epoch = this._dataEpoch;
    try {
      // get_config is SupportsResponse.ONLY — must pass returnResponse=true
      // (signature: callService(domain, service, data, target, notifyOnError, returnResponse))
      // and read the payload from result.response.
      const resp = await hass.callService('ha_tools_email', 'get_config', {}, undefined, false, true);
      if (epoch !== this._dataEpoch || this._hass?.user?.is_admin !== true) return;
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

  // UI context may expire before the raw service promise settles. Keep the
  // shared request lock until settlement, even after discarding its UI result.
  _invalidateEmailResults() {
    this._emailEpoch++;
    this._legacyStatus = null;
    this._sendStatus = null;
    this._smtpStatus = null;
    this._smtpTesting = false;
    this._clearActionFocus();
  }

  _unbindEmailContext() {
    for (const [target, event, listener] of this._emailListeners || []) target?.removeEventListener?.(event, listener);
    this._emailListeners = null;
  }

  _bindEmailContext() {
    const connection = this._hass?.connection;
    if (this._emailListeners && this._emailConnection === connection) return;
    this._unbindEmailContext();
    if (this._emailConnection !== connection) this._emailConnectionOffline = false;
    this._emailConnection = connection;
    this._emailBrowserOffline = navigator.onLine === false;
    const listen = (target, event, offline, key) => {
      const listener = () => {
        this[key] = offline;
        this._invalidateEmailResults();
        if (this.isConnected) this._render();
      };
      target?.addEventListener?.(event, listener);
      return [target, event, listener];
    };
    const win = this.ownerDocument.defaultView;
    this._emailListeners = [listen(win, 'offline', true, '_emailBrowserOffline'),
      listen(win, 'online', false, '_emailBrowserOffline'),
      listen(connection, 'disconnected', true, '_emailConnectionOffline'),
      listen(connection, 'ready', false, '_emailConnectionOffline')];
  }

  _emailAllowed() {
    const context = this._captureLogContext(this._hass);
    return context.admin && context.online && navigator.onLine !== false &&
      !this._emailBrowserOffline && !this._emailConnectionOffline;
  }

  _beginEmailRequest(kind, period) {
    this._bindEmailContext();
    this._rememberActionFocus(kind === 'smtp' ? 'btn-smtp-test' : 'btn-send-' + period);
    const request = { kind, period, epoch: this._emailEpoch, attached: this.isConnected, context: this._captureLogContext(this._hass) };
    this._emailRequest = request;
    this[kind === 'smtp' ? '_smtpStatus' : '_sendStatus'] = { status: 'not_checked', reason: 'sending', period };
    this._smtpTesting = kind === 'smtp';
    this._render();
    return request;
  }

  _finishEmailRequest(request, reason) {
    const context = this._captureLogContext(this._hass);
    const current = request.epoch === this._emailEpoch && this._emailAllowed() &&
      Object.keys(context).every(key => context[key] === request.context[key]);
    this._emailRequest = null;
    this._smtpTesting = false;
    if (!current) this._invalidateEmailResults();
    if (current) this[request.kind === 'smtp' ? '_smtpStatus' : '_sendStatus'] = {
      status: reason === 'prepare_failed' ? 'error' : 'unconfirmed', reason, period: request.period
    };
    if (this.isConnected || (!request.attached && current)) this._render();
  }

  _renderEmailResult(result) {
    if (!result) return '';
    const tr = (pl, en) => this._lang === 'pl' ? pl : en;
    const messages = {
      sending: tr('Żądanie wysyłki trwa. Dostarczenie niepotwierdzone.', 'Send request in progress. Delivery unconfirmed.'),
      completed: tr('Żądanie zakończone. Dostarczenie niepotwierdzone.', 'Request completed. Delivery unconfirmed.'),
      transport_unknown: tr('Nie udało się potwierdzić wyniku żądania. Dostarczenie niepotwierdzone. Sprawdź historię prób przed ponowną wysyłką.', 'The request outcome could not be confirmed. Delivery unconfirmed. Check attempt history before sending again.'),
      prepare_failed: tr('Nie udało się przygotować żądania wysyłki.', 'The send request could not be prepared.'),
      integration_missing: tr('Integracja HA Tools Email lub wymagana usługa jest niedostępna. Sprawdź konfigurację integracji.', 'The HA Tools Email integration or required service is unavailable. Check the integration configuration.'),
      no_data: tr('Dane dziennika są niedostępne. Odśwież dziennik systemowy.', 'Log data is unavailable. Refresh the system log.'),
      no_weekly_data: tr('Dane tygodniowe dziennika są niedostępne. Odśwież dziennik systemowy.', 'Weekly log data is unavailable. Refresh the system log.')
    };
    const ui = createUiV3({ language: this._lang });
    const state = ui.status(result.status).code;
    return `<div class="send-status" data-email-result="${state}" role="status" aria-live="polite">${ui.statusHtml(state)} <span>${_esc(messages[result.reason] || '')}</span></div>`;
  }

  async _sendViaHaToolsEmail(to, subject, body, html) {
    const data = { subject, body };
    if (html) data.html = html;
    if (to) data.to = to;
    await this._hass.callService('ha_tools_email', 'send', data, undefined, false);
  }

  async _testSmtp() {
    if (!this._emailAllowed() || this._emailRequest) return;
    if (!this._hasHaToolsEmail() || !this._hass.services.ha_tools_email.test) {
      this._smtpStatus = { status: 'error', reason: 'integration_missing' };
      this._render();
      return;
    }
    const request = this._beginEmailRequest('smtp');
    let reason = 'completed';
    try {
      await this._hass.callService('ha_tools_email', 'test', {}, undefined, false);
    } catch (_) {
      reason = 'transport_unknown';
    }
    this._finishEmailRequest(request, reason);
  }

  _renderSmtpSection() {
    if (this._hasHaToolsEmail()) {
      const statusBadge = this._renderEmailResult(this._smtpStatus);
      return '<div class="smtp-section">' +
        '<div class="smtp-header">' +
          '<span class="smtp-icon">\u2709\uFE0F</span>' +
          '<div>' +
            '<div class="smtp-title">' + (this._lang === 'pl' ? 'HA Tools Email dostępne' : 'HA Tools Email available') + '</div>' +
            '<div class="smtp-sub">' + (this._lang === 'pl' ? 'Zmie\u0144 w <b><a href="/config/integrations/integration/ha_tools_email">Ustawienia \u2192 Urz\u0105dzenia i us\u0142ugi \u2192 HA Tools Email \u2192 Konfiguruj</a></b>' : 'Change in <b><a href="/config/integrations/integration/ha_tools_email">Settings \u2192 Devices &amp; services \u2192 HA Tools Email \u2192 Configure</a></b>') + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="smtp-actions">' +
          '<button class="send-btn" id="btn-smtp-test" aria-label="' + (this._lang === 'pl' ? 'Wyślij email testowy' : 'Send test email') + '" style="width:auto;padding:8px 16px" ' + (this._emailRequest || !this._emailAllowed() ? 'disabled' : '') + '>' +
            (this._smtpTesting ? (this._lang === 'pl' ? '\u23F3 Wysyłam...' : '\u23F3 Sending...') : (this._lang === 'pl' ? '\u{1F4E8} Wyślij test' : '\u{1F4E8} Send test')) +
          '</button>' +
          statusBadge +
        '</div>' +
      '</div>';
    }
    return this._renderEmailResult(this._smtpStatus) + '<div class="smtp-section smtp-missing">' +
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
    if (!this._emailAllowed() || this._emailRequest) return;
    const data = period === 'weekly' ? this._logData?.weekly : this._logData;
    if (!data || data.unavailable) {
      this._sendStatus = { status: 'no_data', period, reason: period === 'weekly' ? 'no_weekly_data' : 'no_data' };
      this._render();
      return;
    }
    if (!this._hasHaToolsEmail()) {
      this._sendStatus = { status: 'error', period, reason: 'integration_missing' };
      this._render(); return;
    }
    const request = this._beginEmailRequest('send', period);
    let reason = 'completed', dispatched = false;
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
      dispatched = true;
      await this._sendViaHaToolsEmail(to, subject, body, body);
    } catch (_) {
      reason = dispatched ? 'transport_unknown' : 'prepare_failed';
    }
    this._finishEmailRequest(request, reason);
  }

    _getScheduleState(entityId) {
    if (!this._hass || !this._hass.states[entityId]) return 'unknown';
    return this._hass.states[entityId].state;
  }

  async _toggleAutomation(entityId) {
    if (!this._emailAllowed() || this._legacyRequest || this._serverSchedules.model().writing) return;
    const cadence = ['daily', 'weekly'].find(value => entityId === 'automation.ha_tools_log_email_' + value);
    const state = this._getScheduleState(entityId);
    if (!cadence || !['on', 'off'].includes(state)) return;
    this._bindEmailContext();
    this._rememberActionFocus('btn-' + cadence + '-toggle', 'legacy');
    const request = { entityId, desired: state === 'on' ? 'off' : 'on', epoch: this._emailEpoch,
      attached: this.isConnected, context: this._captureLogContext(this._hass) };
    const hass = this._hass;
    // The raw lock survives discarded UI context until this exact promise settles.
    this._legacyRequest = request;
    this._legacyStatus = { entityId, desired: request.desired, status: 'not_checked', reason: 'pending' };
    this._render();
    let reason = 'state_unconfirmed';
    try {
      await hass.callService('automation', request.desired === 'on' ? 'turn_on' : 'turn_off',
        { entity_id: entityId }, undefined, false);
      if (this._getScheduleState(entityId) === request.desired) reason = 'state_confirmed';
    } catch (_) {
      reason = 'transport_unknown';
    }
    const context = this._captureLogContext(this._hass);
    const current = request.epoch === this._emailEpoch && this._emailAllowed() &&
      Object.keys(context).every(key => context[key] === request.context[key]);
    this._legacyRequest = null;
    this._legacyStatus = current ? { entityId, desired: request.desired,
      status: reason === 'state_confirmed' ? 'success' : 'unconfirmed', reason } : null;
    if (this.isConnected || (!request.attached && current)) this._render();
  }

  _renderLegacyResult(entityId) {
    const result = this._legacyStatus;
    if (!result || result.entityId !== entityId) return '';
    const tr = (pl, en) => this._lang === 'pl' ? pl : en;
    const action = result.desired === 'on' ? tr('Żądanie włączenia.', 'Enable requested.') : tr('Żądanie wyłączenia.', 'Disable requested.');
    const messages = {
      pending: tr('Żądanie trwa. Zmiana stanu niepotwierdzona.', 'Request in progress. State change unconfirmed.'),
      state_confirmed: tr('Bieżący stan encji HA potwierdza żądany stan.', 'The current HA entity state confirms the requested state.'),
      state_unconfirmed: tr('Żądanie zakończone. Bieżący stan encji HA nie potwierdza żądanej zmiany.', 'Request completed. The current HA entity state does not confirm the requested change.'),
      transport_unknown: tr('Nie udało się potwierdzić wyniku żądania. Zmiana stanu niepotwierdzona. Sprawdź encję w HA przed ponowną próbą.', 'The request outcome could not be confirmed. State change unconfirmed. Check the entity in HA before trying again.')
    };
    const ui = createUiV3({ language: this._lang });
    const state = ui.status(result.status).code;
    return `<p class="legacy-result" data-legacy-result="${state}" role="status" aria-live="polite">${ui.statusHtml(state)} <span>${_esc(action)} ${_esc(messages[result.reason] || '')}</span></p>`;
  }

  _renderServerSchedules() {
    const m = this._serverSchedules.model(), pl = this._lang === 'pl';
    const tr = (polish, english) => pl ? polish : english;
    const statusUi = createUiV3({ language: this._lang });
    const state = status => `<p class="schedule-result" data-state="${status.state}" role="status" aria-live="polite">${statusUi.statusHtml(status.state)}</p>`;
    const reason = { initial: tr('Nie odczytano harmonogramów.', 'Schedules have not been read.'),
      loading: tr('Odczytywanie…', 'Reading…'), loaded: tr('Dane odczytane z serwera.', 'Data read from the server.'),
      saved: tr('Zapis potwierdzony osobnym odczytem identycznego rekordu.', 'Save confirmed by a separate read of the exact expected row.'),
      saving: tr('Zapisywanie…', 'Saving…'), unavailable: tr('Harmonogramy serwerowe niedostępne. Wymagana integracja HA Tools Email 2.2.0+. Odśwież po jej aktualizacji.', 'Server schedules unavailable. HA Tools Email 2.2.0+ is required. Refresh after updating.'),
      read_timeout: tr('Odczyt przekroczył limit czasu. Odśwież świadomie.', 'Read timed out. Refresh explicitly.'),
      read_failed: tr('Nie udało się odczytać danych. Odśwież świadomie.', 'Data could not be read. Refresh explicitly.'),
      readback_mismatch: tr('Odczyt nie potwierdził zapisanego rekordu. Nie zapisuj ponownie; odśwież, aby sprawdzić.', 'Readback did not confirm the expected row. Do not repeat the save; refresh to check.'),
      write_unknown: tr('Wynik zapisu nieznany. Serwer mógł go wykonać. Nie ponawiaj zapisu; odśwież, aby sprawdzić.', 'Save outcome unknown. The server may have applied it. Do not repeat the write; refresh to check.'),
      save_rejected: tr('Serwer odrzucił zapis. Sprawdź pola oraz dostępność integracji.', 'The server rejected the save. Check the fields and integration availability.'),
      invalid_fields: tr('Sprawdź częstotliwość, godzinę i dzień.', 'Check cadence, time and day.'),
      invalid_timezone: tr('Podaj poprawną strefę IANA, np. Europe/Warsaw.', 'Enter a valid IANA timezone, such as Europe/Warsaw.'),
      cannot_clear_timezone: tr('Zapis scala pola. Istniejącej jawnej strefy nie można usunąć pustym polem; podaj strefę IANA.', 'Save merges fields. An existing explicit timezone cannot be cleared with a blank field; enter an IANA timezone.'),
      id_unavailable: tr('Nie można utworzyć bezpiecznego ID w tej przeglądarce.', 'A safe ID cannot be created in this browser.') };
    const cadence = value => ({ daily: tr('Codziennie', 'Daily'), weekly: tr('Co tydzień', 'Weekly'), monthly: tr('Co miesiąc', 'Monthly') })[value] || value;
    const days = pl ? ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'] :
      ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const busy = m.reading || m.writing || m.locked;
    const editable = !busy && ['success', 'no_data', 'error'].includes(m.status.state);
    const logRows = m.rows.filter(row => row.kind === 'log_digest');
    const d = m.draft;
    const select = (id, label, options, selected) => `<label for="${id}">${label}<select id="${id}" ${busy ? 'disabled' : ''}>${options.map(([value, label]) => `<option value="${_esc(value)}" ${String(value) === String(selected) ? 'selected' : ''}>${_esc(label)}</option>`).join('')}</select></label>`;
    const editor = d ? `<fieldset class="schedule-editor"><legend>${tr('Edycja harmonogramu', 'Edit schedule')}</legend>
      <p>ID: <code>${_esc(d.id)}</code></p><div class="server-schedule-fields">
      ${select('schedule-cadence', tr('Częstotliwość', 'Cadence'), ['daily', 'weekly', 'monthly'].map(v => [v, cadence(v)]), d.cadence)}
      <label for="schedule-time">${tr('Godzina lokalna (HH:MM)', 'Local wall time (HH:MM)')}<input id="schedule-time" type="time" value="${_esc(d.time)}" required ${busy ? 'disabled' : ''}></label>
      <label for="schedule-timezone">${tr('Strefa IANA (puste: strefa HA)', 'IANA timezone (blank: HA timezone)')}<input id="schedule-timezone" type="text" maxlength="128" value="${_esc(d.timezone)}" placeholder="Europe/Warsaw" ${busy ? 'disabled' : ''}></label>
      ${d.cadence === 'weekly' ? select('schedule-weekday', tr('Dzień tygodnia', 'Weekday'), days.map((v, i) => [i, v]), d.weekday) : ''}
      ${d.cadence === 'monthly' ? `<label for="schedule-month-day">${tr('Dzień miesiąca (1–31)', 'Day of month (1–31)')}<input id="schedule-month-day" type="number" min="1" max="31" step="1" value="${_esc(d.month_day)}" ${busy ? 'disabled' : ''}></label>` : ''}
      <label class="schedule-checkbox" for="schedule-enabled"><input id="schedule-enabled" type="checkbox" ${d.enabled ? 'checked' : ''} ${busy ? 'disabled' : ''}>${tr('Włączony', 'Enabled')}</label>
      </div><p>${tr('Zapis włączonego harmonogramu uruchamia przyszłe wysyłki serwerowe. Nowy harmonogram jest domyślnie wyłączony.', 'Saving an enabled schedule activates future server deliveries. A new schedule is disabled by default.')}</p>
      <p>${tr('Odbiorcy i inne zapisane ustawienia zostają na serwerze; brak odbiorców używa konfiguracji centralnej.', 'Recipients and other stored settings remain on the server; no recipients uses the central configuration.')}</p>
      <div class="server-schedule-actions"><button type="button" id="schedule-save" ${editable ? '' : 'disabled'}>${tr('Zapisz', 'Save')}</button>
      <button type="button" id="schedule-cancel">${tr('Anuluj edycję', 'Cancel edits')}</button>
      <button type="button" id="schedule-preview" ${m.previewing || m.writing ? 'disabled' : ''}>${tr('Podgląd okresu z serwera (tylko odczyt)', 'Preview server period (readonly)')}</button></div></fieldset>` : '';
    const p = m.preview;
    const preview = p ? `<section class="schedule-preview"><h4>${tr('Podgląd serwerowy', 'Server preview')} — ${_esc(cadence(p.cadence))}</h4>${state(m.previewStatus)}
      <p>${tr('Poprzedni zakończony okres kalendarzowy; do nie obejmuje końca przedziału.', 'Previous completed calendar period; the end is exclusive.')}</p>
      <dl><dt>${tr('Od / do', 'From / to')}</dt><dd>${_esc(p.period.from)} / ${_esc(p.period.to)}</dd>
      <dt>${tr('Efektywna strefa', 'Effective timezone')}</dt><dd>${_esc(p.effective_timezone)}</dd>
      <dt>${tr('Źródło / metoda zliczania', 'Source / count semantics')}</dt><dd>${_esc(p.source.name)} / ${tr('zachowane agregaty Home Assistant', 'retained Home Assistant aggregates')}</dd>
      <dt>${tr('Zachowane wpisy / różne problemy / wystąpienia (HA)', 'Retained entries / unique problems / occurrences (HA)')}</dt><dd>${_esc(p.source.retained_entries)} / ${_esc(p.unique_problems ?? tr('Brak danych', 'No data'))} / ${_esc(p.total ?? tr('Brak danych', 'No data'))}</dd></dl>
      <p>${tr('Zachowane agregaty ostatniej obserwacji, nie pełna historia zdarzeń. Liczniki mogą obejmować całe życie wpisu; brakujące znaczniki czasu ograniczają kompletność. Nie wysyła emaila i nie zapisuje historii ani digestu.', 'Retained last-observed aggregates, not full event history. Counts may cover the lifetime of an entry; missing timestamps limit completeness. This does not send email or write history or a digest.')}</p></section>` :
      m.previewStatus.reason !== 'initial' ? `<section class="schedule-preview">${state(m.previewStatus)}<p>${_esc(reason[m.previewStatus.reason] || reason.read_failed)}</p></section>` : '';
    const legacy = ['daily', 'weekly'].map(c => {
      const id = 'automation.ha_tools_log_email_' + c, entity = this._hass?.states?.[id], value = entity?.state;
      const known = value === 'on' || value === 'off';
      return `<article class="schedule-card"><strong>${_esc(cadence(c))}</strong><p><code>${id}</code></p>
        <p>${known ? (value === 'on' ? tr('Włączona', 'Enabled') : tr('Wyłączona', 'Disabled')) : tr('Nieznany stan', 'Unknown state')}</p>
        ${entity ? `<p class="schedule-legacy-warning">⚠ ${tr('Skonfigurowana starsza automatyzacja może wysyłać ten sam raport. Możliwe duplikaty po włączeniu obu torów. Sprawdź powyższe ID w HA.', 'A configured legacy automation may send the same report. Duplicate reports are possible if both paths are enabled. Inspect this ID in HA.')}</p>` :
          `<p>${tr('Brak encji w odczycie; nie potwierdza to braku automatyzacji.', 'Entity absent from the read; this does not confirm that no automation exists.')}</p>`}
        ${known ? `<button type="button" class="toggle-btn" id="btn-${c}-toggle" ${m.writing || this._legacyRequest || !this._emailAllowed() ? 'disabled' : ''}>${value === 'on' ? tr('Wyłącz starszą automatyzację', 'Disable legacy automation') : tr('Włącz starszą automatyzację', 'Enable legacy automation')}</button>` : ''}${this._renderLegacyResult(id)}</article>`;
    }).join('');
    return `<section class="server-schedules"><h3>${tr('Harmonogramy serwerowe dziennika', 'Server log schedules')}</h3>
      ${state(m.status)}<p>${_esc(reason[m.status.reason] || reason.read_failed)}</p>
      <div class="server-schedule-actions"><button type="button" id="schedule-refresh" ${m.reading || m.writing ? 'disabled' : ''}>${tr('Odśwież harmonogramy', 'Refresh schedules')}</button>
      <button type="button" id="schedule-new" ${!busy && ['success', 'no_data'].includes(m.status.state) ? '' : 'disabled'}>${tr('Nowy harmonogram', 'New schedule')}</button></div>
      <p>${tr('Godzina dotyczy strefy IANA. Brak zapisanej strefy podąża za strefą Home Assistant. Luka DST: nieistniejąca godzina przesuwa się do przodu o zmianę offsetu. Powtórzona godzina: pierwszy (wcześniejszy) termin, jeden raz. Dzień 29–31 w krótszym miesiącu: ostatni dzień.', 'Wall time uses an IANA timezone. A missing stored timezone follows Home Assistant. DST gap: nonexistent wall time shifts forward by the offset change. Repeated time: the first (earlier) occurrence, once. Day 29–31 in a shorter month: the last day.')}</p>
      <div class="server-schedule-list">${logRows.map((row, i) => `<article class="schedule-card"><h4>${_esc(cadence(row.cadence))} — ${_esc(row.time)}</h4>
        <p>ID: <code>${_esc(row.id)}</code></p><p>${row.enabled ? tr('Włączony', 'Enabled') : tr('Wyłączony', 'Disabled')}</p>
        <p>${tr('Strefa', 'Timezone')}: ${_esc(row.timezone || tr('Podąża za HA', 'Follows HA'))}; ${tr('efektywna', 'effective')}: ${_esc(row.effective_timezone || tr('Brak danych', 'No data'))}</p>
        ${row.cadence === 'weekly' ? `<p>${tr('Dzień tygodnia', 'Weekday')}: ${_esc(days[row.weekday ?? 0])}</p>` : ''}
        ${row.cadence === 'monthly' ? `<p>${tr('Dzień miesiąca', 'Day of month')}: ${_esc(row.month_day ?? 1)}</p>` : ''}
        <p>${tr('Następny termin z serwera', 'Next fire from server')}: ${row.enabled ? _esc(row.next_fire || tr('Brak danych', 'No data')) : tr('Wyłączony — brak następnego terminu', 'Disabled — no next fire')}</p>
        <button type="button" id="schedule-edit-${i}" data-schedule-edit="${i}" ${editable ? '' : 'disabled'}>${tr('Edytuj', 'Edit')}</button></article>`).join('')}</div>
      ${!logRows.length ? `<p>${tr('Brak danych harmonogramów dziennika.', 'No data for log schedules.')}</p>` : ''}${editor}${preview}
      <section class="schedule-legacy"><h3>${tr('Starsze automatyzacje HA — osobny tor', 'Legacy HA automations — separate path')}</h3>
        <p>${tr('Otwarcie i zapis harmonogramu nie przełączają, nie usuwają i nie migrują automatyzacji. Ich przyciski działają tylko po świadomym wyborze. Ostrzeżenie nie sprawdza treści innych automatyzacji.', 'Opening or saving a schedule does not toggle, delete or migrate automations. Their buttons act only on explicit selection. This warning does not inspect other automation contents.')}</p>
        <div class="server-schedule-list">${legacy}</div></section></section>`;
  }

  _bindServerSchedules() {
    const controller = this._serverSchedules, root = this.shadowRoot;
    const actions = { refresh: () => controller.refresh(), new: () => controller.create(), save: () => {
      this._scheduleSaveFocus = root.activeElement?.id === 'schedule-save' ? controller.model().draft?.id : null;
      return controller.save();
    },
      cancel: () => controller.cancel(), preview: () => controller.preview() };
    for (const [id, action] of Object.entries(actions)) root.getElementById('schedule-' + id)?.addEventListener('click', action);
    const rows = controller.model().rows.filter(row => row.kind === 'log_digest');
    root.querySelectorAll('[data-schedule-edit]').forEach(button => button.addEventListener('click', () => controller.edit(rows[Number(button.dataset.scheduleEdit)]?.id)));
    for (const [id, key] of [['cadence', 'cadence'], ['time', 'time'], ['timezone', 'timezone'], ['weekday', 'weekday'], ['month-day', 'month_day'], ['enabled', 'enabled']]) {
      const field = root.getElementById('schedule-' + id);
      field?.addEventListener('input', () => {
        const value = key === 'enabled' ? field.checked : ['weekday', 'month_day'].includes(key) ? Number(field.value) : key === 'timezone' ? field.value.trim() : field.value;
        controller.update(key, value);
        root.querySelector('.schedule-preview')?.remove();
        const previewButton = root.getElementById('schedule-preview');
        if (previewButton && !controller.model().writing) previewButton.disabled = false;
      });
      if (key === 'cadence') field?.addEventListener('change', () => this._render());
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

  _clearActionFocus() {
    const pending = this._actionFocus;
    if (!pending) return;
    this.ownerDocument.removeEventListener('focusin', pending.onFocus, true);
    this.ownerDocument.defaultView.removeEventListener('blur', pending.onBlur);
    this.ownerDocument.defaultView.removeEventListener('offline', pending.onBlur);
    pending.context.connection?.removeEventListener?.('disconnected', pending.onBlur);
    pending.context.connection?.removeEventListener?.('ready', pending.onBlur);
    this._actionFocus = null;
  }

  _rememberActionFocus(id, kind = 'email') {
    const origin = this.shadowRoot.activeElement;
    if (!this.isConnected || origin?.id !== id) return;
    this._clearActionFocus();
    const pending = { id, kind, anchor: origin, tab: this._activeTab, epoch: this._dataEpoch,
      context: this._captureLogContext(this._hass) };
    // Keep intent only while focus remains on our temporary anchor. Moving away,
    // even briefly, belongs to the user and must not be undone by a late response.
    pending.onFocus = event => {
      if (!event.composedPath().includes(pending.anchor)) this._clearActionFocus();
    };
    pending.onBlur = () => this._clearActionFocus();
    this._actionFocus = pending;
    this.ownerDocument.addEventListener('focusin', pending.onFocus, true);
    this.ownerDocument.defaultView.addEventListener('blur', pending.onBlur);
    this.ownerDocument.defaultView.addEventListener('offline', pending.onBlur);
    pending.context.connection?.addEventListener?.('disconnected', pending.onBlur);
    pending.context.connection?.addEventListener?.('ready', pending.onBlur);
  }

  _restoreActionFocus() {
    const pending = this._actionFocus;
    if (!pending) return;
    const root = this.shadowRoot;
    const visible = el => el && !el.disabled && el.getClientRects().length > 0 &&
      getComputedStyle(el).visibility !== 'hidden';
    const busy = pending.kind === 'legacy' ? !!this._legacyRequest : !!this._emailRequest;
    const origin = root.getElementById(pending.id);
    const tab = [...root.querySelectorAll('[data-tab]')].find(el => el.dataset.tab === pending.tab);
    const anchor = root.querySelector('.content');
    const target = busy ? anchor : [origin, tab, root.getElementById('log-tab-select'), anchor].find(visible);
    if (visible(target)) {
      pending.anchor = target;
      target.focus({ preventScroll: true });
    }
    if (!busy || root.activeElement !== pending.anchor) this._clearActionFocus();
  }

  _render() {
    const pending = this._actionFocus;
    if (pending) {
      const context = this._captureLogContext(this._hass);
      if (!this.isConnected || pending.tab !== this._activeTab || pending.epoch !== this._dataEpoch ||
          !context.online || !context.admin || Object.keys(context).some(key => context[key] !== pending.context[key]) ||
          this.shadowRoot.activeElement !== pending.anchor) this._clearActionFocus();
    }
    const recordFocus = _rememberLogRecords(this);
    _disconnectLogRecords(this);
    const focused = this.shadowRoot.activeElement;
    const focusId = focused?.id;
    const focusSelection = focused && typeof focused.selectionStart === 'number' ? [focused.selectionStart, focused.selectionEnd] : null;
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
    if (this._activeTab === 'schedule') statusLabel = this._lang === 'pl' ? 'Harmonogramy serwerowe' : 'Server schedules';
    else if (this._activeTab === 'history') statusLabel = this._lang === 'pl' ? 'Historia prób SMTP' : 'SMTP attempt history';
    else if (unavailable) statusLabel = this._lang === 'pl' ? 'Niedostępne' : 'Unavailable';
    else if (retained && totalErrors > 0) statusLabel = this._countLabel(totalErrors, 'error');
    else if (retained && totalWarnings > 0) statusLabel = this._countLabel(totalWarnings, 'warning');
    else if (retained?.partial) statusLabel = this._lang === 'pl' ? 'Częściowe dane' : 'Partial data';
    else if (retained) statusLabel = this._lang === 'pl' ? 'Brak zachowanych problemów' : 'No retained problems';
    else statusLabel = totalErrors > 0 ? this._countLabel(totalErrors, 'error') : totalWarnings > 0 ? this._countLabel(totalWarnings, 'warning') :
      (this._lang === 'pl' ? 'Brak zachowanych problemów' : 'No retained problems');

    const tabs = [
      { id: 'overview', label: this._t.overview, icon: '\uD83D\uDCCA' },
      { id: 'errors', label: this._t.errors, icon: '❌' },
      { id: 'warnings', label: this._t.warnings, icon: '⚠️' },
      { id: 'schedule', label: this._t.schedule, icon: '\uD83D\uDCC5' },
      { id: 'preview', label: this._t.preview, icon: '\uD83D\uDC41\uFE0F' },
      { id: 'send', label: this._t.sendNow, icon: '\uD83D\uDCE7' },
      { id: 'history', label: this._t.history, icon: '\uD83D\uDCDC' }
    ];

    const sendStatusHTML = this._renderEmailResult(this._sendStatus);

    const smtpHtml = this._renderSmtpSection();
    let tabContent = '';

    if (['overview', 'errors', 'warnings'].includes(this._activeTab)) {
      tabContent = this._renderRetainedLogs();
    } else if (this._activeTab === 'schedule') {
      this._serverSchedules.ensureRead();
      tabContent = this._renderServerSchedules() + `<section aria-label="${this._t.smtpService}"><div class="section-header">${this._t.smtpService}</div>${smtpHtml}</section>`;
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
            <button class="send-btn" id="btn-send-daily" aria-label="${this._t.sendDaily}" ${this._emailRequest || !this._emailAllowed() ? 'disabled' : ''}>${this._t.sendDaily}</button>
          </div>
          <div class="send-card">
            <div class="send-icon">\uD83D\uDCC6</div>
            <div class="send-title">${this._t.weeklyDigest}</div>
            <div class="send-desc">${this._lang === 'pl' ? 'Zachowane wpisy z ostatnich 7 dni; historia może być ograniczona' : 'Retained entries from the last 7 days; history may be limited'}</div>
            <div class="send-counts">
              <span class="count-badge info-badge">${this._lang === 'pl' ? '7 dni' : '7 days'}</span>
            </div>
            <button class="send-btn" id="btn-send-weekly" aria-label="${this._t.sendWeekly}" ${this._emailRequest || !this._emailAllowed() ? 'disabled' : ''}>${this._t.sendWeekly}</button>
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
.card :is(button, select, a, [tabindex]):focus-visible { outline: 3px solid var(--log-email-link); outline-offset: 3px; }
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
  .send-grid { grid-template-columns: minmax(0, 1fr); }
  .send-card { min-width: 0; overflow-wrap: anywhere; }
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

${createUiV3({ language: this._lang }).css}
:host(.bento-dark) .ht-result-state--not_checked,
:host(.bento-dark) .ht-result-state--no_data { color:var(--bento-text-secondary, #d6d3d1); }
.legacy-result { line-height:1.6; }
${_LOG_RECORD_CSS}
.server-schedules { min-width: 0; overflow-wrap: anywhere; }
.server-schedules h3, .server-schedules h4 { margin: 12px 0 8px; }
.server-schedule-list, .server-schedule-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.server-schedule-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.server-schedules button, .server-schedules input:not([type="checkbox"]), .server-schedules select {
  min-height: 44px; min-width: 44px; box-sizing: border-box; font: inherit;
  border: 1px solid var(--bento-border); border-radius: 8px; color: var(--bento-text); background: var(--bento-bg);
}
.server-schedules button { padding: 8px 12px; cursor: pointer; }
.server-schedules button:disabled { cursor: default; color: var(--bento-text-secondary); }
.server-schedules button:focus-visible, .server-schedules input:focus-visible, .server-schedules select:focus-visible { outline: 3px solid var(--log-email-link); outline-offset: 2px; }
.server-schedule-fields label { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.server-schedule-fields input:not([type="checkbox"]), .server-schedule-fields select { width: 100%; padding: 8px; }
.server-schedule-fields .schedule-checkbox { flex-direction: row; align-items: center; min-height: 44px; cursor: pointer; }
.schedule-checkbox input { width: 24px; height: 24px; }
.schedule-editor { min-width: 0; margin: 12px 0; border: 1px solid var(--bento-border); border-radius: 8px; }
.schedule-result { font-weight: 600; color: var(--bento-text); }
.schedule-legacy-warning { color: var(--log-email-warning); }
.server-schedules dl { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 2fr); gap: 8px; }
.server-schedules dd { margin: 0; }
@container log-email-card (max-width: 499px) {
  .server-schedule-list, .server-schedule-fields, .server-schedules dl { grid-template-columns: minmax(0, 1fr); }
  .server-schedule-actions button { flex: 1 1 150px; }
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

        <div class="content" tabindex="-1" role="region" aria-label="${_esc(tabs.find(tab => tab.id === this._activeTab)?.label || this._t.overview)}">
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
        this.setActiveTab(e.currentTarget.dataset.tab);
        history.replaceState(null, '', location.pathname + '#' + this._toolId + '/' + this._activeTab);
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

    this._bindServerSchedules();

    // Legacy automation toggle buttons
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

    if (focusId) {
      const target = this.shadowRoot.getElementById(focusId) || (focusId.startsWith('schedule-') ? this.shadowRoot.getElementById('schedule-refresh') : null);
      target?.focus({ preventScroll: true });
      if (focusSelection && target?.setSelectionRange) try { target.setSelectionRange(...focusSelection); } catch (_) {}
    }
    else if (focusTab) {
      const tab = [...this.shadowRoot.querySelectorAll('[data-tab]')].find(el => el.dataset.tab === focusTab);
      const target = tab?.getBoundingClientRect().width ? tab : this.shadowRoot.getElementById('log-tab-select');
      target?.focus({ preventScroll: true });
    }

    _bindLogRecords(this, recordFocus);
    const scheduleModel = this._serverSchedules.model();
    if (this._scheduleSaveFocus && !scheduleModel.writing && !scheduleModel.reading) {
      const ownerRoot = this.getRootNode(), active = ownerRoot.activeElement;
      if (!active || active === this || active === this.ownerDocument.body) {
        const rows = scheduleModel.rows.filter(row => row.kind === 'log_digest');
        const index = rows.findIndex(row => row.id === this._scheduleSaveFocus);
        const target = scheduleModel.status.reason === 'saved' && index >= 0 ?
          this.shadowRoot.getElementById('schedule-edit-' + index) : this.shadowRoot.getElementById('schedule-save');
        if (target && !target.disabled) target.focus({ preventScroll: true });
      }
      this._scheduleSaveFocus = null;
    }
    this._restoreActionFocus();

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
        ${model.rows.map(row => `<tr role="row" data-log-identity="${_esc(row.identity)}">${[row.level, row.domain, row.when ? rangeDate(Date.parse(row.when)) : '—', row.message, row.count ?? '—'].map((value, i) => `<td role="cell" data-label="${labels[i]}">${_esc(value)}</td>`).join('')}</tr>`).join('')}
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
        `<tr role="row" data-snapshot-key="${_logSnapshotKey(this,row)}">${[new Date(row.ts).toLocaleString(pl ? 'pl-PL' : 'en-US'), row.errors, row.warnings, row.total].map((value, i) => `<td role="cell" data-label="${labels[i]}">${_esc(value)}</td>`).join('')}</tr>`).join('')}</tbody></table>` :
        `<p>${pl ? 'Brak lokalnych odczytów.' : 'No local snapshots.'}</p>`}
    </section>`;
  }

  connectedCallback() {
    this._bindEmailContext();
    if (this._hass) this._render();
  }

  disconnectedCallback() {
    this._invalidateEmailResults();
    this._unbindEmailContext();
    _disconnectLogRecords(this);
    this._logRecordWidths?.clear();
    this._dataEpoch++;
    this._logReadToken++;
    this._retainedLogs = null;
    this._logData = null;
    this._logHistory = [];
    this._attemptHistory.discard();
    this._serverSchedules.discard();
    this._scheduleSaveFocus = null;
    this.shadowRoot.innerHTML = '';
    if (this._pollingTimer) {
      clearInterval(this._pollingTimer);
      this._pollingTimer = null;
    }
  }

  setActiveTab(tabId) {
    if (tabId !== this._activeTab) this._clearActionFocus();
    this._activeTab = tabId;
    if (tabId === 'send') this._loadCentralRecipient();
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
  set hass(hass) {
    this._hass = hass;
    this._lang = String(hass?.locale?.language || hass?.language || navigator.language || '').startsWith('pl') ? 'pl' : 'en';
    this._render();
  }
  _dispatch() {
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this._config }, bubbles: true, composed: true }));
  }
  _syncFields() {
    const values = { title: this._config.title ?? 'Log Email Summary', email_recipient: this._config.email_recipient ?? '' };
    for (const [key, value] of Object.entries(values)) {
      const field = this.shadowRoot.getElementById('cf_' + key);
      const next = String(value);
      if (field.value === next) continue;
      // Keep the node and selection when HA echoes or replaces the configuration.
      const selection = this.shadowRoot.activeElement === field
        ? [field.selectionStart, field.selectionEnd, field.selectionDirection] : null;
      field.value = next;
      if (selection) field.setSelectionRange(...selection);
    }
    this.shadowRoot.querySelector('label[for="cf_title"]').textContent = this._lang === 'pl' ? 'Tytuł' : 'Title';
    this.shadowRoot.querySelector('label[for="cf_email_recipient"]').textContent = this._lang === 'pl' ? 'Odbiorca email (zamiast ustawienia centralnego)' : 'Email recipient (override)';
    this.shadowRoot.getElementById('cf_email_recipient_hint').textContent = this._lang === 'pl' ? 'Pozostaw puste, aby użyć ustawienia centralnego' : 'Leave empty to use central setting';
  }
  _render() {
    if (this.shadowRoot.getElementById('cf_title')) {
      this._syncFields();
      return;
    }
    this.shadowRoot.innerHTML = `
      <style>
            :host { display:block; padding:16px; }
            h3 { margin:0 0 16px; font-size:15px; font-weight:600; color:var(--bento-text, var(--primary-text-color,#1e293b)); }
            input { min-height:44px; box-sizing:border-box; outline:none; transition:border-color .2s; }
            input:focus-visible { outline:3px solid var(--primary-color,#3b82f6); outline-offset:2px; }
              input[type="checkbox"] { flex:0 0 44px; }
              input:focus { border-color:var(--bento-primary, var(--primary-color,#3b82f6)); }
        </style>
      <h3>Log Email Summary</h3>
            <div style="margin-bottom:12px;">
              <label for="cf_title" style="display:block;font-weight:500;margin-bottom:4px;font-size:13px;">${this._lang === 'pl' ? 'Tytuł' : 'Title'}</label>
              <input type="text" id="cf_title" value="${_esc(this._config?.title ?? 'Log Email Summary')}"
                style="width:100%;padding:8px 12px;border:1px solid var(--divider-color,#e2e8f0);border-radius:8px;background:var(--card-background-color,#fff);color:var(--primary-text-color,#1e293b);font-size:14px;box-sizing:border-box;">
            </div>
            <div style="margin-bottom:12px;">
              <label for="cf_email_recipient" style="display:block;font-weight:500;margin-bottom:4px;font-size:13px;">${this._lang === 'pl' ? 'Odbiorca email (zamiast ustawienia centralnego)' : 'Email recipient (override)'}</label>
              <input type="text" id="cf_email_recipient" aria-describedby="cf_email_recipient_hint" value="${_esc(this._config?.email_recipient ?? '')}"
                style="width:100%;padding:8px 12px;border:1px solid var(--divider-color,#e2e8f0);border-radius:8px;background:var(--card-background-color,#fff);color:var(--primary-text-color,#1e293b);font-size:14px;box-sizing:border-box;">
              <div id="cf_email_recipient_hint" style="font-size:11px;color:var(--bento-text-secondary);margin-top:4px;">${this._lang === 'pl' ? 'Pozostaw puste, aby u\u017cy\u0107 ustawienia centralnego' : 'Leave empty to use central setting'}</div>
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
    this._syncFields();
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
 * Version: 4.2.0
 */

(function registerHASmartReports() {
  'use strict';

  if (customElements.get('ha-smart-reports')) return;

  // BEGIN mirror shared/ha-tools-energy-tariff.js

// Canonical, side-effect-free tariff model. Consumers vendor this factory inside
// their own scope. Rates are user settings, never a country's assumed defaults.
function createEnergyTariffV3(input) {
  const errors = [];
  const fail = (path, reason) => errors.push({ path, reason });
  const record = value => value && typeof value === 'object' && !Array.isArray(value);
  const finite = value => typeof value === 'number' && Number.isFinite(value);
  const dateKey = value => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000-')) return false;
    const stamp = Date.parse(value + 'T00:00:00Z');
    return Number.isFinite(stamp) && new Date(stamp).toISOString().slice(0, 10) === value;
  };
  const monthDay = value => typeof value === 'string' && /^\d{2}-\d{2}$/.test(value) && dateKey('2000-' + value);
  const timestamp = value => {
    let stamp;
    if (finite(value)) stamp = Math.trunc(value);
    else {
      // One shared calendar/offset contract; Date.parse alone normalizes Feb 30
      // and 24:00, unlike the server. Milliseconds truncate in both consumers.
      const match = typeof value === 'string' && value.match(/^(\d{4}-\d{2}-\d{2})T([01]\d|2[0-3]):([0-5]\d)(?::([0-5]\d)(?:\.\d+)?)?(Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/);
      if (!match || !dateKey(match[1])) return NaN;
      stamp = Date.parse(value);
    }
    return finite(stamp) && stamp >= -62135596800000 && stamp <= 253402300799999 ? stamp : NaN;
  };
  const minutes = (value, end = false) => {
    if (end && value === '24:00') return 1440;
    if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return NaN;
    return Number(value.slice(0, 2)) * 60 + Number(value.slice(3));
  };
  const p = record(input) ? input : {};
  if (!record(input)) fail('profile', 'invalid_profile');
  if (p.schema !== 1) fail('schema', 'unsupported_schema');
  if (typeof p.currency !== 'string' || !/^[A-Z]{3}$/.test(p.currency)) fail('currency', 'invalid_currency');
  if (!['gross', 'net'].includes(p.priceBasis)) fail('priceBasis', 'invalid_price_basis');
  let formatter;
  try {
    if (typeof p.timezone !== 'string' || !p.timezone) throw new Error('timezone');
    formatter = new Intl.DateTimeFormat('en-CA', { timeZone: p.timezone,
      calendar: 'gregory', numberingSystem: 'latn', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  } catch (_) { fail('timezone', 'invalid_timezone'); }
  const clock = record(p.clock) ? { ...p.clock } : {};
  if (!['civil', 'fixed'].includes(clock.mode)) fail('clock.mode', 'invalid_clock');
  if (clock.mode === 'fixed' && (!Number.isInteger(clock.offsetMinutes) || clock.offsetMinutes < -840 || clock.offsetMinutes > 840))
    fail('clock.offsetMinutes', 'invalid_offset');
  for (const key of ['validFrom', 'validTo']) if (p[key] != null && !dateKey(p[key])) fail(key, 'invalid_date');
  if (dateKey(p.validFrom) && dateKey(p.validTo) && p.validFrom > p.validTo) fail('validTo', 'reversed_validity');
  if (p.fixedMonthly != null && (!finite(p.fixedMonthly) || p.fixedMonthly < 0)) fail('fixedMonthly', 'invalid_fee');
  const energyRate = (value, path) => {
    if (!finite(value) || (value < 0 && p.allowNegativeEnergy !== true)) fail(path, 'invalid_rate');
    return value;
  };
  const variableRate = (value, path) => {
    if (value == null) return null;
    if (!finite(value) || value < 0) fail(path, 'invalid_fee');
    return value;
  };
  const zones = new Map();
  if (!Array.isArray(p.zones) || !p.zones.length || p.zones.length > 32) fail('zones', 'invalid_zones');
  for (const [i, z] of (Array.isArray(p.zones) ? p.zones : []).entries()) {
    const path = `zones.${i}`;
    if (!record(z) || typeof z.id !== 'string' || !/^[\w-]{1,64}$/.test(z.id) || zones.has(z.id)) {
      fail(path, 'invalid_zone'); continue;
    }
    zones.set(z.id, { zone: z.id, label: typeof z.label === 'string' ? z.label : z.id,
      energyRate: energyRate(z.energyRate, path + '.energyRate'), variableRate: variableRate(z.variableRate, path + '.variableRate') });
  }
  const defaultZone = p.defaultZone == null ? null : p.defaultZone;
  if (defaultZone !== null && !zones.has(defaultZone)) fail('defaultZone', 'unknown_zone');
  const parseRules = (value, kind) => {
    if (value == null) return [];
    if (!Array.isArray(value) || value.length > 512) { fail(kind, 'invalid_rules'); return []; }
    return value.map((r, i) => {
      const path = `${kind}.${i}`;
      if (!record(r)) { fail(path, 'invalid_rule'); return null; }
      if (!zones.has(r.zone)) fail(path + '.zone', 'unknown_zone');
      const priority = r.priority == null ? 0 : r.priority;
      if (!Number.isInteger(priority) || Math.abs(priority) > 10000) fail(path + '.priority', 'invalid_priority');
      let weekdays = null, dates = null, season = null;
      if (r.weekdays != null) {
        if (!Array.isArray(r.weekdays) || !r.weekdays.length || r.weekdays.some(d => !Number.isInteger(d) || d < 0 || d > 6)) fail(path + '.weekdays', 'invalid_weekdays');
        else weekdays = new Set(r.weekdays);
      }
      if (r.dates != null || kind === 'exceptions') {
        if (!Array.isArray(r.dates) || !r.dates.length || r.dates.length > 3660 || r.dates.some(d => !dateKey(d))) fail(path + '.dates', 'invalid_dates');
        else dates = new Set(r.dates);
      }
      if (r.season != null) {
        if (!record(r.season) || !monthDay(r.season.from) || !monthDay(r.season.to)) fail(path + '.season', 'invalid_season');
        else season = { from: r.season.from, to: r.season.to };
      }
      const intervals = [];
      if (!Array.isArray(r.intervals) || !r.intervals.length || r.intervals.length > 48) fail(path + '.intervals', 'invalid_intervals');
      else for (const [j, interval] of r.intervals.entries()) {
        const from = minutes(interval?.from), to = minutes(interval?.to, true);
        if (!Number.isFinite(from) || !Number.isFinite(to) || from === to) fail(`${path}.intervals.${j}`, 'invalid_interval');
        else intervals.push({ from, to });
      }
      return { zone: r.zone, priority, weekdays, dates, season, intervals };
    }).filter(Boolean);
  };
  const rules = parseRules(p.rules, 'rules'), exceptions = parseRules(p.exceptions, 'exceptions');
  let dynamic = null;
  if (p.dynamic != null) {
    if (!record(p.dynamic) || !Array.isArray(p.dynamic.intervals) || p.dynamic.intervals.length > 10000) fail('dynamic', 'invalid_dynamic');
    else {
      dynamic = p.dynamic.intervals.map((r, i) => {
        const from = timestamp(r?.from), to = timestamp(r?.to);
        if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) fail(`dynamic.intervals.${i}`, 'invalid_interval');
        return { from, to, zone: 'dynamic', label: 'Dynamic',
          energyRate: energyRate(r?.energyRate, `dynamic.intervals.${i}.energyRate`),
          variableRate: variableRate(r?.variableRate, `dynamic.intervals.${i}.variableRate`) };
      }).sort((a, b) => a.from - b.from);
      for (let i = 1; i < dynamic.length; i++) if (dynamic[i].from < dynamic[i - 1].to) fail('dynamic', 'overlapping_prices');
    }
  }
  const valid = errors.length === 0;
  const unavailable = reason => ({ available: false, reason });
  const localParts = stamp => {
    if (clock.mode === 'fixed') {
      const d = new Date(stamp + clock.offsetMinutes * 60000);
      return { date: d.toISOString().slice(0, 10), minute: d.getUTCHours() * 60 + d.getUTCMinutes() };
    }
    const values = Object.fromEntries(formatter.formatToParts(stamp).filter(v => v.type !== 'literal').map(v => [v.type, v.value]));
    return { date: `${values.year}-${values.month}-${values.day}`, minute: Number(values.hour) * 60 + Number(values.minute) };
  };
  const matchesDay = (rule, day) => {
    if (rule.dates && !rule.dates.has(day)) return false;
    if (rule.weekdays && !rule.weekdays.has(new Date(day + 'T00:00:00Z').getUTCDay())) return false;
    const mmdd = day.slice(5), s = rule.season;
    return !s || (s.from <= s.to ? mmdd >= s.from && mmdd <= s.to : mmdd >= s.from || mmdd <= s.to);
  };
  const matches = (rule, day, minute) => rule.intervals.some(interval => {
    if (interval.from < interval.to) return minute >= interval.from && minute < interval.to && matchesDay(rule, day);
    if (minute >= interval.from) return matchesDay(rule, day);
    if (minute < interval.to) {
      const previousDay = new Date(Date.parse(day + 'T00:00:00Z') - 86400000).toISOString().slice(0, 10);
      return matchesDay(rule, previousDay);
    }
    return false;
  });
  const rateAt = instant => {
    if (!valid) return unavailable('invalid_profile');
    const stamp = timestamp(instant);
    if (!Number.isFinite(stamp)) return unavailable('invalid_timestamp');
    const local = localParts(stamp);
    if ((p.validFrom && local.date < p.validFrom) || (p.validTo && local.date > p.validTo)) return unavailable('outside_validity');
    if (dynamic) {
      // Price periods use absolute timestamps, so repeated DST hours are distinct.
      let low = 0, high = dynamic.length;
      while (low < high) { const mid = (low + high) >>> 1; if (dynamic[mid].from <= stamp) low = mid + 1; else high = mid; }
      const price = dynamic[low - 1];
      return price && stamp < price.to ? { available: true, ...price, date: local.date } : unavailable('missing_rate');
    }
    const special = exceptions.filter(r => matches(r, local.date, local.minute));
    const candidates = special.length ? special : rules.filter(r => matches(r, local.date, local.minute));
    let zone = defaultZone;
    if (candidates.length) {
      const priority = Math.max(...candidates.map(r => r.priority));
      const ids = new Set(candidates.filter(r => r.priority === priority).map(r => r.zone));
      if (ids.size !== 1) return unavailable('ambiguous_rules');
      zone = [...ids][0];
    }
    return zones.has(zone) ? { available: true, ...zones.get(zone), date: local.date } : unavailable('missing_rate');
  };
  const samePrice = (a, b) => a.available && b.available && a.energyRate === b.energyRate && a.variableRate === b.variableRate;
  const priceBucket = row => {
    const from = timestamp(row?.from), to = timestamp(row?.to), kwh = row?.kwh;
    if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from || to - from > 86400000 || !finite(kwh) || kwh < 0)
      return { available: false, reason: 'invalid_measurement', from, to };
    const first = rateAt(from);
    if (!first.available) return { ...first, from, to };
    // Never apportion an aggregate measurement across different prices. Every
    // minute boundary and every dynamic boundary is checked, including the end.
    const checkpoints = new Set([to - 1]);
    for (let t = (Math.floor(from / 60000) + 1) * 60000; t < to; t += 60000) checkpoints.add(t);
    if (dynamic) for (const price of dynamic) for (const t of [price.from, price.to]) if (t > from && t < to) checkpoints.add(t);
    const zoneIds = new Set([first.zone]);
    for (const stamp of checkpoints) {
      const next = rateAt(stamp);
      if (!next.available) return { ...next, from, to };
      if (!samePrice(first, next)) return { available: false, reason: 'mixed_rate_bucket', from, to };
      zoneIds.add(next.zone);
    }
    const energyCost = kwh * first.energyRate, variableCost = first.variableRate === null ? null : kwh * first.variableRate;
    const usageCost = variableCost === null ? null : energyCost + variableCost;
    if (![energyCost, variableCost, usageCost].every(v => v === null || finite(v)))
      return { available: false, reason: 'nonfinite_cost', from, to };
    const ids = [...zoneIds].sort();
    return { available: true, from, to, kwh, zone: ids.length === 1 ? ids[0] : null,
      zones: ids, zoneAttribution: ids.length === 1 ? 'single' : 'multiple', energyRate: first.energyRate,
      variableRate: first.variableRate, energyCost, variableCost, usageCost };
  };
  const priceBuckets = (rows, coverage) => {
    const issues = [], priced = [];
    if (!valid) issues.push({ reason: 'invalid_profile' });
    if (!Array.isArray(rows) || !rows.length) issues.push({ reason: 'no_data' });
    for (const [index, row] of (Array.isArray(rows) ? rows : []).entries()) {
      const result = priceBucket(row); priced.push({ index, ...result });
      if (!result.available) issues.push({ index, reason: result.reason });
    }
    const ordered = [...priced].sort((a, b) => a.from - b.from);
    for (let i = 1; i < ordered.length; i++) if (ordered[i].from < ordered[i - 1].to) issues.push({ index: ordered[i].index, reason: 'overlapping_measurement' });
    if (coverage != null) {
      const from = timestamp(coverage.from), to = timestamp(coverage.to);
      if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from) issues.push({ reason: 'invalid_coverage' });
      else if (!ordered.length || ordered[0].from !== from || ordered.at(-1).to !== to || ordered.some((r, i) => i && r.from !== ordered[i - 1].to))
        issues.push({ reason: 'missing_measurement' });
    }
    let complete = !issues.length;
    let kwh = complete ? priced.reduce((sum, r) => sum + r.kwh, 0) : null;
    let energyCost = complete ? priced.reduce((sum, r) => sum + r.energyCost, 0) : null;
    let variableCost = complete && priced.every(r => r.variableCost !== null) ? priced.reduce((sum, r) => sum + r.variableCost, 0) : null;
    let usageCost = energyCost !== null && variableCost !== null ? energyCost + variableCost : null;
    if (complete && ![kwh, energyCost, variableCost, usageCost].every(v => v === null || finite(v))) {
      issues.push({ reason: 'nonfinite_total' }); complete = false;
      kwh = energyCost = variableCost = usageCost = null;
    }
    return { complete, issues, rows: priced, kwh, energyCost, variableCost, usageCost,
      currency: p.currency ?? null, priceBasis: p.priceBasis ?? null, timezone: p.timezone ?? null,
      clock: { ...clock }, fixedMonthly: valid && finite(p.fixedMonthly) ? p.fixedMonthly : null };
  };
  return { valid, errors, rateAt, priceBuckets };
}

function energyTariffProfileV3(config, haConfig, kind) {
  const c = config || {}, h = haConfig || {};
  if (Object.hasOwn(c, 'tariff_profile')) return c.tariff_profile;
  const isOptimizer = kind === 'optimizer';
  const number = value => typeof value === 'number' && Number.isFinite(value) ? value : null;
  // Older Optimizer YAML accepted decimal strings. Preserve those explicit
  // prices, while refusing empty strings, booleans and automatic sample rates.
  const optimizerNumber = value => number(value) ?? (typeof value === 'string' && value.trim() && Number.isFinite(Number(value)) ? Number(value) : null);
  const mode = c.energy_tariff_mode || (isOptimizer && c.off_peak_rate != null ? 'day_night' : 'flat');
  const start = c.energy_day_hour_start ?? c.peak_hours?.start ?? 6;
  const end = c.energy_night_hour_start ?? c.peak_hours?.end ?? 22;
  const clockTime = value => Number.isInteger(value) && value >= 0 && value <= 24 ? `${String(value).padStart(2, '0')}:00` : 'invalid';
  // Legacy weekday/weekend classification used the current calendar day, even
  // after midnight. Custom overnight rules intentionally use the start day.
  const day = start === end ? [{ from: '00:00', to: '24:00' }] :
    Number.isInteger(start) && Number.isInteger(end) && start > end && start <= 24 && end >= 0 ?
      [...(start < 24 ? [{ from: clockTime(start), to: '24:00' }] : []),
        ...(end > 0 ? [{ from: '00:00', to: clockTime(end) }] : [])] :
      [{ from: clockTime(start), to: clockTime(end) }];
  const zone = (id, energyRate) => ({ id, label: id, energyRate, variableRate: null });
  const profile = { schema: 1, name: 'Configured tariff', currency: c.currency || h.currency || '',
    timezone: h.time_zone || '', clock: { mode: 'civil' }, priceBasis: c.energy_price_basis || 'gross',
    fixedMonthly: null, defaultZone: 'flat', zones: [], rules: [] };
  if (mode === 'flat') profile.zones = [zone('flat', isOptimizer ? optimizerNumber(c.peak_rate ?? c.energy_price) : number(c.energy_price))];
  else if (mode === 'day_night') {
    profile.zones = [zone('day', isOptimizer ? optimizerNumber(c.peak_rate ?? c.energy_price) : number(c.energy_price_day)),
      zone('night', isOptimizer ? optimizerNumber(c.off_peak_rate) : number(c.energy_price_night))];
    profile.defaultZone = 'night'; profile.rules = [{ zone: 'day', intervals: day }];
  } else if (mode === 'weekday_weekend') {
    profile.zones = [zone('weekday', number(c.energy_price_weekday)), zone('weekend', number(c.energy_price_weekend))];
    profile.defaultZone = 'weekday'; profile.rules = [{ zone: 'weekend', weekdays: [0, 6], intervals: [{ from: '00:00', to: '24:00' }] }];
  } else if (mode === 'mixed') {
    profile.zones = [zone('wd_day', number(c.energy_price_wd_day)), zone('wd_night', number(c.energy_price_wd_night)),
      zone('we_day', number(c.energy_price_we_day)), zone('we_night', number(c.energy_price_we_night))];
    profile.defaultZone = 'wd_night'; profile.rules = [
      { zone: 'wd_day', weekdays: [1, 2, 3, 4, 5], intervals: day },
      { zone: 'we_night', weekdays: [0, 6], intervals: [{ from: '00:00', to: '24:00' }] },
      { zone: 'we_day', weekdays: [0, 6], priority: 1, intervals: day }];
  } else profile.schema = 0;
  return profile;
}

  // END mirror shared/ha-tools-energy-tariff.js

  // BEGIN HA TOOLS UI V3 source-sha256=029c06206e55abad9aa09dfcf65bb13027ec24ce6a0bfacc45a938891b27254e
// HA Tools v3: vendored inside each consumer's own closure, never a window API.
function createUiV3({ language = 'en' } = {}) {
  const pl = String(language).startsWith('pl');
  const states = {
    success: ['Success', 'Sukces', '✓'],
    partial: ['Partial', 'Częściowo', '½'],
    unconfirmed: ['Unconfirmed', 'Niepotwierdzony', '?'],
    error: ['Error', 'Błąd', '✕'],
    not_checked: ['Not checked', 'Nie sprawdzono', '–'],
    no_data: ['No data', 'Brak danych', '∅'],
  };
  const status = (value) => {
    const code = typeof value === 'string' && Object.hasOwn(states, value) ? value : 'not_checked';
    const row = states[code];
    return { code, label: row[pl ? 1 : 0], icon: row[2], countsAsSuccess: code === 'success' };
  };
  const statusHtml = (value) => {
    const result = status(value);
    return `<span class="ht-result-state ht-result-state--${result.code}" data-result-state="${result.code}"><span aria-hidden="true">${result.icon}</span> ${result.label}</span>`;
  };
  const css = `
.ht-result-state { display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border:1px solid currentColor;border-radius:6px;font-size:12px;line-height:1.4;white-space:normal; }
.ht-result-state--success { color:#237b3d;background:rgba(35,123,61,.10); }
.ht-result-state--partial { color:#966400;background:rgba(150,100,0,.10); }
.ht-result-state--unconfirmed { color:#ad5200;background:rgba(173,82,0,.10); }
.ht-result-state--error { color:#c32b2b;background:rgba(195,43,43,.10); }
.ht-result-state--not_checked,.ht-result-state--no_data { color:var(--secondary-text-color,#666);background:transparent; }
.ht-result-state--no_data { border-style:dashed; }
:host(.bento-dark) .ht-result-state--success { color:#81cf99; }
:host(.bento-dark) .ht-result-state--partial { color:#efd080; }
:host(.bento-dark) .ht-result-state--unconfirmed { color:#ffb97b; }
:host(.bento-dark) .ht-result-state--error { color:#ff9999; }
`;
  return { status, statusHtml, css };
}
// END HA TOOLS UI V3

  // BEGIN mirror shared/ha-tools-tariff-guard.js
// One wire fence for the card-owned host and settings editor. A public timeout
// is uncertainty, never permission to dispatch another raw operation.
function createTariffGuardV3({ getHass, getContext = () => null, browser = typeof window === 'object' ? window : null, timeoutMs = 15000 }) {
  const canonical = value => JSON.stringify(value, (_, v) => v && typeof v === 'object' && !Array.isArray(v)
    ? Object.fromEntries(Object.keys(v).sort().map(k => [k, v[k]])) : v);
  let epoch = 0, association, connection, connectionOffline = false, browserOffline = browser?.navigator?.onLine === false;
  let raw = null, suspended = false;
  const listeners = new Set(), wireListeners = new Set();
  const notify = () => { epoch++; for (const listener of [...listeners]) listener(); };
  const connectionEvent = event => {
    if (event.type === 'disconnected' || event.type === 'reconnect-error') connectionOffline = true;
    else if (event.type === 'ready') connectionOffline = false;
    notify();
  };
  const types = ['disconnected', 'ready', 'reconnect-error'];
  const bind = next => {
    if (connection === next) return;
    for (const type of types) connection?.removeEventListener?.(type, connectionEvent);
    connection = next; connectionOffline = next?.connected === false;
    if (!suspended) for (const type of types) connection?.addEventListener?.(type, connectionEvent);
  };
  const browserEvent = event => { browserOffline = event.type === 'offline'; notify(); };
  browser?.addEventListener?.('offline', browserEvent);
  browser?.addEventListener?.('online', browserEvent);
  const read = h => {
    bind(h?.connection);
    return { user: h?.user?.id, admin: h?.user?.is_admin === true, owner: h?.user?.is_owner === true,
      active: h?.user?.is_active !== false, groups: canonical(h?.user?.groups || []), groupIds: canonical(h?.user?.group_ids || []),
      connection: h?.connection, callWS: h?.callWS,
      connected: h?.connection?.connected !== false && !connectionOffline,
      online: !suspended && !browserOffline && browser?.navigator?.onLine !== false,
      haConfig: canonical(h?.config || {}), context: canonical(getContext()) };
  };
  const equal = (a, b) => a && b && Object.keys(b).every(k => a[k] === b[k]);
  const observe = (...prospectiveHass) => {
    const now = read(prospectiveHass.length ? prospectiveHass[0] : getHass()), changed = association && !equal(association, now);
    association = now;
    if (changed) notify();
    return { ...now, epoch };
  };
  const available = a => !!a?.user && a.active && !!a.connection && a.connected && a.online && typeof a.callWS === 'function';
  const snapshot = () => observe();
  const current = (token, admin = false) => {
    const now = observe();
    return token?.epoch === now.epoch && equal(token, Object.fromEntries(Object.entries(now).filter(([k]) => k !== 'epoch'))) && available(now) && (!admin || now.admin);
  };
  const call = (token, payload, admin = false) => {
    if (!current(token, admin)) return Promise.reject({ code: 'authority_changed' });
    if (raw) return Promise.reject({ code: 'wire_occupied' });
    let resolvePublic, rejectPublic, finished = false;
    const result = new Promise((resolve, reject) => { resolvePublic = resolve; rejectPublic = reject; });
    const slot = {}; raw = slot;
    const timer = setTimeout(() => { finished = true; rejectPublic({ code: 'timeout' }); }, timeoutMs);
    let request;
    try { request = Promise.resolve(token.callWS.call(getHass(), payload)); }
    catch (error) { request = Promise.reject(error); }
    // Both branches handle late settlement; no floating rejected finally promise.
    const settled = () => {
      clearTimeout(timer); if (raw === slot) raw = null;
      for (const listener of [...wireListeners]) listener();
    };
    request.then(value => {
      settled();
      if (!finished) { finished = true; current(token, admin) ? resolvePublic(value) : rejectPublic({ code: 'authority_changed' }); }
    }, error => { settled(); if (!finished) { finished = true; rejectPublic(error); } });
    return result;
  };
  const suspend = () => {
    if (suspended) return;
    suspended = true;
    for (const type of types) connection?.removeEventListener?.(type, connectionEvent);
    browser?.removeEventListener?.('offline', browserEvent); browser?.removeEventListener?.('online', browserEvent);
    notify();
  };
  const resume = () => {
    if (!suspended) return;
    suspended = false; browserOffline = browser?.navigator?.onLine === false;
    for (const type of types) connection?.addEventListener?.(type, connectionEvent);
    browser?.addEventListener?.('offline', browserEvent); browser?.addEventListener?.('online', browserEvent);
    notify(); observe();
  };
  const dispose = () => {
    for (const type of types) connection?.removeEventListener?.(type, connectionEvent);
    browser?.removeEventListener?.('offline', browserEvent); browser?.removeEventListener?.('online', browserEvent);
    notify(); listeners.clear(); wireListeners.clear(); // Raw occupancy intentionally survives disposal.
  };
  observe(); // Observe typed edges before the card/editor is ever mounted.
  return { snapshot, observe, current, available, call, occupied: () => raw !== null,
    subscribeWire: listener => { wireListeners.add(listener); return () => wireListeners.delete(listener); },
    subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener); }, invalidate: notify, suspend, resume, dispose };
}
  // END mirror shared/ha-tools-tariff-guard.js

  // BEGIN mirror shared/ha-tools-tariff-settings.js
// Node-only dependency; runtime consumers vendor the guard in their own closure.


// Vendor inside each card's closure. The parent owns state and its mount; no
// global registration, helper services, SMTP configuration or browser storage.
function createTariffSettingsV3({ root, getHass, language = 'en', state, validate, onSaved, onLoaded, onCancel, ui, guard }) {
  if (!root || !state || typeof getHass !== 'function' || typeof validate !== 'function') throw new TypeError('tariff_settings_adapter');
  const translations = new Map();
  const pl = () => String(typeof language === 'function' ? language() : language).startsWith('pl');
  const t = (en, polish) => { translations.set(en, polish); return pl() ? polish : en; };
  const localMessage = () => {
    const message = state.message || '';
    for (const [en, polish] of translations) {
      if (message === en || message === polish) return pl() ? polish : en;
    }
    return message;
  };
  const family = () => typeof ui === 'function' ? ui() : ui;
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const object = value => !!value && typeof value === 'object' && !Array.isArray(value);
  const canonical = value => JSON.stringify(value, function (_, v) {
    return object(v) ? Object.fromEntries(Object.keys(v).sort().map(k => [k, v[k]])) : v;
  });
  const equal = (a, b) => canonical(a) === canonical(b);
  const validProfile = profile => { try { return validate(profile)?.valid === true; } catch (_) { return false; } };
  // The server returns only this bounded marker when persisted validation fails.
  // Its confirmed revision lets an administrator explicitly replace the profile.
  const invalidMarker = profile => object(profile) && profile.schema === 0 && Object.keys(profile).length === 1;
  const statuses = () => ({ success: t('Success', 'Sukces'), partial: t('Partial', 'Częściowo'),
    unconfirmed: t('Unconfirmed', 'Niepotwierdzony'), error: t('Error', 'Błąd'),
    not_checked: t('Not checked', 'Nie sprawdzono'), no_data: t('No data', 'Brak danych') });
  const statusHtml = () => family()?.statusHtml(state.status) || `<span data-result-state="${esc(state.status)}"><span aria-hidden="true">${({ success: '✓', partial: '½', unconfirmed: '?', error: '✕', not_checked: '–', no_data: '∅' })[state.status] || '–'}</span> ${esc(statuses()[state.status] || statuses().not_checked)}</span>`;
  const blank = () => ({ schema: 1, type: 'Custom', name: '', currency: getHass()?.config?.currency || '',
    timezone: getHass()?.config?.time_zone || '', clock: { mode: 'civil' }, priceBasis: 'gross',
    fixedMonthly: null, defaultZone: null, zones: [], rules: [], exceptions: [] });
  const seed = profile => invalidMarker(profile) ? blank() : clone(profile) || blank();
  if (!object(state.draft) || invalidMarker(state.draft)) state.draft = seed(state.profile);
  if (!statuses()[state.status]) state.status = 'not_checked';
  if (invalidMarker(state.profile) && state.status === 'not_checked') state.status = 'error';
  guard ||= createTariffGuardV3({ getHass });
  let operation = 0, association, resumeFocus = null, disposed = false;
  const observe = () => (association = guard.observe());
  const available = a => guard.available(a);
  const ticket = () => ({ ...observe(), operation: ++operation });
  const current = (token, admin = false) => token.operation === operation && guard.current(token, admin);
  const call = (token, payload, admin = false) => current(token, admin)
    ? guard.call(token, payload, admin) : Promise.reject({ code: 'authority_changed' });
  const unsubscribe = guard.subscribe(() => {
    if (disposed) return;
    operation++; resumeFocus = null;
    state.profile = null; state.revision = null; state.updated_at = null;
    state.draft = blank(); state._draftBaseline = clone(state.draft);
    state.feedText = undefined; state.feedError = null; state.backendAvailable = false;
    state.busy = false; state.status = 'unconfirmed'; state.message = '';
    // This mount may already have been detached; erase it too, synchronously.
    root.replaceChildren();
  });
  const unsubscribeWire = guard.subscribeWire(() => { if (!disposed && root.isConnected && available(guard.observe())) render(); });
  const envelope = value => object(value) && Object.hasOwn(value, 'profile') &&
    (value.profile === null || invalidMarker(value.profile) || (object(value.profile) && validProfile(value.profile))) && Number.isSafeInteger(value.revision) && value.revision >= 0 &&
    Object.hasOwn(value, 'updated_at') && (value.updated_at === null ||
      (typeof value.updated_at === 'string' && /T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value.updated_at) && Number.isFinite(Date.parse(value.updated_at))));
  const message = (status, text) => { state.status = status; state.message = text; };
  const unknown = () => { state.writeUnconfirmed = true; message('unconfirmed', t('Saving was not confirmed. Check the stored tariff before retrying. Your draft is preserved.',
    'Nie potwierdzono zapisu. Sprawdź zapisaną taryfę przed ponowieniem. Szkic został zachowany.')); };
  const load = async () => {
    if (disposed || state.busy || guard.occupied()) return;
    const token = ticket();
    if (!available(token)) { message('error', t('Tariff backend unavailable.', 'Backend taryf jest niedostępny.')); render(); return; }
    const pristine = equal(state.draft, seed(state.profile)), draft = clone(state.draft);
    state.busy = true; state.message = t('Loading stored tariff…', 'Wczytywanie zapisanej taryfy…'); render();
    try {
      const result = await call(token, { type: 'ha_tools_email/get_tariff' });
      if (!current(token)) return;
      if (!envelope(result)) throw { code: 'malformed' };
      state.profile = clone(result.profile); state.revision = result.revision; state.updated_at = result.updated_at;
      state.backendAvailable = true; state.writeUnconfirmed = false;
      state.draft = pristine ? seed(result.profile) : draft;
      if (pristine) { state.feedText = undefined; state.feedError = null; }
      if (invalidMarker(result.profile)) message('error', t('The stored tariff is invalid. Review and save a replacement; costs stay unavailable until a valid profile is confirmed.',
        'Zapisana taryfa jest niepoprawna. Sprawdź i zapisz nowy profil; koszty pozostają niedostępne do potwierdzenia poprawnej taryfy.'));
      else message(result.profile ? 'not_checked' : 'no_data', t('Stored tariff loaded. Review the fields before saving.', 'Wczytano taryfę. Sprawdź pola przed zapisem.'));
      if (current(token) && typeof onLoaded === 'function') onLoaded(clone(result));
    } catch (_) {
      if (current(token)) { state.backendAvailable = false; message('error', t('Tariff backend unavailable or response invalid. Draft preserved.', 'Backend taryf jest niedostępny lub odpowiedź jest błędna. Zachowano szkic.')); }
    } finally { if (current(token)) { state.busy = false; render(); } }
  };
  const save = async () => {
    if (disposed || state.busy || guard.occupied()) return;
    const token = ticket();
    if (!available(token) || !token.admin || state.writeUnconfirmed || state.backendAvailable === false || !Number.isSafeInteger(state.revision)) {
      message('error', t('Admin access and a loaded tariff backend are required.', 'Wymagane uprawnienia administratora i wczytany backend taryf.')); render(); return;
    }
    if (state.feedError) { message('error', state.feedError); render(); return; }
    const proposed = clone(state.draft);
    let result;
    try { result = validate(proposed); } catch (_) { result = { valid: false }; }
    if (!result?.valid) {
      message('error', t('Invalid tariff. Check the marked paths: ', 'Niepoprawna taryfa. Sprawdź wskazane pola: ') +
        (result?.errors || []).map(e => `${e.path}: ${e.reason}`).join('; ')); render(); return;
    }
    const previousRevision = state.revision;
    state.busy = true; message('not_checked', t('Saving; waiting for stored readback…', 'Zapis; oczekiwanie na odczyt zapisanego profilu…')); render();
    try {
      const written = await call(token, { type: 'ha_tools_email/set_tariff', profile: proposed, expected_revision: previousRevision }, true);
      if (!current(token, true)) return;
      if (!object(written) || !Number.isSafeInteger(written.revision) || written.revision !== previousRevision + 1) { unknown(); return; }
      const stored = await call(token, { type: 'ha_tools_email/get_tariff' }, true);
      if (!current(token, true)) return;
      if (!envelope(stored) || stored.updated_at === null || stored.revision !== written.revision || !equal(stored.profile, proposed)) { unknown(); return; }
      state.writeUnconfirmed = false;
      state.profile = clone(stored.profile); state.draft = clone(stored.profile); state.revision = stored.revision; state.updated_at = stored.updated_at;
      message('success', t('Tariff saved and confirmed by stored readback.', 'Taryfa zapisana i potwierdzona odczytem.'));
      if (current(token, true) && typeof onSaved === 'function') onSaved(clone(stored));
    } catch (error) {
      if (current(token, true) && ['conflict', 'revision_conflict', 'tariff_revision_conflict'].includes(error?.code)) {
        state.writeUnconfirmed = true;
        message('error', t('Revision conflict. Load the stored tariff and reconcile your draft.', 'Konflikt wersji. Wczytaj zapisaną taryfę i porównaj ze szkicem.'));
      } else if (current(token)) unknown();
    } finally { if (current(token)) { state.busy = false; render(); } }
  };
  const cancel = () => {
    // A dispatched save cannot be undone safely. The button remains disabled.
    if (disposed || state.busy || guard.occupied()) return;
    operation++; state.draft = seed(state.profile); state.feedError = null; state.feedText = undefined;
    message('not_checked', ''); render(); if (typeof onCancel === 'function') onCancel();
  };
  const read = path => path.split('.').reduce((value, key) => value?.[key], state.draft);
  const write = (path, value) => {
    const keys = path.split('.'); let at = state.draft;
    for (const key of keys.slice(0, -1)) { if (!object(at[key]) && !Array.isArray(at[key])) at[key] = {}; at = at[key]; }
    at[keys.at(-1)] = value;
  };
  const mutable = () => observe().admin && !state.busy && !guard.occupied() && available(association);
  const field = (path, label, kind = 'text', choices) => {
    const value = read(path);
    const attrs = `data-path="${esc(path)}" aria-label="${esc(label)}"${mutable() ? '' : ' disabled'}`;
    let input;
    if (choices) input = `<select ${attrs}>${choices.map(([v, l]) => `<option value="${esc(v)}"${String(value ?? '') === String(v) ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
    else input = `<input ${attrs} type="${kind === 'number' ? 'number' : kind}"${kind === 'number' ? ' step="any"' : ''} value="${esc(Array.isArray(value) ? value.join(', ') : value)}">`;
    return `<label class="ht-tariff-field"><span>${esc(label)}</span>${input}</label>`;
  };
  const button = (action, label) => `<button type="button" data-action="${esc(action)}"${mutable() ? '' : ' disabled'}>${esc(label)}</button>`;
  const zoneChoices = () => [['', t('Choose a zone', 'Wybierz strefę')], ...(state.draft.zones || []).map(z => [z.id, z.label || z.id])];
  const intervals = (kind, i, row) => (row.intervals || []).map((_, j) => `<div class="ht-tariff-row">${
    field(`${kind}.${i}.intervals.${j}.from`, t('From HH:MM', 'Od HH:MM'))}${
    field(`${kind}.${i}.intervals.${j}.to`, t('To HH:MM (24:00 allowed)', 'Do HH:MM (także 24:00)'))}${
    mutable() ? button(`remove-interval:${kind}:${i}:${j}`, t('Remove interval', 'Usuń przedział')) : ''}</div>`).join('') +
    (mutable() ? button(`add-interval:${kind}:${i}`, t('Add interval', 'Dodaj przedział')) : '');
  const rows = kind => (state.draft[kind] || []).map((row, i) => `<fieldset><legend>${esc(t(kind === 'rules' ? 'Rule' : 'Date exception', kind === 'rules' ? 'Reguła' : 'Wyjątek daty'))} ${i + 1}</legend><div class="ht-tariff-grid">${
    field(`${kind}.${i}.zone`, t('Zone', 'Strefa'), 'text', zoneChoices())}${field(`${kind}.${i}.priority`, t('Priority', 'Priorytet'), 'number')}${
    kind === 'exceptions' ? field(`${kind}.${i}.dates`, t('Dates YYYY-MM-DD, comma separated', 'Daty RRRR-MM-DD, oddzielone przecinkami')) :
      field(`${kind}.${i}.season.from`, t('Season from MM-DD (optional)', 'Sezon od MM-DD (opcjonalny)')) + field(`${kind}.${i}.season.to`, t('Season to MM-DD (optional)', 'Sezon do MM-DD (opcjonalny)'))}</div>${
    kind === 'rules' ? `<div class="ht-tariff-days">${[t('Sunday', 'Niedziela'), t('Monday', 'Poniedziałek'), t('Tuesday', 'Wtorek'), t('Wednesday', 'Środa'), t('Thursday', 'Czwartek'), t('Friday', 'Piątek'), t('Saturday', 'Sobota')].map((label, d) => `<label><input type="checkbox" data-weekday="${i}:${d}"${row.weekdays?.includes(d) ? ' checked' : ''}${mutable() ? '' : ' disabled'}><span>${esc(label)}</span></label>`).join('')}</div><p>${esc(t('No checked days = every day. Overnight intervals start on the selected day.', 'Brak zaznaczonych dni = codziennie. Przedział nocny zaczyna się w zaznaczonym dniu.'))}</p>` : ''}${
    intervals(kind, i, row)}${mutable() ? button(`remove-row:${kind}:${i}`, t('Remove rule', 'Usuń regułę')) : ''}</fieldset>`).join('');
  const css = `.ht-tariff-v3{box-sizing:border-box;color:var(--primary-text-color,#172033);font:inherit;width:100%;min-width:0;max-width:100%;padding:12px;background:var(--ha-card-background,var(--card-background-color,#fff));border-radius:var(--bento-radius,20px)}
.ht-tariff-v3 *{box-sizing:border-box;min-width:0}.ht-tariff-v3 h3,.ht-tariff-v3 p{overflow-wrap:anywhere}.ht-tariff-v3 fieldset{border:1px solid var(--divider-color,#d8dce5);border-radius:14px;margin:12px 0;padding:12px}.ht-tariff-v3 legend{max-width:100%;overflow-wrap:anywhere}.ht-tariff-v3 .ht-tariff-grid,.ht-tariff-v3 .ht-tariff-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,190px),1fr));gap:12px;margin:8px 0}.ht-tariff-v3 .ht-tariff-field{display:flex;flex-direction:column;gap:6px;overflow-wrap:anywhere}.ht-tariff-v3 input,.ht-tariff-v3 select,.ht-tariff-v3 textarea,.ht-tariff-v3 button{font:inherit;color:inherit;border:1px solid var(--divider-color,#c7cdd9);border-radius:10px;background:var(--secondary-background-color,#f7f8fa);min-height:44px;max-width:100%;width:100%;padding:10px}.ht-tariff-v3 textarea{resize:vertical;min-height:110px}.ht-tariff-v3 button{cursor:pointer;width:auto;white-space:normal;overflow-wrap:anywhere}.ht-tariff-v3 button:disabled{cursor:default;opacity:.6}.ht-tariff-v3 :is(input,select,textarea,button):focus-visible{outline:3px solid var(--primary-color,#395fd1);outline-offset:2px}.ht-tariff-v3 .ht-tariff-days,.ht-tariff-v3 .ht-tariff-actions{display:flex;flex-wrap:wrap;gap:8px}.ht-tariff-v3 .ht-tariff-days label{display:flex;align-items:center;gap:8px;min-height:44px}.ht-tariff-v3 input[type=checkbox]{width:24px;min-height:24px;height:24px}.ht-tariff-v3 [role=status]{padding:12px;border-radius:12px;overflow-wrap:anywhere;background:var(--secondary-background-color,#f1f3f6);margin:12px 0}.ht-tariff-v3 [data-status=success]{color:var(--bento-success,#16804a);background:var(--bento-success-light,#e8f5ed)}.ht-tariff-v3 [data-status=error]{color:var(--error-color,#ba1a1a)}.ht-tariff-v3 [data-status=unconfirmed],.ht-tariff-v3 [data-status=partial]{color:var(--warning-color,#a15b00)}.ht-tariff-v3 details{margin:12px 0}.ht-tariff-v3 summary{min-height:44px;cursor:pointer}`;
  function render() {
    if (disposed) return;
    const active = root.getRootNode().activeElement;
    const focused = active && root.contains(active) ? active : root.querySelector(':focus');
    const focusKey = focused ? { path: focused.dataset.path, action: focused.dataset.action, weekday: focused.dataset.weekday, feed: focused.dataset.feed,
      selection: typeof focused.selectionStart === 'number' ? { start: focused.selectionStart, end: focused.selectionEnd, direction: focused.selectionDirection } : null } : resumeFocus;
    const documentFocus = root.ownerDocument.activeElement, ownerRoot = root.getRootNode();
    const externalFocus = documentFocus && documentFocus !== root.ownerDocument.body &&
      documentFocus !== ownerRoot.host && !root.contains(documentFocus);
    if (focused && state.busy) resumeFocus = focusKey;
    const a = observe();
    if (state.busy && (!available(a) || !a.admin) && state.message) unknown();
    const p = state.draft;
    root.innerHTML = `<style>${css}${family()?.css || ''}</style><section class="ht-tariff-v3" aria-label="${esc(t('Tariff settings', 'Ustawienia taryfy'))}"><h3>${esc(t('Your electricity tariff', 'Twoja taryfa energii'))}</h3><p>${esc(t('Enter your own rates and hours. Names G11/G12/G12w/G12n do not fill rates, holidays or schedules.', 'Wpisz własne ceny i godziny. Nazwy G11/G12/G12w/G12n nie uzupełniają cen, świąt ani harmonogramu.'))}</p>${
      !a.admin ? `<p>${esc(t('Household access: read only.', 'Dostęp domownika: tylko odczyt.'))}</p>` : ''}${
      !available(a) || state.backendAvailable === false ? `<p>${esc(t('Tariff backend unavailable. No local fallback.', 'Backend taryf jest niedostępny. Brak lokalnego zapisu zastępczego.'))}</p>` :
        !Number.isSafeInteger(state.revision) ? `<p>${esc(t('Backend availability not checked. Load the tariff first.', 'Dostępność backendu nie została sprawdzona. Najpierw wczytaj taryfę.'))}</p>` : ''}
${invalidMarker(state.profile) ? `<p role="alert">${esc(t('The stored tariff is invalid. Create and save a valid replacement. No rates were guessed.', 'Zapisana taryfa jest niepoprawna. Utwórz i zapisz poprawny profil. Nie przyjęto domyślnych stawek.'))}</p>` : ''}
<div class="ht-tariff-grid">${field('type', t('Tariff name type', 'Typ nazwy taryfy'), 'text', ['Custom', 'G11', 'G12', 'G12w', 'G12n'].map(v => [v, v]))}${field('name', t('Tariff name (optional)', 'Nazwa taryfy (opcjonalna)'))}${field('currency', t('Currency ISO 4217', 'Waluta ISO 4217'))}${field('timezone', t('IANA timezone', 'Strefa czasowa IANA'))}${field('clock.mode', t('Tariff clock', 'Zegar taryfy'), 'text', [['civil', t('Civil time (DST)', 'Czas lokalny (zmiana czasu)')], ['fixed', t('Fixed UTC offset', 'Stałe przesunięcie UTC')]])}${field('clock.offsetMinutes', t('Fixed offset minutes', 'Stałe przesunięcie w minutach'), 'number')}${field('priceBasis', t('Price basis', 'Podstawa ceny'), 'text', [['gross', t('Gross', 'Brutto')], ['net', t('Net', 'Netto')]])}${field('validFrom', t('Valid from (optional)', 'Ważna od (opcjonalnie)'), 'date')}${field('validTo', t('Valid to (optional)', 'Ważna do (opcjonalnie)'), 'date')}${field('fixedMonthly', t('Fixed monthly fee (separate)', 'Opłata stała miesięczna (osobno)'), 'number')}</div>
<h3>${esc(t('Energy and variable fees per kWh', 'Energia i opłaty zmienne za kWh'))}</h3><p>${esc(t('Empty = unknown; zero is a known zero. Fixed monthly fees are shown separately, never prorated.', 'Puste = nieznane; zero jest znaną wartością zero. Opłata stała jest osobna, bez proporcjonalnego naliczania.'))}</p>${
(p.zones || []).map((_, i) => `<fieldset><legend>${esc(t('Zone', 'Strefa'))} ${i + 1}</legend><div class="ht-tariff-grid">${field(`zones.${i}.id`, t('Zone ID', 'ID strefy'))}${field(`zones.${i}.label`, t('Zone label', 'Etykieta strefy'))}${field(`zones.${i}.energyRate`, t('Energy / kWh', 'Energia / kWh'), 'number')}${field(`zones.${i}.variableRate`, t('Variable fees / kWh (optional)', 'Opłaty zmienne / kWh (opcjonalne)'), 'number')}</div>${mutable() ? button(`remove-zone:${i}`, t('Remove zone', 'Usuń strefę')) : ''}</fieldset>`).join('')}${mutable() ? button('add-zone', t('Add zone', 'Dodaj strefę')) : ''}${field('defaultZone', t('Default zone (optional)', 'Strefa domyślna (opcjonalna)'), 'text', zoneChoices())}
<h3>${esc(t('Schedule rules', 'Reguły harmonogramu'))}</h3>${rows('rules')}${mutable() ? button('add-rule', t('Add rule', 'Dodaj regułę')) : ''}<h3>${esc(t('Date exceptions', 'Wyjątki dat'))}</h3>${rows('exceptions')}${mutable() ? button('add-exception', t('Add date exception', 'Dodaj wyjątek daty')) : ''}
<details><summary>${esc(t('Advanced: absolute dynamic price feed', 'Zaawansowane: bezwzględne przedziały cen dynamicznych'))}</summary><p>${esc(t('Optional dynamic feed overrides schedule prices. Use explicit UTC/offset timestamps. Only this feed uses JSON.', 'Opcjonalny feed dynamiczny zastępuje ceny harmonogramu. Użyj znaczników UTC lub z przesunięciem. JSON służy wyłącznie temu feedowi.'))}</p><label class="ht-tariff-field"><span>${esc(t('Dynamic feed JSON (empty = off)', 'Feed dynamiczny JSON (pusty = wyłączony)'))}</span><textarea data-feed="true"${mutable() ? '' : ' disabled'}>${esc(state.feedText ?? (p.dynamic == null ? '' : JSON.stringify(p.dynamic, null, 2)))}</textarea></label>${field('allowNegativeEnergy', t('Negative energy prices', 'Ujemne ceny energii'), 'text', [['false', t('Disabled', 'Wyłączone')], ['true', t('Explicitly allowed', 'Jawnie dozwolone')]])}</details>
<div role="status" aria-live="polite" data-status="${esc(state.status)}">${statusHtml()}${state.message ? ': ' + esc(localMessage()) : ''}</div><div class="ht-tariff-actions"><button type="button" data-action="load"${state.busy || guard.occupied() || !available(a) ? ' disabled' : ''}>${esc(t('Load stored tariff', 'Wczytaj zapisaną taryfę'))}</button>${a.admin ? `<button type="button" data-action="save"${state.busy || guard.occupied() || !available(a) || state.writeUnconfirmed || state.backendAvailable === false || !Number.isSafeInteger(state.revision) ? ' disabled' : ''}>${esc(t('Save tariff', 'Zapisz taryfę'))}</button><button type="button" data-action="cancel"${state.busy || guard.occupied() ? ' disabled' : ''}>${esc(t('Cancel', 'Anuluj'))}</button>` : ''}</div></section>`;
    root.querySelectorAll('[data-path]').forEach(el => el.addEventListener('input', () => {
      if (!mutable()) { render(); return; }
      const path = el.dataset.path;
      let value = el.value;
      if (el.type === 'number') value = value.trim() === '' ? null : Number(value);
      else if (path.endsWith('.dates')) value = value.split(/[\s,]+/).filter(Boolean);
      else if (path === 'allowNegativeEnergy') value = value === 'true';
      else if (['validFrom', 'validTo', 'defaultZone'].includes(path)) value = value || null;
      write(path, value);
      if (path.includes('.season.')) {
        const base = path.split('.').slice(0, 2).join('.'), season = read(base + '.season');
        if (!season.from && !season.to) delete read(base).season;
      }
      message('not_checked', '');
      const badge = root.querySelector('[role=status]');
      if (badge) { badge.dataset.status = 'not_checked'; badge.innerHTML = statusHtml(); }
    }));
    root.querySelectorAll('[data-path]').forEach(el => el.addEventListener('change', () => {
      if (/^zones\.\d+\.(id|label)$/.test(el.dataset.path)) render();
    }));
    root.querySelectorAll('[data-weekday]').forEach(el => el.addEventListener('change', () => {
      if (!mutable()) { render(); return; }
      const [i, day] = el.dataset.weekday.split(':').map(Number), row = p.rules[i], days = new Set(row.weekdays || []);
      if (el.checked) days.add(day); else days.delete(day);
      if (days.size) row.weekdays = [...days].sort(); else delete row.weekdays;
      message('not_checked', ''); render();
    }));
    root.querySelector('[data-feed]')?.addEventListener('input', event => {
      if (!mutable()) { render(); return; }
      state.feedText = event.target.value;
      try { const dynamic = state.feedText.trim() ? JSON.parse(state.feedText) : null;
        if (dynamic !== null && !object(dynamic)) throw Error();
        p.dynamic = dynamic; state.feedError = null; message('not_checked', '');
      } catch (_) { state.feedError = t('Invalid dynamic feed JSON.', 'Niepoprawny JSON feedu dynamicznego.'); message('error', state.feedError); }
      const badge = root.querySelector('[role=status]');
      if (badge) { badge.dataset.status = state.status; badge.innerHTML = statusHtml() + (state.message ? ': ' + esc(localMessage()) : ''); }
    });
    root.querySelectorAll('[data-action]').forEach(el => el.addEventListener('click', () => {
      const [action, ...args] = el.dataset.action.split(':');
      if (action === 'load') { void load(); return; }
      if (!mutable()) return;
      if (action === 'save') { void save(); return; }
      if (action === 'cancel') { cancel(); return; }
      if (action === 'add-zone') {
        p.zones ||= []; let id = `zone-${p.zones.length + 1}`;
        while (p.zones.some(z => z.id === id)) id += '-new';
        p.zones.push({ id, label: '', energyRate: null, variableRate: null });
      } else if (action === 'remove-zone') p.zones.splice(Number(args[0]), 1);
      else if (action === 'add-rule' || action === 'add-exception') {
        const kind = action === 'add-rule' ? 'rules' : 'exceptions'; p[kind] ||= [];
        p[kind].push({ zone: p.defaultZone || p.zones?.[0]?.id || '', priority: 0,
          ...(kind === 'exceptions' ? { dates: [] } : {}), intervals: [{ from: '00:00', to: '24:00' }] });
      } else if (action === 'remove-row') p[args[0]].splice(Number(args[1]), 1);
      else if (action === 'add-interval') { const row = p[args[0]][Number(args[1])]; row.intervals ||= []; row.intervals.push({ from: '00:00', to: '24:00' }); }
      else if (action === 'remove-interval') p[args[0]][Number(args[1])].intervals.splice(Number(args[2]), 1);
      message('not_checked', ''); render();
    }));
    if (focusKey) {
      const target = [...root.querySelectorAll('input,select,textarea,button')].find(el =>
        (focusKey.path && el.dataset.path === focusKey.path) || (focusKey.action && el.dataset.action === focusKey.action) ||
        (focusKey.weekday && el.dataset.weekday === focusKey.weekday) || (focusKey.feed && el.dataset.feed === focusKey.feed));
      if (target && !target.disabled && !externalFocus) {
        target.focus();
        if (focusKey.selection && typeof target.selectionStart === 'number') {
          const length = target.value.length;
          target.setSelectionRange(Math.min(focusKey.selection.start, length), Math.min(focusKey.selection.end, length), focusKey.selection.direction || 'none');
        }
      }
    }
    if (!state.busy) resumeFocus = null;
  }
  return { render, load, cancel, dispose: () => { disposed = true; operation++; unsubscribe(); unsubscribeWire(); } };
}
  // END mirror shared/ha-tools-tariff-settings.js

  // BEGIN mirror shared/ha-tools-tariff-host.js
// Node-only import; omitted in consumer closure.

// Card-owned adapter: it never writes card YAML, helpers, schedules or SMTP.
function createTariffHostV3({ card, kind, createModel, legacyProfile, createSettings, createUi, readTimeoutMs = 15000, guard, onRefresh }) {
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const language = () => card._hass?.locale?.language || card._hass?.language || card._lang || 'en';
  const text = (en, pl) => String(language()).startsWith('pl') ? pl : en;
  guard ||= createTariffGuardV3({ getHass: () => card._hass, getContext: () => card._config, timeoutMs: readTimeoutMs });
  const identity = () => guard.snapshot();
  const same = (a, b) => a?.epoch === b?.epoch && a?.user === b?.user && a?.connection === b?.connection;
  let pending = null, attemptedEpoch = null, cachedKey, cachedModel, editorRoot, editor, focusKey = null;
  const state = () => (card._tariffEditorState ||= { profile: null, revision: null, status: 'not_checked', busy: false });
  const effectiveConfig = () => {
    const config = card._config || {};
    if (Object.hasOwn(config, 'tariff_profile')) return config;
    return card._sharedTariffProfile != null && same(card._sharedTariffAssociation, identity(card._hass))
      ? { ...config, tariff_profile: card._sharedTariffProfile } : config;
  };
  const activeProfile = () => legacyProfile(effectiveConfig(), card._hass?.config, kind);
  const model = function (proposed) {
    if (arguments.length) return createModel(proposed);
    const profile = activeProfile(), key = JSON.stringify(profile);
    if (cachedModel && key === cachedKey) return cachedModel;
    cachedKey = key; cachedModel = createModel(profile); return cachedModel;
  };
  const currency = () => {
    const value = activeProfile()?.currency;
    return typeof value === 'string' && /^[A-Z]{3}$/.test(value) ? value : '';
  };
  const purge = () => {
    card._sharedTariffProfile = null; card._sharedTariffAssociation = null;
    card._sharedTariffLoadedAt = 0; card._tariffEditorState = null;
    card._sharedTariffReadStatus = 'not_checked'; card._tariffSettingsOpen = false;
    cachedKey = undefined; cachedModel = undefined; editorRoot?.replaceChildren(); editor?.dispose?.(); editorRoot = null; editor = null; focusKey = null;
    for (const mount of card.shadowRoot?.querySelectorAll('[data-tariff-mount]') || []) mount.replaceChildren();
    const details = card.shadowRoot?.querySelector('[data-tariff-details]'); if (details) details.open = false;
    // Pending raw request remains owned by guard; a new epoch cannot free it.
  };
  guard.subscribe(purge);
  const reset = (...nextHass) => guard.observe(...nextHass);
  const load = async (force = false) => {
    const token = identity();
    if (!guard.available(token)) return false;
    if (card._sharedTariffReadStatus === 'success' && same(card._sharedTariffAssociation, token)) return true;
    if (pending) return pending;
    if (guard.occupied() || (!force && attemptedEpoch === token.epoch)) return false;
    attemptedEpoch = token.epoch;
    const operation = (async () => {
      try {
        const result = await guard.call(token, { type: 'ha_tools_email/get_tariff' });
        if (!guard.current(token)) return false;
        if (!result || !Object.hasOwn(result, 'profile') || !Number.isSafeInteger(result.revision) || result.revision < 0 ||
          !Object.hasOwn(result, 'updated_at') || (result.updated_at !== null &&
          (typeof result.updated_at !== 'string' || !/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(result.updated_at) || !Number.isFinite(Date.parse(result.updated_at)))))
          throw new Error('invalid_tariff_response');
        const valid = result.profile === null || createModel(result.profile).valid;
        const profile = result.profile === null ? null : valid ? clone(result.profile) : { schema: 0 };
        card._sharedTariffProfile = profile; card._sharedTariffAssociation = token; card._sharedTariffLoadedAt = Date.now();
        card._sharedTariffReadStatus = 'success';
        const saved = state(), pristine = !saved.draft || JSON.stringify(saved.draft) === JSON.stringify(saved._draftBaseline) || JSON.stringify(saved.draft) === JSON.stringify(saved.profile);
        saved.profile = clone(profile); saved.revision = result.revision; saved.updated_at = result.updated_at;
        saved.backendAvailable = true;
        if (pristine) { saved.draft = valid ? clone(profile) : undefined; saved._draftBaseline = clone(saved.draft); }
        return true;
      } catch (_) {
        if (guard.current(token)) card._sharedTariffReadStatus = 'unconfirmed';
        return false;
      }
    })();
    pending = operation;
    operation.then(() => { if (pending === operation) pending = null; }, () => { if (pending === operation) pending = null; });
    return operation;
  };
  const snapshot = () => {
    const token = identity(), own = Object.hasOwn(card._config || {}, 'tariff_profile');
    if (!guard.available(token)) return { profile: null, reason: 'tariff_authority_unavailable' };
    if (own) return { profile: clone(card._config.tariff_profile), revision: null, provenance: 'card_config' };
    if (!same(card._sharedTariffAssociation, token) || card._sharedTariffReadStatus !== 'success') return { profile: null, reason: 'tariff_unconfirmed' };
    return { profile: clone(card._sharedTariffProfile), revision: state().revision, provenance: 'shared_backend', updated_at: state().updated_at };
  };
  const markup = () => {
    const active = card.shadowRoot?.activeElement;
    focusKey = active?.closest('[data-tariff-details]') ? {
      summary: active.tagName === 'SUMMARY', path: active.dataset.path,
      action: active.dataset.action, weekday: active.dataset.weekday, feed: active.dataset.feed,
      selection: typeof active.selectionStart === 'number' ? { start: active.selectionStart, end: active.selectionEnd, direction: active.selectionDirection } : null
    } : null;
    return `<style>
    [data-energy-container]{container-type:inline-size;container-name:energy-card}
    .tabs{flex-wrap:wrap;overflow:visible;max-width:100%}
    .tabs>button{min-height:44px;min-width:44px;white-space:normal;overflow-wrap:anywhere;flex:0 1 auto}
    button{min-height:44px;min-width:44px}
    .energy-tab-picker{display:none;margin:12px 0}
    .energy-tab-picker select{font:inherit;color:var(--primary-text-color,#172033);background:var(--card-background-color,#fff);width:100%;max-width:100%;min-height:44px;border:1px solid var(--divider-color,#d8dce5);border-radius:10px;padding:10px}
    .energy-tab-picker select:focus-visible{outline:3px solid var(--primary-color,#395fd1);outline-offset:2px}
    @container energy-card (max-width:279.99px){.tabs{display:none}.energy-tab-picker{display:block}}
    [data-tariff-details]{margin:16px 0;min-width:0;max-width:100%}
    [data-tariff-details]>summary{min-height:44px;display:flex;align-items:center;padding:10px;border:1px solid var(--divider-color,#d8dce5);border-radius:10px;cursor:pointer;overflow-wrap:anywhere}
    [data-tariff-details]>summary:focus-visible{outline:3px solid var(--primary-color,#395fd1);outline-offset:2px}
    </style>${card._sharedTariffReadStatus === 'unconfirmed' ? `<p role="status">${text('Shared tariff could not be confirmed. Reload explicitly to confirm prices. No tariff cost is guessed.', 'Nie udało się potwierdzić wspólnej taryfy. Wczytaj ponownie, aby potwierdzić ceny. Koszt taryfy nie jest zgadywany.')}</p>` : ''}
    <details data-tariff-details${card._tariffSettingsOpen ? ' open' : ''}><summary>${text('Tariff settings', 'Ustawienia taryfy')}</summary>
    ${Object.hasOwn(card._config || {}, 'tariff_profile') ? `<p>${text('This card uses its own configured tariff. Shared settings apply to cards using the shared profile.', 'Ta karta używa własnej skonfigurowanej taryfy. Ustawienia współdzielone dotyczą kart korzystających ze wspólnego profilu.')}</p>` : ''}
    <div data-tariff-mount></div></details>`;
  };
  const mount = root => {
    if (editorRoot !== root || !editor) {
      editor?.dispose?.();
      const saved = state();
      if (!saved.draft) {
        const profile = activeProfile();
        if (createModel(profile).valid) saved.draft = clone(profile);
      }
      editorRoot = root;
      const mountToken = identity();
      const refreshed = envelope => {
        if (!guard.current(mountToken)) return;
        card._sharedTariffProfile = clone(envelope.profile); card._sharedTariffAssociation = identity(card._hass);
        card._sharedTariffLoadedAt = Date.now();
        card._sharedTariffReadStatus = 'success';
        // The editor finishes its pending state before the parent replaces DOM.
        queueMicrotask(() => {
          if (!guard.current(mountToken)) return;
          if (onRefresh) { onRefresh(envelope); return; }
          if (kind === 'insights') void card._fetchData();
          if (kind === 'email') void card._fetchAllPeriodStats().then(() => card._render());
          card._render();
        });
      };
      editor = createSettings({ root, getHass: () => card._hass, language, state: saved, validate: createModel,
        guard, ui: () => createUi({ language: language() }),
        onSaved: refreshed, onLoaded: refreshed,
        onCancel: () => {
          card._tariffSettingsOpen = false;
          const details = root.closest('[data-tariff-details]');
          if (details) { details.open = false; details.querySelector('summary')?.focus(); }
        } });
    }
    if (!Object.hasOwn(state(), '_draftBaseline')) state()._draftBaseline = clone(state().draft);
    editor.render();
  };
  const bind = () => {
    guard.observe();
    const tabs = card.shadowRoot.querySelector('.tabs');
    if (tabs && kind !== 'smart') {
      tabs.parentElement.setAttribute('data-energy-container', '');
      const buttons = [...tabs.querySelectorAll('button')];
      tabs.setAttribute('role', 'tablist');
      tabs.setAttribute('aria-label', text('Energy views', 'Widoki energii'));
      let picker = card.shadowRoot.querySelector('.energy-tab-picker select');
      if (!picker) {
        const label = document.createElement('label'); label.className = 'energy-tab-picker';
        picker = document.createElement('select'); label.append(picker); tabs.before(label);
        picker.addEventListener('change', () => buttons[Number(picker.value)]?.click());
      }
      picker.setAttribute('aria-label', text('Energy view', 'Widok energii'));
      picker.replaceChildren(...buttons.map((button, index) => {
        const option = document.createElement('option'); option.value = String(index);
        option.textContent = button.textContent.trim(); option.selected = button.classList.contains('active');
        button.setAttribute('role', 'tab'); button.setAttribute('aria-selected', String(option.selected));
        if (!button.dataset.energyPickerBound) {
          button.dataset.energyPickerBound = 'true';
          button.addEventListener('click', () => queueMicrotask(() => {
            buttons.forEach((item, i) => {
              const active = item.classList.contains('active'); item.setAttribute('aria-selected', String(active));
              if (active) picker.value = String(i);
            });
          }));
        }
        return option;
      }));
    }
    const details = card.shadowRoot.querySelector('[data-tariff-details]');
    if (!details) return;
    let root = details.querySelector('[data-tariff-mount]');
    if (editorRoot && editor && root !== editorRoot) { root.replaceWith(editorRoot); root = editorRoot; }
    if (!details.dataset.bound) {
      details.dataset.bound = 'true';
      details.addEventListener('toggle', () => {
        card._tariffSettingsOpen = details.open;
        if (details.open) mount(root);
      });
    }
    if (details.open) mount(root);
    if (focusKey) {
      const key = focusKey; focusKey = null;
      const target = key.summary ? details.querySelector('summary') : details.open &&
        [...root.querySelectorAll('input,select,textarea,button')].find(el =>
          (key.path && el.dataset.path === key.path) || (key.action && el.dataset.action === key.action) ||
          (key.weekday && el.dataset.weekday === key.weekday) || (key.feed && el.dataset.feed === key.feed));
      if (target && !target.disabled) {
        target.focus({ preventScroll: true });
        if (key.selection && typeof target.selectionStart === 'number') {
          const length = target.value.length;
          target.setSelectionRange(Math.min(key.selection.start, length), Math.min(key.selection.end, length), key.selection.direction || 'none');
        }
      }
    }
  };
  return { model, profile: activeProfile, currency, reset, load, snapshot, markup, bind, guard, ui: () => createUi({ language: language() }) };
}

  // END mirror shared/ha-tools-tariff-host.js

  const VERSION = '4.2.0';
  const VALID_PERIODS = new Set(['1d', '7d', '30d']);
  const ENERGY_UNITS = new Set(['Wh', 'kWh', 'MWh']);

  const PL = Object.freeze({
    'missing_measurement':'brak pomiaru','shared_backend':'wspólne ustawienia taryfy','card_config':'ustawienia karty',
    'gross':'brutto','net':'netto','nonaligned_window':'okres nie obejmuje pełnych godzin',
    'tariff_authority_unavailable':'ustawienia taryfy niedostępne','tariff_unconfirmed':'ustawienia taryfy niepotwierdzone',
    'invalid_profile':'nieprawidłowa taryfa','mixed_rate_bucket':'zmiana stawki wewnątrz przedziału',

    'Previous period could not be loaded.':'Nie udało się wczytać poprzedniego okresu.',
    'read_failed':'odczyt nie powiódł się',
    'All hours':'Wszystkie godziny','Page':'Strona','Previous':'Poprzednia','Next':'Następna',
    'Complete history':'Kompletna historia','Partial history':'Niepełna historia','No measurements':'Brak pomiarów',
    'Daily consumption views':'Widoki dziennego zużycia','Day details':'Szczegóły dnia','Clear day selection':'Wyczyść wybór dnia',
    'Select a day for its interval and measurement coverage.':'Wybierz dzień, aby zobaczyć jego przedział i kompletność pomiarów.',
    'Hourly records':'Dane godzinowe','Daily overview':'Przegląd dzienny','UTC interval':'Przedział UTC',
    'Energy / kWh':'Energia / kWh','Zone':'Strefa','Status':'Stan',
    'Select a day to inspect its hours. Stripes show measured subsets; gaps are not zero.':'Wybierz dzień, aby zobaczyć godziny. Paski oznaczają zmierzoną część danych; brak danych nie oznacza zera.',

    "shared_backend": "Wspólny profil z backendu",
    "card_config": "Profil z konfiguracji karty",
    "Configured tariff energy cost": "Koszt energii według skonfigurowanej taryfy",
    "Measured hours": "Zmierzone godziny",
    "Revision": "Wersja",
    "Current profile validity": "Bieżąca dostępność profilu",
    "Energy cost only; variable and fixed fees are separate. This is not a complete electricity bill.": "Tylko koszt energii; opłaty zmienne i stałe są osobno. To nie jest pełny rachunek za prąd.",
    "Measured subset only": "Tylko zmierzony podzbiór",
    "Variable fees": "Opłaty zmienne",
    "Energy and variable fees": "Energia i opłaty zmienne",
    "Fixed monthly fee (separate)": "Miesięczna opłata stała (osobno)",
    "month": "miesiąc",
    "Cost evidence": "Dane kosztu",
    "Chart": "Wykres",
    "Data": "Dane",
    "Measured energy": "Zmierzona energia",
    "Priced energy": "Wyceniona energia",
    "Flat rate per kWh": "Stała stawka za kWh",
    "Cost mode": "Tryb kosztu",
    "Recorded costs, then explicit flat estimate": "Zarejestrowane koszty, potem jawny stały szacunek",
    "Recorded monetary statistics": "Statystyki kosztów w walucie",
    "Configured tariff from measured hours": "Skonfigurowana taryfa ze zmierzonych godzin",
    "invalid_profile": "Niepoprawny profil",
    "missing_measurement": "Brak pomiaru",
    "mixed_rate_bucket": "Różne ceny wewnątrz godziny",
    "tariff_unconfirmed": "Taryfa niepotwierdzona",
    "tariff_authority_unavailable": "Brak dostępu do taryfy",
    "outside_validity": "Poza okresem ważności",
    "nonaligned_window": "Niepełne godziny okresu",
    "invalid_root_sources": "Niepoprawne źródła główne",
    "invalid_measurement": "Niepoprawny pomiar",
    "ambiguous_rules": "Niejednoznaczne reguły",
    "Compare previous local-calendar period": "Porównaj poprzedni okres kalendarza lokalnego",
    "Previous period comparison": "Porównanie z poprzednim okresem",
    "Comparison details": "Szczegóły porównania",
    "Current period": "Bieżący okres",
    "Previous period": "Poprzedni okres",
    "Missing energy days": "Dni z brakami energii",
    "Missing cost days": "Dni z brakami kosztu",
    "Role": "Rola",
    "Change in measured energy": "Zmiana zmierzonej energii",
    "Change in energy cost": "Zmiana kosztu energii",
    "Daily allocation": "Przypisanie do dnia",
    "Whole reading in this day": "Cały pomiar w tym dniu",
    "device": "urządzenie",
    "priced_energy": "koszt zmierzonej energii",
    "crosses_local_midnight": "Pełna godzina przecina lokalną północ; zachowana w Wszystkie godziny, bez dzielenia pomiaru",
    "Recorded value": "Zarejestrowana wartość",
    "complete_comparable_measurements": "Pełne porównywalne pomiary",
    "ambiguous_local_cutoff": "Niejednoznaczna lokalna godzina odcięcia",
    "nonexistent_local_cutoff": "Lokalna godzina odcięcia nie istnieje",
    "historical_flat_rate_unavailable": "Brak potwierdzonej historycznej stawki stałej",
    "previous_zero": "Poprzednia wartość wynosi zero — procent nieznany",
    "previous_nonpositive": "Poprzednia wartość jest ujemna — procent nieznany",
    "nonfinite_delta": "Zmiana poza zakresem liczbowym",
    "unit_mismatch": "Niezgodne jednostki",

    "Search devices or sources": "Szukaj urządzenia lub źródła",
    "Name or entity/statistic ID": "Nazwa lub identyfikator encji/statystyki",
    "Clear search": "Wyczyść wyszukiwanie",
    "Shown devices": "Pokazane urządzenia",
    "No matching devices": "Brak pasujących urządzeń",
    "Parent device": "Urządzenie nadrzędne",
    "Export includes all devices and sources in this report, including those hidden by search.": "Eksport obejmuje wszystkie urządzenia i źródła w raporcie, także ukryte przez wyszukiwanie.",
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
    "Boundary intervals without a complete hourly measurement": "Przedziały graniczne bez pełnego pomiaru godzinowego",
    "invalid_relationship": "nieprawidłowe powiązanie urządzeń",
    "nested_parent_missing": "brak nadrzędnego źródła urządzenia",
    "currency_mismatch": "niezgodna waluta",
    "partial_cost": "niepełne dane kosztu",
    "partial_energy": "niepełne dane energii",
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
    return ({ missing_measurement: 'Missing measurement', shared_backend: 'Shared tariff settings', card_config: 'Card settings',
      gross: 'Gross', net: 'Net', nonaligned_window: 'Window does not cover complete hours',
      tariff_authority_unavailable: 'Tariff settings unavailable', tariff_unconfirmed: 'Tariff settings unconfirmed',
      invalid_profile: 'Invalid tariff', mixed_rate_bucket: 'Rate changes within this interval',
      priced_energy: 'Priced energy', crosses_local_midnight: 'Whole hour crosses local midnight; retained in All hours without splitting the reading',
      complete_comparable_measurements: 'Complete comparable measurements', ambiguous_local_cutoff: 'Ambiguous local cutoff time',
      nonexistent_local_cutoff: 'Local cutoff time does not exist', historical_flat_rate_unavailable: 'Confirmed historical flat rate unavailable',
      previous_zero: 'Previous value is zero; percentage unavailable', previous_nonpositive: 'Previous value is negative; percentage unavailable',
      nonfinite_delta: 'Change exceeds numeric range', unit_mismatch: 'Incompatible units',
      incomplete_coverage: 'Incomplete coverage', partial_cost: 'Incomplete cost history', partial_energy: 'Incomplete energy history', missing_rate: 'Missing rate', currency_mismatch: 'Incompatible currency' })[text] || (text === 'day_suffix' ? 'd' : text);
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

  // BEGIN HA TOOLS EXPORT V3 source-sha256=bae4197cb254a7e24affbf90f029833127c5ba09b5b96f876a6fd8112f816a3d
/**
 * W6 export dialog. Pure ES module; vendor this factory INSIDE each consumer's
 * own IIFE (remove only the `export` keyword). Never attach it to window.
 * Construction is inert. open() appends only its own container to root.
 *
 * Required dependency injection:
 * root: Element/ShadowRoot; getLanguage(): 'pl'|'en'; createUiV3: existing W4 factory.
 * getContext(): {role,userId,connectionId,datasetId,revision,connected,canExport,
 *                sourceConfirmed}. Identities/revision are nonempty scalar values;
 * bump revision monotonically for source/filter/selection/identity changes,
 * including a restored source; never reuse an old revision. Never return tokens or data.
 * policy: {id,allowlistedFields:string[],neverInclude:[tokens,users,addresses,raw_config]}.
 * formats: explicit subset of ['json','csv','txt']; defaults must be explicit valid choices.
 * buildPayload({context,draft,policy,signal}): read-only, Promise or sync result:
 * {serialized:string,confirmed:true,sourceConfirmed:true,status:'success'|'partial',
 *  included:string[],excluded:string[],sourceLimit:string}.
 * Included/Excluded/sourceLimit describe the REVIEWED CONSUMER policy and actual
 * source limitations in the current language. The consumer MUST explicitly select
 * allowed fields, exclude tokens/users/addresses/raw configuration under EVERY
 * private opt-in, and sanitize CSV formula cells where applicable. A generic
 * recursive export/redactor of arbitrary raw state/config is NOT a valid consumer.
 * This factory cannot inspect or truthfully sanitize an unknown arbitrary schema.
 * For partial reports the consumer also encodes the partial status, inclusion
 * scope and source limitations IN its allowlisted file schema, not only UI text.
 * performDownload({serialized,blob,filename,format,context,signal}): explicit Save
 * only. Return {outcome:'initiated'|'saved'|'unknown'}; 'saved' requires actual
 * adapter confirmation, never infer disk persistence from an anchor click.
 * Optional clock(): monotonic milliseconds; setTimer(fn,ms), clearTimer(handle).
 *
 * Returned API: open({opener}), cancel(), contextChanged(), destroy(). Every open
 * resets private consent. contextChanged() discards bytes/consent immediately;
 * owner also calls cancel/destroy on disconnect. Save ALWAYS rechecks context.
 * One preview on open, explicit Refresh thereafter; bounded 10s, no automatic
 * retries/downloads/persistence. AbortSignal is advisory; late results are ignored.
 */
function createExportDialog(options) {
  const { root, getContext, getLanguage, createUiV3, buildPayload, performDownload,
    clock = () => globalThis.performance.now(), setTimer = (fn, ms) => globalThis.setTimeout(fn, ms),
    clearTimer = id => globalThis.clearTimeout(id), defaultFormat, defaultFilename } = options || {};
  const allowedFormats = ['json', 'csv', 'txt', 'yaml'];
  const excludedCategories = ['tokens', 'users', 'addresses', 'raw_config'];
  const strings = value => Array.isArray(value) && value.length > 0 && value.every(v => typeof v === 'string' && v.trim());
  if (!root?.append || !root.ownerDocument || [getContext, getLanguage, createUiV3, buildPayload, performDownload, clock, setTimer, clearTimer].some(fn => typeof fn !== 'function')) {
    throw new TypeError('root and injected getContext/getLanguage/createUiV3/buildPayload/performDownload/clock/timers are required');
  }
  const suppliedPolicy = options.policy;
  if (!suppliedPolicy || typeof suppliedPolicy.id !== 'string' || !suppliedPolicy.id.trim() || !strings(suppliedPolicy.allowlistedFields) || !strings(suppliedPolicy.neverInclude) || excludedCategories.some(key => !suppliedPolicy.neverInclude.includes(key))) {
    throw new TypeError('Explicit reviewed consumer policy with allowlistedFields and neverInclude is required');
  }
  const policy = Object.freeze({ id: suppliedPolicy.id, allowlistedFields: Object.freeze([...suppliedPolicy.allowlistedFields]), neverInclude: Object.freeze([...suppliedPolicy.neverInclude]) });
  if (!strings(options.formats) || options.formats.some(f => !allowedFormats.includes(f)) || new Set(options.formats).size !== options.formats.length || !options.formats.includes(defaultFormat) || typeof defaultFilename !== 'string') {
    throw new TypeError('Explicit formats/defaultFormat/defaultFilename are required');
  }
  const formats = Object.freeze([...options.formats]);
  const doc = root.ownerDocument;
  const mime = { json: 'application/json;charset=utf-8', csv: 'text/csv;charset=utf-8', txt: 'text/plain;charset=utf-8', yaml: 'application/yaml;charset=utf-8' };
  const copy = {
    en: { title: 'Export', filename: 'Filename', format: 'Format', private: 'Include reviewed private fields (this export only)', included: 'Included in the file', excluded: 'Excluded from the file', source: 'Source and limits', preview: 'Exact file content', save: 'Save', refresh: 'Refresh preview', cancel: 'Cancel', busy: 'Building preview… Save waits for confirmed bytes.', changed: 'Choices changed. Refresh preview before Save.', context: 'Source or access changed. Review the source and refresh preview.', unavailable: 'Source unavailable or unconfirmed. Reconnect or confirm the source, then refresh.', invalidFormat: 'Choose an allowed format: JSON, CSV, TXT or YAML as offered.', invalidName: 'Use a basename of 1–128 characters: no paths, control characters, reserved names or leading/trailing spaces.', extension: 'Filename must end with the selected extension. Edit the filename, then refresh.', timeout: 'Preview exceeded 10 seconds. Check the source and explicitly refresh.', buildError: 'Could not build a confirmed preview. Check the source and refresh.', unconfirmed: 'Bytes or source metadata are unconfirmed. Confirm the source and refresh.', noData: 'No confirmed file content. Select available data and refresh.', saving: 'Handing off the confirmed preview… Wait for the adapter result.', initiated: 'Download initiated. Saving to the filesystem is not confirmed. Refresh only for a new export intent.', saved: 'Save confirmed by the download adapter.', unknown: 'Download result unconfirmed. Check the previous attempt before explicitly refreshing for a new export intent.' },
    pl: { title: 'Eksport', filename: 'Nazwa pliku', format: 'Format', private: 'Dołącz sprawdzone pola prywatne (tylko ten eksport)', included: 'W pliku jest', excluded: 'W pliku nie ma', source: 'Źródło i ograniczenia', preview: 'Dokładna zawartość pliku', save: 'Zapisz', refresh: 'Odśwież podgląd', cancel: 'Anuluj', busy: 'Przygotowywanie podglądu… Zapis wymaga potwierdzonej zawartości.', changed: 'Wybór zmieniony. Odśwież podgląd przed zapisem.', context: 'Źródło lub uprawnienia zmienione. Sprawdź źródło i odśwież podgląd.', unavailable: 'Źródło niedostępne lub niepotwierdzone. Połącz lub potwierdź źródło i odśwież.', invalidFormat: 'Wybierz dostępny format: JSON, CSV, TXT lub YAML z listy.', invalidName: 'Użyj nazwy pliku o długości 1–128 znaków: bez ścieżek, znaków sterujących, nazw zastrzeżonych i skrajnych spacji.', extension: 'Nazwa pliku musi mieć rozszerzenie wybranego formatu. Popraw nazwę i odśwież.', timeout: 'Podgląd przekroczył 10 sekund. Sprawdź źródło i jawnie odśwież.', buildError: 'Nie udało się przygotować potwierdzonego podglądu. Sprawdź źródło i odśwież.', unconfirmed: 'Zawartość lub opis źródła niepotwierdzony. Potwierdź źródło i odśwież.', noData: 'Brak potwierdzonej zawartości pliku. Wybierz dostępne dane i odśwież.', saving: 'Przekazywanie potwierdzonego podglądu… Poczekaj na wynik zapisu.', initiated: 'Pobieranie rozpoczęte. Zapis na dysku nie jest potwierdzony. Odśwież tylko dla nowej próby eksportu.', saved: 'Adapter pobierania potwierdził zapis.', unknown: 'Wynik pobierania niepotwierdzony. Sprawdź poprzednią próbę przed jawnym odświeżeniem dla nowego eksportu.' },
  };
  const css = `
[data-ha-tools-export] { min-width:0;max-width:100%;color:var(--primary-text-color,#1e293b);font:inherit; }
[data-ha-tools-export] * { box-sizing:border-box; }
[data-ha-tools-export] dialog { width:min(520px,calc(100vw - 32px));max-width:none;max-height:calc(100vh - 32px);max-height:calc(100dvh - 32px);min-width:0;margin:auto;padding:0;border:1px solid var(--divider-color,#e2e8f0);border-radius:18px;background:var(--card-background-color,#fff);color:inherit;font:inherit;box-shadow:0 24px 64px #0f172a33;overflow:hidden; }
[data-ha-tools-export] dialog[open] { display:flex;flex-direction:column; }
[data-ha-tools-export] dialog::backdrop { background:#0f172a66; }
[data-ha-tools-export] .ht-export-body { min-height:0;overflow:auto;overscroll-behavior:contain;padding:24px; }
[data-ha-tools-export] h2,[data-ha-tools-export] h3,[data-ha-tools-export] p,[data-ha-tools-export] li { overflow-wrap:anywhere;white-space:normal; }
[data-ha-tools-export] h2 { margin:0 0 16px;font-size:1.25em;line-height:1.4; }
[data-ha-tools-export] h3 { margin:16px 0 6px;font-size:1em;line-height:1.5; }
[data-ha-tools-export] p { line-height:1.5; }
[data-ha-tools-export] .ht-export-fields { display:grid;grid-template-columns:minmax(0,1fr);gap:12px; }
[data-ha-tools-export] label { display:flex;flex-direction:column;gap:6px;min-width:0;overflow-wrap:anywhere; }
[data-ha-tools-export] .ht-export-format { margin-top:16px; }
[data-ha-tools-export] .ht-export-private { flex-direction:row;align-items:center;min-height:44px;margin-top:12px; }
[data-ha-tools-export] input:not([type=checkbox]),[data-ha-tools-export] select,[data-ha-tools-export] button { font:inherit;min-width:44px;min-height:44px;max-width:100%; }
[data-ha-tools-export] input:not([type=checkbox]),[data-ha-tools-export] select { width:100%;color:inherit;background:var(--ht-export-field-bg,#f8fafc);border:1px solid var(--divider-color,#cbd5e1);border-radius:8px;padding:8px 12px; }
[data-ha-tools-export] input[type=checkbox] { width:24px;height:24px;flex:none;margin:10px; }
[data-ha-tools-export] [data-export-scope] { padding:12px 14px;border-radius:10px;margin-top:14px; }
[data-ha-tools-export] [data-export-scope] h3 { margin:0 0 6px; }
[data-ha-tools-export] [data-export-scope=included] { background:var(--ht-export-included-bg,#ecfdf3);color:var(--ht-export-included-text,#166534); }
[data-ha-tools-export] [data-export-scope=excluded] { background:var(--ht-export-excluded-bg,#fff1f2);color:var(--ht-export-excluded-text,#9f1239); }
[data-ha-tools-export] ul { padding:0;margin:0;list-style:none; }
[data-ha-tools-export] li { display:flex;gap:6px;line-height:1.5; }
[data-ha-tools-export] li + li { margin-top:4px; }
[data-ha-tools-export] [data-export-scope=included] li::before { content:'✓';flex:none; }
[data-ha-tools-export] [data-export-scope=excluded] li::before { content:'×';flex:none; }
[data-ha-tools-export] button { padding:8px 12px;white-space:normal;overflow-wrap:anywhere;cursor:pointer;border:1px solid transparent;border-radius:8px;color:var(--ht-export-accent,#0369a1);background:transparent; }
[data-ha-tools-export] [data-export=save] { color:var(--ht-export-save-text,#fff);background:var(--ht-export-accent,#0369a1); }
[data-ha-tools-export] :focus-visible { outline:3px solid var(--ht-export-accent,#0369a1);outline-offset:2px; }
[data-ha-tools-export] button:disabled { cursor:default;opacity:.6; }
[data-ha-tools-export] .ht-export-actions { display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px;flex:none;padding:12px 24px;border-top:1px solid var(--divider-color,#e2e8f0);background:var(--card-background-color,#fff); }
[data-ha-tools-export] pre { max-width:100%;min-width:0;max-height:260px;overflow:auto;white-space:pre;margin:0;padding:12px;border:1px solid var(--divider-color,#cbd5e1);border-radius:8px;background:var(--ht-export-field-bg,#f8fafc); }
:host(.bento-dark) { --ht-export-field-bg:#0f172a;--ht-export-included-bg:#103827;--ht-export-included-text:#bbf7d0;--ht-export-excluded-bg:#43212a;--ht-export-excluded-text:#fda4af;--ht-export-accent:#7dd3fc;--ht-export-save-text:#0f172a; }
@media (max-width:399px) { [data-ha-tools-export] .ht-export-body { padding:16px; } [data-ha-tools-export] .ht-export-actions { padding:12px 16px;gap:6px; } }
@media (max-width:319px) { [data-ha-tools-export] dialog { width:calc(100vw - 16px); } [data-ha-tools-export] .ht-export-actions button { flex:1 1 auto; } }
`;  let container, nodes, L, ui, opener, alive = false, destroyed = false, serial = 0;
  let pending = null, handoff = null, ready = null, observed = null;
  const listeners = [];
  const on = (target, event, handler, capture = false) => {
    target.addEventListener(event, handler, capture);
    listeners.push(() => target.removeEventListener(event, handler, capture));
  };
  const contextKeys = ['role', 'userId', 'connectionId', 'datasetId', 'revision'];
  function readContext() {
    try {
      const value = getContext();
      if (!value || contextKeys.some(k => !['string', 'number'].includes(typeof value[k]) || String(value[k]).trim() === '' || (typeof value[k] === 'number' && !Number.isFinite(value[k])))) return null;
      return Object.freeze(Object.fromEntries([...contextKeys, 'connected', 'canExport', 'sourceConfirmed'].map(k => [k, value[k]])));
    } catch { return null; }
  }
  const same = (a, b) => !!a && !!b && [...contextKeys, 'connected', 'canExport', 'sourceConfirmed'].every(k => a[k] === b[k]);
  const available = c => !!c && c.connected === true && c.canExport === true && c.sourceConfirmed === true;
  const draft = () => Object.freeze({ filename: nodes.filename.value, format: nodes.format.value, includePrivate: nodes.private.checked });
  const sameDraft = (a, b) => a.filename === b.filename && a.format === b.format && a.includePrivate === b.includePrivate;
  function validation(value) {
    if (!formats.includes(value.format)) return 'invalidFormat';
    const name = value.filename;
    if (!name || [...name].length > 128 || name !== name.trim() || /[\p{Cc}\p{Cf}/\\<>:"|?*]/u.test(name) || /[. ]$/.test(name) || /^(con|prn|aux|nul|com[0-9¹²³]|lpt[0-9¹²³])(?:\.|$)/i.test(name)) return 'invalidName';
    if (!name.endsWith(`.${value.format}`) || name.length <= value.format.length + 1) return 'extension';
    return null;
  }
  function status(code, message) {
    if (!alive) return;
    const result = ui.status(code); // exact existing W4 labels/icons/codes
    nodes.status.className = `ht-result-state ht-result-state--${result.code}`;
    nodes.status.dataset.resultState = result.code;
    nodes.status.replaceChildren();
    const icon = doc.createElement('span'); icon.setAttribute('aria-hidden', 'true'); icon.textContent = result.icon;
    nodes.status.append(icon, doc.createTextNode(` ${result.label}`));
    nodes.message.textContent = ` ${L[message]}`;
    nodes.save.disabled = !ready || !!pending || !!handoff;
    nodes.refresh.disabled = !!pending || !!handoff;
  }
  function stop(job) {
    if (!job) return;
    if (job.timer !== null) clearTimer(job.timer);
    job.timer = null; job.controller.abort();
  }
  function discard(resetPrivate = false) {
    serial++; stop(pending); pending = null; ready = null;
    if (alive) {
      nodes.preview.textContent = ''; nodes.included.replaceChildren(); nodes.excluded.replaceChildren(); nodes['source-limit'].textContent = '';
      if (resetPrivate) nodes.private.checked = false;
    }
  }
  function contextChanged() {
    if (!alive) return;
    observed = readContext(); discard(true);
    // Once a handoff began we cannot retract a browser download. Ignore its late
    // callback and retain the prohibition on a second write until it settles.
    if (handoff) handoff.controller.abort();
    status(root.isConnected && available(observed) ? 'unconfirmed' : 'no_data', 'context');
  }
  function validContext(original) {
    const current = readContext();
    if (!root.isConnected || !same(original, current) || !available(current)) { contextChanged(); return false; }
    return true;
  }
  function changeDraft() {
    if (!alive) return;
    if (!same(observed, readContext())) { contextChanged(); return; }
    discard();
    const error = validation(draft()); status(error ? 'error' : 'not_checked', error || 'changed');
  }
  function fillList(node, items) {
    node.replaceChildren(...items.map(text => { const li = doc.createElement('li'); li.textContent = text; return li; }));
  }
  async function refresh() {
    if (!alive || pending || handoff) return;
    const current = readContext();
    if (!same(observed, current)) { observed = current; discard(true); }
    const value = draft(), error = validation(value);
    discard();
    if (error) { status('error', error); return; }
    if (!root.isConnected || !available(current)) { status(!root.isConnected || current?.connected === false ? 'no_data' : 'unconfirmed', 'unavailable'); return; }
    observed = current;
    const job = { id: serial, context: current, draft: value, started: clock(), controller: new globalThis.AbortController(), timer: null };
    pending = job; status('not_checked', 'busy');
    const timeout = () => {
      if (!alive || pending !== job) return;
      discard(); status('unconfirmed', 'timeout');
    };
    job.timer = setTimer(timeout, 10000);
    try {
      const payload = await buildPayload(Object.freeze({ context: current, draft: value, policy, signal: job.controller.signal }));
      if (!alive || pending !== job || job.id !== serial) return;
      if (clock() - job.started >= 10000) { timeout(); return; }
      if (!validContext(current)) return;
      clearTimer(job.timer); job.timer = null;
      if (!sameDraft(value, draft())) { changeDraft(); return; }
      const { serialized, confirmed, sourceConfirmed, status: resultState, included, excluded, sourceLimit } = payload || {};
      if (resultState === 'no_data' || serialized === '') { pending = null; status('no_data', 'noData'); return; }
      if (confirmed !== true || sourceConfirmed !== true || !['success', 'partial'].includes(resultState) || typeof serialized !== 'string' || !strings(included) || !strings(excluded) || typeof sourceLimit !== 'string' || !sourceLimit.trim()) {
        pending = null; status('unconfirmed', 'unconfirmed'); return;
      }
      // Freeze the only serialized bytes and build the only Blob NOW; Save never
      // re-runs serialization or builds a second payload from potentially newer data.
      ready = Object.freeze({ serialized, blob: new globalThis.Blob([serialized], { type: mime[value.format] }), context: current, draft: value });
      nodes.preview.textContent = ready.serialized;
      fillList(nodes.included, [...included]); fillList(nodes.excluded, [...excluded]);
      nodes['source-limit'].textContent = sourceLimit;
      pending = null; status(resultState, 'changed'); nodes.message.textContent = '';
    } catch {
      if (!alive || pending !== job || job.id !== serial) return;
      if (clock() - job.started >= 10000) { timeout(); return; }
      if (!validContext(current)) return;
      discard(); status('error', 'buildError');
    }
  }
  async function save() {
    if (!alive || !ready || pending || handoff) return;
    if (!validContext(ready.context)) return;
    const value = draft(), error = validation(value);
    if (error || !sameDraft(value, ready.draft) || nodes.preview.textContent !== ready.serialized) {
      discard(); status(error ? 'error' : 'unconfirmed', error || 'changed'); return;
    }
    const snapshot = ready; ready = null; // consume intent BEFORE invoking adapter
    const job = { id: serial, context: snapshot.context, controller: new globalThis.AbortController() };
    handoff = job; status('unconfirmed', 'saving');
    // choices cannot initiate another preview while the adapter result is unknown
    for (const key of ['filename', 'format', 'private']) nodes[key].disabled = true;
    try {
      const result = await performDownload(Object.freeze({ serialized: snapshot.serialized, blob: snapshot.blob, filename: snapshot.draft.filename, format: snapshot.draft.format, context: snapshot.context, signal: job.controller.signal }));
      if (!alive || handoff !== job || job.id !== serial || !validContext(job.context)) return;
      status(result?.outcome === 'saved' ? 'success' : 'unconfirmed', result?.outcome === 'saved' ? 'saved' : result?.outcome === 'initiated' ? 'initiated' : 'unknown');
    } catch {
      if (alive && handoff === job && job.id === serial && validContext(job.context)) status('unconfirmed', 'unknown');
    } finally {
      if (handoff === job) {
        handoff = null;
        if (alive) {
          for (const key of ['filename', 'format', 'private']) nodes[key].disabled = false;
          nodes.refresh.disabled = false; nodes.save.disabled = true;
          if (job.id !== serial) status('unconfirmed', 'unknown');
        }
      }
    }
  }
  function focusable() {
    return Array.from(nodes.dialog.querySelectorAll('input,select,button,[tabindex="0"]')).filter(el => !el.disabled);
  }
  function keydown(event) {
    if (!alive) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); cancel(); }
    if (event.key === 'Tab') {
      const items = focusable(), first = items[0], last = items.at(-1);
      const active = nodes.dialog.getRootNode().activeElement || root.activeElement || doc.activeElement;
      if (event.shiftKey && (active === first || !nodes.dialog.contains(active))) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (active === last || !nodes.dialog.contains(active))) { event.preventDefault(); first?.focus(); }
    }
  }
  function cancel() {
    if (!alive) return;
    discard(true); if (handoff) handoff.controller.abort();
    alive = false; listeners.splice(0).forEach(off => off());
    if (nodes.dialog.open) nodes.dialog.close();
    container.remove();
    container = null; nodes = null; observed = null;
    // A pending handoff remains latched until settled: reopening never repeats it.
    if (opener?.isConnected && typeof opener.focus === 'function') opener.focus();
    opener = null;
  }
  function open({ opener: target } = {}) {
    if (destroyed) throw new Error('Export dialog destroyed');
    if (alive) return;
    const language = String(getLanguage());
    L = copy[language.startsWith('pl') ? 'pl' : 'en'];
    ui = createUiV3({ language });
    opener = target || root.activeElement || doc.activeElement;
    container = doc.createElement('div'); container.setAttribute('data-ha-tools-export', '');
    // The own shadow boundary contains CSS and local IDs; adjacent W4 status
    // elements retain their existing styling. Consumers can query this open root.
    const shadow = container.attachShadow({ mode: 'open' });
    if (root.host?.classList.contains('bento-dark')) container.classList.add('bento-dark');
    const style = doc.createElement('style'); style.textContent = ':host{display:block;min-width:0;max-width:100%;}' + css + '\n' + ui.css;
    shadow.append(style);
    const shell = doc.createElement('div'); shell.setAttribute('data-ha-tools-export', ''); shadow.append(shell);
    nodes = {};
    const make = (tag, key, parent, text) => { const node = doc.createElement(tag); if (key) { node.dataset.export = key; nodes[key] = node; } if (text) node.textContent = text; parent.append(node); return node; };
    const dialog = make('dialog', 'dialog', shell); dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true');
    const body = make('div', null, dialog); body.className = 'ht-export-body';
    const title = make('h2', 'title', body, L.title);
    // Locally unique IDs, no random or global counters/persistent state.
    const prefix = `ht-export-${String(clock()).replace(/\W/g, '')}`;
    title.id = prefix + '-title'; dialog.setAttribute('aria-labelledby', title.id);
    const fields = make('div', null, body); fields.className = 'ht-export-fields';
    const filenameLabel = make('label', null, fields); make('span', null, filenameLabel, L.filename);
    const filename = make('input', 'filename', filenameLabel); filename.type = 'text'; filename.value = defaultFilename; filename.autocomplete = 'off';
    for (const key of ['included', 'excluded']) {
      const scope = make('section', null, body); scope.dataset.exportScope = key;
      make('h3', null, scope, L[key]); make('ul', key, scope);
    }
    const formatLabel = make('label', null, body); formatLabel.className = 'ht-export-format'; make('span', null, formatLabel, L.format);
    const format = make('select', 'format', formatLabel);
    formats.forEach(value => { const option = make('option', null, format, value.toUpperCase()); option.value = value; }); format.value = defaultFormat;
    const privateLabel = make('label', null, body); privateLabel.className = 'ht-export-private';
    const privateInput = make('input', 'private', privateLabel); privateInput.type = 'checkbox'; privateInput.checked = false; make('span', null, privateLabel, L.private);
    const statusLine = make('p', null, body); statusLine.setAttribute('role', 'status'); statusLine.setAttribute('aria-live', 'polite');
    make('span', 'status', statusLine); make('span', 'message', statusLine);
    make('h3', null, body, L.source); make('p', 'source-limit', body);
    const previewHeading = make('h3', null, body, L.preview); previewHeading.id = prefix + '-preview';
    const preview = make('pre', 'preview', body); preview.tabIndex = 0; preview.setAttribute('aria-labelledby', previewHeading.id);
    const actions = make('div', null, dialog); actions.className = 'ht-export-actions';
    for (const key of ['refresh', 'save', 'cancel']) { const button = make('button', key, actions, L[key]); button.type = 'button'; }
    root.append(container); alive = true; observed = readContext();
    for (const [key, event] of [['filename', 'input'], ['format', 'change'], ['private', 'change']]) on(nodes[key], event, changeDraft);
    on(nodes.refresh, 'click', refresh); on(nodes.save, 'click', save); on(nodes.cancel, 'click', cancel);
    on(dialog, 'keydown', keydown);
    on(dialog, 'cancel', event => { event.preventDefault(); cancel(); });
    on(dialog, 'close', () => { if (alive && nodes?.dialog === dialog) cancel(); });
    try {
      if (typeof dialog.showModal !== 'function') throw new Error('Native export dialog is unavailable');
      dialog.showModal();
    } catch (error) {
      cancel();
      throw error;
    }
    // The consumer supplies exact opener even when its shadow DOM hides activeElement.
    filename.focus();
    if (handoff) {
      for (const key of ['filename', 'format', 'private']) nodes[key].disabled = true;
      preview.focus();
      status('unconfirmed', 'saving');
    } else { status('not_checked', 'changed'); void refresh(); }
  }
  function destroy() { cancel(); destroyed = true; }
  return Object.freeze({ open, cancel, contextChanged, destroy });
}
// END HA TOOLS EXPORT V3

  // BEGIN SMART REPORTS EXPORT V3 source-sha256=570a233a9854b836d86500788946f6c3c4a2dbe6601cd5d2393e9e9f6fcfb1c1
// Smart Reports reviewed export boundary. Pure schema-directed projection;
// never traverse unknown input keys, arbitrary config, profiles or raw errors.
function projectSmartReportV3(report, includePrivate = false) {
  const ids = new Map(), labels = new Map(), zones = new Map();
  const alias = (map, value, prefix) => {
    if (typeof value !== 'string' || !value) return null;
    if (!map.has(value)) map.set(value, `${prefix}-${map.size + 1}`);
    return map.get(value);
  };
  const identity = value => typeof value !== 'string' ? null : includePrivate ? value : alias(ids, value, 'source');
  const label = (value, owner) => typeof value !== 'string' ? null : includePrivate ? value
    : owner?.statistic_id ? identity(owner.statistic_id) : value === 'Grid import' ? value : alias(labels, value, 'label');
  const number = value => typeof value === 'number' && Number.isFinite(value) ? value : null;
  const boolean = value => typeof value === 'boolean' ? value : null;
  const choice = values => value => value == null ? null : values.includes(value) ? value : 'unknown';
  const status = choice(['ready','partial','no_data','idle','loading','not_configured','unsupported','permission_denied','error','invalid','noncomparable','unavailable','unknown']);
  const reason = choice(['request_failed','loading','not_configured','no_data','missing_statistics','missing_rate','missing_currency','energy_data_unavailable',
    'currency_mismatch','partial_cost','unsupported_source','partial_energy','incompatible_energy_metadata','incompatible_currency_metadata',
    'invalid_bucket','outside_requested_window','missing_change','incomplete_coverage','historical_flat_rate_unavailable',
    'tariff_authority_unavailable','tariff_unconfirmed','invalid_profile','invalid_root_sources','nonaligned_window','nonaligned_boundary',
    'invalid_measurement','nonfinite_measurement','missing_measurement','invalid_timestamp','outside_validity','ambiguous_rules','mixed_rate_bucket',
    'nonfinite_cost','invalid_coverage','overlapping_measurement','nonfinite_total','ambiguous_local_cutoff','nonexistent_local_cutoff',
    'unit_mismatch','nonfinite_delta','previous_zero','previous_nonpositive','crosses_local_midnight','nested_parent_missing','invalid_relationship',
    'unsupported','unavailable','unknown','authority_changed','read_failed','timeout','readback_failed']);
  const provenance = choice(['explicit','energy_dashboard','legacy_energy_entity','card_config','shared_backend','complete_comparable_measurements','unavailable','unknown','recorder_available_samples']);
  const method = choice(['cost_statistics','flat_rate_estimate','configured_tariff','unavailable']);
  const unit = value => typeof value === 'string' && (/^[A-Z]{3}$/.test(value) || ['Wh','kWh','MWh','m³','m3','ft³','gal','L','l','W','kW','h','%'].includes(value)) ? value : value == null ? null : 'unknown';
  const stamp = value => typeof value === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(value) && Number.isFinite(Date.parse(value)) ? value : null;
  const date = value => typeof value === 'string' && /^\d{4}-\d\d-\d\d$/.test(value) ? value : null;
  const timezone = value => { if (typeof value !== 'string') return null; try { new Intl.DateTimeFormat('en', {timeZone:value}); return value; } catch { return null; } };
  const zone = value => alias(zones,value,'zone'); // profile identifiers are never an opt-in field
  const fields = (names, type) => Object.fromEntries(names.split(' ').map(name => [name,type]));
  const local = fields('year month day hour minute second',number);
  const period = {key:choice(['1d','7d','30d']),start:stamp,end:stamp,time_zone:timezone,actual_hours:number,local_start:local,local_cutoff:local};
  const interval = {from:stamp,to:stamp,reason};
  const coverage = { ...fields('observed_hours expected_hours observed_source_hours expected_source_hours',number),first_sample:stamp,last_sample:stamp,complete:boolean,measured_subset:boolean,unmeasured_intervals:[interval] };
  const source = {statistic_id:identity,label,role:choice(['total','cost','device','priced_energy']),value:number,recorded_value:number,coverage,unit,status,provenance,included_in_stat:identity,reason};
  const total = {label,status,value:number,unit,source_statistic_ids:[identity]};
  const subtotal = {value:number,unit,status,...fields('sources_with_data complete_sources configured_sources',number),source_statistic_ids:[identity]};
  const day = {start:stamp,end:stamp,value:number,recorded_value:number,unit,status,observed_source_hours:number,expected_source_hours:number};
  const measuredBySource = (value, owner) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    // Dynamic map keys are restricted to this record's explicit source IDs.
    return Object.fromEntries((Array.isArray(owner?.source_statistic_ids) ? owner.source_statistic_ids : [])
      .filter(id => typeof id === 'string' && Object.hasOwn(value,id)).map(id => [identity(id),number(value[id])]));
  };
  const record = { ...source, side:choice(['current','previous']),day_index:number,day_allocation_reason:reason,local_date:date,from:stamp,to:stamp,
    source_statistic_ids:[identity],source_kwh:measuredBySource,available:boolean,measurement_available:boolean,zone,zones:[zone],
    ...fields('kwh energyRate variableRate energyCost variableCost usageCost',number),currency:unit,price_basis:choice(['gross','net']),revision:number };
  const tariffDay = {from:stamp,to:stamp,...fields('kwh energyCost recorded_kwh recorded_energy_cost expected_hours measured_hours observed_hours',number),
    measurement_available:boolean,available:boolean,status,records:[record]};
  const tariff = {records:[record],daily:[tariffDay],coverage,revision:number,provenance,currency:unit,price_basis:choice(['gross','net']),
    tariff_timezone:timezone,tariff_clock:{mode:choice(['civil','fixed']),offsetMinutes:number},
    ...fields('fixed_monthly variable_cost usage_cost measured_energy_cost measured_kwh',number),current_profile_validity:{available:boolean,reason,checked_at:stamp}};
  const cost = { ...tariff,value:number,currency:unit,method,rate:number,source_statistic_ids:[identity],reason };
  const warning = value => {
    const prefix = 'included_in_stat is only valid for device sources: ';
    if (typeof value === 'string' && value.startsWith(prefix)) return prefix + identity(value.slice(prefix.length));
    return choice(['nested_parent_missing','invalid_relationship'])(value);
  };
  const snapshotDay = {index:number,start:stamp,end:stamp,energy:day,cost:day};
  const snapshot = {period,source_mode:choice(['explicit','energy_dashboard']),status,total,cost,recorded_total:subtotal,recorded_cost:subtotal,
    total_sources:[source],cost_sources:[source],devices:[source],warnings:[warning],daily:[snapshotDay],records:[record],
    coverage:fields('missing_energy_days missing_cost_days observed_energy_source_hours expected_energy_source_hours observed_cost_source_hours expected_cost_source_hours',number)};
  const metric = {...fields('current previous delta percent',number),unit,comparable:boolean,reason,provenance};
  const metadata = {has_sum:boolean,unit_class:choice(['energy','currency']),name:label};
  const scope = {statistic_id:identity,role:source.role,unit,provenance,included_in_stat:identity,energy_statistic_ids:[identity],
    metadata:(value,owner)=>value && typeof value === 'object' ? {has_sum:boolean(value.has_sum),unit_class:metadata.unit_class(value.unit_class),name:label(value.name,owner)} : null};
  const comparison = {status,reason,shift_days:number,requested_local_start:local,requested_local_cutoff:local,scope:[scope],current:snapshot,previous:snapshot,
    metrics:{energy:metric,cost:metric},daily:[{index:number,current:snapshotDay,previous:snapshotDay}],records:[record]};
  const schema = {schema_version:number,generated_at:stamp,period,source_mode:snapshot.source_mode,comparison,
    energy:{status,total,cost,tariff,recorded_total:subtotal,recorded_cost:subtotal,daily:[day],total_sources:[source],cost_sources:[source],devices:[source],warnings:[warning]}};
  function project(value, shape, owner) {
    if (value == null) return null;
    if (typeof shape === 'function') return shape(value,owner);
    if (Array.isArray(shape)) return Array.isArray(value) ? value.map(item => project(item,shape[0],item)) : [];
    if (typeof value !== 'object' || Array.isArray(value)) return null;
    const output = {};
    // Only the reviewed schema can introduce keys. No rest/spread of raw objects.
    for (const [key,type] of Object.entries(shape)) if (Object.hasOwn(value,key) && value[key] !== undefined) output[key]=project(value[key],type,value);
    return output;
  }
  return project(report,schema);
}
// END SMART REPORTS EXPORT V3

  class HASmartReports extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._hass = null;
      this._config = {
        energy_cost_mode: 'auto',
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
      this._deviceQuery = '';
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
      this._bindReviewedExportEvents();
      this._observeReviewedExportSource();
      this._tariffGuard?.resume();
      this._tariffGuard?.observe();
      this._renderScaffold();
      this._syncTheme();
      this._syncTabs();
      if (this._hass) this._scheduleRefresh(true);
    }

    disconnectedCallback() {
      this._connected = false;
      this._navigationObserver?.disconnect(); this._navigationObserver = null;
      this._pendingReportFocus = null;
      this._exportDialog?.destroy(); this._exportDialog = null;
      this._unbindReviewedExportEvents();
      this._observeReviewedExportSource();
      this._tariffGuard?.suspend();
      this._tariffGuard?.observe();
      if (this._refreshTimer !== null) clearTimeout(this._refreshTimer);
      this._refreshTimer = null;
      this._invalidateEnergyRequest();
    }

    set hass(hass) {
      const language = languageOf(hass);
      const languageChanged = language !== this._language;
      this._language = language;
      if (this._hass && (this._hass.user?.id !== hass?.user?.id || this._hass.connection !== hass?.connection)) this._deviceQuery = '';
      this._hass = hass;
      if (this._connected) this._bindReviewedExportEvents();
      this._observeReviewedExportSource();
      if (languageChanged) this._exportDialog?.cancel();
      if (this._config.energy_cost_mode === 'configured_tariff') this._tariffController().reset();
      else this._tariffGuard?.observe();
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
      this._deviceQuery = '';
      const next = config && typeof config === 'object' ? config : {};
      const hasRate = Object.prototype.hasOwnProperty.call(next, 'energy_price');
      const currency = typeof next.currency === 'string' && next.currency.trim() ? next.currency.trim() : null;
      this._config = {
        ...next,
        energy_cost_mode: ['cost_statistics','flat_rate_estimate','configured_tariff'].includes(next.energy_cost_mode) ? next.energy_cost_mode : 'auto',
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
        compare_previous_period: next.compare_previous_period === true,
      };
      this._observeReviewedExportSource();
      this._tariffGuard?.observe();
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
          ${createUiV3({ language: languageOf(this._hass) }).css}
          :host{--sr-primary:var(--primary-color,#3b82f6);--sr-card:var(--card-background-color,var(--ha-card-background,#fff));--sr-text:var(--primary-text-color,#172033);--sr-muted:var(--secondary-text-color,#667085);--sr-border:var(--divider-color,#d9e0ea);--sr-good:#15803d;--sr-warn:#b45309;--sr-bad:#b42318;display:block;color:var(--sr-text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}*{box-sizing:border-box}.card{background:var(--sr-card);border:1px solid var(--sr-border);border-radius:16px;overflow:hidden}.header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:18px 20px 12px}h2,h3,p{margin:0}h2{font-size:20px}h3{font-size:15px}.tabs{display:flex;gap:4px;padding:0 16px;border-bottom:1px solid var(--sr-border);overflow-x:auto}button,select{font:inherit}button{cursor:pointer}button:focus-visible,select:focus-visible,a:focus-visible{outline:2px solid var(--sr-primary);outline-offset:2px}.tab{border:0;border-bottom:3px solid transparent;background:transparent;color:var(--sr-muted);padding:10px 12px}.tab.active{color:var(--sr-primary);border-bottom-color:var(--sr-primary);font-weight:650}.toolbar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px;padding:14px 20px 0}.toolbar-actions{display:flex;flex-wrap:wrap;gap:8px}.control,.action{min-height:44px;min-width:44px;max-width:100%;border:1px solid var(--sr-border);border-radius:9px;background:var(--sr-card);color:var(--sr-text);padding:8px 11px}.action.primary{background:var(--sr-primary);border-color:var(--sr-primary);color:#fff}.action:disabled{cursor:not-allowed;opacity:.45}.pane{padding:20px;min-height:220px}.state{display:grid;gap:12px;place-items:start;padding:22px;border:1px solid var(--sr-border);border-radius:12px}.state[role="status"]{border-left:4px solid var(--sr-primary)}.state.partial{border-left-color:var(--sr-warn)}.state.error{border-left-color:var(--sr-bad)}.summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}.metric{border:1px solid var(--sr-border);border-radius:12px;padding:14px}.metric-label,.muted{color:var(--sr-muted);font-size:12px}.metric-value{margin-top:5px;font-size:23px;font-weight:720}.section{margin-top:18px}.list{display:grid;gap:8px;margin-top:10px}.row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;border-bottom:1px solid var(--sr-border);padding:9px 2px}.row.child{padding-left:24px}.row-name{overflow-wrap:anywhere}.status-ready{color:var(--sr-good)}.warning{color:var(--sr-warn)}.fixed-link{color:var(--sr-primary)}.donate-section{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:10px;border-top:1px solid var(--sr-border);padding:13px 18px;color:var(--sr-muted);font-size:12px}.donate-section a{color:var(--sr-primary);text-decoration:none;min-height:44px;display:inline-flex;align-items:center}[hidden]{display:none!important}@media(max-width:520px){.header,.toolbar{align-items:stretch;flex-direction:column}.toolbar-actions{width:100%}.action{flex:1}}
          .report-views{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}.report-views [aria-selected="true"]{border-color:var(--sr-primary);color:var(--sr-primary);font-weight:650}.bar-chart{display:grid;gap:12px}.chart-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:5px 12px}.chart-row.child{margin-left:20px}.bar-track{grid-column:1/-1;height:9px;background:var(--sr-border);border-radius:5px;overflow:hidden}.bar-fill{background:var(--sr-primary);height:100%;border-radius:4px}.chart-row small{grid-column:1/-1}.daily-history{display:grid;gap:12px;min-width:0;margin-top:14px}.daily-history h3,.daily-history p{overflow-wrap:anywhere}.daily-list{display:grid;gap:8px}.daily-day{display:grid;gap:6px;width:100%;text-align:left;line-height:1.4}.daily-day[aria-pressed="true"]{border-color:var(--sr-primary);box-shadow:inset 3px 0 var(--sr-primary)}.daily-label{font-size:12px;color:var(--sr-muted)}.daily-value{font-size:16px;font-variant-numeric:tabular-nums}.daily-coverage{font-size:12px;color:var(--sr-muted)}.daily-track{display:block;height:9px;background:var(--sr-border);border-radius:4px;overflow:hidden}.daily-track .bar-fill{display:block;min-width:0}.daily-day[data-availability="partial"] .bar-fill{background:repeating-linear-gradient(135deg,var(--sr-primary) 0 4px,var(--sr-border) 4px 7px)}.daily-day[data-availability="no_data"] .daily-track{background:repeating-linear-gradient(135deg,transparent 0 4px,var(--sr-border) 4px 7px)}.daily-detail{border:1px solid var(--sr-border);border-left:3px solid var(--sr-primary);border-radius:10px;padding:12px;display:grid;gap:8px;overflow-wrap:anywhere;line-height:1.5}.daily-detail h4{margin:0}.daily-detail p{font-size:12px}.cost-source{font-size:12px;line-height:1.6;margin-top:8px;overflow-wrap:anywhere}.report-context{margin-bottom:14px;line-height:1.6}summary{cursor:pointer;overflow-wrap:anywhere;min-height:44px;display:flex;align-items:center;padding:8px 0}.daily-history:focus-visible,summary:focus-visible{outline:2px solid var(--sr-primary);outline-offset:2px}
          .tariff-evidence{display:grid;gap:12px;min-width:0}.tariff-evidence p,.tariff-evidence h4{overflow-wrap:anywhere}.tariff-day-chart{display:grid;gap:8px;margin-top:12px}.tariff-day-chart h4{margin:0;font-size:14px}.tariff-day{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:5px 10px;min-height:64px;min-width:44px;max-width:100%;padding:10px 12px;border:1px solid var(--sr-border);border-radius:10px;background:var(--sr-card);color:var(--sr-text);text-align:left;font:inherit}.tariff-day[aria-pressed=true]{border-color:var(--sr-primary);outline:1px solid var(--sr-primary)}.tariff-day strong{overflow-wrap:anywhere}.tariff-day small{grid-column:1/-1;color:var(--sr-muted);font-size:11px}.tariff-day-track{grid-column:1/-1;position:relative;height:8px;background:var(--sr-border);border-radius:4px;overflow:hidden}.tariff-day-track.signed{background:linear-gradient(to right,var(--sr-border) calc(50% - 1px),var(--sr-text) 50%,var(--sr-border) calc(50% + 1px))}.tariff-day-fill{position:absolute;top:0;height:100%;background:var(--sr-primary);border-radius:3px}.tariff-day[data-availability=partial] .tariff-day-fill{background:repeating-linear-gradient(135deg,var(--sr-primary) 0 4px,var(--sr-border) 4px 7px)}.tariff-day[data-availability=gap] .tariff-day-track{background:repeating-linear-gradient(135deg,transparent 0 4px,var(--sr-border) 4px 7px)}.tariff-pagination{display:flex;align-items:center;flex-wrap:wrap;gap:8px}.tariff-pagination span{flex:1;min-width:0}.tariff-evidence button{min-height:44px;min-width:44px;white-space:normal;overflow-wrap:anywhere}.tariff-data-row{border:1px solid var(--sr-border);border-radius:10px;padding:12px;margin-top:8px;min-width:0;overflow-wrap:anywhere}.tariff-data-row h4{font-size:13px;margin:0 0 8px}.tariff-data-row dl{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,2fr);gap:6px 12px;margin:0;font-size:12px}.tariff-data-row dt{color:var(--sr-muted)}.tariff-data-row dd{margin:0}.tariff-day:focus-visible{outline:3px solid var(--sr-primary);outline-offset:2px}
          .device-search-form{display:flex;flex-wrap:wrap;gap:8px;align-items:end;margin:14px 0}.device-search-form label{flex:1;min-width:min(100%,180px);display:grid;gap:6px;font-size:13px}.device-search{width:100%;min-width:0;min-height:44px;padding:10px 12px;border:1px solid var(--sr-border);border-radius:9px;background:var(--sr-card);color:var(--sr-text);font:inherit}.device-search-clear{min-height:44px;min-width:44px}.device-search:focus-visible{outline:2px solid var(--sr-primary);outline-offset:2px}.device-search-count,.device-export-note{overflow-wrap:anywhere;line-height:1.5}.chart-row small{overflow-wrap:anywhere}
          button,select,input:not([type="checkbox"]),summary,.fixed-link,.donate-section a{min-height:44px!important;min-width:44px;max-width:100%;box-sizing:border-box}
          button,select{font:inherit;white-space:normal;overflow-wrap:anywhere}summary,.fixed-link,.donate-section a{display:flex;align-items:center}
          button:focus-visible,select:focus-visible,input:focus-visible,summary:focus-visible,a:focus-visible{outline:3px solid var(--sr-primary)!important;outline-offset:2px}
          .tabs{flex-wrap:wrap;overflow:visible}.tab{flex:1 1 auto}.header{flex-wrap:wrap}.header h2{overflow-wrap:anywhere;min-width:0}
          .report-picker{display:block;width:100%;min-width:0;padding:10px;border:1px solid var(--sr-border);border-radius:8px;background:var(--sr-card);color:var(--sr-text);margin:0 0 12px}
          .report-picker[data-report-picker="main"]{width:calc(100% - 32px);margin:0 16px 12px}[hidden]{display:none!important}
          :host(.bento-dark){--sr-good:#4ade80;--sr-warn:#fbbf24;--sr-bad:#f87171}
        </style>
        <ha-card class="card">
          <div class="header"><h2 id="title"></h2><span class="muted" id="recorderLabel">${this._t("Recorder-backed")}</span></div>
          <nav class="tabs" id="tabs" data-report-nav="main" role="tablist" aria-label="${this._t("Report sections")}">
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
        this._tariffGuard?.observe();
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
      this.shadowRoot.querySelector('[data-ha-tools-export]')?.classList.toggle('bento-dark',dark);
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

    _syncNavigation() {
      if (!this._scaffoldRendered) return;
      if (!this._navigationObserver && typeof ResizeObserver === 'function' && this._connected) {
        this._navigationObserver = new ResizeObserver(() => this._syncNavigation());
        this._navigationObserver.observe(this);
      }
      const width = this.getBoundingClientRect().width;
      const compact = width > 0 && width < 280;
      for (const group of this.shadowRoot.querySelectorAll('[data-report-nav]')) {
        const key = group.dataset.reportNav;
        const buttons = Array.from(group.querySelectorAll('button')).filter(button => !button.hidden);
        let picker = group.previousElementSibling;
        if (picker?.dataset.reportPicker !== key) {
          picker = document.createElement('select'); picker.className = 'report-picker'; picker.dataset.reportPicker = key;
          group.before(picker);
          picker.addEventListener('change', () => {
            const chosen = Array.from(group.querySelectorAll('button')).filter(button => !button.hidden)[Number(picker.selectedIndex)];
            chosen?.click();
            const current = this.shadowRoot.querySelector(`[data-report-picker="${key}"]`);
            if (current && !current.hidden) current.focus({ preventScroll: true });
          });
        }
        picker.setAttribute('aria-label', group.getAttribute('aria-label') || this._t('Report sections'));
        const choices = buttons.map(button => ({value:button.dataset.tab || button.dataset.energyView || button.dataset.costView || button.dataset.comparisonView || button.dataset.dailyView,label:button.textContent}));
        const signature = JSON.stringify(choices);
        if (picker.dataset.choices !== signature) {
          picker.replaceChildren(...choices.map(choice => { const option = document.createElement('option'); option.value = choice.value; option.textContent = choice.label; return option; }));
          picker.dataset.choices = signature;
        }
        const selected = buttons.find(button => button.getAttribute('aria-selected') === 'true') || buttons[0];
        picker.selectedIndex = buttons.indexOf(selected);
        const active = this.shadowRoot.activeElement;
        const inGroup = group.contains(active);
        // Reveal the destination before moving focus; hide the old representation last.
        if (compact && buttons.length) {
          picker.hidden = false;
          if (inGroup) picker.focus({ preventScroll: true });
          group.hidden = true;
        } else {
          group.hidden = buttons.length === 0;
          if (active === picker || (inGroup && active.hidden)) selected?.focus({ preventScroll: true });
          picker.hidden = true;
        }
      }
    }

    _focusReportControl(target) {
      if (!target || target.disabled) return null;
      const group = target.closest('[data-report-nav]');
      if (group?.hidden) target = this.shadowRoot.querySelector(`[data-report-picker="${group.dataset.reportNav}"]`);
      if (!target || target.closest('[hidden]')) return null;
      target.focus({ preventScroll: true });
      return target;
    }

    _rememberReportFocus(target) {
      if (!target || !this.shadowRoot.getElementById('content')?.contains(target)) return null;
      if (target.classList.contains('device-search')) return {search:true,start:target.selectionStart,end:target.selectionEnd,direction:target.selectionDirection};
      const names = ['data-daily-view','data-daily-day','data-daily-page','data-daily-clear','data-report-picker','data-report-control','data-energy-view','data-cost-view','data-cost-day','data-cost-metric','data-cost-page','data-cost-chart-page','data-cost-clear-day','data-comparison-view','data-comparison-day','data-comparison-metric','data-side','data-comparison-data-page','data-comparison-chart-page','data-comparison-clear','data-compare-previous-period'];
      const attributes = names.filter(name => target.hasAttribute(name)).map(name => [name,target.getAttribute(name)]);
      return attributes.length ? {tag:target.localName,attributes} : null;
    }

    _restoreReportFocus(snapshot, status) {
      const root = this.shadowRoot;
      let target = snapshot.search ? root.querySelector('.device-search') : Array.from(root.querySelectorAll(snapshot.tag)).find(node => snapshot.attributes.every(([name,value]) => node.getAttribute(name) === value));
      if (target?.disabled) target = null;
      if (target?.matches('[data-report-picker]') && target.hidden) {
        target = root.querySelector(`[data-report-nav="${target.dataset.reportPicker}"] [aria-selected="true"]`);
      }
      const restored = this._focusReportControl(target);
      if (restored) {
        if (snapshot.search && snapshot.start != null) restored.setSelectionRange(snapshot.start,snapshot.end,snapshot.direction);
        return;
      }
      const fallback = this._focusReportControl(root.querySelector('[data-energy-view][aria-selected="true"]')) || this._focusReportControl(root.getElementById('periodSelect'));
      // Keep only control identity through loading. A user focus move cancels restoration.
      if (status === 'loading' && fallback) this._pendingReportFocus = {snapshot,anchor:fallback};
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
        button.setAttribute('role', 'tab');
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
      this._syncNavigation();
    }

    _selectTab(tab) {
      if (!this._availableTabs().includes(tab) || tab === this._activeTab) return;
      if (this._activeTab === 'energy') this._invalidateEnergyRequest();
      this._activeTab = tab;
      this._tariffGuard?.observe();
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

    _invalidateEnergyRequest() { this._energyRequestGeneration += 1; this._invalidateReviewedExport(true); }

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

    _strictLocalInstant(parts, timeZone) {
      // Reuse the calendar converter, then verify all offsets observed around it.
      // An iterative converter alone can silently choose one side of a DST fold.
      const initial = this._zonedDateTimeToUtc(parts, timeZone).getTime();
      const target = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
      const offsets = new Set();
      for (let minutes = -2160; minutes <= 2160; minutes += 30) {
        const stamp = initial + minutes * 60000;
        const local = this._partsInZone(new Date(stamp), timeZone);
        offsets.add(Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second) - stamp);
      }
      const matches = [...offsets].map(offset => target - offset).filter(stamp => {
        const actual = this._partsInZone(new Date(stamp), timeZone);
        return ['year','month','day','hour','minute','second'].every(key => actual[key] === parts[key]);
      });
      return matches.length === 1 ? { value: new Date(matches[0]).toISOString(), reason: null }
        : { value: null, reason: matches.length ? 'ambiguous_local_cutoff' : 'nonexistent_local_cutoff' };
    }

    _comparisonPeriod(period) {
      return { ...period, actual_hours: (Date.parse(period.end) - Date.parse(period.start)) / 3600000,
        local_start: this._partsInZone(new Date(period.start), period.time_zone),
        local_cutoff: this._partsInZone(new Date(period.end), period.time_zone) };
    }

    _previousPeriodDescriptor(period) {
      const days = period.key === '1d' ? 1 : period.key === '30d' ? 30 : 7;
      const shift = parts => ({ ...parts, ...this._addCalendarDays(parts, -days) });
      const first = this._partsInZone(new Date(period.start), period.time_zone);
      const last = this._partsInZone(new Date(period.end), period.time_zone);
      const endpoints = [first, last, shift(first), shift(last)].map(parts => this._strictLocalInstant(parts, period.time_zone));
      const failed = endpoints.find(endpoint => endpoint.reason);
      if (failed) return { period: null, reason: failed.reason, shift_days: days,
        requested_local_start: shift(first), requested_local_cutoff: shift(last) };
      return { period: this._comparisonPeriod({ key: period.key, start: endpoints[2].value, end: endpoints[3].value, time_zone: period.time_zone }), reason: null, shift_days: days };
    }

    _freezeComparison(value) {
      if (value && typeof value === 'object' && !Object.isFrozen(value)) {
        for (const child of Object.values(value)) this._freezeComparison(child);
        Object.freeze(value);
      }
      return value;
    }

    _comparisonDelta(current, previous, unit, previousUnit, complete, reason) {
      const finite = value => typeof value === 'number' && Number.isFinite(value);
      const comparable = complete && unit && unit === previousUnit && finite(current) && finite(previous);
      let delta = comparable ? current - previous : null;
      if (!finite(delta)) delta = null;
      let percent = comparable && delta !== null && previous > 0 ? (delta / previous) * 100 : null;
      if (!finite(percent)) percent = null;
      return { current: finite(current) ? current : null, previous: finite(previous) ? previous : null, unit: unit || null,
        delta, percent, comparable: !!comparable && delta !== null,
        reason: !comparable ? reason || (unit !== previousUnit ? 'unit_mismatch' : 'incomplete_coverage') : delta === null ? 'nonfinite_delta' : previous === 0 ? 'previous_zero' : previous < 0 ? 'previous_nonpositive' : percent === null ? 'nonfinite_delta' : null,
        provenance: comparable && delta !== null ? 'complete_comparable_measurements' : 'unavailable' };
    }

    _comparisonSnapshot(state, selection, statistics, metadata, side) {
      const period = this._comparisonPeriod(state.period);
      const energyDays = state.daily || [];
      const costDays = state.cost.method === 'configured_tariff' ? (state.cost.daily || []).map(day => ({
        start: day.from, end: day.to, value: day.energyCost, recorded_value: day.recorded_energy_cost,
        unit: state.cost.currency, status: day.available ? 'ready' : day.status,
        observed_source_hours: day.observed_hours, expected_source_hours: day.expected_hours,
      })) : this._dailyEnergySeries(period, this._config.energy_cost_mode === 'flat_rate_estimate' ? [] : state.cost_sources, statistics, metadata, 'cost', this._hass.config?.currency);
      const finite = value => typeof value === 'number' && Number.isFinite(value) ? value : null;
      const daily = energyDays.map((energy, index) => ({ index, start: energy.start, end: energy.end,
        energy: { ...energy, value: finite(energy.value), recorded_value: finite(energy.recorded_value) },
        cost: costDays.find(day => day.start === energy.start) || { start: energy.start, end: energy.end, value: null, recorded_value: null,
          unit: state.cost.currency, status: 'no_data', observed_source_hours: 0, expected_source_hours: (Date.parse(energy.end)-Date.parse(energy.start))/3600000 },
      }));
      const records = [];
      // Daily charts retain only whole readings contained in one local day.
      // Crossing measurements remain intact in All hours and full exports.
      const dayAllocation = (from, to) => {
        const day_index = daily.findIndex(day => Date.parse(day.start) <= from && Date.parse(day.end) >= to);
        return { day_index, day_allocation_reason: day_index < 0 ? 'crosses_local_midnight' : null };
      };
      const references = state.status === 'error' ? [] : [...selection.totals, ...selection.costs, ...selection.devices];
      const summaries = new Map([...state.total_sources, ...state.cost_sources, ...state.devices].map(source => [`${source.role}:${source.statistic_id}`, source]));
      for (const source of references) {
        const summary = summaries.get(`${source.role}:${source.statistic_id}`);
        const buckets = Array.isArray(statistics[source.statistic_id]) ? statistics[source.statistic_id] : [];
        for (let from = Date.parse(period.start); from < Date.parse(period.end);) {
          const to = Math.min(Date.parse(period.end), (Math.floor(from / 3600000) + 1) * 3600000);
          const samples = buckets.filter(bucket => numericTime(bucket.end) > from && numericTime(bucket.start) < to);
          const measured = this._summarizeSeries(samples, metadata[source.statistic_id], { start: new Date(from), end: new Date(to) }, source.role, this._hass.config?.currency);
          const parts = this._partsInZone(new Date(from), period.time_zone);
          records.push({ side, ...dayAllocation(from, to),
            local_date: `${parts.year}-${String(parts.month).padStart(2,'0')}-${String(parts.day).padStart(2,'0')}`,
            from: new Date(from).toISOString(), to: new Date(to).toISOString(), statistic_id: source.statistic_id, role: source.role,
            source_statistic_ids: [source.statistic_id], label: summary?.label || source.statistic_id,
            value: finite(measured.value), recorded_value: finite(measured.recorded_value), unit: measured.unit,
            status: measured.status, reason: measured.reason || (measured.status !== 'ready' ? 'incomplete_coverage' : null),
            coverage: measured.coverage, provenance: source.provenance, included_in_stat: source.included_in_stat || null });
          from = to;
        }
      }
      if (state.cost.method === 'configured_tariff') for (const record of state.cost.records || []) {
        records.push({ side, role: 'priced_energy', statistic_id: null, ...record,
          ...dayAllocation(Date.parse(record.from), Date.parse(record.to)) });
      }
      // Safe allowlisted export snapshots, never profile, draft, config or tickets.
      const safeCost = { value: finite(state.cost.value), currency: state.cost.currency || null, method: state.cost.method,
        reason: state.cost.reason || null, rate: finite(state.cost.rate), source_statistic_ids: [...(state.cost.source_statistic_ids || [])],
        ...(state.cost.method === 'configured_tariff' ? { records: state.cost.records, daily: (state.cost.daily || []).map(({ records, ...day }) => day),
          coverage: state.cost.coverage, revision: state.cost.revision, provenance: state.cost.provenance,
          price_basis: state.cost.price_basis, tariff_timezone: state.cost.tariff_timezone, tariff_clock: state.cost.tariff_clock,
          measured_energy_cost: state.cost.measured_energy_cost, variable_cost: state.cost.variable_cost, usage_cost: state.cost.usage_cost,
          fixed_monthly: state.cost.fixed_monthly, current_profile_validity: state.cost.current_profile_validity } : {}) };
      return { period, source_mode: state.source_mode, status: state.status,
        total: { ...state.total, value: finite(state.total.value) }, cost: safeCost,
        recorded_total: state.recorded_total, recorded_cost: state.recorded_cost,
        total_sources: state.total_sources.map(source => this._exportSource(source)), cost_sources: state.cost_sources.map(source => this._exportSource(source)),
        devices: state.devices.map(source => this._exportSource(source)), warnings: [...state.warnings], daily, records,
        coverage: { missing_energy_days: daily.filter(day => day.energy.status !== 'ready').length,
          missing_cost_days: daily.filter(day => day.cost.status !== 'ready' || day.cost.value === null).length,
          observed_energy_source_hours: state.total_sources.reduce((sum, source) => sum + (source.coverage?.observed_hours || 0), 0),
          expected_energy_source_hours: state.total_sources.length * period.actual_hours,
          observed_cost_source_hours: state.cost.coverage?.observed_hours ?? state.cost_sources.reduce((sum, source) => sum + (source.coverage?.observed_hours || 0), 0),
          expected_cost_source_hours: state.cost.coverage?.expected_hours ?? state.cost_sources.length * period.actual_hours } };
    }

    _buildPeriodComparison(state, descriptor, selection, statistics, previousStatistics, metadata, snapshot) {
      const current = this._comparisonSnapshot(state, selection, statistics, metadata, 'current');
      const previousState = descriptor.period ? (descriptor.readStatus === 'error' ? this._errorState({ code: 'read_failed' }, descriptor.period) : this._materializeEnergyPeriod(descriptor.period, selection, previousStatistics || {}, metadata, snapshot, true)) : null;
      const previous = previousState ? this._comparisonSnapshot(previousState, selection, previousStatistics || {}, metadata, 'previous') : null;
      const scope = [...selection.totals, ...selection.costs, ...selection.devices].map(source => ({ statistic_id: source.statistic_id, role: source.role,
        unit: this._metadataUnit(metadata[source.statistic_id]), provenance: source.provenance, included_in_stat: source.included_in_stat || null,
        energy_statistic_ids: [...(source.energy_statistic_ids || [])], metadata: {
          has_sum: metadata[source.statistic_id]?.has_sum === true,
          unit_class: typeof metadata[source.statistic_id]?.unit_class === 'string' ? metadata[source.statistic_id].unit_class : null,
          name: typeof metadata[source.statistic_id]?.name === 'string' ? metadata[source.statistic_id].name : null,
        } }));
      const sameScope = !!previous && current.source_mode === previous.source_mode && ['total_sources','cost_sources','devices'].every(key =>
        JSON.stringify(current[key].map(source => [source.statistic_id,source.role,source.unit,source.included_in_stat]).sort()) ===
        JSON.stringify(previous[key].map(source => [source.statistic_id,source.role,source.unit,source.included_in_stat]).sort()));
      const energyComplete = sameScope && current.total_sources.every(source => source.status === 'ready') && previous.total_sources.every(source => source.status === 'ready')
        && current.coverage.missing_energy_days === 0 && previous.coverage.missing_energy_days === 0;
      const costComplete = sameScope && current.cost.method === previous.cost.method && ['cost_statistics','configured_tariff'].includes(current.cost.method)
        && current.coverage.missing_energy_days === 0 && previous.coverage.missing_energy_days === 0
        && current.coverage.missing_cost_days === 0 && previous.coverage.missing_cost_days === 0
        && (current.cost.method !== 'configured_tariff' || (current.cost.coverage?.complete && previous.cost.coverage?.complete
          && current.cost.price_basis === previous.cost.price_basis && current.cost.revision === previous.cost.revision
          && current.cost.tariff_timezone === previous.cost.tariff_timezone && JSON.stringify(current.cost.tariff_clock) === JSON.stringify(previous.cost.tariff_clock)));
      // An unavailable amount does not invalidate a currency confirmed by every
      // selected cost source. Keep the legacy cost snapshot itself unchanged.
      const comparisonCurrency = snapshot => {
        if (snapshot?.cost.currency) return snapshot.cost.currency;
        const expected = this._hass.config?.currency;
        return snapshot && snapshot.cost.reason !== 'currency_mismatch' && typeof expected === 'string' && expected
          && snapshot.cost_sources.length > 0 && snapshot.cost_sources.every(source => source.unit === expected && source.reason !== 'incompatible_currency_metadata')
          ? expected : null;
      };
      const currentCurrency = comparisonCurrency(current), previousCurrency = comparisonCurrency(previous);
      const costReason = descriptor.reason || (currentCurrency && previousCurrency && currentCurrency !== previousCurrency ? 'currency_mismatch'
        : previous?.cost.reason || current.cost.reason || 'incomplete_coverage');
      const metrics = {
        energy: this._comparisonDelta(current.total.value, previous?.total.value, current.total.unit, previous?.total.unit, energyComplete, descriptor.reason),
        cost: this._comparisonDelta(current.cost.value, previous?.cost.value, currentCurrency, previousCurrency, costComplete,
          costComplete ? descriptor.reason : costReason),
      };
      return this._freezeComparison({ status: descriptor.reason ? 'noncomparable' : metrics.energy.comparable && metrics.cost.comparable ? 'ready' : 'partial',
        reason: descriptor.reason || null, shift_days: descriptor.shift_days,
        requested_local_start: descriptor.requested_local_start || null, requested_local_cutoff: descriptor.requested_local_cutoff || null,
        scope, current, previous, metrics, daily: current.daily.map((day, index) => ({ index, current: day, previous: previous?.daily[index] || null })),
        records: [...current.records, ...(previous?.records || [])].sort((a,b) => a.day_index - b.day_index
          || a.role.localeCompare(b.role) || String(a.statistic_id || '').localeCompare(String(b.statistic_id || ''))
          || (Date.parse(a.from) - Date.parse(a.side === 'current' ? current.period.start : previous.period.start))
            - (Date.parse(b.from) - Date.parse(b.side === 'current' ? current.period.start : previous.period.start))
          || a.side.localeCompare(b.side)) });
    }

    async _dashboardSources(generation, read = payload => this._hass.callWS(payload)) {
      let prefs;
      try {
        prefs = await read({ type: 'energy/get_prefs' });
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
          const info = await read({ type: 'energy/info' });
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
      const configured = config.energy_cost_mode === 'flat_rate_estimate' ? [] : (Array.isArray(costSources) ? costSources : []);
      if (configured.length > 0) {
        if (configured.some((source) => source.reason === 'incompatible_currency_metadata')) return { value: null, currency: null, method: 'unavailable', rate: null, source_statistic_ids: configured.map((source) => source.statistic_id), reason: 'currency_mismatch' };
        if (configured.some((source) => source.status !== 'ready')) return { value: null, currency: null, method: 'unavailable', rate: null, source_statistic_ids: configured.map((source) => source.statistic_id), reason: 'partial_cost' };
        const currencies = [...new Set(configured.map((source) => source.unit))];
        if (currencies.length !== 1) return { value: null, currency: null, method: 'unavailable', rate: null, source_statistic_ids: configured.map((source) => source.statistic_id), reason: 'currency_mismatch' };
        return { value: configured.reduce((sum, source) => sum + source.value, 0), currency: currencies[0], method: 'cost_statistics', rate: null, source_statistic_ids: configured.map((source) => source.statistic_id), reason: null };
      }
      if (config.energy_cost_mode === 'cost_statistics') return { value: null, currency: null, method: 'unavailable', rate: null, source_statistic_ids: [], reason: 'missing_statistics' };
      if (typeof config.energy_price !== 'number' || !Number.isFinite(config.energy_price) || config.energy_price < 0) return { value: null, currency: config.currency || null, method: 'unavailable', rate: null, source_statistic_ids: [], reason: 'missing_rate' };
      if (typeof config.currency !== 'string' || !config.currency.trim()) return { value: null, currency: null, method: 'unavailable', rate: config.energy_price, source_statistic_ids: [], reason: 'missing_currency' };
      if (!total || typeof total.value !== 'number' || !Number.isFinite(total.value)) return { value: null, currency: config.currency, method: 'unavailable', rate: config.energy_price, source_statistic_ids: [], reason: 'energy_data_unavailable' };
      return { value: total.value * config.energy_price, currency: config.currency, method: 'flat_rate_estimate', rate: config.energy_price, source_statistic_ids: Array.isArray(total.source_statistic_ids) ? [...total.source_statistic_ids] : [], reason: null };
    }

    async _loadEnergy() {
      const exportAssociation = this._observeReviewedExportSource();
      const requestHass = this._hass, requestCall = requestHass?.callWS;
      if (this._config.energy_cost_mode === 'configured_tariff') this._tariffController().reset();
      const compare = this._config.compare_previous_period === true;
      if (compare) this._tariffController();
      const ticket = compare ? this._tariffGuard.snapshot() : null;
      const generation = ++this._energyRequestGeneration;
      const period = this._periodDescriptor();
      const pairedPeriod = compare ? this._previousPeriodDescriptor(period) : null;
      const current = () => this._isCurrentEnergyRequest(generation) && exportAssociation === this._observeReviewedExportSource() && (!compare || this._tariffGuard.current(ticket));
      const read = payload => compare ? this._tariffGuard.call(ticket, payload) : requestCall.call(requestHass,payload);
      const mode = this._config.energy_source_mode === 'explicit' ? 'explicit' : 'energy_dashboard';
      const previous = this._energyViewState;
      const reportConfig = JSON.stringify([this._config.energy_source_mode, this._config.energy_total_statistics, this._config.energy_device_statistics, this._config.energy_cost_statistics, this._config.energy_entity, this._config.energy_price, this._config.currency, this._config.energy_cost_mode, this._config.tariff_profile, compare]);
      const sameWindow = this._energyReportConfig === reportConfig && previous && ['ready', 'partial', 'no_data'].includes(previous.status) && previous.source_mode === mode && previous.period && previous.period.key === period.key && previous.period.start === period.start && previous.period.end === period.end && previous.period.time_zone === period.time_zone;
      if (!sameWindow) this._setEnergyViewState({ status: 'loading', period, source_mode: mode, total: { value: null, unit: 'kWh', source_statistic_ids: [] }, cost: { value: null, currency: null, method: 'unavailable', rate: null, source_statistic_ids: [], reason: 'loading' }, devices: [], warnings: [] });
      try {
        const selection = mode === 'explicit' ? this._explicitSources() : await this._dashboardSources(generation, read);
        if (!selection || !current()) return;
        if (selection.totals.length === 0) {
          this._setEnergyViewState({ status: 'not_configured', period, source_mode: selection.source_mode, total: { value: null, unit: 'kWh', source_statistic_ids: [] }, cost: { value: null, currency: null, method: 'unavailable', rate: null, source_statistic_ids: [], reason: 'not_configured' }, devices: [], total_sources: [], cost_sources: [], warnings: [...(selection.warnings || [])] });
          return;
        }
        const ids = selection.ordered.map((source) => source.statistic_id);
        const metadataResponse = await read({ type: 'recorder/get_statistics_metadata', statistic_ids: ids });
        if (!current()) return;
        const statisticsResponse = new Date(period.end) <= new Date(period.start) ? {} : await read({ type: 'recorder/statistics_during_period', start_time: period.start, end_time: period.end, statistic_ids: ids, period: 'hour', types: ['change'] });
        if (!current()) return;
        const metadataById = this._metadataMap(metadataResponse); const statisticsById = statisticsResponse && typeof statisticsResponse === 'object' ? statisticsResponse : {};
        let priorStatistics = null;
        let comparisonDescriptor = pairedPeriod;
        if (pairedPeriod?.period) {
          const prior = pairedPeriod.period;
          try {
            priorStatistics = new Date(prior.end) <= new Date(prior.start) ? {} : await read({ type: 'recorder/statistics_during_period', start_time: prior.start, end_time: prior.end, statistic_ids: ids, period: 'hour', types: ['change'] });
          } catch (error) {
            if (!current()) return;
            // Permission failures remain fail-closed. An optional historical read
            // failure must not erase the separately confirmed current readings.
            if (this._classifyError(error) === 'permission_denied') throw error;
            comparisonDescriptor = { ...pairedPeriod, readStatus: 'error', reason: 'read_failed' };
          }
          if (!current()) return;
        }
        let tariffSnapshot = null;
        if (this._config.energy_cost_mode === 'configured_tariff') {
          const host = this._tariffController();
          if (!Object.hasOwn(this._config,'tariff_profile')) await host.load();
          if (!current()) return;
          tariffSnapshot = host.snapshot();
        }
        const state = this._materializeEnergyPeriod(period, selection, statisticsById, metadataById, tariffSnapshot);
        if (compare) state.comparison = this._buildPeriodComparison(state, comparisonDescriptor, selection, statisticsById, priorStatistics, metadataById, tariffSnapshot);
        if (!current()) return;
        this._tariffPricingContext = this._config.energy_cost_mode === 'configured_tariff' ? { generation, period, roots: selection.totals, statistics: statisticsById, metadata: metadataById,
          ...(compare ? { selection, pairedPeriod: comparisonDescriptor, priorStatistics } : {}) } : null;
        this._energyReportConfig = reportConfig;
        this._setEnergyViewState(state);
      } catch (error) {
        if (current()) this._setEnergyViewState(this._errorState(error, period));
      }
    }

    _materializeEnergyPeriod(period, selection, statisticsById, metadataById, tariffSnapshot, historical = false) {
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
        if (this._config.energy_cost_mode !== 'configured_tariff' && this._config.energy_cost_mode !== 'flat_rate_estimate' && selection.cost_configuration_incomplete) cost = { value: null, currency: null, method: 'unavailable', rate: null, source_statistic_ids: costSources.map((source) => source.statistic_id), reason: 'partial_cost' };
        if (status !== 'ready') {
          const reason = status === 'no_data' ? 'no_data' : (status === 'unsupported' ? 'unsupported_source' : 'partial_energy');
          cost = { ...cost, value: null, method: 'unavailable', reason };
        }
        if (this._config.energy_cost_mode === 'configured_tariff') {
          cost = this._priceConfiguredTariff(period, selection.totals, statisticsById, metadataById, tariffSnapshot);
        } else if (historical && cost.method === 'flat_rate_estimate') {
          cost = { value: null, currency: cost.currency, method: 'unavailable', rate: null, source_statistic_ids: [], reason: 'historical_flat_rate_unavailable' };
        }
        const deviceModel = this._buildDeviceRows(deviceSources);
        const deviceDataStatus = deviceSources.some((source) => source.status !== 'ready') ? 'partial' : 'ready';
        const warnings = [...(selection.warnings || [])];
        if (deviceModel.relationship_status !== 'valid') warnings.push(deviceModel.relationship_status);
        const recordedTotal = this._recordedSubtotal(totalSources, 'kWh');
        const recordedCost = this._recordedSubtotal(costSources, expectedCurrency);
        const daily = this._dailyEnergySeries(period, totalSources, statisticsById, metadataById);
        return { status, period, source_mode: selection.source_mode, total: completeTotal, cost, recorded_total: recordedTotal, recorded_cost: recordedCost, daily, devices: deviceModel.rows, total_sources: totalSources, cost_sources: costSources, device_data_status: deviceDataStatus, device_relationship_status: deviceModel.relationship_status, top_ranking_available: deviceModel.top_ranking_available, warnings };
    }

    _priceConfiguredTariff(period, roots, statistics, metadata, snapshot) {
      const unavailable = reason => ({ method: 'configured_tariff', value: null, currency: null, rate: null,
        source_statistic_ids: roots.map(s => s.statistic_id), reason, records: Object.freeze([]), daily: Object.freeze([]), measured_energy_cost: null,
        coverage: { observed_hours: 0, expected_hours: 0, observed_source_hours: 0, expected_source_hours: 0 } });
      const profile = snapshot?.profile, model = createEnergyTariffV3(profile);
      if (!model.valid) return unavailable(snapshot?.reason || 'invalid_profile');
      const start = numericTime(period.start), end = numericTime(period.end), hour = 3600000;
      if (!roots.length || new Set(roots.map(s => s.statistic_id)).size !== roots.length || roots.some(s => s.role !== 'total' || s.included_in_stat)) return unavailable('invalid_root_sources');
      if (start === null || end === null || end <= start || (end - start) / hour > 744) return unavailable('nonaligned_window');
      const firstHour = Math.ceil(start / hour) * hour, lastHour = Math.floor(end / hour) * hour;
      // Recorder measures complete UTC hours. Non-hour local midnight boundaries
      // stay unknown; neither prorate a reading nor shorten the requested period.
      const unmeasuredIntervals = [];
      const boundary = (from, to) => Object.freeze({ from: new Date(from).toISOString(), to: new Date(to).toISOString(), reason: 'nonaligned_boundary' });
      if (firstHour >= lastHour && (start % hour || end % hour)) unmeasuredIntervals.push(boundary(start, end));
      else {
        if (firstHour > start) unmeasuredIntervals.push(boundary(start, firstHour));
        if (lastHour < end) unmeasuredIntervals.push(boundary(lastHour, end));
      }
      const common = new Map(), fatal = new Map(), ids = roots.map(s => s.statistic_id);
      for (const source of roots) {
        const id = source.statistic_id, md = metadata[id], unit = this._metadataUnit(md);
        if (!md || md.has_sum !== true || !ENERGY_UNITS.has(unit) || (md.unit_class != null && md.unit_class !== 'energy')) { fatal.set(id, 'incompatible_energy_metadata'); continue; }
        const series = statistics[id];
        if (series != null && !Array.isArray(series)) { fatal.set(id, 'invalid_measurement'); continue; }
        const sorted = (series || []).map(b => ({ from: numericTime(b?.start), to: numericTime(b?.end), change: b?.change })).sort((a,b) => a.from - b.from);
        if (sorted.some((b,i) => b.from === null || b.to === null || b.to - b.from !== hour || b.from % hour || b.from < Math.floor(start / hour) * hour || b.to > Math.ceil(end / hour) * hour ||
          (i && b.from < sorted[i-1].to) || (b.change != null && (typeof b.change !== 'number' || !Number.isFinite(b.change) || b.change < 0)))) { fatal.set(id, 'invalid_measurement'); continue; }
        const factor = unit === 'Wh' ? 0.001 : unit === 'MWh' ? 1000 : 1;
        for (const b of sorted) if (b.from >= firstHour && b.to <= lastHour && typeof b.change === 'number') {
          const kwh = b.change * factor;
          if (!Number.isFinite(kwh)) { fatal.set(id, 'nonfinite_measurement'); break; }
          if (!common.has(b.from)) common.set(b.from, new Map()); common.get(b.from).set(id, kwh);
        }
      }
      // No root overlap assumption is inferred from devices or residual values.
      // Each complete common hour is measured once across the explicitly selected roots.
      const measured = [];
      if (!fatal.size) for (let from = firstHour; from < lastHour; from += hour) {
        const contributions = common.get(from);
        if (contributions?.size === roots.length) measured.push({ from, to: from + hour, kwh: [...contributions.values()].reduce((a,b) => a+b,0) });
      }
      const priced = model.priceBuckets(measured, { from: start, to: end });
      const byHour = new Map(priced.rows.map(row => [row.from, row])), measuredByHour = new Map(measured.map(row => [row.from,row]));
      const records = [];
      for (let from = firstHour; from < lastHour; from += hour) {
        const p = byHour.get(from), available = p?.available === true;
        const contributions = common.get(from), reason = available ? null : p?.reason || (fatal.size ? [...fatal.values()][0] : 'missing_measurement');
        records.push(Object.freeze({ from: new Date(from).toISOString(), to: new Date(from + hour).toISOString(),
          source_statistic_ids: Object.freeze([...ids]), source_kwh: Object.freeze(measuredByHour.has(from) ? Object.fromEntries(contributions) : {}),
          available, measurement_available: measuredByHour.has(from), reason, kwh: measuredByHour.get(from)?.kwh ?? null, zone: p?.zone ?? null, zones: Object.freeze(p?.zones || []),
          energyRate: p?.energyRate ?? null, variableRate: p?.variableRate ?? null,
          energyCost: available ? p.energyCost : null, variableCost: available ? p.variableCost : null, usageCost: available ? p.usageCost : null,
          currency: profile.currency, price_basis: profile.priceBasis, revision: snapshot.revision ?? null }));
      }
      const ready = records.filter(r => r.available), sum = field => { const n = ready.reduce((a,b) => a+b[field],0); return ready.length && Number.isFinite(n) ? n : null; };
      const current = model.rateAt(this._now().toISOString());
      const observedSourceHours = !fatal.size ? [...common.values()].reduce((n,c) => n+c.size,0) : 0;
      return Object.freeze({ method: 'configured_tariff', value: priced.complete ? priced.energyCost : null,
        currency: profile.currency, rate: null, source_statistic_ids: Object.freeze([...ids]),
        reason: priced.complete ? null : (fatal.size ? [...fatal.values()][0] : priced.issues[0]?.reason || 'missing_measurement'),
        records: Object.freeze(records), daily: this._tariffDailyRecords(period, records), measured_energy_cost: sum('energyCost'), measured_kwh: sum('kwh'),
        variable_cost: priced.complete ? priced.variableCost : null, usage_cost: priced.complete ? priced.usageCost : null,
        fixed_monthly: priced.fixedMonthly, price_basis: profile.priceBasis, tariff_timezone: profile.timezone,
        tariff_clock: Object.freeze({ ...profile.clock }), revision: snapshot.revision ?? null, provenance: snapshot.provenance || null,
        current_profile_validity: Object.freeze({ available: current.available, reason: current.reason || null, checked_at: this._now().toISOString() }),
        coverage: Object.freeze({ observed_hours: ready.length, expected_hours: (end-start)/hour,
          observed_source_hours: observedSourceHours, expected_source_hours: roots.length * (end-start)/hour,
          complete: priced.complete, measured_subset: !priced.complete && ready.length > 0,
          unmeasured_intervals: Object.freeze(unmeasuredIntervals) }) });
    }

    _tariffDailyRecords(period, records) {
      const start = asDate(period.start), end = asDate(period.end);
      if (!start || !end || end <= start || !records.length) return Object.freeze([]);
      const days = []; let parts = this._partsInZone(start, period.time_zone);
      const sum = (rows, field) => {
        const value = rows.reduce((total, row) => total + row[field], 0);
        return rows.length && Number.isFinite(value) ? value : null;
      };
      for (let index = 0; index < 31; index++) {
        const bounds = this._zonedDayBounds(parts, period.time_zone);
        const from = Math.max(start.getTime(), bounds.start.getTime()), to = Math.min(end.getTime(), bounds.end.getTime());
        if (to <= from) break;
        // Never split an hourly meter reading across a local midnight. A fractional
        // boundary stays incomplete instead of inventing within-hour consumption.
        const hours = records.filter(row => Date.parse(row.from) >= from && Date.parse(row.to) <= to);
        const measured = hours.filter(row => row.measurement_available), priced = hours.filter(row => row.available);
        const expected = (to - from) / 3600000;
        const energyComplete = Number.isInteger(expected) && measured.length === expected;
        const costComplete = Number.isInteger(expected) && priced.length === expected;
        const kwh = sum(measured, 'kwh'), money = sum(priced, 'energyCost');
        const complete = energyComplete && costComplete && kwh !== null && money !== null;
        days.push(Object.freeze({ from: new Date(from).toISOString(), to: new Date(to).toISOString(),
          kwh: energyComplete ? kwh : null, energyCost: costComplete ? money : null,
          recorded_kwh: kwh, recorded_energy_cost: money,
          measurement_available: energyComplete && kwh !== null, available: costComplete && money !== null,
          expected_hours: expected, measured_hours: measured.length, observed_hours: priced.length,
          status: complete ? 'ready' : measured.length ? 'partial' : 'no_data', records: Object.freeze(hours) }));
        if (bounds.end >= end) break;
        parts = this._addCalendarDays(parts, 1);
      }
      return Object.freeze(days);
    }

    _tariffController() {
      if (this._tariffHost) return this._tariffHost;
      this._tariffGuard ||= createTariffGuardV3({ getHass: () => this._hass,
        getContext: () => ({ config: this._config, period: this._period, tab: this._activeTab, connected: this._connected }) });
      this._tariffGuard.subscribe(() => {
        this._invalidateEnergyRequest(); this._energyReportConfig = null; this._tariffPricingContext = null; this._deviceQuery = ''; this._costSelectedDay = null; this._costDataPage = 0; this._costChartPage = 0;
        this._comparisonSelectedDay = null; this._comparisonDataPage = 0; this._comparisonChartPage = 0;
        this._tariffSettingsSection?.replaceChildren(); this._tariffSettingsSection = null;
        this._energyViewState = { status: 'idle' };
        // Clear cached priced/private source DOM immediately; do not dispatch a retry.
        if (this._scaffoldRendered && this._activeTab === 'energy') this.shadowRoot.getElementById('content')?.replaceChildren();
      });
      this._tariffHost = createTariffHostV3({ card: this, kind: 'smart', createModel: createEnergyTariffV3,
        legacyProfile: config => Object.hasOwn(config, 'tariff_profile') ? config.tariff_profile : null,
        createSettings: createTariffSettingsV3, createUi: createUiV3, guard: this._tariffGuard,
        onRefresh: () => {
          // Settings readback updates the settled snapshot without another recorder request.
          const context = this._tariffPricingContext;
          if (context && context.generation === this._energyRequestGeneration) {
            const snapshot = this._tariffHost.snapshot();
            const cost = this._priceConfiguredTariff(context.period, context.roots, context.statistics, context.metadata, snapshot);
            const state = { ...this._energyViewState, cost };
            if (context.selection) state.comparison = this._buildPeriodComparison(state, context.pairedPeriod, context.selection, context.statistics, context.priorStatistics, context.metadata, snapshot);
            this._setEnergyViewState(state);
          } else this._renderEnergyState();
        } });
      return this._tariffHost;
    }

    _renderTariffSettings(container, markup) {
      if (this._config.energy_cost_mode !== 'configured_tariff') return;
      const host = this._tariffController(), block = document.createElement('section');
      const existingMount = this._tariffSettingsSection?.querySelector('[data-tariff-mount]');
      block.innerHTML = markup ?? host.markup();
      // Keep the editor and its in-flight operation across ordinary report renders.
      // The strong guard separately erases this mount on any authority/context edge.
      if (existingMount) block.querySelector('[data-tariff-mount]').replaceWith(existingMount);
      this._tariffSettingsSection = block; container.appendChild(block); host.bind();
    }

    _renderTariffEvidence(container, cost) {
      const section = document.createElement('section'); section.className = 'tariff-evidence section';
      const heading = document.createElement('h3'); heading.textContent = this._t('Configured tariff energy cost'); section.appendChild(heading);
      const text = document.createElement('p'); text.className = 'muted';
      text.textContent = `${this._t('Measured hours')}: ${cost.coverage.observed_hours}/${cost.coverage.expected_hours} · ${cost.currency || '—'} · ${this._t(cost.price_basis || '—')} · ${cost.tariff_timezone || '—'} · ${this._t('Revision')}: ${cost.revision ?? '—'} · ${this._t(cost.provenance || 'unavailable')} · ${this._t('Current profile validity')}: ${this._t(cost.current_profile_validity?.available ? 'ready' : cost.current_profile_validity?.reason || cost.reason || 'unavailable')}`;
      section.appendChild(text);
      for (const interval of cost.coverage.unmeasured_intervals || []) {
        const gap = document.createElement('p'); gap.className = 'warning'; gap.dataset.tariffBoundary = '';
        gap.textContent = `${this._t('Boundary intervals without a complete hourly measurement')}: ${this._formatPeriodDate(interval.from, this._energyViewState.period.time_zone)} – ${this._formatPeriodDate(interval.to, this._energyViewState.period.time_zone)}`;
        section.appendChild(gap);
      }
      const note = document.createElement('p'); note.textContent = this._t('Energy cost only; variable and fixed fees are separate. This is not a complete electricity bill.'); section.appendChild(note);
      if (cost.value === null) {
        const subset = document.createElement('p'); subset.setAttribute('role','status');
        subset.textContent = `${this._t('Measured subset only')}: ${cost.measured_energy_cost == null ? '—' : this._formatNumber(cost.measured_energy_cost,2)} ${cost.currency || ''} · ${this._t(cost.reason || 'unavailable')}`; section.appendChild(subset);
      }
      for (const [key,label,unit] of [['variable_cost','Variable fees',cost.currency],['usage_cost','Energy and variable fees',cost.currency],['fixed_monthly','Fixed monthly fee (separate)',`${cost.currency || ''}/${this._t('month')}`]]) {
        const line = document.createElement('p');line.textContent = `${this._t(label)}: ${cost[key] == null ? '—' : this._formatNumber(cost[key],2)} ${unit || ''}`;section.appendChild(line);
      }
      const views = document.createElement('div'); views.dataset.reportNav='cost'; views.className='report-views';views.setAttribute('role','tablist');views.setAttribute('aria-label',this._t('Cost evidence'));
      for (const [key,label] of [['chart','Chart'],['data','Data']]) {
        const button=document.createElement('button');button.type='button';button.className='action';button.dataset.costView=key;button.setAttribute('role','tab');button.setAttribute('aria-selected',String((this._costEvidenceView || 'chart')===key));button.textContent=this._t(label);
        button.addEventListener('click',()=>{this._costEvidenceView=key;this._renderEnergyState();this._focusReportControl(this.shadowRoot.querySelector(`[data-cost-view="${key}"]`));});views.appendChild(button);
      }section.appendChild(views);
      const panel = document.createElement('div'); panel.setAttribute('role','tabpanel');
      const records = cost.records, daily = cost.daily || [];
      const selected = daily.find(day => day.from === this._costSelectedDay);
      if (!selected) this._costSelectedDay = null;
      const rerender = (selector, fallback) => {
        this._renderEnergyState();
        const target = this.shadowRoot.querySelector(selector);
        this._focusReportControl(target && !target.disabled ? target : this.shadowRoot.querySelector(fallback || '[data-cost-view][aria-selected="true"]'));
      };
      if (selected) {
        const detail = document.createElement('p'); detail.dataset.costSelectedDay = selected.from; detail.setAttribute('role','status');
        detail.textContent = `${this._formatPeriodDate(selected.from,this._energyViewState.period.time_zone)} · ${selected.measured_hours}/${selected.expected_hours} ${this._t('Measured hours')} · ${this._t(selected.status)} · ${this._formatNumber(selected.recorded_kwh,2)} kWh · ${this._formatNumber(selected.recorded_energy_cost,2)} ${cost.currency || '—'}`;
        panel.appendChild(detail);
        const clear = document.createElement('button'); clear.type='button'; clear.className='action'; clear.dataset.costClearDay=''; clear.textContent=this._t('All hours');
        clear.addEventListener('click',()=>{this._costSelectedDay=null;this._costDataPage=0;rerender('[data-cost-view][aria-selected="true"]');}); panel.appendChild(clear);
      }
      const paginate = (count, size, property, attribute) => {
        const pages=Math.max(1,Math.ceil(count/size));
        this[property]=Math.max(0,Math.min(pages-1,this[property] || 0));
        const nav=document.createElement('nav'); nav.className='tariff-pagination'; nav.setAttribute('aria-label',this._t(attribute==='costPage'?'Hourly records':'Daily overview'));
        const status=document.createElement('span'); status.textContent=`${this._t('Page')} ${this[property]+1}/${pages}`; nav.appendChild(status);
        for (const [direction,label,offset] of [['previous','Previous',-1],['next','Next',1]]) {
          const button=document.createElement('button');button.type='button';button.className='action';button.dataset[attribute]=direction;button.textContent=this._t(label);
          button.disabled=offset<0?this[property]===0:this[property]===pages-1;
          button.addEventListener('click',()=>{this[property]+=offset;rerender(`[data-${attribute==='costPage'?'cost-page':'cost-chart-page'}="${direction}"]`,`[data-${attribute==='costPage'?'cost-page':'cost-chart-page'}]:not([disabled])`);});nav.appendChild(button);
        }
        panel.appendChild(nav); return this[property]*size;
      };
      if ((this._costEvidenceView || 'chart') === 'data') {
        const rows = selected ? selected.records : records;
        const offset = paginate(rows.length,50,'_costDataPage','costPage');
        for (const record of rows.slice(offset,offset+50)) {
          const row=document.createElement('article');row.className='tariff-data-row';row.dataset.pricedRow=record.from;
          const title=document.createElement('h4');title.textContent=`${this._formatPeriodDate(record.from,this._energyViewState.period.time_zone)} → ${this._formatPeriodDate(record.to,this._energyViewState.period.time_zone)}`;row.appendChild(title);
          const data=document.createElement('dl');
          for(const [label,value] of [
            ['Measured energy',`${this._formatNumber(record.kwh,2)} kWh`],
            ['Priced energy',`${this._formatNumber(record.energyCost,2)} ${cost.currency || '—'}`],
            ['Energy / kWh',`${this._formatNumber(record.energyRate,4)} ${cost.currency || '—'}/kWh`],
            ['Zone',record.zones.join(', ') || '—'],['Status',this._t(record.reason || 'ready')],
            ['Source evidence',record.source_statistic_ids.join(', ')],['UTC interval',`${record.from} → ${record.to}`]]) {
            const term=document.createElement('dt');term.textContent=this._t(label);const valueNode=document.createElement('dd');valueNode.textContent=value;data.append(term,valueNode);
          }row.appendChild(data);panel.appendChild(row);
        }
      } else {
        const offset=paginate(daily.length,7,'_costChartPage','costChartPage');
        const note=document.createElement('p');note.className='muted';note.textContent=this._t('Select a day to inspect its hours. Stripes show measured subsets; gaps are not zero.');panel.appendChild(note);
        for (const [key,subset,unit,label] of [['kwh','recorded_kwh','kWh','Measured energy'],['energyCost','recorded_energy_cost',cost.currency || '—','Priced energy']]) {
          const chart=document.createElement('section');chart.className='tariff-day-chart';chart.setAttribute('aria-label',`${this._t(label)} (${unit})`);
          const axis=document.createElement('h4');axis.textContent=`${this._t(label)} · ${unit}`;chart.appendChild(axis);
          const signed = daily.some(day => day[subset] < 0);
          const scale=Math.max(0,...daily.map(day=>Math.abs(day[subset] || 0)));
          for (const day of daily.slice(offset,offset+7)) {
            const value=day[subset], complete=key==='kwh'?day.measurement_available:day.available;
            const button=document.createElement('button');button.type='button';button.className='tariff-day';button.dataset.costDay=day.from;button.dataset.costMetric=key;button.dataset.availability=value===null?'gap':complete?'ready':'partial';button.setAttribute('aria-pressed',String(selected?.from===day.from));
            const date=document.createElement('span');date.textContent=new Intl.DateTimeFormat(languageOf(this._hass),{day:'numeric',month:'short',timeZone:this._energyViewState.period.time_zone}).format(new Date(day.from));
            const amount=document.createElement('strong');amount.textContent=`${this._formatNumber(value,2)} ${unit}`;
            const status=document.createElement('small');status.textContent=this._t(complete?'ready':day.status);
            const track=document.createElement('span');track.className=`tariff-day-track${signed?' signed':''}`;track.setAttribute('aria-hidden','true');
            if(value!==null){const fill=document.createElement('span');fill.className='tariff-day-fill';const width=scale?Math.abs(value)/scale*(signed?50:100):0;fill.style.width=`${width}%`;fill.style.left=`${signed?(value<0?50-width:50):0}%`;track.appendChild(fill);}
            button.title=`${day.from} → ${day.to} · ${day.measured_hours}/${day.expected_hours} ${this._t('Measured hours')} · ${this._t(day.status)}`;
            button.append(date,amount,status,track);
            button.addEventListener('click',()=>{this._costSelectedDay=day.from;this._costDataPage=0;rerender(`[data-cost-day="${day.from}"][data-cost-metric="${key}"]`);});chart.appendChild(button);
          }panel.appendChild(chart);
        }
      }
      section.appendChild(panel);container.appendChild(section);
    }

    _dailyEnergySeries(period, sources, statistics, metadata, role = 'total', expectedCurrency = null) {
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
          return this._summarizeSeries(buckets, metadata[source.statistic_id], { start: dayStart, end: dayEnd }, role, expectedCurrency);
        });
        const measured = summaries.filter(source => typeof source.recorded_value === 'number' && Number.isFinite(source.recorded_value));
        const value = measured.reduce((sum, source) => sum + source.recorded_value, 0);
        const complete = sources.length > 0 && summaries.every(source => source.status === 'ready');
        days.push({ start: dayStart.toISOString(), end: dayEnd.toISOString(), value: complete && Number.isFinite(value) ? value : null, recorded_value: measured.length && Number.isFinite(value) ? value : null, unit: role === 'cost' ? expectedCurrency : 'kWh', status: complete && Number.isFinite(value) ? 'ready' : (measured.length ? 'partial' : 'no_data'), observed_source_hours: summaries.reduce((sum, source) => sum + (source.coverage ? source.coverage.observed_hours : 0), 0), expected_source_hours: sources.length * (dayEnd - dayStart) / 3600000 });
        if (bounds.end >= end) break;
        parts = this._addCalendarDays(parts, 1);
      }
      return days;
    }

    _renderEnergyViews(container) {
      const nav = document.createElement('nav'); nav.dataset.reportNav='energy'; nav.className = 'report-views'; nav.setAttribute('role', 'tablist'); nav.setAttribute('aria-label', this._t('Energy report views'));
      for (const [key, label] of [['summary', 'Summary'], ['devices', 'Devices'], ['costs', 'Costs']]) {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'action'; button.textContent = this._t(label); button.dataset.energyView = key; button.setAttribute('role', 'tab'); button.setAttribute('aria-selected', String(this._energyView === key));
        button.addEventListener('click', () => { this._energyView = key; this._renderEnergyState(); this._focusReportControl(this.shadowRoot.querySelector('[data-energy-view][aria-selected="true"]')); });
        nav.appendChild(button);
      }
      container.appendChild(nav);
    }

    _renderComparisonToggle(container) {
      const style = document.createElement('style'); style.textContent = `.comparison-toggle{display:flex;gap:10px;align-items:center;min-height:44px;cursor:pointer;overflow-wrap:anywhere}.comparison-toggle input{flex-shrink:0;width:20px;height:20px;accent-color:var(--sr-primary)}`;
      container.appendChild(style);
      const label = document.createElement('label'); label.className = 'comparison-toggle section';
      const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = this._config.compare_previous_period === true;
      checkbox.dataset.comparePreviousPeriod = '';
      const text = document.createElement('span'); text.textContent = this._t('Compare previous local-calendar period');
      checkbox.addEventListener('change', () => {
        this._config = { ...this._config, compare_previous_period: checkbox.checked };
        this._comparisonSelectedDay = null; this._comparisonDataPage = 0; this._comparisonChartPage = 0;
        this._invalidateEnergyRequest(); this._energyReportConfig = null; this._tariffGuard?.observe(); this._scheduleRefresh(true);
      });
      label.append(checkbox, text); container.appendChild(label);
    }

    _comparisonHint(metric, pair, key) {
      const note = document.createElement('div'); note.className = 'muted comparison-hint';
      if (key === 'sources' || key === 'complete') {
        const evidence = pair.previous?.recorded_total;
        note.textContent = `${this._t('Previous period')}: ${evidence ? `${key === 'sources' ? evidence.sources_with_data : evidence.complete_sources} / ${evidence.configured_sources}` : '—'}`;
      } else {
        const delta = pair.metrics[key];
        note.textContent = `${this._t('Previous period')}: ${this._formatNumber(delta.previous,2)} ${key === 'cost' ? pair.previous?.cost.currency || (pair.previous?.cost_sources.length && pair.previous.cost_sources.every(source => source.unit === delta.unit) ? delta.unit : '') : delta.unit || ''}`;
        if (typeof delta.delta === 'number') note.textContent += ` · Δ ${this._formatNumber(delta.delta,2)} ${delta.unit || ''}`;
        if (typeof delta.percent === 'number') note.textContent += ` · ${this._formatNumber(delta.percent,2)}%`;
        else note.textContent += ` · ${this._t(delta.reason || pair.reason || 'unavailable')}`;
      }
      metric.appendChild(note);
    }

    _renderComparisonOverview(container, pair) {
      const section=document.createElement('section');section.className='section comparison-overview';
      const style=document.createElement('style');style.textContent=`
        .comparison-hint{font-size:12px;line-height:1.6;overflow-wrap:anywhere;margin-top:6px}
        .comparison-overview{min-width:0}.comparison-overview p{overflow-wrap:anywhere}
        .comparison-legend{display:flex;flex-wrap:wrap;gap:12px;font-size:12px;margin-top:8px}.comparison-legend span{display:inline-flex;align-items:center;gap:5px}.comparison-legend i{display:inline-block;width:12px;height:12px;border-radius:2px;background:var(--sr-primary)}.comparison-legend .previous i{background:var(--sr-text);opacity:.25}\n        .comparison-days{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:6px}
        .comparison-mini-day{border:0;background:none;color:var(--sr-text);font:inherit;min-width:0;min-height:44px;padding:4px;cursor:pointer}
        .comparison-mini-bars{height:90px;display:flex;align-items:flex-end;gap:3px;border-bottom:1px solid var(--sr-border)}
        .comparison-mini-bar{flex:1;background:var(--sr-primary);min-height:2px}.comparison-mini-bar.previous{background:var(--sr-text);opacity:.25}.comparison-mini-bar.gap{background:transparent;border:1px dashed var(--sr-border);box-sizing:border-box;min-height:6px}.comparison-mini-bar.partial{background-image:repeating-linear-gradient(45deg,transparent,transparent 3px,var(--sr-card) 3px,var(--sr-card) 5px)}
        .comparison-mini-day small{display:block;font-size:10px;overflow-wrap:anywhere;margin-top:5px}
        .comparison-details>summary{cursor:pointer;min-height:44px;display:flex;align-items:center;gap:8px}.comparison-details>summary:before{content:'▸'}.comparison-details[open]>summary:before{content:'▾'}
        .comparison-mini-day:focus-visible,.comparison-details>summary:focus-visible{outline:2px solid var(--sr-primary);outline-offset:2px}`;
      section.appendChild(style);
      for (const [side,label] of [['current','Current period'],['previous','Previous period']]) {
        const snapshot=pair[side],context=document.createElement('p');context.className='muted comparison-context';
        context.textContent=snapshot?`${this._t(label)}: ${this._formatPeriodDate(snapshot.period.start,snapshot.period.time_zone)} → ${this._formatPeriodDate(snapshot.period.end,snapshot.period.time_zone)} · ${snapshot.period.time_zone} · ${this._t('Missing energy days')}: ${snapshot.coverage.missing_energy_days}`:`${this._t(label)}: — · ${this._t(pair.reason || 'unavailable')}`;
        if(snapshot?.status==='error')context.textContent=`${this._t('Previous period could not be loaded.')} · ${snapshot.period.start} → ${snapshot.period.end}`;
        section.appendChild(context);
      }
      if(this._energyView==='summary') {
        const title=document.createElement('h3');title.textContent=this._t('Recorded consumption by day');section.appendChild(title);
        const days=document.createElement('div');days.className='comparison-days';days.setAttribute('role','group');days.setAttribute('aria-label',this._t('Previous period comparison'));
        const shown=pair.daily.slice(0,7),scale=Math.max(0,...shown.flatMap(d=>[d.current.energy.recorded_value,d.previous?.energy.recorded_value]).filter(Number.isFinite));
        for(const day of shown){
          const button=document.createElement('button');button.type='button';button.className='comparison-mini-day';
          const bars=document.createElement('span');bars.className='comparison-mini-bars';bars.setAttribute('aria-hidden','true');const labels=[];
          for(const side of ['previous','current']){
            const metric=day[side]?.energy,value=metric?.recorded_value ?? null,bar=document.createElement('span');bar.className=`comparison-mini-bar ${side} ${value===null?'gap':metric.status==='ready'?'':'partial'}`;
            bar.style.height=`${value===null?100:scale?Math.max(0,value)/scale*100:0}%`;bars.appendChild(bar);
            labels.push(`${this._t(side==='current'?'Current period':'Previous period')}: ${this._formatNumber(value,2)} kWh · ${this._t(metric?.status || 'no_data')}`);
          }
          const date=document.createElement('small');date.textContent=new Intl.DateTimeFormat(languageOf(this._hass),{month:'numeric',day:'numeric',timeZone:pair.current.period.time_zone}).format(new Date(day.current.start));
          const label=`${this._formatPeriodDate(day.current.start,pair.current.period.time_zone)} · ${labels.join(' · ')}`;button.setAttribute('aria-label',label);button.title=label;button.append(bars,date);
          button.addEventListener('click',()=>{this._comparisonSelectedDay=day.current.start;this._comparisonDetailsOpen=true;this._renderEnergyState();this._focusReportControl(this.shadowRoot.querySelector('[data-comparison-view][aria-selected="true"]'));});days.appendChild(button);
        }section.appendChild(days);
        const legend=document.createElement('div');legend.className='comparison-legend';
        for(const [side,label]of [['current','Current period'],['previous','Previous period']]){const item=document.createElement('span');item.className=side;const swatch=document.createElement('i');swatch.setAttribute('aria-hidden','true');item.append(swatch,document.createTextNode(this._t(label)));legend.appendChild(item);}section.appendChild(legend);
        if(pair.daily.length>7){const more=document.createElement('p');more.className='muted';more.textContent=this._t('Comparison details');section.appendChild(more);}
      }
      const detail=document.createElement('details');detail.className='comparison-details';detail.open=this._comparisonDetailsOpen===true;
      const summary=document.createElement('summary');summary.textContent=this._t('Comparison details');summary.dataset.reportControl='comparison-details';detail.appendChild(summary);
      detail.addEventListener('toggle',()=>{if(detail.isConnected)this._comparisonDetailsOpen=detail.open;});
      this._renderPeriodComparison(detail,pair);section.appendChild(detail);container.appendChild(section);
    }

    _renderPeriodComparison(container, pair) {
      const section = document.createElement('section'); section.className = 'comparison section'; section.dataset.comparison = '';
      // Scoped styles keep the existing Smart19 settings and chart CSS intact.
      const style = document.createElement('style'); style.textContent = `
        .comparison{container-type:inline-size;container-name:smart-comparison;border:1px solid var(--sr-border);border-radius:12px;padding:16px;min-width:0}.comparison p,.comparison dd{overflow-wrap:anywhere}.comparison-context{font-size:12px;line-height:1.6}.comparison .summary{grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr))}
        .comparison-pair{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:8px 0}.comparison-day{font:inherit;background:var(--sr-card);color:var(--sr-text);border:1px solid var(--sr-border);border-radius:8px;padding:10px;text-align:left;display:grid;gap:6px;min-width:0;min-height:44px;cursor:pointer}.comparison-day[aria-pressed=true]{outline:2px solid var(--sr-primary);outline-offset:1px}.comparison-day strong,.comparison-day small{overflow-wrap:anywhere}.comparison-day[data-availability=partial]{border-style:dashed}.comparison-day[data-availability=gap]{opacity:.8}
        .comparison-track{height:10px;position:relative;border-radius:4px;background:var(--sr-border);overflow:hidden;display:block}.comparison-track.signed:after{content:'';position:absolute;left:50%;height:100%;border-left:1px solid var(--sr-text)}.comparison-fill{position:absolute;top:0;height:100%;background:var(--sr-primary);max-width:100%}.comparison-day[data-side=previous] .comparison-fill{background:var(--sr-text);opacity:.65}.comparison-day[data-availability=partial] .comparison-fill{background-image:repeating-linear-gradient(45deg,transparent,transparent 4px,var(--sr-card) 4px,var(--sr-card) 6px)}
        .comparison-record{border-bottom:1px solid var(--sr-border);padding:12px 0}.comparison-record dl{display:grid;grid-template-columns:minmax(90px,1fr) minmax(0,3fr);gap:6px}.comparison-record dd{margin:0}.comparison button:focus-visible{outline:2px solid var(--sr-primary);outline-offset:2px}@container smart-comparison (max-width:500px){.comparison-pair{grid-template-columns:minmax(0,1fr)}.comparison-record dl{grid-template-columns:minmax(0,1fr)}}`;
      section.appendChild(style);
      const heading = document.createElement('h3'); heading.textContent = this._t('Previous period comparison'); section.appendChild(heading);
      for (const [side,snapshot] of [['current',pair.current],['previous',pair.previous]]) {
        const context = document.createElement('p'); context.className = 'muted comparison-context'; context.dataset.comparisonPeriod = side;
        context.textContent = snapshot ? `${this._t(side === 'current' ? 'Current period' : 'Previous period')}: ${this._formatPeriodDate(snapshot.period.start,snapshot.period.time_zone)} → ${this._formatPeriodDate(snapshot.period.end,snapshot.period.time_zone)} · ${snapshot.period.time_zone} · ${this._formatNumber(snapshot.period.actual_hours,2)} h · UTC ${snapshot.period.start} → ${snapshot.period.end} · ${this._t('Missing energy days')}: ${snapshot.coverage.missing_energy_days} · ${this._t('Missing cost days')}: ${snapshot.coverage.missing_cost_days} · ${this._t('source hours')}: ${this._formatNumber(snapshot.coverage.observed_energy_source_hours,2)}/${this._formatNumber(snapshot.coverage.expected_energy_source_hours,2)}`
          : `${this._t('Previous period')}: — · ${this._t(pair.reason || 'unavailable')} · ${JSON.stringify(pair.requested_local_cutoff)}`;
        if (snapshot?.status === 'error') context.textContent = `${this._t('Previous period could not be loaded.')} · ${snapshot.period.start} → ${snapshot.period.end} · ${snapshot.period.time_zone}`;
        section.appendChild(context);
      }
      const scope = document.createElement('p'); scope.className = 'muted comparison-context'; scope.textContent = `${this._t('Source evidence')}: ${pair.scope.map(source => `${this._t(source.role)}: ${source.statistic_id} (${source.unit || '—'})`).join(' · ')}`; section.appendChild(scope);
      const metrics = document.createElement('div'); metrics.className = 'summary';
      for (const [key,label] of [['energy','Change in measured energy'],['cost','Change in energy cost']]) {
        const metric = pair.metrics[key];
        metrics.appendChild(this._metric(label, `${this._formatNumber(metric.delta,2)} ${metric.unit || ''} · ${this._formatNumber(metric.percent,2)}%`));
        const reason = document.createElement('p'); reason.className = 'muted comparison-context'; reason.dataset.comparisonReason = key;
        reason.textContent = `${this._t(label)}: ${this._t(metric.reason || 'ready')} · ${this._t(metric.provenance)}`; metrics.appendChild(reason);
      }
      section.appendChild(metrics);
      const note = document.createElement('p'); note.className = 'muted'; note.textContent = this._t('Recorded values cover available samples only; gaps are not zero.'); section.appendChild(note);
      const nav = document.createElement('nav'); nav.dataset.reportNav='comparison'; nav.className = 'report-views'; nav.setAttribute('role','tablist'); nav.setAttribute('aria-label',this._t('Previous period comparison'));
      const rerender = selector => { this._renderEnergyState(); this._focusReportControl(this.shadowRoot.querySelector(selector)); };
      for (const [key,label] of [['chart','Chart'],['data','Data']]) {
        const button = document.createElement('button'); button.type='button'; button.className='action'; button.dataset.comparisonView=key;
        button.textContent=this._t(label); button.setAttribute('role','tab'); button.setAttribute('aria-selected',String((this._comparisonView || 'chart')===key));
        button.addEventListener('click',()=>{this._comparisonView=key;rerender(`[data-comparison-view="${key}"]`);}); nav.appendChild(button);
      } section.appendChild(nav);
      const panel=document.createElement('div'); panel.setAttribute('role','tabpanel');
      const selected=pair.daily.find(day=>day.current.start===this._comparisonSelectedDay);
      if(!selected)this._comparisonSelectedDay=null;
      if(selected){const detail=document.createElement('p');detail.dataset.comparisonSelectedDay=selected.current.start;
        detail.textContent=`${this._t('Current period')}: ${selected.current.start} → ${selected.current.end} · ${this._t('Previous period')}: ${selected.previous?.start || '—'} → ${selected.previous?.end || '—'}`;panel.appendChild(detail);
        const clear=document.createElement('button');clear.type='button';clear.className='action';clear.dataset.comparisonClear='';clear.textContent=this._t('All hours');
        clear.addEventListener('click',()=>{this._comparisonSelectedDay=null;this._comparisonDataPage=0;rerender('[data-comparison-view][aria-selected="true"]');});panel.appendChild(clear);}
      const paginate=(count,size,property,attribute)=>{
        const pages=Math.max(1,Math.ceil(count/size));this[property]=Math.max(0,Math.min(pages-1,this[property] || 0));
        const controls=document.createElement('nav');controls.className='tariff-pagination';controls.setAttribute('aria-label',this._t(attribute==='comparisonDataPage'?'Hourly records':'Daily overview'));
        const status=document.createElement('span');status.textContent=`${this._t('Page')} ${this[property]+1}/${pages}`;controls.appendChild(status);
        for(const [direction,label,offset] of [['previous','Previous',-1],['next','Next',1]]){const button=document.createElement('button');button.type='button';button.className='action';button.dataset[attribute]=direction;button.textContent=this._t(label);button.disabled=offset<0?this[property]===0:this[property]===pages-1;
          button.addEventListener('click',()=>{this[property]+=offset;rerender(`[data-${attribute==='comparisonDataPage'?'comparison-data-page':'comparison-chart-page'}="${direction}"]:not([disabled]),[data-comparison-view][aria-selected="true"]`);});controls.appendChild(button);}
        panel.appendChild(controls);return this[property]*size;
      };
      if((this._comparisonView || 'chart')==='data'){
        const records=selected?pair.records.filter(record=>record.day_index===selected.index):pair.records;
        const offset=paginate(records.length,50,'_comparisonDataPage','comparisonDataPage');
        for(const record of records.slice(offset,offset+50)){
          const row=document.createElement('article');row.className='comparison-record';row.dataset.comparisonRecord=record.from;row.dataset.comparisonDay=pair.daily[record.day_index]?.current.start || '';row.dataset.side=record.side;
          const title=document.createElement('h4');title.textContent=`${this._t(record.side==='current'?'Current period':'Previous period')} · ${this._formatPeriodDate(record.from,pair.current.period.time_zone)} → ${this._formatPeriodDate(record.to,pair.current.period.time_zone)}`;row.appendChild(title);
          const dl=document.createElement('dl');const priced=record.role==='priced_energy';
          const fields = [['Sources',(record.source_statistic_ids || []).join(', ')],['Role',this._t(record.role)],['Recorded value',`${this._formatNumber(priced?record.energyCost:record.recorded_value,2)} ${priced?record.currency:record.unit || ''}`],['Status',this._t(record.reason || record.status || (record.available?'ready':'partial'))],['Daily allocation',this._t(record.day_allocation_reason || 'Whole reading in this day')],['source hours',record.coverage?`${record.coverage.observed_hours}/${record.coverage.expected_hours}`:priced?`${record.available?1:0}/1`:'—'],['UTC interval',`${record.from} → ${record.to}`]];
          if(priced)fields.push(['Measured energy',`${this._formatNumber(record.kwh,2)} kWh`],['Energy / kWh',`${this._formatNumber(record.energyRate,4)} ${record.currency || '—'}/kWh`],['Zone',(record.zones || []).join(', ') || '—'],['Revision',String(record.revision ?? '—')]);
          for(const [label,value] of fields){const dt=document.createElement('dt');dt.textContent=this._t(label);const dd=document.createElement('dd');dd.textContent=value;dl.append(dt,dd);}row.appendChild(dl);panel.appendChild(row);
        }
      }else{
        const offset=paginate(pair.daily.length,7,'_comparisonChartPage','comparisonChartPage');
        for(const [key,label] of [['energy','Measured energy'],['cost','Priced energy']]){
          const chart=document.createElement('section');chart.className='comparison-chart';const unit=key==='energy'?'kWh':pair.current.cost.currency || pair.previous?.cost.currency || '—';
          chart.setAttribute('aria-label',`${this._t(label)} (${unit})`);const axis=document.createElement('h4');axis.textContent=`${this._t(label)} · ${unit}`;chart.appendChild(axis);
          const values=pair.daily.flatMap(day=>[day.current[key].recorded_value,day.previous?.[key].recorded_value]).filter(value=>typeof value==='number'&&Number.isFinite(value));
          const scale=values.reduce((max,value)=>Math.max(max,Math.abs(value)),0);const signed=values.some(value=>value<0);
          for(const day of pair.daily.slice(offset,offset+7)){
            const group=document.createElement('div');group.className='comparison-pair';
            for(const side of ['current','previous']){
              const snapshot=day[side],metric=snapshot?.[key],value=metric?.recorded_value ?? null;
              const button=document.createElement('button');button.type='button';button.className='comparison-day';button.dataset.comparisonDay=day.current.start;button.dataset.comparisonMetric=key;button.dataset.side=side;
              button.dataset.availability=value===null?'gap':metric.status==='ready'?'ready':'partial';button.setAttribute('aria-pressed',String(selected?.index===day.index));
              const date=document.createElement('span');date.textContent=`${this._t(side==='current'?'Current period':'Previous period')} · ${snapshot?this._formatPeriodDate(snapshot.start,pair.current.period.time_zone):'—'}`;
              const amount=document.createElement('strong');amount.textContent=`${this._formatNumber(value,2)} ${metric?.unit || unit}`;
              const status=document.createElement('small');status.textContent=`${this._t(metric?.status || 'no_data')} · ${this._formatNumber(metric?.observed_source_hours,2)}/${this._formatNumber(metric?.expected_source_hours,2)} ${this._t('source hours')}`;
              const track=document.createElement('span');track.className=`comparison-track${signed?' signed':''}`;track.setAttribute('aria-hidden','true');
              if(typeof value==='number'&&Number.isFinite(value)){const fill=document.createElement('span');fill.className='comparison-fill';const width=scale?Math.min(signed?50:100,Math.abs(value)/scale*(signed?50:100)):0;fill.style.width=`${width}%`;fill.style.left=`${signed?(value<0?50-width:50):0}%`;track.appendChild(fill);}
              button.title=snapshot?`${snapshot.start} → ${snapshot.end}`:this._t(pair.reason || 'unavailable');button.append(date,amount,status,track);
              button.addEventListener('click',()=>{this._comparisonSelectedDay=day.current.start;this._comparisonDataPage=0;rerender(`[data-comparison-day="${day.current.start}"][data-comparison-metric="${key}"][data-side="${side}"]`);});group.appendChild(button);
            }chart.appendChild(group);
          }panel.appendChild(chart);
        }
      }section.appendChild(panel);container.appendChild(section);
    }

    _filteredDevices(devices) {
      const query = String(this._deviceQuery || '').trim().toLocaleLowerCase();
      return query ? devices.filter(row => [row.label, row.statistic_id].some(value => String(value || '').toLocaleLowerCase().includes(query))) : devices;
    }

    _renderDeviceSearch(container, devices) {
      const controls = document.createElement('div'); controls.className = 'device-search-form';
      const label = document.createElement('label'); label.textContent = this._t('Search devices or sources');
      const input = document.createElement('input'); input.type = 'search'; input.className = 'device-search'; input.maxLength = 256;
      input.value = this._deviceQuery || ''; input.placeholder = this._t('Name or entity/statistic ID');
      input.addEventListener('input', () => { this._deviceQuery = input.value.slice(0,256); this._renderEnergyState(); });
      input.addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); this._deviceQuery = ''; this._renderEnergyState(); } });
      label.appendChild(input);
      const clear = document.createElement('button'); clear.type = 'button'; clear.className = 'action device-search-clear'; clear.textContent = this._t('Clear search');
      clear.addEventListener('click', () => { this._deviceQuery = ''; this._renderEnergyState(); this.shadowRoot.querySelector('.device-search')?.focus(); });
      controls.append(label,clear); container.appendChild(controls);
      const count = document.createElement('p'); count.className = 'muted device-search-count'; count.setAttribute('role','status'); count.setAttribute('aria-live','polite');
      count.textContent = `${this._t('Shown devices')}: ${this._filteredDevices(devices).length} / ${devices.length}`; container.appendChild(count);
      const note = document.createElement('p'); note.className = 'muted device-export-note'; note.textContent = this._t('Export includes all devices and sources in this report, including those hidden by search.'); container.appendChild(note);
    }

    _coverageText(source) {
      const coverage = source.coverage;
      const hours = value => this._formatNumber(value, Number.isInteger(value) ? 0 : 2);
      return coverage ? `${hours(coverage.observed_hours)} / ${hours(coverage.expected_hours)} h · ${this._t(source.status)}` : this._t(source.status || 'no_data');
    }

    _barChart(rows, label, unit, {scaleRows = rows, deviceContext = null} = {}) {
      const chart = document.createElement('section'); chart.className = 'bar-chart section'; chart.setAttribute('aria-label', this._t(label));
      const finite = row => typeof row.recorded_value === 'number' && Number.isFinite(row.recorded_value) ? row.recorded_value : (row.status === 'ready' && typeof row.value === 'number' && Number.isFinite(row.value) ? row.value : null);
      const maximum = Math.max(0, ...scaleRows.map(row => finite(row) || 0));
      for (const source of rows) {
        const row = document.createElement('div'); row.className = `chart-row${source.depth > 0 ? ' child' : ''}`;
        if (deviceContext) row.dataset.deviceStatistic = source.statistic_id;
        const name = document.createElement('span'); name.className = 'row-name'; name.textContent = source.label || source.statistic_id;
        const measured = finite(source); const value = document.createElement('span'); value.textContent = `${this._formatNumber(measured, unit ? 2 : 0)}${unit ? ` ${unit}` : ''}`;
        const track = document.createElement('div'); track.className = 'bar-track';
        const bar = document.createElement('div'); bar.className = 'bar-fill'; bar.style.width = `${maximum > 0 && measured !== null ? Math.max(0, Math.min(100, measured / maximum * 100)) : 0}%`;
        if (measured !== null) { track.setAttribute('role', 'meter'); track.setAttribute('aria-label', name.textContent); track.setAttribute('aria-valuemin', '0'); track.setAttribute('aria-valuemax', String(Math.max(maximum, measured))); track.setAttribute('aria-valuenow', String(measured)); track.setAttribute('aria-valuetext', `${value.textContent} · ${this._coverageText(source)}`); }
        track.appendChild(bar); row.append(name, value, track);
        if (unit) { const coverage = document.createElement('small'); coverage.className = source.status === 'ready' ? 'muted' : 'warning'; coverage.textContent = this._coverageText(source); row.appendChild(coverage); }
        if (deviceContext && source.included_in_stat) {
          const parent = deviceContext.get(source.included_in_stat);
          const context = document.createElement('small'); context.className = 'muted';
          context.textContent = `${this._t('Parent device')}: ${parent?.label || source.included_in_stat}${parent?.label && parent.label !== source.included_in_stat ? ` (${source.included_in_stat})` : ''}`;
          row.appendChild(context);
        }
        chart.appendChild(row);
      }
      return chart;
    }

    _renderDailyChart(container, state) {
      const days = state.daily || [];
      if (!days.length) return;
      const zone = state.period.time_zone;
      const windowKey = JSON.stringify([state.period.start, state.period.end, zone]);
      if (this._dailyWindow !== windowKey) {
        this._dailyWindow = windowKey;
        this._dailySelectedDay = null;
        this._dailyPage = 0;
      }
      const selected = days.find(day => day.start === this._dailySelectedDay);
      if (!selected) this._dailySelectedDay = null;
      const view = this._dailyView || 'chart';
      const pages = Math.max(1, Math.ceil(days.length / 7));
      this._dailyPage = Math.max(0, Math.min(pages - 1, this._dailyPage || 0));
      const section = document.createElement('section'); section.className = 'daily-history section';
      section.setAttribute('aria-label', this._t('Recorded consumption by day'));
      const heading = document.createElement('h3'); heading.textContent = this._t('Recorded consumption by day'); section.appendChild(heading);
      const note = document.createElement('p'); note.className = 'muted';
      note.textContent = `${this._t('Select a day for its interval and measurement coverage.')} ${this._t('Striped days have incomplete history; empty days are not measured zero.')}`; section.appendChild(note);
      const rerender = selector => {
        this._renderEnergyState();
        const target = this.shadowRoot.querySelector(selector);
        this._focusReportControl(target && !target.disabled ? target : this.shadowRoot.querySelector('[data-daily-view][aria-selected="true"]'));
      };
      const views = document.createElement('div'); views.className = 'report-views'; views.dataset.reportNav = 'daily';
      views.setAttribute('role', 'tablist'); views.setAttribute('aria-label', this._t('Daily consumption views'));
      for (const [key, label] of [['chart', 'Chart'], ['data', 'Data']]) {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'action'; button.dataset.dailyView = key;
        button.setAttribute('role', 'tab'); button.setAttribute('aria-selected', String(view === key)); button.textContent = this._t(label);
        button.addEventListener('click', () => { this._dailyView = key; rerender(`[data-daily-view="${key}"]`); }); views.appendChild(button);
      }
      section.appendChild(views);
      const panel = document.createElement('div'); panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-label', this._t(view === 'chart' ? 'Chart' : 'Data'));
      const list = document.createElement('div'); list.className = 'daily-list';
      const maximum = Math.max(0, ...days.map(day => day.recorded_value || 0));
      const energy = day => `${this._formatNumber(day.recorded_value, 2)} ${day.unit}`;
      const coverage = day => `${this._t(day.status === 'ready' ? 'Complete history' : day.status === 'partial' ? 'Partial history' : 'No measurements')} · ${this._formatNumber(day.observed_source_hours, Number.isInteger(day.observed_source_hours) ? 0 : 2)} / ${this._formatNumber(day.expected_source_hours, Number.isInteger(day.expected_source_hours) ? 0 : 2)} ${this._t('source hours')}`;
      for (const day of days.slice(this._dailyPage * 7, (this._dailyPage + 1) * 7)) {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'action daily-day';
        button.dataset.dailyDay = day.start; button.dataset.availability = day.status; button.setAttribute('aria-pressed', String(day === selected));
        const date = document.createElement('span'); date.className = 'daily-label';
        date.textContent = new Intl.DateTimeFormat(languageOf(this._hass), { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: zone }).format(new Date(day.start));
        const value = document.createElement('strong'); value.className = 'daily-value'; value.textContent = energy(day);
        const status = document.createElement('span'); status.className = 'daily-coverage'; status.textContent = coverage(day);
        button.append(date, value, status);
        if (view === 'chart') {
          const track = document.createElement('span'); track.className = 'daily-track'; track.setAttribute('aria-hidden', 'true');
          const fill = document.createElement('span'); fill.className = 'bar-fill';
          fill.style.width = `${maximum > 0 && day.recorded_value != null ? Math.max(0, Math.min(100, day.recorded_value / maximum * 100)) : 0}%`;
          track.appendChild(fill); button.appendChild(track);
        }
        button.addEventListener('click', () => { this._dailySelectedDay = day.start; rerender(`[data-daily-day="${day.start}"]`); });
        list.appendChild(button);
      }
      panel.appendChild(list);
      const nav = document.createElement('nav'); nav.className = 'tariff-pagination'; nav.setAttribute('aria-label', this._t('Daily overview'));
      const page = document.createElement('span'); page.textContent = `${this._t('Page')} ${this._dailyPage + 1}/${pages}`; nav.appendChild(page);
      for (const [key, label, offset] of [['previous', 'Previous', -1], ['next', 'Next', 1]]) {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'action'; button.dataset.dailyPage = key; button.textContent = this._t(label);
        button.disabled = this._dailyPage + offset < 0 || this._dailyPage + offset >= pages;
        button.addEventListener('click', () => { this._dailyPage += offset; rerender(`[data-daily-page="${key}"]`); }); nav.appendChild(button);
      }
      panel.appendChild(nav);
      if (selected) {
        const detail = document.createElement('section'); detail.className = 'daily-detail'; detail.dataset.dailyDetail = selected.start; detail.setAttribute('role', 'status');
        const title = document.createElement('h4'); title.textContent = this._t('Day details'); detail.appendChild(title);
        for (const text of [
          `${this._formatPeriodDate(selected.start, zone)} – ${this._formatPeriodDate(selected.end, zone)} · ${zone}`,
          `${energy(selected)} · ${coverage(selected)}`,
          `${this._t('UTC interval')}: ${selected.start} → ${selected.end}`,
        ]) { const line = document.createElement('p'); line.textContent = text; detail.appendChild(line); }
        const clear = document.createElement('button'); clear.type = 'button'; clear.className = 'action'; clear.dataset.dailyClear = ''; clear.textContent = this._t('Clear day selection');
        clear.addEventListener('click', () => { this._dailySelectedDay = null; rerender(`[data-daily-day="${selected.start}"]`); }); detail.appendChild(clear);
        const selectedButton = Array.from(list.querySelectorAll('[data-daily-day]')).find(button => button.dataset.dailyDay === selected.start);
        if (selectedButton) selectedButton.after(detail); else panel.appendChild(detail);
      }
      section.appendChild(panel); container.appendChild(section);
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
      const association = this._observeReviewedExportSource();
      const sameSource = this._exportSourceAssociation === association;
      this._exportSourceAssociation = association;
      if (JSON.stringify(state) === JSON.stringify(this._energyViewState)) {
        if (!sameSource) this._invalidateReviewedExport();
        return; // Identical measurements preserve the live DOM and focus.
      }
      this._energyViewState = state;
      this._invalidateReviewedExport();
      if (this._scaffoldRendered && this._activeTab === 'energy') this._renderEnergyState();
    }

    _stateBlock(title, detail, className, role, result = className || 'not_checked') {
      const block = document.createElement('section'); block.className = `state ${className || ''}`.trim(); if (role) block.setAttribute('role', role);
      const badge = document.createElement('div');
      badge.innerHTML = createUiV3({ language: languageOf(this._hass) }).statusHtml(result);
      block.appendChild(badge);
      const heading = document.createElement('h3'); heading.textContent = this._t(title); block.appendChild(heading);
      if (detail) { const paragraph = document.createElement('p'); paragraph.className = 'muted'; paragraph.textContent = this._t(detail); block.appendChild(paragraph); }
      return block;
    }

    _renderEnergyState() {
      this._tariffGuard?.observe();
      if (!this._scaffoldRendered) return;
      const container = this.shadowRoot.getElementById('content'); const state = this._energyViewState || { status: 'idle' };
      const exportable = ['ready', 'partial', 'no_data'].includes(state.status);
      const focused = this.shadowRoot.activeElement;
      const remembered = this._rememberReportFocus(focused);
      const focus = remembered || (focused === this._pendingReportFocus?.anchor ? this._pendingReportFocus.snapshot : null);
      this._pendingReportFocus = null;
      try {
      const tariffMarkup = this._config.energy_cost_mode === 'configured_tariff' ? this._tariffController().markup() : null;
      this.shadowRoot.getElementById('exportJsonBtn').disabled = !exportable; this.shadowRoot.getElementById('exportCsvBtn').disabled = !exportable; container.replaceChildren();
      this._renderTariffSettings(container, tariffMarkup);
      this._renderComparisonToggle(container);
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
        const retry = document.createElement('button'); retry.type = 'button'; retry.dataset.reportControl = 'retry'; retry.className = 'action'; retry.textContent = this._t('Retry'); retry.addEventListener('click', () => this._scheduleRefresh(true), { once: true }); block.appendChild(retry); container.appendChild(block); return;
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
        if(state.comparison)this._renderComparisonOverview(container,state.comparison);
        container.appendChild(this._stateBlock('No recorded energy change in this period.', 'Measured zero is rendered separately; this state means no recorder samples were available.', '', 'status', 'no_data'));
        this._renderDailyChart(container, state);
        if (period.start === period.end) { const note = document.createElement('p'); note.className = 'muted section'; note.textContent = this._t('Today starts reporting after its first completed hour.'); container.appendChild(note); }
        return;
      }
      this._renderEnergyViews(container);
      if (state.status === 'partial') container.appendChild(this._stateBlock('Partial history — recorded values only.', 'At least one required statistic was missing, invalid, incomplete, or used an incompatible currency.', 'partial', 'status'));
      const summary = document.createElement('section'); summary.className = 'summary';
      const recordedTotal = state.recorded_total || {};
      const recordedCost = state.cost?.method === 'configured_tariff' ? {} : state.recorded_cost || {};
      summary.appendChild(this._metric(state.status === 'partial' ? 'Recorded consumption' : 'Grid import', `${this._formatNumber(state.status === 'partial' ? recordedTotal.value : state.total.value, 2)} ${state.total.unit || 'kWh'}`));
      const costLabel = state.cost && state.cost.method === 'configured_tariff' ? 'Configured tariff energy cost' : state.cost && state.cost.method === 'cost_statistics' ? 'Actual cost' : (state.cost && state.cost.method === 'flat_rate_estimate' ? 'Estimated cost' : 'Cost unavailable');
      const costValue = state.cost && typeof state.cost.value === 'number' ? `${this._formatNumber(state.cost.value, 2)} ${state.cost.currency || ''}`.trim() : '—';
      summary.appendChild(this._metric(state.cost && state.cost.value == null && recordedCost.value != null ? 'Recorded cost' : costLabel, state.cost && state.cost.value == null && recordedCost.value != null ? `${this._formatNumber(recordedCost.value, 2)} ${recordedCost.unit || ''}` : costValue));
      summary.appendChild(this._metric('Sources with data', `${recordedTotal.sources_with_data || 0} / ${(state.total_sources || []).length}`));
      summary.appendChild(this._metric('Complete sources', `${recordedTotal.complete_sources || 0} / ${(state.total_sources || []).length}`));
      if(state.comparison){
        [...summary.children].forEach((metric,index)=>this._comparisonHint(metric,state.comparison,['energy','cost','sources','complete'][index]));
      }
      container.appendChild(summary);
      if(state.comparison)this._renderComparisonOverview(container,state.comparison);
      if (state.status === 'partial' || recordedCost.status === 'partial') { const note = document.createElement('p'); note.className = 'muted section'; note.textContent = this._t('Recorded values cover available samples only; gaps are not zero.'); container.appendChild(note); }
      if (this._energyView === 'summary' && !state.comparison) this._renderDailyChart(container, state);
      if (this._energyView !== 'costs') {
        const devices = state.devices || [];
        if (this._energyView === 'devices') this._renderDeviceSearch(container, devices);
        const heading = document.createElement('h3'); heading.className = 'section'; heading.textContent = this._t(state.top_ranking_available === false ? 'Device breakdown unavailable' : (state.device_data_status === 'partial' ? 'Reported devices — partial' : 'Device breakdown')); container.appendChild(heading);
        const shown = this._energyView === 'devices' ? this._filteredDevices(devices) : devices.slice(0, 6);
        if (shown.length) {
          container.appendChild(this._barChart(shown, 'Recorded energy by device', 'kWh', {scaleRows:this._energyView === 'devices' ? devices : shown,deviceContext:new Map(devices.map(row=>[row.statistic_id,row]))}));
          const note = document.createElement('p'); note.className = 'muted'; note.textContent = this._t('Device values have their own coverage; nested devices are included in their parent.'); container.appendChild(note);
          if (this._energyView === 'summary' && devices.length > 6) { const all = document.createElement('button'); all.type = 'button'; all.dataset.reportControl = 'all-devices'; all.className = 'action section'; all.textContent = this._t('See all devices'); all.addEventListener('click', () => { this._energyView = 'devices'; this._renderEnergyState(); }); container.appendChild(all); }
        } else { const empty = document.createElement('p'); empty.className = 'muted section'; empty.textContent = this._t(devices.length ? 'No matching devices' : 'No device statistics are configured.'); container.appendChild(empty); }
      }
      if (this._energyView !== 'devices') {
        if (state.cost?.method === 'configured_tariff') this._renderTariffEvidence(container,state.cost);
        else this._renderCostCoverage(container, state);
      }
      const evidence = document.createElement('details'); evidence.className = 'section source-evidence';
      const evidenceHeading = document.createElement('summary'); evidenceHeading.dataset.reportControl = 'source-evidence'; evidenceHeading.textContent = this._t('Source evidence'); evidence.appendChild(evidenceHeading);
      const evidenceList = document.createElement('div'); evidenceList.className = 'list';
      const evidenceSources = [...(state.total_sources || []), ...(state.cost_sources || [])];
      if (this._energyView === 'devices' && String(this._deviceQuery || '').trim()) evidence.open = true;
      for (const source of (this._energyView === 'devices' ? this._filteredDevices(evidenceSources) : evidenceSources)) {
        const row = document.createElement('div'); row.className = 'row'; row.dataset.energySource = source.statistic_id;
        const name = document.createElement('span'); name.className = 'row-name'; const sourceLabel = source.label || source.statistic_id; name.textContent = sourceLabel === source.statistic_id ? source.statistic_id : `${sourceLabel} (${source.statistic_id})`;
        const detail = document.createElement('span'); detail.className = source.status === 'ready' ? 'status-ready' : 'warning'; detail.textContent = source.reason ? `${this._t(source.status)}: ${this._t(source.reason)}` : this._t(source.status);
        row.append(name, detail); evidenceList.appendChild(row);
      }
      for (const warningText of state.warnings || []) { const warning = document.createElement('p'); warning.className = 'warning'; warning.textContent = this._warningText(warningText); evidenceList.appendChild(warning); }
      evidence.appendChild(evidenceList); container.appendChild(evidence);
      } finally {
        this._syncNavigation();
        if (focus) this._restoreReportFocus(focus, state.status);
      }
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
      this._tariffGuard?.observe();
      const state = this._energyViewState || {}; const period = state.period || this._periodDescriptor(); const total = state.total || {}; const cost = state.cost || {}; const generated = asDate(nowValue) || new Date();
      return {
        schema_version: state.comparison && this._config.compare_previous_period === true ? 3 : 2,
        ...(state.comparison && this._config.compare_previous_period === true ? { comparison: state.comparison } : {}),
        generated_at: generated.toISOString(),
        period: { key: period.key || this._period, start: period.start || null, end: period.end || null, time_zone: period.time_zone || this._timeZone() },
        source_mode: state.source_mode || (this._config.energy_source_mode === 'explicit' ? 'explicit' : 'energy_dashboard'),
        energy: {
          status: state.status || 'error',
          total: { label: 'Grid import', value: typeof total.value === 'number' && Number.isFinite(total.value) ? total.value : null, unit: total.unit || 'kWh', source_statistic_ids: Array.isArray(total.source_statistic_ids) ? [...total.source_statistic_ids] : [] },
          cost: { value: typeof cost.value === 'number' && Number.isFinite(cost.value) ? cost.value : null, currency: cost.currency || null, method: cost.method || 'unavailable', rate: typeof cost.rate === 'number' && Number.isFinite(cost.rate) ? cost.rate : null, source_statistic_ids: Array.isArray(cost.source_statistic_ids) ? [...cost.source_statistic_ids] : [], reason: cost.reason || null },
          ...(cost.method === 'configured_tariff' ? { tariff: { records: cost.records, daily: (cost.daily || []).map(({records, ...day}) => day), coverage: cost.coverage, revision: cost.revision ?? null, provenance: cost.provenance || null, currency: cost.currency, price_basis: cost.price_basis, tariff_timezone: cost.tariff_timezone, tariff_clock: cost.tariff_clock, fixed_monthly: cost.fixed_monthly ?? null, variable_cost: cost.variable_cost ?? null, usage_cost: cost.usage_cost ?? null, measured_energy_cost: cost.measured_energy_cost ?? null, current_profile_validity: cost.current_profile_validity || null } } : {}),
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
      if (typeof value === 'string' && /^(?:[\t\r\n]|[\u0000-\u0020]*[=+\-@])/.test(text)) { text = `'${text}`; forceQuote = true; }
      return forceQuote || /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
    }

    _buildCsv(documentValue) {
      const report = documentValue || this._buildExportDocument(this._now());
      const header = ['schema_version', 'generated_at', 'period_key', 'period_start', 'period_end', 'time_zone', 'section', 'metric', 'statistic_id', 'label', 'value', 'unit', 'status', 'provenance', 'included_in_stat', 'reason'];
      const base = [report.schema_version, report.generated_at, report.period.key, report.period.start, report.period.end, report.period.time_zone]; const rows = [header];
      rows.push([...base, 'energy', 'total', report.energy.total.source_statistic_ids.join('|'), report.energy.total.label, report.energy.total.value, report.energy.total.unit, report.energy.status, report.source_mode, '', '']);
      rows.push([...base, 'energy', 'cost', report.energy.cost.source_statistic_ids.join('|'), report.energy.cost.method, report.energy.cost.value, report.energy.cost.currency, report.energy.cost.value == null ? (report.energy.cost.reason || 'unavailable') : 'ready', report.energy.cost.method, '', report.energy.cost.reason]);
      for (const record of report.energy.tariff?.records || []) {
        for (const [key,kind,unit] of [['kwh','tariff_hour_energy','kWh'],['energyCost','tariff_hour_cost',record.currency],['energyRate','tariff_hour_rate',`${record.currency}/kWh`]]) rows.push([...base,'energy',kind,record.source_statistic_ids.join('|'),`${record.from} / ${record.to}`,record[key],unit,record.available?'ready':'partial','configured_tariff','',JSON.stringify({zones:record.zones,revision:record.revision,price_basis:record.price_basis,reason:record.reason})]);
      }
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
      if (report.comparison) {
        const pair = report.comparison;
        for (const [side, snapshot] of [['current', pair.current], ['previous', pair.previous]]) {
          const pairedBase = [report.schema_version, report.generated_at, snapshot?.period.key || report.period.key,
            snapshot?.period.start || null, snapshot?.period.end || null, snapshot?.period.time_zone || report.period.time_zone];
          rows.push([...pairedBase, 'comparison', 'comparison_snapshot', '', side, JSON.stringify(snapshot), '', snapshot?.status || pair.status, snapshot?.source_mode || '', '', pair.reason || '']);
        }
        for (const [key, metric] of Object.entries(pair.metrics)) rows.push([...base, 'comparison', 'comparison_metric', '', key, JSON.stringify(metric), metric.unit, metric.comparable ? 'ready' : 'partial', metric.provenance, '', metric.reason]);
        rows.push([...base, 'comparison', 'comparison_scope', '', '', JSON.stringify(pair.scope), '', pair.status, '', '', JSON.stringify({ reason: pair.reason, shift_days: pair.shift_days, requested_local_start: pair.requested_local_start, requested_local_cutoff: pair.requested_local_cutoff })]);
        for (const record of pair.records) {
          const p = (record.side === 'current' ? pair.current : pair.previous).period;
          rows.push([report.schema_version, report.generated_at, p.key, p.start, p.end, p.time_zone, 'comparison', 'comparison_record', record.statistic_id || (record.source_statistic_ids || []).join('|'), record.side, JSON.stringify(record), record.unit || record.currency, record.status || (record.available ? 'ready' : 'partial'), record.provenance || pair[record.side].cost.provenance, record.included_in_stat || '', record.reason || '']);
        }
      }
      return `${rows.map((row) => row.map((value) => this._csvCell(value)).join(',')).join('\n')}\n`;
    }


    _exportObjectIdentity(value) {
      if (!value || !['object','function'].includes(typeof value)) return 'none';
      this._exportObjects ||= new WeakMap();
      if (!this._exportObjects.has(value)) this._exportObjects.set(value, String(this._exportObjectSequence = (this._exportObjectSequence || 0) + 1));
      return this._exportObjects.get(value);
    }

    _readExportAssociation() {
      const h = this._hass;
      // Association stays local. Never put config, user, groups or connection data in a file.
      return JSON.stringify([h?.user?.id, h?.user?.is_admin, h?.user?.is_owner, h?.user?.is_active,
        h?.user?.groups, h?.user?.group_ids, this._exportObjectIdentity(h?.connection), this._exportObjectIdentity(h?.callWS),
        h?.connection?.connected, this._exportConnectionOffline, this._exportBrowserOffline, navigator.onLine,
        this._connected, this._activeTab, this._period, this._config, h?.language, h?.locale, h?.config]);
    }

    _invalidateReviewedExport(unavailable = false) {
      this._exportRevision = (this._exportRevision || 0) + 1;
      if (unavailable) this._exportSourceAssociation = null;
      this._exportDialog?.contextChanged();
    }

    _observeReviewedExportSource() {
      const association = this._readExportAssociation();
      if (this._exportObservedAssociation !== association) {
        this._exportObservedAssociation = association;
        this._energyRequestGeneration += 1;
        this._invalidateReviewedExport(true);
      }
      return association;
    }

    _bindReviewedExportEvents() {
      const next = this._hass?.connection;
      if (!this._exportBrowserEvent) {
        this._exportBrowserOffline = navigator.onLine === false;
        this._exportBrowserEvent = event => {
          this._exportBrowserOffline = event.type === 'offline';
          this._observeReviewedExportSource();
        };
        window.addEventListener('offline', this._exportBrowserEvent);
        window.addEventListener('online', this._exportBrowserEvent);
      }
      if (this._exportConnection !== next) {
        for (const type of ['ready','disconnected','reconnect-error']) this._exportConnection?.removeEventListener?.(type,this._exportConnectionEvent);
        this._exportConnection = next;
        this._exportConnectionOffline = next?.connected === false;
        this._exportConnectionEvent = event => {
          this._exportConnectionOffline = event.type !== 'ready';
          // An event is an epoch boundary even when the transport reuses its object.
          this._energyRequestGeneration += 1;
          this._invalidateReviewedExport(true);
          this._observeReviewedExportSource();
        };
        for (const type of ['ready','disconnected','reconnect-error']) next?.addEventListener?.(type,this._exportConnectionEvent);
      }
    }

    _unbindReviewedExportEvents() {
      window.removeEventListener('offline',this._exportBrowserEvent);
      window.removeEventListener('online',this._exportBrowserEvent);
      for (const type of ['ready','disconnected','reconnect-error']) this._exportConnection?.removeEventListener?.(type,this._exportConnectionEvent);
      this._exportBrowserEvent = null; this._exportConnection = null;
    }

    _reviewedExportContext() {
      const association = this._observeReviewedExportSource();
      const source = JSON.stringify(this._energyViewState);
      if (source !== this._exportObservedData) {
        this._exportObservedData = source;
        this._exportRevision = (this._exportRevision || 0) + 1;
      }
      const h = this._hass;
      const connected = this._connected && this.isConnected && navigator.onLine !== false && !this._exportBrowserOffline
        && !this._exportConnectionOffline && h?.connection?.connected !== false;
      // Smart Reports already grants household users read access. Export adds no admin gate.
      const canExport = !!h?.user?.id && h.user.is_active !== false && typeof h.callWS === 'function' && this._activeTab === 'energy';
      return { role: JSON.stringify([h?.user?.is_admin === true,h?.user?.is_owner === true,h?.user?.groups || [],h?.user?.group_ids || []]),
        userId: h?.user?.id || 'unavailable', connectionId:this._exportObjectIdentity(h?.connection || h?.callWS),
        datasetId:'smart-energy', revision:this._exportRevision || 1, connected, canExport,
        sourceConfirmed:this._exportSourceAssociation === association && ['ready','partial','no_data'].includes(this._energyViewState?.status) };
    }

    _projectReviewedExport(report, includePrivate) {
      return projectSmartReportV3(report, includePrivate === true);
    }

    _buildReviewedExport({draft,signal}) {
      if (signal.aborted || !this._reviewedExportContext().sourceConfirmed) return {status:'no_data'};
      // No new backend reads: project only the materialized current report.
      const report = this._projectReviewedExport(this._buildExportDocument(this._now()),draft.includePrivate);
      if (signal.aborted || !this._reviewedExportContext().sourceConfirmed) return {status:'no_data'};
      const pl = languageOf(this._hass).startsWith('pl');
      const included = [pl ? 'Pełny raport pomiarów: wszystkie źródła i urządzenia, także ukryte wyszukiwaniem; wartości zero, ujemne i braki null.'
        : 'Full measured report: all sources and devices, including those hidden by search; zero, negative and missing null values.',
        pl ? 'Zachowane zakresy, strefy czasu, pokrycie, taryfy, stawki, opłaty oraz obie migawki porównania, jeśli włączone.'
        : 'Preserved ranges, timezones, coverage, tariffs, rates, fees and both comparison snapshots when enabled.',
        draft.includePrivate ? (pl ? 'Sprawdzone nazwy źródeł/urządzeń i identyfikatory statystyk.' : 'Reviewed source/device names and statistic IDs.')
          : (pl ? 'Spójne aliasy źródeł, urządzeń, nazw i relacji.' : 'Consistent aliases for sources, devices, names and relationships.')];
      const excluded = [pl ? 'Tokeny, użytkownicy, adresy, konfiguracja, profile i szkice taryf oraz surowe błędy.'
        : 'Tokens, users, addresses, configuration, tariff profiles/drafts and raw errors.',
        pl ? 'Nieznane pola spoza jawnych schematów. Identyfikatory stref taryfowych zastąpione aliasami.'
          : 'Unknown fields outside explicit schemas. Tariff zone identifiers are aliased.',
        draft.includePrivate ? (pl ? 'Żadne inne pola prywatne nie są objęte zgodą.' : 'Consent covers no other private fields.')
          : (pl ? 'Prywatne nazwy i identyfikatory statystyk.' : 'Private names and statistic IDs.')];
      const sourceLimit = pl ? 'Tylko wczytany zakres Recorder. Retencja lub braki pomiarów pozostają widoczne; bez ekstrapolacji i bez obcięcia rekordów. Opłata stała jest osobna. CSV zawiera również pełny bezpieczny dokument w wierszu reviewed_full_document.'
        : 'Loaded Recorder range only. Retention or measurement gaps remain explicit; no extrapolation or record truncation. Fixed fee stays separate. CSV also carries the complete safe document in reviewed_full_document.';
      const partial = report.energy.status !== 'ready' || report.energy.cost.value === null || report.energy.devices.some(d => d.status !== 'ready')
        || !!report.energy.warnings.length || (!!report.comparison && report.comparison.status !== 'ready') || report.energy.tariff?.coverage?.complete === false;
      const resultState = report.energy.status === 'no_data' ? 'no_data' : partial ? 'partial' : 'success';
      report.export_scope = {policy:'smart-measured-report-v1',result_state:resultState,include_private:draft.includePrivate === true,
        included,excluded,source_limit:sourceLimit,truncated:false,search_applied:false,
        counts:{total_sources:report.energy.total_sources.length,cost_sources:report.energy.cost_sources.length,devices:report.energy.devices.length,
          tariff_records:report.energy.tariff?.records?.length || 0,comparison_records:report.comparison?.records?.length || 0,
          current_records:report.comparison?.current?.records?.length || 0,previous_records:report.comparison?.previous?.records?.length || 0}};
      const serialized = draft.format === 'json' ? JSON.stringify(report,null,2) + '\n' : this._buildReviewedCsv(report);
      // A confirmed no-data REPORT is a partial document, not a fabricated successful measurement.
      return {serialized,confirmed:true,sourceConfirmed:true,status:resultState === 'success' ? 'success' : 'partial',included,excluded,sourceLimit};
    }

    _buildReviewedCsv(report) {
      const csv = this._buildCsv(report);
      const row = [report.schema_version,report.generated_at,report.period.key,report.period.start,report.period.end,report.period.time_zone,
        'export','reviewed_full_document','','',JSON.stringify(report),'',report.export_scope.result_state,report.source_mode,'',''];
      // The legacy domain rows remain available; this row makes CSV lossless for
      // tariff daily records, fixed fees, coverage and paired data, with no limits.
      return csv + row.map(value => this._csvCell(value)).join(',') + '\n';
    }

    _downloadExport(format) {
      this._tariffGuard?.observe();
      const context = this._reviewedExportContext();
      if (!context.connected || !context.canExport || !context.sourceConfirmed) return;
      if (this.shadowRoot.querySelector('[data-ha-tools-export]')) return;
      this._exportDialog?.destroy();
      this._exportDialog = createExportDialog({root:this.shadowRoot,createUiV3,getLanguage:()=>languageOf(this._hass),
        getContext:()=>this._reviewedExportContext(),formats:['json','csv'],defaultFormat:format,
        defaultFilename:`smart-report-${this._period}.${format}`,
        policy:{id:'smart-measured-report-v1',allowlistedFields:['schema_version','generated_at','period','source_mode','energy','comparison','export_scope'],
          neverInclude:['tokens','users','addresses','raw_config','profiles','drafts','raw_errors']},
        buildPayload:options=>this._buildReviewedExport(options),
        performDownload:({blob,filename,signal})=>{
          if (signal.aborted) return {outcome:'unknown'};
          const url = URL.createObjectURL(blob), anchor = document.createElement('a');
          anchor.href=url;anchor.download=filename;
          try { anchor.click(); } finally { setTimeout(()=>URL.revokeObjectURL(url),1000); }
          return {outcome:'initiated'};
        }});
      this._exportDialog.open({opener:this.shadowRoot.getElementById(format === 'json' ? 'exportJsonBtn' : 'exportCsvBtn')});
    }

  }

  class HASmartReportsEditor extends HTMLElement {
    constructor() { super(); this.attachShadow({ mode: 'open' }); this._config = {}; }
    setConfig(config) {
      const next = config && typeof config === 'object' ? { ...config } : {};
      const same = JSON.stringify(next) === JSON.stringify(this._config);
      this._config = next;
      if (!same || !this.shadowRoot.firstChild) this._render();
    }
    set hass(hass) {
      const language = languageOf(hass);
      const changed = language !== this._language;
      this._language = language; this._hass = hass;
      if (changed) this._render(true);
    }
    _render(preserveDraft = false) {
      const active = this.shadowRoot.activeElement;
      const focus = active?.id ? {id:active.id,start:active.selectionStart,end:active.selectionEnd,direction:active.selectionDirection,value:active.value} : null;
      this.shadowRoot.replaceChildren();
      const style = document.createElement('style'); style.textContent = ':host{display:grid;gap:12px;padding:12px;color:var(--primary-text-color,#172033);font-family:system-ui,sans-serif}label{display:grid;gap:5px}input,select,textarea{min-height:44px;max-width:100%;min-width:0;box-sizing:border-box;font:inherit;padding:9px;border:1px solid var(--divider-color,#d9e0ea);border-radius:8px;background:var(--card-background-color,#fff);color:inherit}input:focus-visible,textarea:focus-visible,select:focus-visible{outline:2px solid var(--primary-color,#3b82f6);outline-offset:2px}[hidden]{display:none!important}';
      const field = (id, labelText, key) => { const label = document.createElement('label'); label.textContent = translate(this._hass, labelText); const input = document.createElement('input'); input.id = id; input.value = typeof this._config[key] === 'string' ? this._config[key] : ''; input.addEventListener('input', () => { this._config = { ...this._config, [key]: input.value }; this._dispatch(); }); label.appendChild(input); return label; };
      this.shadowRoot.append(style, field('cf_title', 'Title', 'title'), field('cf_currency', 'Currency', 'currency'));
      const modeLabel = document.createElement('label'); modeLabel.textContent = translate(this._hass, 'Source mode');
      const mode = document.createElement('select'); mode.id = 'cf_source_mode'; mode.style.cssText = 'font:inherit;padding:9px;background:var(--card-background-color,#fff);color:inherit;border:1px solid var(--divider-color,#d9e0ea);border-radius:8px';
      for (const [value, text] of [['dashboard', 'Energy Dashboard'], ['explicit', 'Explicit statistics']]) { const option = document.createElement('option'); option.value = value; option.textContent = translate(this._hass, text); mode.appendChild(option); }
      mode.value = this._config.energy_source_mode === 'explicit' ? 'explicit' : 'dashboard'; modeLabel.appendChild(mode); this.shadowRoot.appendChild(modeLabel);
      const sources = document.createElement('section'); sources.style.cssText = 'display:grid;gap:12px'; sources.hidden = mode.value !== 'explicit';
      for (const [key, title] of [['energy_total_statistics', 'Total statistic IDs'], ['energy_device_statistics', 'Device statistic IDs'], ['energy_cost_statistics', 'Cost statistic IDs']]) {
        const label = document.createElement('label'); label.textContent = translate(this._hass, title);
        const input = document.createElement('textarea'); input.id = `cf_${key}`; input.rows = 3; input.style.cssText = 'font:inherit;width:100%;box-sizing:border-box;padding:9px;background:var(--card-background-color,#fff);color:inherit;border:1px solid var(--divider-color,#d9e0ea);border-radius:8px';
        input.value = (Array.isArray(this._config[key]) ? this._config[key] : []).map(value => typeof value === 'string' ? value : value && value.statistic_id).filter(value => typeof value === 'string').join('\n');
        input.addEventListener('change', () => {
          const previous = new Map((Array.isArray(this._config[key]) ? this._config[key] : []).filter(Boolean).map(value => [typeof value === 'string' ? value : value.statistic_id, value]));
          const ids = [...new Set(input.value.split(/[\n,]/).map(value => value.trim()).filter(Boolean))];
          this._config = { ...this._config, [key]: ids.map(id => previous.get(id) || id) }; this._dispatch();
        }); label.appendChild(input); sources.appendChild(label);
      }
      const note = document.createElement('p'); note.textContent = translate(this._hass, 'One statistic ID per line. Advanced labels and parent relationships can be configured in YAML.'); note.style.fontSize = '12px'; sources.appendChild(note); this.shadowRoot.appendChild(sources);
      const rateLabel = document.createElement('label');rateLabel.textContent=translate(this._hass,'Flat rate per kWh');
      const rate=document.createElement('input');rate.type='number';rate.min='0';rate.step='any';rate.id='cf_energy_price';rate.value=typeof this._config.energy_price==='number'?String(this._config.energy_price):'';
      rate.addEventListener('change',()=>{const value=rate.value.trim()===''?null:Number(rate.value);this._config={...this._config,energy_price:typeof value==='number'&&Number.isFinite(value)&&value>=0?value:null};this._dispatch();});rateLabel.appendChild(rate);
      const costLabel=document.createElement('label');costLabel.textContent=translate(this._hass,'Cost mode');const costMode=document.createElement('select');costMode.id='cf_cost_mode';
      for(const [value,label] of [['auto','Recorded costs, then explicit flat estimate'],['cost_statistics','Recorded monetary statistics'],['flat_rate_estimate','Explicit flat-rate estimate'],['configured_tariff','Configured tariff from measured hours']]){const option=document.createElement('option');option.value=value;option.textContent=translate(this._hass,label);costMode.appendChild(option);}
      costMode.value=['cost_statistics','flat_rate_estimate','configured_tariff'].includes(this._config.energy_cost_mode)?this._config.energy_cost_mode:'auto';costMode.addEventListener('change',()=>{this._config={...this._config,energy_cost_mode:costMode.value};this._dispatch();});costLabel.appendChild(costMode);
      this.shadowRoot.append(costLabel,rateLabel);
      mode.addEventListener('change', () => { this._config = { ...this._config, energy_source_mode: mode.value }; sources.hidden = mode.value !== 'explicit'; this._dispatch(); });
      if (focus) {
        const target = this.shadowRoot.getElementById(focus.id);
        if (target && !target.closest('[hidden]')) {
          if (preserveDraft) target.value = focus.value;
          target.focus({preventScroll:true});
          if (focus.start != null && typeof target.setSelectionRange === 'function') target.setSelectionRange(focus.start,focus.end,focus.direction);
        }
      }
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
