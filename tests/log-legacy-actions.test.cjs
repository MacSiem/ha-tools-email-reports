'use strict';
// Regression coverage for truthful legacy automation outcomes.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const source = process.env.LOG_LEGACY_ACTIONS_SOURCE || path.join(__dirname, '..', 'ha-log-email.js');
const entity = cadence => 'automation.ha_tools_log_email_' + cadence;
const buttonId = cadence => 'btn-' + cadence + '-toggle';
const privateError = 'private-host.invalid token=fixture-secret recipient=private@example.invalid <img onerror=alert(1)>';
const deferred = () => { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
function fixture(initial = 'off', lang = 'en', compact = false) {
  const dom = new JSDOM('<!doctype html><body><button id="outside">Outside</button></body>', {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/'
  });
  const w = dom.window;
  w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  // Only layout is simulated. Rendering, clicks, disabled state, focus and lifecycle are real.
  w.HTMLElement.prototype.getClientRects = function () {
    if (!this.isConnected || this.closest('[hidden]') || this.closest(compact ? '.tabs' : '.native-tabs')) return [];
    return [{ width: 200, height: 44 }];
  };
  w.HTMLElement.prototype.getBoundingClientRect = function () { return this.getClientRects()[0] || { width: 0, height: 0 }; };
  w.eval(fs.readFileSync(source, 'utf8'));
  const logs = [], requests = [], writes = [], operations = [], pending = deferred();
  for (const name of ['warn', 'error', 'debug']) w.console[name] = (...args) => logs.push(args);
  const connection = new w.EventTarget(); connection.connected = true;
  const hass = { language: lang, locale: { language: lang }, user: { id: 'admin-a', is_admin: true }, connection,
    states: { [entity('daily')]: { state: initial }, [entity('weekly')]: { state: initial } },
    services: { ha_tools_email: { send: {}, test: {} } },
    callWS: async msg => { writes.push(msg); return { schema: 1, schedules: [] }; },
    callService: (...args) => { requests.push(args); return requests.length === 1 ? pending.promise : Promise.resolve({}); } };
  const card = w.document.createElement('ha-log-email');
  card._config = { title: 'Log Email', max_entries: 50, show_support: false };
  card._hass = hass; card._firstRender = true; card._activeTab = 'schedule';
  card._logData = { errors: [], warnings: [], total: 0, weekly: { errors: [], warnings: [], total: 0 } };
  const original = card._toggleAutomation;
  card._toggleAutomation = function (...args) { const result = original.apply(this, args); operations.push(result); return result; };
  w.document.body.append(card); card.hass = hass; card._render();
  return { w, card, hass, connection, requests, writes, logs,
    start(cadence = 'daily') { const button = card.shadowRoot.getElementById(buttonId(cadence)); assert.ok(button); button.focus(); button.click(); },
    echo(cadence, state) { card.hass = { ...card._hass, states: { ...card._hass.states, [entity(cadence)]: { state } } }; },
    async settle(outcome = 'resolve') {
      if (outcome === 'reject') pending.reject(new Error(privateError));
      else pending.resolve({ success: true, delivered: true, message: privateError });
      await Promise.all(operations);
    },
    async close() { pending.resolve({}); await Promise.all(operations); card.remove(); w.close(); }
  };
}
const visibleResult = f => f.card.shadowRoot.querySelector('[data-legacy-result]');
const anchor = f => assert.equal(f.card.shadowRoot.activeElement, f.card.shadowRoot.querySelector('.content'));

for (const cadence of ['daily', 'weekly']) for (const initial of ['on', 'off']) {
  for (const outcome of ['echo', 'unchanged', 'reject']) test(`${cadence} ${initial}: actual toggle ${outcome} is truthful, sanitized and focused`, async () => {
    const f = fixture(initial);
    try {
      assert.equal(f.requests.length, 0, 'opening has no service side effects');
      assert.match(f.card.shadowRoot.textContent, /Duplicate reports are possible/);
      f.start(cadence);
      assert.equal(f.requests.length, 1);
      assert.deepEqual(f.requests[0].slice(0, 2), ['automation', initial === 'on' ? 'turn_off' : 'turn_on']);
      assert.equal(f.requests[0][2].entity_id, entity(cadence));
      assert.equal(f.requests[0][4], false, 'suppress raw HA error notification');
      assert.equal(visibleResult(f).dataset.legacyResult, 'not_checked');
      assert.match(visibleResult(f).textContent, /Not checked.*requested.*unconfirmed/s);
      anchor(f);
      for (const other of ['daily', 'weekly']) {
        const button = f.card.shadowRoot.getElementById(buttonId(other));
        assert.equal(button.disabled, true); button.click();
        await f.card._toggleAutomation(entity(other));
      }
      assert.equal(f.requests.length, 1, 'one raw automation request');
      if (outcome === 'echo') f.echo(cadence, initial === 'on' ? 'off' : 'on');
      f.card._render(); anchor(f);
      await f.settle(outcome === 'reject' ? 'reject' : 'resolve');
      const expected = outcome === 'echo' ? 'success' : 'unconfirmed';
      assert.equal(visibleResult(f).dataset.legacyResult, expected);
      assert.equal(f.card._legacyStatus.reason, { echo: 'state_confirmed', unchanged: 'state_unconfirmed', reject: 'transport_unknown' }[outcome]);
      assert.match(visibleResult(f).textContent, initial === 'on' ? /Disable requested/ : /Enable requested/);
      assert.match(visibleResult(f).textContent, outcome === 'echo' ? /Success.*confirms the requested state/s : /Unconfirmed/);
      assert.equal(f.card.shadowRoot.activeElement?.id, buttonId(cadence));
      assert.equal(f.card.shadowRoot.activeElement.disabled, false);
      if (outcome === 'echo') assert.match(f.card.shadowRoot.activeElement.textContent, initial === 'on' ? /Enable legacy/ : /Disable legacy/);
      assert.doesNotMatch(f.card.shadowRoot.innerHTML + JSON.stringify(f.card._legacyStatus) + JSON.stringify(f.logs), /private-host|fixture-secret|private@example|onerror=alert/);
      assert.equal(f.requests.length, 1, 'no retries');
      assert.equal(f.writes.some(msg => /set_schedule|send_now/.test(msg.type)), false);
    } finally { await f.close(); }
  });
}

for (const outcome of ['resolve', 'reject']) for (const change of ['user', 'role', 'connection', 'offline', 'connection-event', 'browser-event', 'detach']) {
  test(`${change}: context invalidation discards ${outcome} UI but retains raw lock`, async () => {
    const f = fixture();
    try {
      f.start();
      if (change === 'user') f.card.hass = { ...f.hass, user: { id: 'admin-b', is_admin: true } };
      if (change === 'role') { f.card.hass = { ...f.hass, user: { id: 'admin-a', is_admin: false } }; f.card.hass = f.hass; }
      if (change === 'connection') f.card.hass = { ...f.hass, connection: { connected: true } };
      if (change === 'offline') { f.card.hass = { ...f.hass, connected: false }; f.card.hass = f.hass; }
      if (change === 'connection-event') { f.connection.dispatchEvent(new f.w.Event('disconnected')); f.connection.dispatchEvent(new f.w.Event('ready')); }
      if (change === 'browser-event') { f.w.dispatchEvent(new f.w.Event('offline')); f.w.dispatchEvent(new f.w.Event('online')); }
      if (change === 'detach') { f.card.remove(); f.w.document.body.append(f.card); }
      assert.equal(f.card._legacyStatus, null);
      assert.ok(f.card._legacyRequest);
      f.card._render();
      for (const cadence of ['daily', 'weekly']) {
        const button = f.card.shadowRoot.getElementById(buttonId(cadence)); assert.equal(button.disabled, true); button.click();
        await f.card._toggleAutomation(entity(cadence));
      }
      f.echo('daily', 'on');
      const outside = f.w.document.getElementById('outside'); outside.focus();
      await f.settle(outcome);
      assert.equal(f.card._legacyRequest, null); assert.equal(f.card._legacyStatus, null);
      assert.equal(visibleResult(f), null); assert.equal(f.w.document.activeElement, outside);
      assert.equal(f.requests.length, 1);
      f.start('weekly'); await f.settle();
      assert.equal(f.requests.length, 2, 'new explicit attempt works after raw settlement');
    } finally { await f.close(); }
  });
}

for (const move of ['outside', 'outside-blur', 'inside', 'window-blur', 'tab']) test(`${move}: no late focus stealing`, async () => {
  const f = fixture();
  try {
    f.start(); anchor(f);
    const outside = f.w.document.getElementById('outside');
    if (move.startsWith('outside')) { outside.focus(); if (move === 'outside-blur') outside.blur(); }
    if (move === 'inside') f.card.shadowRoot.getElementById('schedule-refresh').focus();
    if (move === 'window-blur') f.w.dispatchEvent(new f.w.Event('blur'));
    if (move === 'tab') { const tab = f.card.shadowRoot.querySelector('[data-tab="history"]'); tab.focus(); tab.click(); }
    await f.settle();
    assert.notEqual(f.card.shadowRoot.activeElement?.id, buttonId('daily'));
    if (move === 'outside') assert.equal(f.w.document.activeElement, outside);
    if (move === 'inside') assert.equal(f.card.shadowRoot.activeElement?.id, 'schedule-refresh');
  } finally { await f.close(); }
});

for (const compact of [false, true]) test(`removed entity: ${compact ? 'picker' : 'tab'} focus fallback`, async () => {
  const f = fixture('off', 'en', compact);
  try {
    f.start(); f.echo('daily', 'unavailable'); anchor(f); await f.settle();
    assert.equal(visibleResult(f).dataset.legacyResult, 'unconfirmed');
    const active = f.card.shadowRoot.activeElement;
    if (compact) assert.equal(active?.id, 'log-tab-select');
    else assert.equal(active?.dataset.tab, 'schedule');
  } finally { await f.close(); }
});

test('pending and completed reasons translate in current PL/EN; new attempt removes previous outcome', async () => {
  const f = fixture();
  try {
    f.start();
    f.card.hass = { ...f.hass, locale: { language: 'pl' } };
    assert.match(visibleResult(f).textContent, /Nie sprawdzono.*Żądanie włączenia.*niepotwierdzona/s); anchor(f);
    await f.settle();
    assert.match(visibleResult(f).textContent, /Niepotwierdzony.*nie potwierdza/s);
    f.card.hass = f.hass;
    assert.match(visibleResult(f).textContent, /Unconfirmed.*Enable requested.*does not confirm/s);
    f.start('weekly');
    assert.equal(f.card.shadowRoot.querySelectorAll('[data-legacy-result]').length, 1);
    assert.equal(visibleResult(f).dataset.legacyResult, 'not_checked');
    assert.equal(visibleResult(f).closest('.schedule-card').querySelector('button').id, 'btn-weekly-toggle');
    await f.settle(); assert.equal(f.requests.length, 2);
    f.connection.dispatchEvent(new f.w.Event('ready'));
    assert.equal(visibleResult(f), null, 'settled results expire on connection context event');
  } finally { await f.close(); }
});

for (const restriction of ['role', 'hass-offline', 'browser-offline', 'connection-event', 'unknown-state']) test(`${restriction}: no call without allowed context/state`, async () => {
  const f = fixture();
  try {
    if (restriction === 'role') f.card.hass = { ...f.hass, user: { id: 'admin-a', is_admin: false } };
    if (restriction === 'hass-offline') f.card.hass = { ...f.hass, connected: false };
    if (restriction === 'browser-offline') f.w.dispatchEvent(new f.w.Event('offline'));
    if (restriction === 'connection-event') f.connection.dispatchEvent(new f.w.Event('disconnected'));
    if (restriction === 'unknown-state') f.echo('daily', 'unavailable');
    const button = f.card.shadowRoot.getElementById(buttonId('daily'));
    if (button) { assert.equal(button.disabled, true); button.click(); }
    await f.settle(); // Broken implementations must fail the count without waiting forever.
    await f.card._toggleAutomation(entity('daily'));
    assert.equal(f.requests.length, 0); assert.equal(visibleResult(f), null);
  } finally { await f.close(); }
});

test('legacy completion uses its own busy predicate while a mail request is still pending', async () => {
  const f = fixture(), mail = deferred();
  try {
    const call = f.hass.callService;
    f.hass.callService = (...args) => args[0] === 'ha_tools_email' ? mail.promise : call(...args);
    const send = f.card._testSmtp();
    f.start(); anchor(f); f.echo('daily', 'on'); await f.settle();
    assert.ok(f.card._emailRequest);
    assert.equal(f.card.shadowRoot.activeElement?.id, buttonId('daily'));
    assert.equal(f.card._legacyStatus.status, 'success');
    mail.resolve({}); await send;
    assert.equal(f.card._smtpStatus.status, 'unconfirmed', 'Part53 delivery semantics retained');
    assert.equal(f.card._legacyStatus.status, 'success');
  } finally { mail.resolve({}); await f.close(); }
});

test('six exact shared PL/EN labels are preserved by legacy result presentation', async () => {
  const f = fixture();
  try {
    const names = { success: ['Success', 'Sukces'], partial: ['Partial', 'Częściowo'], unconfirmed: ['Unconfirmed', 'Niepotwierdzony'],
      error: ['Error', 'Błąd'], not_checked: ['Not checked', 'Nie sprawdzono'], no_data: ['No data', 'Brak danych'] };
    for (const [status, labels] of Object.entries(names)) for (const [index, language] of ['en', 'pl'].entries()) {
      f.card._lang = language;
      f.card._legacyStatus = { entityId: entity('daily'), desired: 'off', status, reason: 'state_unconfirmed' };
      const host = f.w.document.createElement('div'); host.innerHTML = f.card._renderLegacyResult(entity('daily'));
      const badge = host.querySelector('[data-result-state]'); badge.querySelector('[aria-hidden]').remove();
      assert.equal(badge.textContent.trim(), labels[index]);
    }
    assert.equal(f.requests.length, 0);
  } finally { await f.close(); }
});

test('transport rejection stays Unconfirmed even when an entity echo arrives; Polish disable explanation stays sanitized', async () => {
  const f = fixture('on', 'pl');
  try {
    f.start(); f.echo('daily', 'off'); await f.settle('reject');
    assert.equal(visibleResult(f).dataset.legacyResult, 'unconfirmed');
    assert.match(visibleResult(f).textContent, /Niepotwierdzony.*Żądanie wyłączenia.*Zmiana stanu niepotwierdzona/s);
    f.card.hass = { ...f.card._hass, locale: { language: 'en' } };
    assert.match(visibleResult(f).textContent, /Unconfirmed.*Disable requested.*State change unconfirmed/s);
    assert.doesNotMatch(f.card.shadowRoot.innerHTML + JSON.stringify(f.logs), /private-host|fixture-secret|private@example/);
    assert.equal(f.requests.length, 1);
  } finally { await f.close(); }
});

test('confirmed state result translates to Polish without another toggle', async () => {
  const f = fixture();
  try {
    f.start(); f.echo('daily', 'on'); await f.settle();
    f.card.hass = { ...f.card._hass, locale: { language: 'pl' } };
    assert.match(visibleResult(f).textContent, /Sukces.*Żądanie włączenia.*potwierdza żądany stan/s);
    assert.equal(f.requests.length, 1);
  } finally { await f.close(); }
});
