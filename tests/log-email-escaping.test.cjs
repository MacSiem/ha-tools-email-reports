'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

test('log messages and service errors stay escaped; server send carries selection only', async () => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/',
  });
  const { window } = dom;
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  window.eval(fs.readFileSync(path.join(__dirname, '..', 'ha-log-email.js'), 'utf8'));
  const card = window.document.createElement('ha-log-email');
  const attack = '<img src=x onerror=alert(1)>';
  const sent = [];
  card._config = { title: 'Log Email', max_entries: 50, email_recipient: 'demo@example.com' };
  card._hass = {
    language: 'en', themes: { darkMode: false }, user: { is_admin: true }, states: {},
    services: { ha_tools_email: { send: {} } },
    callWS: async message => {
      if (message.type === 'manifest/get') return {domain:'ha_tools_email',version:'2.3.0'};
      if (message.type === 'ha_tools_email/send_now') { sent.push(message); return {}; }
      return {};
    },
    callService: () => assert.fail('manual report must not carry client-rendered HTML'),
  };
  card._logData = { errors: [{ domain: attack, message: attack, when: '', count: 1 }], warnings: [], total: 1 };
  card._activeTab = 'overview';
  card._render();
  assert.equal(card.shadowRoot.querySelector('img'), null);
  assert.match(card.shadowRoot.textContent, /<img src=x/);
  assert.doesNotMatch(card._buildEmailPreview(), /<img src=x/);

  card._smtpStatus = { ok: false, error: attack };
  card._sendStatus = { status: 'error', error: attack };
  card._activeTab = 'schedule';
  card._render();
  assert.equal(card.shadowRoot.querySelector('img'), null);
  assert.match(card.shadowRoot.textContent, /HA Tools Email available/);
  assert.doesNotMatch(card.shadowRoot.textContent, /SMTP configured/);

  await card._sendEmailNow('daily');
  assert.equal(sent.length, 1);
  for (const field of ['html','body','subject']) assert.equal(field in sent[0], false);
  assert.equal(sent[0].type, 'ha_tools_email/send_now');
  assert.equal(sent[0].cadence, 'daily');
  dom.window.close();
});

test('household view never requests admin logs or displays stored admin results', async () => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/',
  });
  const { window } = dom;
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  window.localStorage.setItem('ha-tools-log-polling', JSON.stringify({ enabled: true, interval: 60 }));
  window.eval(fs.readFileSync(path.join(__dirname, '..', 'ha-log-email.js'), 'utf8'));
  const card = window.document.createElement('ha-log-email');
  card.setConfig({ title: 'Log Email' });
  let calls = 0;
  card._logData = { errors: [{ message: 'private admin log' }], warnings: [], total: 1 };
  card.hass = {
    language: 'en', themes: { darkMode: false }, user: { is_admin: false }, states: {}, services: {},
    callWS: async () => { calls++; throw new Error('Unauthorized'); },
  };
  await card._fetchLogData();
  await card._pollForNewErrors();
  assert.equal(calls, 0);
  assert.equal(card._logData, null);
  assert.equal(JSON.parse(window.localStorage.getItem('ha-tools-log-polling')).enabled, true);
  assert.match(card.shadowRoot.textContent, /administrator/i);
  assert.doesNotMatch(card.shadowRoot.textContent, /private admin log|Clean|No errors found/i);
  dom.window.close();
});

test('missing fallback sensor stays unavailable locally; missing backend capability blocks mail', async () => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/',
  });
  const { window } = dom;
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  window.eval(fs.readFileSync(path.join(__dirname, '..', 'ha-log-email.js'), 'utf8'));
  const card = window.document.createElement('ha-log-email');
  card._config = { title: 'Log Email', max_entries: 50 };
  let sends = 0;
  card._hass = { language: 'en', user: { is_admin: true }, states: {}, services: { ha_tools_email: { send: {} } }, callService: async () => { sends++; } };
  card._logData = card._getLogFromSensor();
  card._render();
  assert.match(card.shadowRoot.textContent, /unavailable/i);
  assert.doesNotMatch(card.shadowRoot.textContent, /Clean|No errors found/i);
  card._activeTab = 'send';
  await card._sendEmailNow('daily');
  assert.equal(sends, 0);
  assert.equal(card._sendStatus.status, 'error');
  assert.equal(card._sendStatus.reason, 'prepare_failed');
  assert.doesNotMatch(card.shadowRoot.textContent, /Clean|No errors found/i);
  dom.window.close();
});
