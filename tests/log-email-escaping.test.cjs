'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

test('log messages and service errors remain text in the card, preview and email body', async () => {
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
    language: 'en', themes: { darkMode: false }, states: {},
    services: { ha_tools_email: { send: {} } },
    callService: async (_domain, service, data) => { if (service === 'send') sent.push(data); return {}; },
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
  assert.doesNotMatch(sent[0].body, /<img src=x/);
  dom.window.close();
});
