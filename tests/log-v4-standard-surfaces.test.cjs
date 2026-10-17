'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { JSDOM } = require('jsdom');
const settle = async () => { for (let i = 0; i < 8; i++) await new Promise(r => setImmediate(r)); };
async function fixture(t, language = 'en', backend = '2.3.1', asyncHaCard = false) {
  const dom = new JSDOM('', { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
  t.after(() => dom.window.close());
  const w = dom.window, pendingPaints = [];
  if (asyncHaCard) {
    // HA-CARD is a LitElement: its light DOM is focusable only after its slot renders.
    // jsdom has no layout, so model this native readiness boundary explicitly.
    w.customElements.define('ha-card', class extends w.HTMLElement {
      constructor() {
        super(); this.attachShadow({ mode: 'open' });
        this.updateComplete = new Promise(resolve => pendingPaints.push(() => {
          this.shadowRoot.innerHTML = '<slot></slot>'; resolve(true);
        }));
      }
    });
    const nativeRects = w.HTMLElement.prototype.getClientRects;
    w.HTMLElement.prototype.getClientRects = function () {
      const wrapper = this.closest('ha-card');
      if (wrapper) return wrapper.shadowRoot.querySelector('slot') ? [{ width: 100, height: 44 }] : [];
      return nativeRects.call(this);
    };
    const nativeFocus = w.HTMLElement.prototype.focus;
    w.HTMLElement.prototype.focus = function (...args) {
      const wrapper = this.closest('ha-card');
      if (wrapper && !wrapper.shadowRoot.querySelector('slot')) return;
      nativeFocus.apply(this, args);
    };
  }
  const paint = async () => { pendingPaints.splice(0).forEach(done => done()); await settle(); await new Promise(resolve => w.requestAnimationFrame(resolve)); };
  w.eval(readFileSync(join(__dirname, '..', 'ha-log-email.js'), 'utf8'));
  const now = Date.now(), calls = [], writes = [];
  const logs = ['qa10', 'qa2', 'qa1'].map((name, i) => ({ id: name, name, level: i === 1 ? 'WARNING' : 'ERROR',
    timestamp: (now - (i + 1) * 1000) / 1000, count: i === 2 ? 0 : i + 1, message: [name + ' retained message'] }));
  const mail = { cadence: 'daily', subject: 'Synthetic preview', body: 'SERVER BODY', html: '<p>SERVER BODY</p>',
    generated_at: new Date(now).toISOString(), effective_timezone: 'Europe/Warsaw',
    period: { from: new Date(now - 86400000).toISOString(), to: new Date(now).toISOString(), semantics: 'rolling_retained_last_observed' },
    source: { name: 'system_log', complete: false } };
  const schedule = { id: 'synthetic-log', kind: 'log_digest', cadence: 'daily', time: '10:00', enabled: false, next_fire: null };
  const hass = { user: { id: 'admin', is_admin: true }, connection: { connected: true }, states: {}, services: {},
    locale: { language }, config: { time_zone: 'Europe/Warsaw' },
    callService: async (...args) => writes.push(args), callWS: async message => {
      calls.push(message.type);
      if (message.type === 'system_log/list') return logs;
      if (message.type === 'manifest/get') return { domain: 'ha_tools_email', version: backend };
      if (message.type === 'ha_tools_email/list_schedules') return { schedules: [schedule] };
      if (message.type === 'ha_tools_email/get_attempt_history') return { schema: 1, limit: 128, retention_days: 90, attempts: [] };
      if (message.type === 'ha_tools_email/preview_log_digest') return backend === '2.3.1' ? mail : {
        cadence: 'daily', effective_timezone: 'Europe/Warsaw', total: 2, unique_problems: 1,
        period: { ...mail.period, semantics: 'previous_completed_calendar_period' },
        source: { name: 'system_log', count_semantics: 'retained_aggregates', complete: false, retained_entries: 1 } };
      throw new Error('Unexpected request ' + message.type);
    } };
  const card = w.document.createElement('ha-log-email'); card.setConfig({ show_support: false });
  w.document.body.append(card); card.hass = hass; await settle();
  if (asyncHaCard) await paint();
  const root = card.shadowRoot;
  const choose = (key, value) => { const e = root.getElementById('log-' + key); e.value = value; e.dispatchEvent(new w.Event('change')); };
  const source = name => [...root.getElementById('log-source').options].find(o => o.textContent === name).value;
  return { card, root, hass, calls, writes, choose, source, paint, window: w };
}
for (const language of ['en', 'pl']) test(`W9 source chooser is natural while records stay chronological (${language})`, async t => {
  const f = await fixture(t, language);
  assert.deepEqual([...f.root.getElementById('log-source').options].slice(1).map(o => o.textContent), ['qa1', 'qa2', 'qa10']);
  assert.deepEqual(Array.from(f.card._retainedModel().rows, r => r.domain), ['qa10', 'qa2', 'qa1']);
  assert.equal(f.calls.length, 1); assert.deepEqual(f.writes, []);
});
for (const language of ['en', 'pl']) test(`W9 active filter chips reset one field, retain others and restore focus (${language})`, async t => {
  const f = await fixture(t, language); const key = f.source('qa2');
  f.choose('source', key); f.choose('severity', 'WARNING'); f.choose('period', '7d');
  const chips = () => [...f.root.querySelectorAll('[data-log-clear-filter]')];
  assert.equal(chips().length, 3); assert.match(chips().map(e => e.textContent).join(' '), /qa2/);
  const clear = chips().find(e => e.dataset.logClearFilter === 'source');
  assert.equal(clear.localName, 'button'); assert.equal(clear.type, 'button'); assert.ok(clear.getAttribute('aria-label'));
  clear.focus(); clear.click();
  assert.equal(f.root.getElementById('log-source').value, 'all');
  assert.equal(f.root.getElementById('log-severity').value, 'WARNING'); assert.equal(f.root.getElementById('log-period').value, '7d');
  assert.equal(f.root.activeElement, f.root.getElementById('log-source'));
  f.card.hass = { ...f.hass }; await settle(); assert.equal(chips().length, 2);
  chips().find(e => e.dataset.logClearFilter === 'period').click();
  assert.equal(f.root.getElementById('log-period').value, '24h');
  assert.equal(f.calls.length, 1); assert.deepEqual(f.writes, []);
});
test('W10 retained metrics are tiles and preserve measured zero occurrences', async t => {
  const f = await fixture(t); f.choose('source', f.source('qa1'));
  const tiles = [...f.root.querySelectorAll('[data-log-metric]')]; assert.ok(tiles.length >= 2);
  assert.match(tiles.map(e => e.textContent).join(' '), /1 unique problem/);
  assert.match(tiles.map(e => e.textContent).join(' '), /0 occurrences/);
  assert.doesNotMatch(tiles.map(e => e.textContent).join(' '), /No data|unknown/);
});
test('W8 SMTP history has a compact honest source summary and closed full explanations', async t => {
  const f = await fixture(t); f.card.setActiveTab('history'); f.root.getElementById('history-refresh').click(); await settle();
  const section = f.root.querySelector('.attempt-history'), summary = section.querySelector('[data-source-summary]');
  assert.ok(summary); assert.match(summary.textContent, /Home Assistant|server/i); assert.match(summary.textContent, /128/); assert.match(summary.textContent, /90/);
  const explanation = [...section.querySelectorAll('details')].find(d => /does not confirm delivery/.test(d.textContent));
  assert.ok(explanation); assert.equal(explanation.open, false);
  const empty = [...section.querySelectorAll('p')].find(p => /No retained send attempts/.test(p.textContent));
  assert.ok(empty); assert.equal(empty.closest('details'), null);
});
test('W8 browser snapshots distinguish local retention and keep identity warnings visible', async t => {
  const f = await fixture(t); f.card._browserCountsLegacy = true; f.card.setActiveTab('history');
  const section = f.root.querySelector('.browser-snapshots'), summary = section.querySelector('[data-source-summary]');
  assert.ok(summary); assert.match(summary.textContent, /browser|local/i); assert.match(summary.textContent, /24/);
  const explanation = [...section.querySelectorAll('details')].find(d => /not SMTP attempts/.test(d.textContent));
  assert.ok(explanation); assert.equal(explanation.open, false);
  const warning = [...section.querySelectorAll('p')].find(p => /no confirmed user identity/.test(p.textContent));
  assert.ok(warning); assert.equal(warning.closest('details'), null);
});
test('W8 actual mail wrapper condenses metadata without hiding partial or changing server HTML', async t => {
  const f = await fixture(t); f.card.setActiveTab('preview'); f.root.getElementById('btn-refresh-preview').click(); await settle();
  const section = f.root.querySelector('.schedule-preview'), summary = section.querySelector('[data-source-summary]');
  assert.ok(summary); assert.match(summary.textContent, /retained|log/i);
  const metadata = [...section.querySelectorAll('details')].find(d => d.querySelector('dl'));
  assert.ok(metadata); assert.equal(metadata.open, false);
  const warning = [...section.querySelectorAll('p')].find(p => /partial data/.test(p.textContent));
  assert.ok(warning); assert.equal(warning.closest('details'), null);
  const frame = section.querySelector('iframe'); assert.equal(frame.getAttribute('sandbox'), '');
  assert.match(frame.srcdoc, /SERVER BODY/); assert.match(frame.srcdoc, /default-src 'none'/);
  assert.deepEqual(f.writes, []); assert.ok(f.calls.every(x => !/send_now|set_schedule/.test(x)));
});
test('W8 older server preview keeps partial status outside collapsed limitations', async t => {
  const f = await fixture(t, 'en', '2.2.0'); f.card.setActiveTab('schedule'); await settle();
  f.root.querySelector('[data-schedule-edit]').click(); f.root.getElementById('schedule-preview').click(); await settle();
  const section = f.root.querySelector('.schedule-preview'); assert.ok(section.querySelector('[data-source-summary]'));
  const explanation = [...section.querySelectorAll('details')].find(d => /not full event history/.test(d.textContent));
  assert.ok(explanation); assert.equal(explanation.open, false);
  const status = section.querySelector('[data-result-state="partial"]'); assert.ok(status); assert.equal(status.closest('details'), null);
  assert.deepEqual(f.writes, []); assert.ok(f.calls.every(x => !/send_now|set_schedule/.test(x)));
});
test('W9 uses the full HA locale, preserves source identity ties and absent selected labels', async t => {
  const f = await fixture(t, 'en');
  const stamp = Date.now() / 1000 - 1;
  const names = ['Öl 2', 'Zon 10', 'Zon 2', 'Ål 1', 'Älg 1', 'Lampa 10', 'Lampa 2', 'Lampa 2'];
  f.card._retainedLogs = f.card._groupRetainedLogs(names.map((name, i) => ({ id: 'locale-' + i,
    name, source: i === 7 ? [] : undefined, level: 'ERROR', timestamp: stamp - i, count: 1, message: [name] })), Date.now());
  f.card._render();
  const expected = language => Array.from(f.card._retainedLogs, row => row.domain).sort(new Intl.Collator(language, { numeric: true, sensitivity: 'base' }).compare);
  const labels = () => Array.from(f.root.getElementById('log-source').options).slice(1).map(option => option.textContent);
  assert.deepEqual(labels(), expected('en'));
  const order = Array.from(f.card._retainedModel().rows, row => row.identity);
  f.card.hass = { ...f.hass, locale: { language: 'sv-SE' } };
  assert.deepEqual(labels(), expected('sv-SE'));
  assert.deepEqual(Array.from(f.card._retainedModel().rows, row => row.identity), order);
  const key = f.source('Lampa 2'); f.choose('source', key);
  f.card._retainedLogs = f.card._retainedLogs.filter(row => row.sourceKey !== key);
  f.card._render();
  const selected = f.root.getElementById('log-source').selectedOptions[0];
  assert.equal(selected.value, key); assert.match(selected.textContent, /Lampa 2.*absent/);
  assert.match(f.root.querySelector('[data-log-clear-filter="source"]').textContent, /Lampa 2/);
  assert.equal(f.calls.length, 1); assert.deepEqual(f.writes, []);
});
test('W9 severity reset retains source and period, and focuses the corresponding select', async t => {
  const f = await fixture(t); const key = f.source('qa2');
  f.choose('source', key); f.choose('severity', 'WARNING'); f.choose('period', '30d');
  f.root.querySelector('[data-log-clear-filter="severity"]').click();
  assert.equal(f.root.getElementById('log-severity').value, 'all');
  assert.equal(f.root.getElementById('log-source').value, key);
  assert.equal(f.root.getElementById('log-period').value, '30d');
  assert.equal(f.root.activeElement, f.root.getElementById('log-severity'));
  assert.equal(f.calls.length, 1); assert.deepEqual(f.writes, []);
});
test('W10 unknown counts remain distinct from measured zero in metric tiles', async t => {
  const f = await fixture(t);
  const key = f.source('qa1');
  f.card._retainedLogs.find(row => row.sourceKey === key).count = null;
  f.choose('source', key);
  assert.match(f.root.querySelector('[data-log-metric="unique"]').textContent, /1 unique problem/);
  assert.match(f.root.querySelector('[data-log-metric="occurrences"]').textContent, /— occurrences/);
  assert.match(f.root.querySelector('.retained-logs').textContent, /occurrence count unknown/);
  assert.equal(f.root.querySelector('[data-log-metric="occurrences"]').textContent.includes('0 occurrences'), false);
});
test('W8 disclosure state survives repaint and clears when the user context changes', async t => {
  const f = await fixture(t); f.card.setActiveTab('history');
  const disclosure = () => f.root.querySelector('[data-log-disclosure-key="snapshots-source"]');
  assert.equal(disclosure().open, false); disclosure().open = true;
  f.card._render(); assert.equal(disclosure().open, true);
  f.card.hass = { ...f.hass, user: { id: 'second-admin', is_admin: true } };
  await settle(); assert.equal(disclosure().open, false);
});
test('W8–W10 keep Smart and Energy sources byte identical', () => {
  const { createHash } = require('node:crypto');
  for (const [file, hash] of [
    ['ha-smart-reports.js', 'b3b2ea718469081598284eb226066519a3a5b4049847e59872daa3197865155c'],
    ['ha-energy-email.js', 'e0c46328584577871e891487d8cd327211b063c0e24bd49fab47de0c6977bad5']
  ]) assert.equal(createHash('sha256').update(readFileSync(join(__dirname, '..', file))).digest('hex'), hash);
});

for (const key of ['severity', 'source', 'period']) test(`W9 keyboard reset transfers focus after HA-CARD renders its slot: ${key}`, async t => {
  const f = await fixture(t, 'en', '2.3.1', true);
  f.choose(key, key === 'severity' ? 'WARNING' : key === 'source' ? f.source('qa2') : '7d');
  await f.paint();
  const chip = f.root.querySelector('[data-log-clear-filter="' + key + '"]');
  chip.focus(); assert.equal(f.root.activeElement, chip); chip.click();
  assert.equal(f.root.getElementById('log-' + key).value, key === 'period' ? '24h' : 'all');
  await f.paint();
  assert.equal(f.root.activeElement, f.root.getElementById('log-' + key));
  assert.equal(f.calls.length, 1); assert.deepEqual(f.writes, []);
});
for (const interruption of ['focus-away-and-back', 'keyboard', 'pointer', 'window-blur', 'context', 'disconnect'])
  test(`W9 delayed reset focus respects newer user intent or context: ${interruption}`, async t => {
    const f = await fixture(t, 'en', '2.3.1', true);
    f.choose('severity', 'WARNING'); await f.paint();
    const chip = f.root.querySelector('[data-log-clear-filter="severity"]'); chip.focus(); chip.click();
    const outside = f.window.document.createElement('button'); outside.textContent = 'Other control';
    f.window.document.body.append(outside);
    if (interruption === 'focus-away-and-back') { outside.focus(); outside.blur(); }
    if (interruption === 'keyboard') f.window.document.dispatchEvent(new f.window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    if (interruption === 'pointer') f.window.document.dispatchEvent(new f.window.Event('pointerdown', { bubbles: true }));
    if (interruption === 'window-blur') f.window.dispatchEvent(new f.window.Event('blur'));
    if (interruption === 'context') f.card.hass = { ...f.hass, user: { id: 'next-admin', is_admin: true } };
    if (interruption === 'disconnect') f.card.remove();
    await f.paint();
    assert.notEqual(f.root.activeElement, f.root.getElementById('log-severity'));
    assert.deepEqual(f.writes, []);
  });
