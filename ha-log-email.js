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
  let calendarCompatible = false;
  let reading = null, writing = false, previewing = null, pendingExpected = null, preview = null;
  let status = { state: 'not_checked', reason: 'initial' }, previewStatus = { state: 'not_checked', reason: 'initial' };
  const cancellations = new Set();
  const capture = value => ({ user: value?.user?.id ?? value?.user ?? null, admin: value?.user?.is_admin === true,
    connection: value?.connection ?? null, online: !!value && !browserOffline && !connectionOffline && value.connected !== false && value.connection?.connected !== false });
  const allowed = () => !!hass && context?.admin && context?.online && !browserOffline && !connectionOffline && hass.user?.is_admin === true && hass.connected !== false && hass.connection?.connected !== false;
  const notify = () => changed();
  const reset = () => {
    epoch++; for (const cancel of [...cancellations]) cancel(); cancellations.clear();
    calendarCompatible = false; checked = false; rows = []; draft = null; privateRows = new Map(); privateDraft = null; pendingRecipients = null; reading = null; writing = false; previewing = null;
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
  // list_schedules also exists in 2.1.2, which silently drops calendar fields.
  // Confirm the loaded integration through HA's manifest API before any mutation.
  const supportsCalendar = manifest => {
    if (manifest?.domain !== 'ha_tools_email' || typeof manifest.version !== 'string' ||
      !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(manifest.version)) return false;
    const version = manifest.version.split('.').map(Number);
    return version.every(Number.isSafeInteger) && (version[0] > 2 || version[0] === 2 && version[1] >= 2);
  };
  const unavailable = error => ['unknown_command', 'not_found'].includes(error?.code);
  const read = () => {
    if (!allowed()) return Promise.resolve();
    if (typeof hass.callWS !== 'function') { checked = true; status = { state: 'not_checked', reason: 'unavailable' }; notify(); return Promise.resolve(); }
    if (reading) return reading.promise;
    const token = { epoch, promise: null }, source = hass;
    reading = token; calendarCompatible = false; checked = true; status = { state: pendingExpected ? 'unconfirmed' : 'not_checked', reason: 'loading' };
    token.promise = (async () => {
      try {
        const manifest = await request(source, { type: 'manifest/get', integration: 'ha_tools_email' }, token);
        if (epoch !== token.epoch || reading !== token || !allowed()) return;
        if (!supportsCalendar(manifest)) throw { code: 'not_found' };
        const response = await request(source, { type: 'ha_tools_email/list_schedules' }, token);
        if (epoch !== token.epoch || reading !== token || !allowed()) return;
        rows = cleanRows(response); calendarCompatible = true;
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
    if (!allowed() || !calendarCompatible || !draft || writing || reading || pendingExpected || !['success', 'no_data', 'error'].includes(status.state)) return;
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
    if (!allowed() || !calendarCompatible || reading || previewing || writing) return previewing?.promise || Promise.resolve();
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
      if (!allowed() || !calendarCompatible || writing || pendingExpected || reading || !['success', 'no_data', 'error'].includes(status.state)) return;
      const row = rows.find(value => value.id === id && value.kind === kind);
      if (!row) return;
      previewing?.cancel?.(); previewing = null;
      privateDraft = recipientEditor ? [...(privateRows.get(id) || [])] : null;
      draft = { ...row, timezone: row.timezone || '', weekday: row.weekday ?? 0, month_day: row.month_day ?? 1 };
      preview = null; previewStatus = { state: 'not_checked', reason: 'initial' }; notify();
    },
    create() {
      if (!allowed() || !calendarCompatible || reading || writing || pendingExpected || !['success', 'no_data'].includes(status.state)) return;
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
      if (!allowed() || !calendarCompatible || reading || writing || pendingExpected || !rows.some(row => row.id === id && row.kind === kind) || !['success', 'no_data', 'error'].includes(status.state)) return;
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
