'use strict';
// Contract of the ha-energy-email compatibility shim (Energy Optimizer owns the card).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
const SHIM = fs.readFileSync(path.join(ROOT, 'ha-energy-email.js'), 'utf8');
const BUNDLE = fs.readFileSync(path.join(ROOT, 'ha-tools-email-reports.js'), 'utf8');

// Minimal stand-in for Energy Optimizer's bundle: guarded public tag + always-free alias.
const FAKE_OPTIMIZER = `
(function () {
  class OptimizerEnergyEmail extends HTMLElement {
    static getStubConfig() { return { type: 'custom:ha-energy-email', from: 'optimizer' }; }
    static getConfigElement() { return document.createElement('div'); }
    constructor() { super(); this.attachShadow({ mode: 'open' }); this.configs = []; this.hassCount = 0; }
    setConfig(c) { this.configs.push(c); this.shadowRoot.innerHTML = '<ha-card>optimizer energy email</ha-card>'; }
    set hass(h) { this.hassCount++; this._h = h; }
    getCardSize() { return 4; }
    getGridOptions() { return { rows: 7, columns: 12, min_rows: 3, min_columns: 6 }; }
  }
  window.__OptimizerEnergyEmail = OptimizerEnergyEmail;
  if (!customElements.get('ha-energy-email')) customElements.define('ha-energy-email', OptimizerEnergyEmail);
  if (!customElements.get('ha-energy-optimizer-email')) customElements.define('ha-energy-optimizer-email', class extends OptimizerEnergyEmail {});
})();`;

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

function makeWindow() {
  const dom = new JSDOM('<!DOCTYPE html><body></body>', { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
  const errors = [];
  dom.window.addEventListener('error', (e) => errors.push(e.message));
  return { window: dom.window, errors };
}

for (const [label, source] of [['source', SHIM], ['bundle', BUNDLE]]) {
  test(`${label}: shim loaded first delegates to Energy Optimizer loaded later`, async () => {
    const { window, errors } = makeWindow();
    window.eval(source);
    const card = window.document.createElement('ha-energy-email');
    card.setConfig({ type: 'custom:ha-energy-email', recipient: 'a@example.com' });
    card.hass = { language: 'en' };
    window.document.body.appendChild(card);
    assert.match(card.shadowRoot.innerHTML, /Energy Email/);
    window.eval(FAKE_OPTIMIZER);
    await delay(20);
    const inner = card.shadowRoot.querySelector('ha-energy-optimizer-email');
    assert.ok(inner, 'optimizer card mounted inside the shim');
    assert.equal(inner.configs.at(-1).recipient, 'a@example.com');
    card.hass = { language: 'en', n: 2 };
    assert.ok(inner.hassCount >= 2, 'hass is forwarded');
    card.setConfig({ type: 'custom:ha-energy-email', recipient: 'b@example.com' });
    assert.equal(inner.configs.at(-1).recipient, 'b@example.com');
    assert.equal(card.getCardSize(), 4);
    assert.equal(JSON.stringify(card.getGridOptions()), JSON.stringify({ rows: 7, columns: 12, min_rows: 3, min_columns: 6 }));
    assert.equal(window.customElements.get('ha-energy-email').getStubConfig().from, 'optimizer');
    assert.deepEqual(errors, []);
    window.close();
  });

  test(`${label}: Energy Optimizer loaded first keeps ownership of the tag`, async () => {
    const { window, errors } = makeWindow();
    window.eval(FAKE_OPTIMIZER);
    window.eval(source);
    assert.equal(window.customElements.get('ha-energy-email'), window.__OptimizerEnergyEmail);
    const card = window.document.createElement('ha-energy-email');
    card.setConfig({ type: 'custom:ha-energy-email' });
    window.document.body.appendChild(card);
    assert.match(card.shadowRoot.innerHTML, /optimizer energy email/);
    assert.deepEqual(errors, []);
    window.close();
  });
}

test('without Energy Optimizer the shim explains how to get the card', async () => {
  const { window, errors } = makeWindow();
  window.eval(SHIM);
  const card = window.document.createElement('ha-energy-email');
  card.setConfig({ type: 'custom:ha-energy-email' });
  card.hass = { language: 'pl' };
  window.document.body.appendChild(card);
  await delay(4300);
  assert.match(card.shadowRoot.innerHTML, /Energy Optimizer/);
  assert.match(card.shadowRoot.innerHTML, /HACS/);
  // Installing Energy Optimizer later still upgrades the card in place.
  window.eval(FAKE_OPTIMIZER);
  await delay(20);
  assert.ok(card.shadowRoot.querySelector('ha-energy-optimizer-email'));
  assert.deepEqual(errors, []);
  window.close();
});

test('the email card source no longer carries its own implementation', () => {
  assert.ok(SHIM.length < 12000, 'shim stays thin');
  assert.doesNotMatch(SHIM, /ha_tools_email\.send|callService\(/);
});
