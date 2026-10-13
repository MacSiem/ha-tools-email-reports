'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

// Set LOG_ACTION_FOCUS_SOURCE to the generated bundle to qualify that artifact later.
const source = process.env.LOG_ACTION_FOCUS_SOURCE || path.join(__dirname, '..', 'ha-log-email.js');
function fixture(action, compact = false) {
  const dom = new JSDOM('<!doctype html><html><body><button id="outside">Outside</button></body></html>', {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/'
  });
  const w = dom.window;
  w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  // jsdom has no layout engine. Supply only visibility geometry, leaving actual
  // render, events, disabled buttons, focus, service promises and lifecycle intact.
  w.HTMLElement.prototype.getClientRects = function () {
    if (!this.isConnected || this.closest('[hidden]')) return [];
    if (this.closest('.tabs') && compact) return [];
    if (this.closest('.native-tabs') && !compact) return [];
    return [{ width: 200, height: 44 }];
  };
  w.HTMLElement.prototype.getBoundingClientRect = function () {
    return this.getClientRects()[0] || { width: 0, height: 0 };
  };
  w.eval(fs.readFileSync(source, 'utf8'));
  const card = w.document.createElement('ha-log-email');
  w.document.body.append(card);
  const requests = [];
  let resolve, reject;
  const pending = new Promise((yes, no) => { resolve = yes; reject = no; });
  const connection = new w.EventTarget();
  connection.connected = true;
  const hass = { language: 'en', locale: { language: 'en' }, user: { id: 'admin-a', is_admin: true },
    connection, states: {}, services: { ha_tools_email: { send: {}, test: {} } },
    callWS: async () => ({ schema: 1, schedules: [] }),
    callService: (domain, service, data) => {
      requests.push({ domain, service, data });
      return ['send', 'test'].includes(service) ? pending : Promise.resolve({});
    } };
  card._config = { title: 'Log Email', max_entries: 50, email_recipient: 'fixture@example.invalid', show_support: false };
  card._hass = hass;
  card._firstRender = true;
  card._logData = { errors: [{ message: 'Fixture', domain: 'fixture', count: 1 }], warnings: [], total: 1,
    weekly: { errors: [{ message: 'Fixture', domain: 'fixture', count: 1 }], warnings: [], total: 1 } };
  card._activeTab = action === 'smtp' ? 'schedule' : 'send';
  card._render();
  const id = action === 'smtp' ? 'btn-smtp-test' : 'btn-send-' + action;
  const method = action === 'smtp' ? '_testSmtp' : '_sendEmailNow';
  const actual = card[method];
  let operation;
  const operations = [];
  // Observe the Promise created by the real rendered click handler.
  card[method] = function (...args) { operation = actual.apply(this, args); operations.push(operation); return operation; };
  return { dom, w, card, hass, requests, id, connection,
    start() { const button = card.shadowRoot.getElementById(id); button.focus(); button.click(); return operation; },
    async finish(outcome = 'success') {
      if (outcome === 'success') resolve({}); else reject(new Error('Synthetic transport error'));
      await Promise.all(operations);
    },
    async close() { resolve({}); await Promise.all(operations); card.remove(); dom.window.close(); }
  };
}
function anchor(card) {
  const active = card.shadowRoot.activeElement;
  assert.equal(active, card.shadowRoot.querySelector('.content'), 'visible content retains focus while action is disabled');
  assert.equal(active.getAttribute('role'), 'region');
  assert.ok(active.getAttribute('aria-label'));
  assert.ok(active.getClientRects().length);
}

for (const action of ['daily', 'weekly', 'smtp']) {
  for (const outcome of ['success', 'error']) test(`${action}: actual async ${outcome} restores keyboard origin`, async () => {
    const f = fixture(action);
    try {
      f.start();
      assert.equal(f.requests.length, 1);
      assert.equal(f.requests[0].service, action === 'smtp' ? 'test' : 'send');
      assert.equal(f.card.shadowRoot.getElementById(f.id).disabled, true);
      anchor(f.card);
      // An unrelated redraw and locale change during the wait retain the anchor.
      f.card._render(); anchor(f.card);
      f.card.hass = { ...f.hass, locale: { language: 'pl' } };
      anchor(f.card);
      await f.finish(outcome);
      assert.equal(f.card.shadowRoot.activeElement?.id, f.id);
      assert.equal(f.card.shadowRoot.activeElement.disabled, false);
      if (action === 'smtp') assert.equal(f.card._smtpStatus.ok, outcome === 'success');
      else assert.equal(f.card._sendStatus.status, outcome === 'success' ? 'success' : 'error');
      assert.equal(f.requests.length, 1, 'focus never adds a service call');
    } finally { await f.close(); }
  });

  for (const move of ['outside', 'outside-then-blur', 'inside', 'window-blur']) test(`${action}: ${move} relinquishes restore intent`, async () => {
    const f = fixture(action);
    try {
      f.start(); anchor(f.card);
      let target;
      if (move === 'inside') {
        target = f.card.shadowRoot.querySelector(`[data-tab="${f.card._activeTab}"]`);
        target.focus();
      } else if (move === 'window-blur') f.w.dispatchEvent(new f.w.Event('blur'));
      else {
        target = f.w.document.getElementById('outside'); target.focus();
        if (move === 'outside-then-blur') target.blur();
      }
      await f.finish();
      assert.notEqual(f.card.shadowRoot.activeElement?.id, f.id);
      if (move === 'outside') assert.equal(f.w.document.activeElement, target);
      if (move === 'inside') assert.equal(f.card.shadowRoot.activeElement?.dataset.tab, f.card._activeTab);
    } finally { await f.close(); }
  });

  for (const compact of [false, true]) test(`${action}: navigation ${compact ? 'picker' : 'tabs'} cancels late restore`, async () => {
    const f = fixture(action, compact);
    try {
      f.start();
      if (compact) {
        const picker = f.card.shadowRoot.getElementById('log-tab-select');
        picker.focus(); picker.value = 'history'; picker.dispatchEvent(new f.w.Event('change'));
      } else {
        const tab = f.card.shadowRoot.querySelector('[data-tab="history"]'); tab.focus(); tab.click();
      }
      await f.finish();
      assert.equal(f.card._activeTab, 'history');
      if (compact) assert.equal(f.card.shadowRoot.activeElement?.id, 'log-tab-select');
      else assert.equal(f.card.shadowRoot.activeElement?.dataset.tab, 'history');
    } finally { await f.close(); }
  });

  for (const change of ['user', 'connection', 'offline', 'reconnect-event', 'remove-reinsert']) test(`${action}: ${change} invalidates old focus ownership`, async () => {
    const f = fixture(action);
    try {
      f.start();
      if (change === 'user') f.card.hass = { ...f.hass, user: { id: 'admin-b', is_admin: true } };
      if (change === 'connection') f.card.hass = { ...f.hass, connection: { connected: true } };
      if (change === 'offline') {
        f.card.hass = { ...f.hass, connected: false };
        f.card.hass = { ...f.hass, connected: true };
      }
      if (change === 'reconnect-event') {
        f.connection.dispatchEvent(new f.w.Event('disconnected'));
        f.connection.dispatchEvent(new f.w.Event('ready'));
      }
      if (change === 'remove-reinsert') { f.card.remove(); f.w.document.body.append(f.card); f.card._render(); }
      await f.finish();
      assert.notEqual(f.card.shadowRoot.activeElement?.id, f.id);
    } finally { await f.close(); }
  });

  test(`${action}: programmatic invocation with outside focus has no keyboard claim`, async () => {
    const f = fixture(action);
    try {
      const outside = f.w.document.getElementById('outside'); outside.focus();
      if (action === 'smtp') f.card._testSmtp(); else f.card._sendEmailNow(action);
      await f.finish();
      assert.equal(f.w.document.activeElement, outside);
      assert.equal(f.card.shadowRoot.activeElement, null);
    } finally { await f.close(); }
  });
}

for (const period of ['daily', 'weekly']) test(`${period}: both send buttons stay single-flight while focused on anchor`, async () => {
  const f = fixture(period);
  try {
    const first = f.start();
    for (const id of ['btn-send-daily', 'btn-send-weekly']) {
      const button = f.card.shadowRoot.getElementById(id);
      assert.equal(button.disabled, true); button.click();
    }
    await f.card._sendEmailNow('daily'); await f.card._sendEmailNow('weekly');
    assert.equal(f.requests.length, 1);
    await f.finish(); await first;
    assert.equal(f.card.shadowRoot.activeElement?.id, f.id);
    f.card.shadowRoot.getElementById('btn-send-weekly').click();
    await f.finish();
    assert.equal(f.requests.length, 2);
  } finally { await f.close(); }
});

for (const compact of [false, true]) test(`SMTP removed during wait: visible ${compact ? 'picker' : 'active tab'} fallback`, async () => {
  const f = fixture('smtp', compact);
  try {
    f.start(); anchor(f.card);
    f.hass.services = {}; // Real renderer now omits the SMTP action on the same tab.
    await f.finish();
    const active = f.card.shadowRoot.activeElement;
    assert.ok(active?.getClientRects().length);
    if (compact) assert.equal(active.id, 'log-tab-select');
    else assert.equal(active.dataset.tab, 'schedule');
  } finally { await f.close(); }
});
