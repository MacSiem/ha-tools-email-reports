'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const { JSDOM } = require('jsdom');
const flush = async () => { for (let i = 0; i < 5; i++) await new Promise(resolve => setImmediate(resolve)); };
function setup() {
  const dom = new JSDOM('', { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
  const w = dom.window;
  w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  w.eval(readFileSync(join(__dirname, '..', 'ha-log-email.js'), 'utf8'));
  const card = w.document.createElement('ha-log-email');
  card.setConfig({ max_entries: 50, show_support: false });
  const requests = [], writes = []; let occupied = 0, maxOccupied = 0;
  const hass = { user: { id: 'first-admin', is_admin: true }, connection: { connected: true }, states: {}, services: {},
    callWS(request) {
      assert.equal(request.type, 'system_log/list', 'no extra privileged requests');
      occupied++; maxOccupied = Math.max(maxOccupied, occupied);
      return new Promise((resolve, reject) => requests.push({ resolve(value) { occupied--; resolve(value); }, reject(error) { occupied--; reject(error); } }));
    }, callService(...args) { writes.push(args); return Promise.resolve(); } };
  const rows = message => [{ timestamp: Date.now() / 1000 - 1, level: 'ERROR', name: 'fixture', message: [message], count: 2 }];
  const accept = async (index, message = 'CURRENT') => { assert.ok(requests[index], 'expected raw log read'); requests[index].resolve(rows(message)); await flush(); };
  return { card, hass, requests, writes, rows, accept, max: () => maxOccupied, mount: () => w.document.body.append(card), close() { card.remove(); w.close(); } };
}
for (const initial of ['household', 'undefined-user', 'offline', 'null']) test(`startup ${initial} -> admin obtains first logs through real setter`, async () => {
  const f = setup(); try {
    f.mount();
    if (initial === 'household') f.hass.user.is_admin = false;
    if (initial === 'undefined-user') f.hass.user = undefined;
    if (initial === 'offline') f.hass.connection.connected = false;
    f.card.hass = initial === 'null' ? null : f.hass;
    await flush(); assert.equal(f.requests.length, 0);
    f.hass.user = { id: 'first-admin', is_admin: true }; f.hass.connection.connected = true;
    f.card.hass = f.hass; await flush();
    await f.accept(0); assert.match(f.card.shadowRoot.textContent, /CURRENT/);
    assert.equal(f.card._logHistory.length, 1); assert.equal(f.writes.length, 0);
  } finally { f.close(); }
});
test('hass before mount waits for connection; remount reloads purged data without setter', async () => {
  const f = setup(); try {
    f.card.hass = f.hass; await flush(); assert.equal(f.requests.length, 0);
    f.mount(); await flush(); await f.accept(0, 'FIRST');
    f.card.remove(); assert.equal(f.card._logData, null); assert.equal(f.card.shadowRoot.textContent, '');
    f.mount(); await flush(); await f.accept(1, 'REMOUNT');
    assert.match(f.card.shadowRoot.textContent, /REMOUNT/); assert.doesNotMatch(f.card.shadowRoot.textContent, /FIRST/);
  } finally { f.close(); }
});
for (const change of ['user', 'connection', 'role', 'offline', 'remount']) test(`quiet HA resumes first load after occupied stale ${change} raw read settles`, async () => {
  const f = setup(); try {
    f.mount(); f.card.hass = f.hass; await flush(); assert.equal(f.requests.length, 1);
    if (change === 'user') f.hass.user.id = 'second-admin';
    if (change === 'connection') f.hass.connection = { connected: true };
    if (change === 'role') { f.hass.user.is_admin = false; f.card.hass = f.hass; f.hass.user.is_admin = true; }
    if (change === 'offline') { f.hass.connection.connected = false; f.card.hass = f.hass; f.hass.connection.connected = true; }
    if (change === 'remount') { f.card.remove(); f.mount(); }
    f.card.hass = f.hass; // Last ordinary HA update occurs BEFORE the raw WS settles.
    await flush(); assert.equal(f.requests.length, 1, 'old raw read stays occupied');
    assert.equal(f.card._logData, null); assert.doesNotMatch(f.card.shadowRoot.textContent, /STALE/);
    await f.accept(0, 'STALE');
    assert.equal(f.requests.length, 2, 'current context resumes without another HA update');
    assert.equal(f.card._logData, null); assert.doesNotMatch(f.card.shadowRoot.textContent, /STALE/);
    await f.accept(1); assert.match(f.card.shadowRoot.textContent, /CURRENT/);
    assert.equal(f.card._logHistory.length, 1); assert.equal(f.max(), 1); assert.equal(f.writes.length, 0);
  } finally { f.close(); }
});
for (const end of ['household', 'offline', 'detached']) test(`stale first settlement cannot read or restore private logs while ${end}`, async () => {
  const f = setup(); try {
    f.mount(); f.card.hass = f.hass; await flush();
    if (end === 'household') f.hass.user.is_admin = false;
    if (end === 'offline') f.hass.connection.connected = false;
    if (end === 'detached') f.card.remove(); else f.card.hass = f.hass;
    await f.accept(0, 'PRIVATE-STALE');
    assert.equal(f.requests.length, 1); assert.equal(f.card._logData, null); assert.equal(f.card._retainedLogs, null);
    assert.doesNotMatch(f.card.shadowRoot.textContent, /PRIVATE-STALE/); assert.equal(f.writes.length, 0);
  } finally { f.close(); }
});
for (const result of ['success', 'failure', 'invalid']) test(`settled ${result} stops automatic reads; manual refresh remains single flight`, async () => {
  const f = setup(); try {
    f.mount(); f.card.hass = f.hass; await flush();
    if (result === 'success') await f.accept(0);
    else { if (result === 'failure') f.requests[0].reject(Error('unavailable')); else f.requests[0].resolve({ invalid: true }); await flush(); }
    assert.equal(f.card._loading, false); assert.equal(f.requests.length, 1);
    for (let i = 0; i < 3; i++) { f.card.hass = f.hass; await flush(); }
    assert.equal(f.requests.length, 1, 'no retry or new polling');
    const refresh = f.card._fetchLogData(); const duplicate = f.card._fetchLogData();
    assert.equal(f.requests.length, 2, 'manual refresh coalesces');
    f.card.hass = f.hass; await f.accept(1, 'REFRESHED'); await Promise.all([refresh, duplicate]);
    await flush(); assert.equal(f.requests.length, 2); assert.equal(f.max(), 1); assert.equal(f.writes.length, 0);
    assert.match(f.card.shadowRoot.textContent, /REFRESHED/);
    assert.equal(f.card._pollingTimer, null);
  } finally { f.close(); }
});
test('empty first result remains settled across locale/theme updates and preserves explicit polling interval', async () => {
  const f = setup(); try {
    const intervals = [], cleared = [];
    const w = f.card.ownerDocument.defaultView;
    w.setInterval = (callback, interval) => { intervals.push({ callback, interval }); return 42; };
    w.clearInterval = id => cleared.push(id);
    f.card._pollingEnabled = true; f.card._pollingIntervalSec = 180;
    f.card._logFilters = { severity: 'WARNING', source: 'fixture', period: '7d' };
    f.mount(); f.card.hass = f.hass; await flush();
    f.requests[0].resolve([]); await flush();
    assert.equal(f.card._logData.total, 0); assert.equal(f.card._logHistory.length, 1);
    assert.equal(f.card._logHistory[0].errors, 0); assert.equal(f.card._logHistory[0].warnings, 0);
    assert.equal(intervals.length, 1); assert.equal(intervals[0].interval, 180000);
    f.hass.language = 'pl'; f.hass.themes = { darkMode: true }; f.card.hass = f.hass; await flush();
    assert.equal(f.requests.length, 1); assert.equal(intervals.length, 1);
    assert.equal(JSON.stringify(f.card._logFilters), JSON.stringify({ severity: 'WARNING', source: 'fixture', period: '7d' }));
    f.card.remove(); assert.deepEqual(cleared, [42]);
  } finally { f.close(); }
});
