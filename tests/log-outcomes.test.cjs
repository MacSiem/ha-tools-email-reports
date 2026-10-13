'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

// Qualify the generated artifact separately by setting LOG_OUTCOMES_SOURCE.
const source = process.env.LOG_OUTCOMES_SOURCE || path.join(__dirname, '..', 'ha-log-email.js');
const privateError = 'smtp://private-host.invalid token=fixture-secret recipient=private@example.invalid <img src=x onerror=alert(1)>';
const retained = () => ({ errors: [{ domain: 'fixture', message: 'Fixture error', count: 1 }], warnings: [], total: 1,
  weekly: { errors: [{ domain: 'fixture', message: 'Fixture error', count: 1 }], warnings: [], total: 1 } });
const resultOf = (card, action) => action === 'smtp' ? card._smtpStatus : card._sendStatus;
const buttonId = action => action === 'smtp' ? 'btn-smtp-test' : 'btn-send-' + action;

function fixture(action) {
  const dom = new JSDOM('<!doctype html><html><body><button id="outside">Outside</button></body></html>', {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/'
  });
  const w = dom.window;
  w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  // Layout only is simulated; source rendering, focus, clicks and promises are real.
  w.HTMLElement.prototype.getClientRects = function () {
    return !this.isConnected || this.closest('[hidden], .native-tabs') ? [] : [{ width: 200, height: 44 }];
  };
  w.HTMLElement.prototype.getBoundingClientRect = function () {
    return this.getClientRects()[0] || { width: 0, height: 0 };
  };
  w.eval(fs.readFileSync(source, 'utf8'));
  const card = w.document.createElement('ha-log-email');
  const connection = new w.EventTarget(); connection.connected = true;
  const requests = [], operations = [], logs = [];
  for (const name of ['warn', 'error', 'debug']) w.console[name] = (...args) => logs.push(args);
  let complete, fail;
  const pending = new Promise((resolve, reject) => { complete = resolve; fail = reject; });
  const hass = { locale: { language: 'en' }, language: 'en', user: { id: 'admin-a', is_admin: true },
    connection, states: {}, services: { ha_tools_email: { send: {}, test: {} } },
    callWS: async () => ({ schema: 1, schedules: [] }),
    callService: (...args) => {
      if (!['send', 'test'].includes(args[1])) return Promise.resolve({});
      requests.push(args);
      return requests.length === 1 ? pending : Promise.resolve(undefined);
    } };
  card._config = { title: 'Log Email', max_entries: 50, email_recipient: 'fixture@example.invalid', show_support: false };
  card._hass = hass;
  card._firstRender = true;
  card._logData = retained();
  card._activeTab = action === 'smtp' ? 'schedule' : 'send';
  for (const method of ['_sendEmailNow', '_testSmtp']) {
    const original = card[method];
    card[method] = function (...args) { const operation = original.apply(this, args); operations.push(operation); return operation; };
  }
  w.document.body.append(card);
  card.hass = hass;
  card._render();
  return { dom, w, card, hass, connection, requests, logs,
    start(next = action) {
      card._activeTab = next === 'smtp' ? 'schedule' : 'send'; card._render();
      const button = card.shadowRoot.getElementById(buttonId(next));
      assert.ok(button); button.focus(); button.click();
    },
    async settle(outcome = 'resolve', value) {
      if (outcome === 'reject') fail(new Error(privateError)); else complete(value);
      await Promise.all(operations);
    },
    async close() { complete(); await Promise.all(operations); card.remove(); w.close(); }
  };
}

for (const action of ['daily', 'weekly', 'smtp']) {
  for (const outcome of ['resolve', 'reject']) test(`${action}: rendered click has truthful, sanitized ${outcome} result and keyboard focus`, async () => {
    const f = fixture(action);
    try {
      f.start();
      assert.equal(f.requests.length, 1);
      assert.equal(f.requests[0][1], action === 'smtp' ? 'test' : 'send');
      assert.equal(f.requests[0][4], false, 'HA must not toast a raw service error');
      assert.equal(f.card.shadowRoot.activeElement, f.card.shadowRoot.querySelector('.content'));
      assert.equal(f.card.shadowRoot.getElementById(buttonId(action)).disabled, true);
      assert.equal(f.card.shadowRoot.querySelector('[data-email-result] [data-result-state]').dataset.resultState, 'not_checked');
      assert.equal(resultOf(f.card, action).reason, 'sending');
      await f.settle(outcome);
      const result = resultOf(f.card, action);
      assert.equal(result.status, 'unconfirmed');
      assert.equal(result.reason, outcome === 'resolve' ? 'completed' : 'transport_unknown');
      const visible = f.card.shadowRoot.querySelector('[data-email-result]');
      assert.equal(visible.dataset.emailResult, 'unconfirmed');
      assert.match(visible.textContent, /Unconfirmed/);
      assert.match(visible.textContent, /Delivery unconfirmed/);
      if (outcome === 'resolve') assert.match(visible.textContent, /Request completed/);
      else assert.match(visible.textContent, /request outcome could not be confirmed/);
      assert.equal(visible.querySelector('[data-result-state="success"]'), null);
      assert.equal(f.card.shadowRoot.activeElement?.id, buttonId(action));
      assert.equal(f.card.shadowRoot.activeElement.disabled, false);
      assert.equal(f.requests.length, 1);
      assert.doesNotMatch(f.card.shadowRoot.innerHTML + JSON.stringify(result) + JSON.stringify(f.logs), /private-host|fixture-secret|private@example|onerror=alert/);
      f.card.hass = { ...f.hass, locale: { language: 'pl' } };
      const polish = f.card.shadowRoot.querySelector('[data-email-result]');
      assert.match(polish.textContent, /Niepotwierdzony/);
      assert.match(polish.textContent, /Dostarczenie niepotwierdzone/);
      assert.doesNotMatch(polish.textContent, /Request completed|Delivery unconfirmed/);
      f.card.hass = f.hass;
      assert.match(f.card.shadowRoot.querySelector('[data-email-result]').textContent, /Delivery unconfirmed/);
      assert.equal(f.requests.length, 1, 'locale changes never resend');
    } finally { await f.close(); }
  });

  test(`${action}: arbitrary service payload cannot claim delivery`, async () => {
    const f = fixture(action);
    try {
      f.start(); await f.settle('resolve', { success: true, delivered: true, status: 'success', message: privateError });
      assert.equal(resultOf(f.card, action).status, 'unconfirmed');
      assert.doesNotMatch(f.card.shadowRoot.innerHTML, /fixture-secret|private-host/);
    } finally { await f.close(); }
  });

  for (const change of ['user', 'role', 'connection', 'offline', 'connection-event', 'browser-event', 'detach']) {
    for (const outcome of ['resolve', 'reject']) test(`${action}: ${change} discards ${outcome} result but preserves raw single-flight`, async () => {
      const f = fixture(action);
      try {
        f.start();
        if (change === 'user') f.card.hass = { ...f.hass, user: { id: 'admin-b', is_admin: true } };
        if (change === 'role') {
          f.card.hass = { ...f.hass, user: { id: 'admin-a', is_admin: false } };
          f.card.hass = f.hass;
        }
        if (change === 'connection') f.card.hass = { ...f.hass, connection: { connected: true } };
        if (change === 'offline') {
          f.card.hass = { ...f.hass, connected: false };
          f.card.hass = { ...f.hass, connected: true };
        }
        if (change === 'connection-event') {
          f.connection.dispatchEvent(new f.w.Event('disconnected'));
          f.connection.dispatchEvent(new f.w.Event('ready'));
        }
        if (change === 'browser-event') {
          f.w.dispatchEvent(new f.w.Event('offline'));
          f.w.dispatchEvent(new f.w.Event('online'));
        }
        if (change === 'detach') { f.card.remove(); f.w.document.body.append(f.card); }
        assert.equal(f.card._sendStatus, null);
        assert.equal(f.card._smtpStatus, null);
        f.card._logData = retained();
        for (const next of ['daily', 'weekly', 'smtp']) {
          f.card._activeTab = next === 'smtp' ? 'schedule' : 'send'; f.card._render();
          const button = f.card.shadowRoot.getElementById(buttonId(next));
          assert.equal(button.disabled, true); button.click();
        }
        await f.card._sendEmailNow('daily'); await f.card._sendEmailNow('weekly'); await f.card._testSmtp();
        assert.equal(f.requests.length, 1, 'context changes do not release the raw request lock');
        f.w.document.getElementById('outside').focus();
        await f.settle(outcome);
        assert.equal(f.card._sendStatus, null); assert.equal(f.card._smtpStatus, null);
        assert.equal(f.card.shadowRoot.querySelector('[data-email-result]'), null);
        assert.equal(f.w.document.activeElement.id, 'outside');
        assert.equal(f.requests.length, 1, 'no automatic retry on settlement');
        f.start(action); await f.settle();
        assert.equal(f.requests.length, 2, 'intentional retry works only after settlement');
        assert.equal(resultOf(f.card, action).status, 'unconfirmed');
      } finally { await f.close(); }
    });
  }

  test(`${action}: earlier settled metadata is cleared by reconnect and identity changes`, async () => {
    const f = fixture(action);
    try {
      f.start(); await f.settle();
      assert.equal(resultOf(f.card, action).status, 'unconfirmed');
      f.connection.dispatchEvent(new f.w.Event('ready'));
      assert.equal(f.card._sendStatus, null); assert.equal(f.card._smtpStatus, null);
      f.start(); await f.settle();
      f.card.hass = { ...f.hass, user: { id: 'admin-b', is_admin: true } };
      assert.equal(f.card._sendStatus, null); assert.equal(f.card._smtpStatus, null);
      assert.equal(f.card.shadowRoot.querySelector('[data-email-result]'), null);
    } finally { await f.close(); }
  });

  test(`${action}: send and SMTP buttons share one request lock`, async () => {
    const f = fixture(action);
    try {
      f.start();
      for (const next of ['daily', 'weekly', 'smtp']) {
        f.card._activeTab = next === 'smtp' ? 'schedule' : 'send'; f.card._render();
        const button = f.card.shadowRoot.getElementById(buttonId(next));
        assert.equal(button.disabled, true); button.click();
      }
      await f.card._testSmtp(); await f.card._testSmtp(); await f.card._sendEmailNow('daily'); await f.card._sendEmailNow('weekly');
      assert.equal(f.requests.length, 1);
      await f.settle();
      assert.equal(f.requests.length, 1);
      f.start(action === 'smtp' ? 'daily' : 'smtp'); await f.settle();
      assert.equal(f.requests.length, 2);
    } finally { await f.close(); }
  });
}

for (const action of ['daily', 'weekly', 'smtp']) {
  for (const denial of ['role', 'hass-offline', 'connection-offline', 'browser-offline', 'connection-event']) {
    test(`${action}: ${denial} forbids a service request`, async () => {
      const f = fixture(action);
      try {
        if (denial === 'role') f.card.hass = { ...f.hass, user: { id: 'admin-a', is_admin: false } };
        if (denial === 'hass-offline') f.card.hass = { ...f.hass, connected: false };
        if (denial === 'connection-offline') { f.connection.connected = false; f.card.hass = f.hass; }
        if (denial === 'browser-offline') f.w.dispatchEvent(new f.w.Event('offline'));
        if (denial === 'connection-event') f.connection.dispatchEvent(new f.w.Event('disconnected'));
        f.card._logData = retained();
        const button = f.card.shadowRoot.getElementById(buttonId(action));
        if (button) { assert.equal(button.disabled, true); button.click(); }
        if (action === 'smtp') await f.card._testSmtp(); else await f.card._sendEmailNow(action);
        assert.equal(f.requests.length, 0);
      } finally { await f.close(); }
    });
  }
}

for (const action of ['daily', 'weekly', 'smtp']) test(`${action}: missing integration is Error, without dispatch`, async () => {
  const f = fixture(action);
  try {
    // Existing rendered action can outlive a service registry update until next redraw.
    f.hass.services = {};
    const button = f.card.shadowRoot.getElementById(buttonId(action)); button.click();
    assert.equal(f.requests.length, 0);
    assert.equal(resultOf(f.card, action).status, 'error');
    assert.equal(f.card.shadowRoot.querySelector('[data-email-result]').dataset.emailResult, 'error');
  } finally { await f.close(); }
});

for (const action of ['daily', 'weekly']) test(`${action}: missing retained data is No data, without dispatch`, async () => {
  const f = fixture(action);
  try {
    if (action === 'daily') f.card._logData = null; else delete f.card._logData.weekly;
    f.start();
    assert.equal(f.requests.length, 0);
    assert.equal(resultOf(f.card, action).status, 'no_data');
    assert.match(f.card.shadowRoot.querySelector('[data-email-result]').textContent, /No data/);
    f.card.hass = { ...f.hass, locale: { language: 'pl' } };
    assert.match(f.card.shadowRoot.querySelector('[data-email-result]').textContent, /Brak danych/);
  } finally { await f.close(); }
});

test('SMTP: missing test service is Error, without dispatch', async () => {
  const f = fixture('smtp');
  try {
    delete f.hass.services.ha_tools_email.test;
    f.start();
    assert.equal(f.requests.length, 0);
    assert.equal(f.card._smtpStatus.status, 'error');
  } finally { await f.close(); }
});
