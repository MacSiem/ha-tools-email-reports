'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

for (const source of ['ha-log-email.js', 'ha-tools-email-reports.js']) {
  for (const outcome of ['success', 'failure']) {
    test(`${source}: one pending log send blocks both periods and permits a deliberate retry after ${outcome}`, async () => {
      const dom = new JSDOM('<!doctype html><html><body></body></html>', {
        runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/',
      });
      const { window } = dom;
      window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
      window.eval(fs.readFileSync(path.join(__dirname, '..', source), 'utf8'));
      const card = window.document.createElement('ha-log-email');
      const requests = [];
      let finish;
      const pending = new Promise((resolve, reject) => {
        finish = outcome === 'success' ? resolve : () => reject(new Error('Synthetic SMTP unavailable'));
      });
      card._config = { title: 'Log Email', max_entries: 50, email_recipient: 'fixture@example.invalid' };
      card._hass = {
        language: 'en', user: { is_admin: true }, states: {},
        services: { ha_tools_email: { send: {} } },
        callService: async (domain, service, data) => {
          requests.push({ domain, service, data });
          if (requests.length === 1) await pending;
          return {};
        },
      };
      card._logData = { errors: [{ message: 'Fixture error', domain: 'fixture', count: 1 }], warnings: [], total: 1 };
      card._activeTab = 'send';
      let first;
      try {
        card._render();
        first = card._sendEmailNow('daily');
        await card._sendEmailNow('daily');
        await card._sendEmailNow('weekly');
        assert.equal(requests.length, 1, 'one service request while the first send is pending');
        assert.equal(card._sendStatus.status, 'sending');
        for (const id of ['btn-send-daily', 'btn-send-weekly']) {
          assert.equal(card.shadowRoot.getElementById(id).disabled, true, `${id} is disabled during sending`);
        }
        finish();
        await first;
        assert.equal(card._sendStatus.status, outcome === 'success' ? 'success' : 'error');
        for (const id of ['btn-send-daily', 'btn-send-weekly']) {
          assert.equal(card.shadowRoot.getElementById(id).disabled, false, `${id} is enabled after settlement`);
        }
        await card._sendEmailNow('weekly');
        assert.equal(requests.length, 2, 'a later deliberate send is allowed');
        assert.equal(requests[1].service, 'send');
        assert.match(requests[1].data.subject, /Weekly Report/);
      } finally {
        finish();
        if (first) await first;
        dom.window.close();
      }
    });
  }
}
