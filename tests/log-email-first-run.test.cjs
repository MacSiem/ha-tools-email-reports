'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
for (const source of ['ha-log-email.js', 'ha-tools-email-reports.js']) {
  for (const language of ['en', 'pl']) {
    test(`${source}: ${language} missing integration guides installation; an available service does not claim SMTP configured`, () => {
      const dom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
      const { window } = dom;
      window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
      window.eval(fs.readFileSync(path.join(__dirname, '..', source), 'utf8'));
      const card = window.document.createElement('ha-log-email');
      card._config = { title: 'Log Email', max_entries: 50 };
      card._lang = language;
      card._hass = { language, user: { is_admin: true }, themes: { darkMode: false }, states: {}, services: {} };
      card._logData = { errors: [], warnings: [], total: 0 };
      card._activeTab = 'schedule';
      try {
        card._render();
        assert.match(card.shadowRoot.querySelector('.smtp-section').textContent, language === 'pl' ? /Integracja HA Tools Email nie jest zainstalowana/ : /HA Tools Email integration is not installed/);
        assert.match(card.shadowRoot.querySelector('.smtp-section').textContent, /HACS/);
        assert.equal(card.shadowRoot.querySelector('.smtp-section a[href="/hacs"]').textContent, 'HACS');
        assert.equal(card.shadowRoot.querySelector('.smtp-section a[href="/config/integrations"]').textContent, language === 'pl' ? 'Urządzenia i usługi' : 'Devices & services');
        assert.doesNotMatch(card.shadowRoot.querySelector('.smtp-section').textContent, /SMTP not configured|SMTP nie skonfigurowany/);
        card._hass.services = { ha_tools_email: { send: {} } };
        card._smtpStatus = { ok: false, error: 'SMTP not configured' };
        card._render();
        assert.match(card.shadowRoot.querySelector('.smtp-section').textContent, language === 'pl' ? /HA Tools Email dostępne/ : /HA Tools Email available/);
        assert.match(card.shadowRoot.querySelector('.smtp-section').textContent, /SMTP not configured/);
        assert.doesNotMatch(card.shadowRoot.querySelector('.smtp-section').textContent, /integration is not installed|Integracja HA Tools Email nie jest zainstalowana|SMTP configured/);
      } finally { dom.window.close(); }
    });
  }
}
