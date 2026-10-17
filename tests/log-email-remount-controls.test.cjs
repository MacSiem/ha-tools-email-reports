'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { JSDOM } = require('jsdom');
const settle = async () => { for (let i = 0; i < 10; i++) await new Promise(r => setImmediate(r)); };
function fixture(t) {
  const dom = new JSDOM('', { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
  t.after(() => dom.window.close());
  dom.window.eval(readFileSync(join(__dirname, '..', 'ha-log-email.js'), 'utf8'));
  const card = dom.window.document.createElement('ha-log-email'), calls = [], writes = [];
  card.setConfig({ show_support: false });
  const hass = { user: { id: 'admin', is_admin: true }, connection: { connected: true }, states: {}, services: {},
    callService: async (...args) => writes.push(args),
    callWS: async message => {
      calls.push(message.type);
      if (message.type === 'system_log/list') return [];
      if (message.type === 'manifest/get') return { domain: 'ha_tools_email', version: '2.3.1' };
      if (message.type === 'ha_tools_email/list_schedules') return { schedules: [] };
      if (message.type === 'ha_tools_email/preview_log_digest') return { cadence: message.cadence,
        subject: 'CURRENT PREVIEW', body: 'Synthetic', html: '<p>Synthetic</p>', generated_at: '2026-10-17T01:00:00Z',
        period: { from: '2026-10-16T01:00:00Z', to: '2026-10-17T01:00:00Z', semantics: 'rolling_retained_last_observed' },
        source: { name: 'system_log', complete: true }, effective_timezone: 'UTC' };
      throw new Error('Unexpected request ' + message.type);
    } };
  const mount = () => dom.window.document.body.append(card);
  mount(); card.hass = hass;
  return { card, hass, calls, writes, mount };
}
for (const tab of ['schedule', 'preview']) test(`${tab} resumes after real remove/reinsert without another hass setter`, async t => {
  const f = fixture(t); await settle(); f.card.setActiveTab(tab); await settle();
  f.card.remove(); f.mount(); await settle();
  if (tab === 'schedule') {
    assert.equal(f.calls.filter(x => x === 'ha_tools_email/list_schedules').length, 2);
    f.card.shadowRoot.getElementById('schedule-refresh').click(); await settle();
    assert.equal(f.calls.filter(x => x === 'ha_tools_email/list_schedules').length, 3);
    assert.match(f.card.shadowRoot.textContent, /Data read from the server/);
  } else {
    f.card.shadowRoot.getElementById('btn-refresh-preview').click(); await settle();
    assert.equal(f.calls.filter(x => x === 'ha_tools_email/preview_log_digest').length, 1);
    assert.match(f.card.shadowRoot.textContent, /CURRENT PREVIEW/);
  }
  assert.deepEqual(f.writes, []);
  assert.ok(f.calls.every(x => !/send_now|set_schedule|test_smtp/.test(x)));
});
for (const boundary of ['household', 'offline']) test(`remount remains fail closed after ${boundary} changes without a setter`, async t => {
  const f = fixture(t); await settle(); f.card.setActiveTab('schedule'); await settle(); f.card.remove();
  if (boundary === 'household') f.hass.user.is_admin = false;
  else f.hass.connection.connected = false;
  const before = f.calls.length; f.mount(); await settle();
  assert.equal(f.calls.length, before); assert.deepEqual(f.writes, []);
  assert.equal(f.card.shadowRoot.getElementById('schedule-refresh'), null);
});
