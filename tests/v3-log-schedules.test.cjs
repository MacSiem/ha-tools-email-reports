'use strict';
// Source card contract tests. Run before implementation for RED, then after for GREEN.
// No live HA, SMTP, browser, generated bundle, or copied card implementation.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const source = fs.readFileSync(path.join(__dirname, '..', 'ha-log-email.js'), 'utf8');
const row = (extra = {}) => ({ id: 'log-existing', kind: 'log_digest', cadence: 'weekly', time: '08:30',
  enabled: false, weekday: 0, recipients: ['local-fixture@example.invalid'],
  next_fire: null, effective_timezone: 'Europe/Warsaw', ...extra });
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const settle = async () => { for (let i = 0; i < 15; i++) await Promise.resolve(); };
async function fixture(t, options = {}) {
  const dom = new JSDOM('<!doctype html><body></body>', { url: 'http://localhost/', runScripts: 'outside-only', pretendToBeVisual: true });
  t.after(() => dom.window.close());
  const { window } = dom;
  const deadlines = new Map(); let timerId = 1;
  const nativeSet = window.setTimeout.bind(window), nativeClear = window.clearTimeout.bind(window);
  window.setTimeout = (callback, delay, ...args) => {
    if (delay !== 8000) return nativeSet(callback, delay, ...args);
    const id = timerId++; deadlines.set(id, callback); return -id;
  };
  window.clearTimeout = id => { if (id < 0) deadlines.delete(-id); else nativeClear(id); };
  window.eval(source);
  const calls = [], services = [];
  let rows = options.rows || [row()], lists = 0;
  const hass = { user: { id: 'admin-a', is_admin: true }, connected: true, connection: { connected: true },
    locale: { language: options.lang || 'en' }, config: { time_zone: 'Europe/Warsaw' }, states: options.states || {}, services: {},
    callService: async (...args) => { services.push(JSON.parse(JSON.stringify(args))); return {}; },
    callWS: async msg => {
      calls.push(JSON.parse(JSON.stringify(msg)));
      if (msg.type === 'system_log/list') return options.logs || [];
      if (msg.type === 'ha_tools_email/list_schedules') { lists++; return options.list ? options.list(lists, rows) : { schedules: rows }; }
      if (msg.type === 'ha_tools_email/set_schedule') {
        if (options.save) return options.save(msg);
        rows = rows.map(r => { if (r.id !== msg.schedule.id) return r; const next = { ...r, ...msg.schedule }; if (next.use_ha_timezone === true) delete next.timezone; delete next.use_ha_timezone; return next; });
        if (!rows.some(r => r.id === msg.schedule.id)) rows.push(row({ ...msg.schedule }));
        return { schedule: rows.find(r => r.id === msg.schedule.id), schedules: rows };
      }
      if (msg.type === 'ha_tools_email/preview_log_digest') return options.preview || {
        cadence: msg.cadence, effective_timezone: 'Europe/Warsaw', total: 2,
        period: { from: '2026-09-01T00:00:00+00:00', to: '2026-10-01T00:00:00+00:00', semantics: 'previous_completed_calendar_period' },
        source: { name: 'system_log', count_semantics: 'retained_aggregates', complete: false, retained_entries: 2,
          reason: 'retained_last_observed_aggregates_not_full_event_history' }, level_counts: { ERROR: 2 }, logger_counts: { fixture: 2 }
      };
      throw new Error('Unexpected read: ' + msg.type);
    } };
  const card = window.document.createElement('ha-log-email');
  card.setConfig({ show_support: false }); window.document.body.append(card); card.hass = hass;
  await settle();
  const root = card.shadowRoot;
  const click = id => { const el = root.getElementById(id); assert.ok(el, id); el.click(); };
  const input = (id, value) => { const el = root.getElementById(id); assert.ok(el, id); if (el.type === 'checkbox') el.checked = value; else el.value = value; el.dispatchEvent(new window.Event('input', { bubbles: true })); el.dispatchEvent(new window.Event('change', { bubbles: true })); };
  const open = async () => { card.setActiveTab('schedule'); await settle(); };
  const edit = () => { const el = root.querySelector('[data-schedule-edit]'); assert.ok(el); el.click(); };
  const types = () => calls.map(c => c.type);
  return { card, hass, root, click, input, open, edit, calls, services, types, window,
    expire: () => { const pending = [...deadlines.values()]; deadlines.clear(); pending.forEach(fn => fn()); }, deadlines };
}
test('opening Schedule is readonly and coalesces list reads; no config/SMTP/save/send', async t => {
  const pending = deferred(); const f = await fixture(t, { list: () => pending.promise });
  f.card.setActiveTab('schedule'); f.card._render(); f.card._render(); await settle();
  assert.equal(f.types().filter(x => x.endsWith('/list_schedules')).length, 1);
  assert.equal(f.services.length, 0);
  assert.deepEqual(f.types().filter(x => x.startsWith('ha_tools_email/')), ['ha_tools_email/list_schedules']);
  pending.resolve({ schedules: [] }); await settle(); assert.match(f.root.textContent, /No data/);
});
test('explicit Save updates existing ID and confirms only separate exact list readback', async t => {
  const f = await fixture(t, { rows: [row(), row({ id: 'other-kind', kind: 'energy_report' }), row({ id: 'other-log' })] });
  await f.open(); f.edit(); f.input('schedule-time', '09:15'); f.input('schedule-enabled', true); f.click('schedule-save'); await settle();
  const writes = f.calls.filter(x => x.type.endsWith('/set_schedule')); assert.equal(writes.length, 1);
  assert.equal(writes[0].schedule.id, 'log-existing'); assert.equal(writes[0].schedule.time, '09:15');
  assert.equal('recipients' in writes[0].schedule, false); assert.equal('next_fire' in writes[0].schedule, false);
  assert.equal(f.types().filter(x => x.endsWith('/list_schedules')).length, 2);
  assert.match(f.root.textContent, /Success/); assert.match(f.root.textContent, /other-log/);
  assert.equal(f.services.length, 0);
});
test('mismatching readback stays Unconfirmed and cannot repeat write', async t => {
  const f = await fixture(t, { save: async () => ({ schedule: row({ time: '09:15' }) }) });
  await f.open(); f.edit(); f.input('schedule-time', '09:15'); f.click('schedule-save'); await settle();
  assert.match(f.root.textContent, /Unconfirmed/); assert.ok(f.root.getElementById('schedule-save').disabled);
  f.click('schedule-save'); f.click('schedule-refresh'); await settle();
  assert.equal(f.types().filter(x => x.endsWith('/set_schedule')).length, 1);
});
test('Cancel discards edits without write and preserves existing disabled schedule', async t => {
  const f = await fixture(t); await f.open(); f.edit(); f.input('schedule-time', '09:15'); f.click('schedule-cancel'); await settle();
  assert.equal(f.root.getElementById('schedule-time'), null); assert.equal(f.types().filter(x => x.endsWith('/set_schedule')).length, 0);
  assert.match(f.root.textContent, /Disabled/); f.edit(); assert.equal(f.root.getElementById('schedule-time').value, '08:30');
});
test('unknown write timeout locks writes; late acknowledgement cannot claim Success; refresh can confirm', async t => {
  const pending = deferred(); let saved;
  const f = await fixture(t, { save: msg => { saved = msg.schedule; return pending.promise; },
    list: count => ({ schedules: [count > 1 && pending.confirm ? row(saved) : row()] }) });
  await f.open(); f.edit(); f.input('schedule-time', '10:00'); f.click('schedule-save'); await settle(); f.expire(); await settle();
  assert.match(f.root.textContent, /Unconfirmed/); assert.ok(f.root.getElementById('schedule-save').disabled);
  pending.resolve({ schedule: row(saved) }); await settle(); assert.doesNotMatch(f.root.textContent, /Success/);
  pending.confirm = true; f.click('schedule-refresh'); await settle(); assert.match(f.root.textContent, /Success/);
  assert.equal(f.types().filter(x => x.endsWith('/set_schedule')).length, 1);
});
test('capability unavailable has explicit refresh and no fallback automation creation', async t => {
  const f = await fixture(t, { list: async () => { throw { code: 'unknown_command' }; } }); await f.open();
  assert.match(f.root.textContent, /Not checked/); assert.match(f.root.textContent, /unavailable/i);
  assert.ok(f.root.getElementById('schedule-new').disabled); f.click('schedule-refresh'); await settle();
  assert.equal(f.services.length, 0); assert.equal(f.types().filter(x => x.endsWith('/list_schedules')).length, 2);
});
test('bounded list timeout permits explicit refresh and ignores old response', async t => {
  const pending = deferred(); const f = await fixture(t, { list: n => n === 1 ? pending.promise : { schedules: [row({ id: 'fresh' })] } });
  f.card.setActiveTab('schedule'); await settle(); f.expire(); await settle(); assert.match(f.root.textContent, /Not checked/);
  f.click('schedule-refresh'); await settle(); pending.resolve({ schedules: [row({ id: 'stale' })] }); await settle();
  assert.match(f.root.textContent, /fresh/); assert.doesNotMatch(f.root.textContent, /stale/);
});
for (const boundary of ['role', 'user', 'connection', 'offline', 'disconnect']) test('drop rows, draft, timers and pending replies on ' + boundary, async t => {
  const pending = deferred(); const f = await fixture(t, { list: n => n === 1 ? { schedules: [row()] } : n === 2 ? pending.promise : { schedules: [] } });
  await f.open(); f.edit(); f.input('schedule-time', '10:00'); f.click('schedule-refresh'); await settle();
  if (boundary === 'disconnect') f.card.remove();
  else f.card.hass = { ...f.hass, ...(boundary === 'role' ? { user: { id: 'admin-a', is_admin: false } } :
    boundary === 'user' ? { user: { id: 'admin-b', is_admin: true } } : boundary === 'connection' ? { connection: { connected: true } } : { connected: false }) };
  pending.resolve({ schedules: [row({ id: 'leaked-old' })] }); await settle();
  assert.doesNotMatch(f.root.textContent, /leaked-old|log-existing/); assert.equal(f.card._serverSchedules.model().draft, null);
  if (boundary !== 'user' && boundary !== 'connection') assert.equal(f.deadlines.size, 0);
});
test('calendar fields Monday=0 and day=31; inherited timezone omitted; server DST metadata visible', async t => {
  const f = await fixture(t, { rows: [row({ enabled: true, next_fire: '2026-10-25T02:30:00+02:00' })] }); await f.open();
  assert.match(f.root.textContent, /2026-10-25T02:30:00\+02:00/); assert.match(f.root.textContent, /Europe\/Warsaw/);
  assert.match(f.root.textContent, /gap|nonexistent/i); assert.match(f.root.textContent, /first|earlier/i); assert.match(f.root.textContent, /last day/i);
  f.edit(); assert.equal(f.root.getElementById('schedule-weekday').value, '0');
  f.input('schedule-cadence', 'monthly'); f.input('schedule-month-day', '31'); f.click('schedule-save'); await settle();
  const write = f.calls.find(c => c.type.endsWith('/set_schedule')); assert.equal(write.schedule.month_day, 31);
  assert.equal('timezone' in write.schedule, false); assert.match(f.root.textContent, /Success/);
});
test('explicit IANA timezone can return to HA timezone and then choose another country', async t => {
  const f = await fixture(t, { rows: [row({ timezone: 'Europe/Warsaw' })] }); await f.open(); f.edit();
  f.input('schedule-timezone', ''); f.click('schedule-save'); await settle();
  const first = f.calls.find(c => c.type.endsWith('/set_schedule')); assert.ok(first);
  assert.equal(first.schedule.use_ha_timezone, true); assert.equal('timezone' in first.schedule, false);
  assert.match(f.root.querySelector('.server-schedules').textContent, /Success/);
  f.edit(); f.input('schedule-timezone', 'America/New_York'); f.click('schedule-save'); await settle();
  const writes = f.calls.filter(c => c.type.endsWith('/set_schedule')); assert.equal(writes.length, 2);
  assert.equal(writes[1].schedule.timezone, 'America/New_York');
});
test('known configured legacy IDs warn about duplicates; unknown state is never off or toggled', async t => {
  const f = await fixture(t, { states: { 'automation.ha_tools_log_email_daily': { state: 'unavailable' }, 'automation.ha_tools_log_email_weekly': { state: 'off' } } }); await f.open();
  assert.match(f.root.textContent, /duplicate/i); assert.match(f.root.textContent, /automation\.ha_tools_log_email_daily/);
  assert.match(f.root.textContent, /Unknown/); assert.equal(f.root.getElementById('btn-daily-toggle'), null);
  f.click('btn-weekly-toggle'); await settle(); assert.deepEqual(f.services[0], ['automation', 'turn_on', { entity_id: 'automation.ha_tools_log_email_weekly' }]);
});
test('readonly preview is explicit and displays server period/source/retained limitations without SMTP/history writes', async t => {
  const f = await fixture(t); await f.open(); assert.equal(f.types().filter(x => x.endsWith('/preview_log_digest')).length, 0);
  f.edit(); f.input('schedule-cadence', 'monthly'); f.input('schedule-timezone', 'America/New_York'); f.click('schedule-preview'); await settle();
  const preview = f.calls.find(x => x.type.endsWith('/preview_log_digest'));
  assert.equal(preview.cadence, 'monthly'); assert.equal(preview.timezone, 'America/New_York');
  assert.match(f.root.textContent, /Partial/); assert.match(f.root.textContent, /2026-09-01/); assert.match(f.root.textContent, /system_log/);
  assert.match(f.root.textContent, /retained Home Assistant aggregates/); assert.match(f.root.textContent, /full event history/i);
  assert.equal(f.services.length, 0); assert.equal(f.types().filter(x => /set_schedule|send_now|history/.test(x)).length, 0);
});
test('PL/EN exact result names, container layout, focus and existing filters/history remain available', async t => {
  const f = await fixture(t, { lang: 'pl' }); await f.open(); assert.match(f.root.textContent, /Sukces/);
  assert.match(f.root.querySelector('style').textContent, /@container[^]*server-schedule/);
  f.edit(); const field = f.root.getElementById('schedule-timezone'); field.focus(); f.card._render();
  assert.equal(f.root.activeElement.id, 'schedule-timezone');
  f.click('schedule-cancel'); f.card.setActiveTab('overview');
  for (const id of ['log-severity', 'log-source', 'log-period']) assert.ok(f.root.getElementById(id));
  f.input('log-period', '7d'); f.card.setActiveTab('history'); assert.ok(f.root.getElementById('history-refresh'));
  f.card.setActiveTab('overview'); assert.equal(f.root.getElementById('log-period').value, '7d');
});
test('explicit New makes a disabled draft; Cancel never writes; one Save preserves new ID through readback', async t => {
  const f = await fixture(t, { rows: [] }); await f.open();
  f.click('schedule-new'); const firstId = f.card._serverSchedules.model().draft.id;
  assert.match(firstId, /^[0-9a-f-]{36}$/i); assert.equal(f.root.getElementById('schedule-enabled').checked, false);
  f.click('schedule-cancel'); assert.equal(f.types().filter(x => x.endsWith('/set_schedule')).length, 0);
  f.click('schedule-new'); const id = f.card._serverSchedules.model().draft.id; assert.notEqual(id, firstId);
  f.click('schedule-save'); f.root.getElementById('schedule-save')?.click(); await settle();
  const writes = f.calls.filter(x => x.type.endsWith('/set_schedule')); assert.equal(writes.length, 1);
  assert.equal(writes[0].schedule.id, id); assert.equal(writes[0].schedule.enabled, false); assert.equal('timezone' in writes[0].schedule, false);
  assert.match(f.root.textContent, /Success/); assert.match(f.root.textContent, /Disabled/);
});
test('acknowledgement may contain matching row but cannot show Success until the separate list resolves', async t => {
  const pending = deferred(); const f = await fixture(t, { list: n => n === 1 ? { schedules: [row()] } : pending.promise });
  await f.open(); f.edit(); f.input('schedule-time', '10:00'); f.click('schedule-save'); await settle();
  assert.doesNotMatch(f.root.querySelector('.server-schedules').textContent, /Success/);
  pending.resolve({ schedules: [row({ time: '10:00' })] }); await settle(); assert.match(f.root.textContent, /Success/);
});
test('matching time from wrong ID or kind never confirms a save', async t => {
  const f = await fixture(t, { list: n => ({ schedules: n === 1 ? [row()] : [row({ id: 'another-id', time: '10:00' }), row({ kind: 'energy_report', time: '10:00' })] }) });
  await f.open(); f.edit(); f.input('schedule-time', '10:00'); f.click('schedule-save'); await settle();
  assert.match(f.root.textContent, /Unconfirmed/); assert.equal(f.types().filter(x => x.endsWith('/set_schedule')).length, 1);
});
test('definite backend validation failure is Error without automatic retry or automation toggle', async t => {
  const f = await fixture(t, { save: async () => { throw { code: 'invalid_payload' }; } }); await f.open(); f.edit(); f.click('schedule-save'); await settle();
  assert.match(f.root.textContent, /Error/); assert.equal(f.types().filter(x => x.endsWith('/set_schedule')).length, 1); assert.equal(f.services.length, 0);
});
test('late preview from an old selection is discarded and preview requests coalesce', async t => {
  const pending = deferred(); const f = await fixture(t, { preview: pending.promise }); await f.open(); f.edit(); f.click('schedule-preview'); f.click('schedule-preview'); await settle();
  assert.equal(f.types().filter(x => x.endsWith('/preview_log_digest')).length, 1);
  f.input('schedule-cadence', 'monthly'); pending.resolve({ cadence: 'weekly', total: 999 }); await settle();
  assert.doesNotMatch(f.root.querySelector('.server-schedules').textContent, /999/); assert.equal(f.card._serverSchedules.model().preview, null);
});
test('other-kind and other-log fields are absent from mutation payloads and addresses absent from Schedule UI', async t => {
  const f = await fixture(t, { rows: [row(), row({ id: 'protected-energy', kind: 'energy_report' }), row({ id: 'protected-log' })] });
  await f.open(); assert.doesNotMatch(f.root.textContent, /local-fixture@example\.invalid/);
  f.edit(); f.input('schedule-cadence', 'daily'); f.click('schedule-save'); await settle();
  const writes = f.calls.filter(x => x.type.endsWith('/set_schedule')); assert.equal(writes.length, 1);
  assert.equal(writes[0].schedule.id, 'log-existing'); assert.equal('schedules' in writes[0], false);
  assert.equal('recipients' in writes[0].schedule, false); assert.equal('schedule_id' in writes[0], false);
  assert.equal(writes[0].action, 'upsert');
});
test('partial/malformed list cannot silently enable New and preserves useful legacy preview/manual controls', async t => {
  const f = await fixture(t, { list: async () => ({ schedules: 'invalid' }) }); await f.open(); assert.match(f.root.textContent, /Not checked/);
  assert.ok(f.root.getElementById('schedule-new').disabled); f.card.setActiveTab('preview'); assert.ok(f.root.getElementById('btn-refresh-preview'));
  f.card.setActiveTab('send'); assert.ok(f.root.getElementById('btn-send-daily')); assert.ok(f.root.getElementById('btn-send-weekly'));
  assert.equal(f.types().filter(x => x.endsWith('/set_schedule')).length, 0);
});
test('role loss during a save discards late acknowledgement and prevents readback from old context', async t => {
  const pending = deferred(); const f = await fixture(t, { save: () => pending.promise }); await f.open(); f.edit();
  f.click('schedule-save'); await settle(); const before = f.types().filter(x => x.endsWith('/list_schedules')).length;
  f.card.hass = { ...f.hass, user: { id: 'admin-a', is_admin: false } }; pending.resolve({ schedule: row() }); await settle();
  assert.equal(f.types().filter(x => x.endsWith('/list_schedules')).length, before);
  assert.equal(f.card._serverSchedules.model().draft, null); assert.equal(f.card._serverSchedules.model().locked, false);
  assert.equal(f.deadlines.size, 0); assert.doesNotMatch(f.root.textContent, /Success|log-existing/);
});
test('connection loss during server preview clears data and ignores the late preview', async t => {
  const pending = deferred(); const f = await fixture(t, { preview: pending.promise }); await f.open(); f.edit(); f.click('schedule-preview'); await settle();
  f.card.hass = { ...f.hass, connection: { connected: false } }; pending.resolve({ cadence: 'weekly', total: 999 }); await settle();
  assert.equal(f.card._serverSchedules.model().preview, null); assert.equal(f.card._serverSchedules.model().draft, null);
  assert.equal(f.deadlines.size, 0); assert.doesNotMatch(f.root.textContent, /999|log-existing/);
});
test('readonly list is privacy projected; no recipient/config or arbitrary fields in draft', async t => {
  const f = await fixture(t, { rows: [row({ private_unknown: 'local-private-fixture' })] }); await f.open(); f.edit();
  const draft = f.card._serverSchedules.model().draft;
  assert.equal('recipients' in draft, false); assert.equal('private_unknown' in draft, false);
  assert.doesNotMatch(f.root.textContent, /local-private-fixture|example\.invalid/);
});
test('optional backend count completeness metadata keeps unknown occurrences as No data, never zero', async t => {
  const f = await fixture(t, { preview: { cadence: 'weekly', total: null, unique_problems: 2, counts_complete: false,
    effective_timezone: 'Europe/Warsaw', period: { from: '2026-10-05T00:00:00+00:00', to: '2026-10-12T00:00:00+00:00', semantics: 'previous_completed_calendar_period' },
    source: { name: 'system_log', count_semantics: 'retained_aggregates', complete: false, retained_entries: 2 } } });
  await f.open(); f.edit(); f.click('schedule-preview'); await settle();
  const preview = f.root.querySelector('.schedule-preview'); assert.ok(preview);
  assert.match(preview.textContent, /Partial/); assert.match(preview.textContent, /2 \/ 2 \/ No data/);
});
test('confirmed Save returns keyboard focus to the edited row after its busy phase', async t => {
  const f = await fixture(t); await f.open(); f.edit();
  const save = f.root.getElementById('schedule-save'); save.focus(); save.click(); await settle();
  assert.match(f.root.querySelector('.server-schedules').textContent, /Success/);
  assert.equal(f.root.activeElement?.id, 'schedule-edit-0');
});
