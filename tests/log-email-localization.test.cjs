'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const cases = [
  [0, 'błędów', 'ostrzeżeń'], [1, 'błąd', 'ostrzeżenie'],
  [2, 'błędy', 'ostrzeżenia'], [5, 'błędów', 'ostrzeżeń'],
  [12, 'błędów', 'ostrzeżeń'], [14, 'błędów', 'ostrzeżeń'],
  [21, 'błędów', 'ostrzeżeń'], [22, 'błędy', 'ostrzeżenia'],
];
for (const language of ['pl', 'en']) {
  for (const [count, errorsWord, warningsWord] of cases) {
    for (const kind of ['error', 'warning']) {
      test(`rendered ${language} ${kind} count ${count}`, () => {
        const dom = new JSDOM('<!doctype html><html><body></body></html>', {
          runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/',
        });
        const { window } = dom;
        window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
        window.eval(fs.readFileSync(path.join(__dirname, '..', 'ha-log-email.js'), 'utf8'));
        try {
          const card = window.document.createElement('ha-log-email');
          card._config = { title: 'Log Email', max_entries: 50 };
          card._lang = language;
          card._hass = { language, user: { is_admin: true }, themes: { darkMode: false }, states: {}, services: {} };
          const entries = Array.from({ length: count }, () => ({ message: '<img src=x>', domain: 'system_log', count: 1 }));
          card._logData = { errors: kind === 'error' ? entries : [], warnings: kind === 'warning' ? entries : [], total: count };
          card._activeTab = 'overview'; card._render();
          const header = card.shadowRoot.querySelector('.header-badge').textContent;
          const expected = language === 'pl' ? `${count} ${kind === 'error' ? errorsWord : warningsWord}` : `${count} ${kind}${count === 1 ? '' : 's'}`;
          assert.equal(header, count === 0 ? (language === 'pl' ? 'Bez błędów' : 'Clean') : expected);
          assert.equal(card.shadowRoot.querySelector('img'), null);
          card._activeTab = 'send'; card._render();
          const badge = card.shadowRoot.querySelector(kind === 'error' ? '.error-badge' : '.warn-badge');
          // English send badges deliberately keep their established plural wording.
          assert.equal(badge.textContent, language === 'pl' ? expected : `${count} ${kind}s`);
          assert.equal(card._logData.total, count);
        } finally { dom.window.close(); }
      });
    }
  }
}


test('Log locale overrides legacy language and changes on the same HA object without fetching', () => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/',
  });
  const { window } = dom;
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  window.eval(fs.readFileSync(path.join(__dirname, '..', 'ha-log-email.js'), 'utf8'));
  try {
    const card = window.document.createElement('ha-log-email');
    card._config = { title: 'User title', max_entries: 50, email_recipient: 'user@example.com' };
    card._firstRender = true;
    card._activeTab = 'send';
    const data = { errors: [{ message: 'User <img src=x>', domain: 'system_log', count: 1 }], warnings: [], total: 1 };
    card._logData = data;
    const hass = { locale: { language: 'pl' }, language: 'en', user: { is_admin: true }, themes: { darkMode: false }, states: {}, services: {}, callWS() { assert.fail('Language must not fetch log data'); } };
    card._hass = hass;
    for (const [locale, legacy, expected] of [['pl', 'en', '1 błąd'], ['en', 'pl', '1 error'], ['pl-PL', 'en', '1 błąd']]) {
      hass.locale.language = locale; hass.language = legacy; card.hass = hass;
      assert.equal(card.shadowRoot.querySelector('.header-badge').textContent, expected);
      assert.equal(card._activeTab, 'send');
      assert.equal(card._logData, data);
      assert.equal(card._config.email_recipient, 'user@example.com');
      assert.equal(card.shadowRoot.querySelector('.header-title').textContent, 'User title');
      assert.equal(card.shadowRoot.querySelector('img'), null);
    }
    delete hass.locale.language; hass.language = 'en'; card.hass = hass;
    assert.equal(card.shadowRoot.querySelector('.header-badge').textContent, '1 error');
    delete hass.language;
    Object.defineProperty(window.navigator, 'language', { configurable: true, value: 'pl-PL' }); card.hass = hass;
    assert.equal(card.shadowRoot.querySelector('.header-badge').textContent, '1 błąd');
    Object.defineProperty(window.navigator, 'language', { configurable: true, value: '' }); card.hass = hass;
    assert.equal(card.shadowRoot.querySelector('.header-badge').textContent, '1 error');
  } finally { dom.window.close(); }
});
