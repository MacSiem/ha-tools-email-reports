/* HA Tools split — ha-energy-email compatibility shim v4.5.0 (2026-09-24) */
(function() {
'use strict';

/*
 * The Energy Email card now lives in Energy Optimizer (HACS default), which is its
 * single maintained source. This file keeps existing `type: custom:ha-energy-email`
 * cards working for people who installed HA Tools Email & Reports:
 *
 *  - If Energy Optimizer is loaded first, it owns `ha-energy-email` and this file
 *    defines nothing.
 *  - If this file is loaded first, it defines a thin wrapper that renders Energy
 *    Optimizer's card (`ha-energy-optimizer-email`) as soon as it is available, in
 *    either load order, and otherwise explains how to install Energy Optimizer.
 */
const TAG = 'ha-energy-email';
const IMPL = 'ha-energy-optimizer-email';
const NOTICE_DELAY_MS = 4000;
const _esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);

class HAEnergyEmailShim extends HTMLElement {
  static getConfigElement() {
    const Impl = customElements.get(IMPL);
    return Impl && typeof Impl.getConfigElement === 'function' ? Impl.getConfigElement() : undefined;
  }

  static getStubConfig() {
    const Impl = customElements.get(IMPL);
    return Impl && typeof Impl.getStubConfig === 'function' ? Impl.getStubConfig() : {};
  }

  constructor() {
    super();
    this._config = {};
    this._hass = null;
    this._inner = null;
    this._noticeTimer = null;
    this._waiting = false;
    this._noticeShown = false;
    this.attachShadow({ mode: 'open' });
  }

  setConfig(config) {
    this._config = config && typeof config === 'object' ? { ...config } : {};
    if (this._inner && typeof this._inner.setConfig === 'function') this._inner.setConfig(this._config);
  }

  set hass(hass) {
    this._hass = hass;
    if (this._inner) this._inner.hass = hass;
    else if (this._noticeShown) this._renderNotice();
  }

  get hass() { return this._hass; }

  connectedCallback() {
    if (this._inner) {
      if (!this._inner.isConnected) this.shadowRoot.replaceChildren(this._inner);
      return;
    }
    this.style.display = 'block';
    if (customElements.get(IMPL)) { this._mountImpl(); return; }
    if (!this._noticeShown && !this.shadowRoot.firstChild) this._renderPlaceholder();
    if (!this._waiting) {
      this._waiting = true;
      customElements.whenDefined(IMPL).then(() => { if (this.isConnected) this._mountImpl(); });
    }
    if (this._noticeTimer == null) {
      this._noticeTimer = setTimeout(() => {
        this._noticeTimer = null;
        if (!this._inner && this.isConnected) this._renderNotice();
      }, NOTICE_DELAY_MS);
    }
  }

  disconnectedCallback() {
    if (this._noticeTimer != null) { clearTimeout(this._noticeTimer); this._noticeTimer = null; }
  }

  _mountImpl() {
    if (this._inner) return;
    if (this._noticeTimer != null) { clearTimeout(this._noticeTimer); this._noticeTimer = null; }
    const inner = document.createElement(IMPL);
    try { inner.setConfig(this._config); } catch (e) { console.warn('[ha-energy-email] setConfig failed:', e); }
    if (this._hass) inner.hass = this._hass;
    this._noticeShown = false;
    this.shadowRoot.replaceChildren(inner);
    this._inner = inner;
  }

  _renderPlaceholder() {
    const card = document.createElement('ha-card');
    card.innerHTML = '<div style="padding:16px;color:var(--secondary-text-color)">Energy Email…</div>';
    this.shadowRoot.replaceChildren(card);
  }

  _renderNotice() {
    this._noticeShown = true;
    const pl = String((this._hass && this._hass.language) || (navigator.language || 'en')).toLowerCase().startsWith('pl');
    const title = pl ? 'Karta Energy Email jest teraz w Energy Optimizer' : 'The Energy Email card now lives in Energy Optimizer';
    const body = pl
      ? 'Zainstaluj <b>Energy Optimizer</b> z HACS (katalog domyślny), a następnie odśwież stronę. Ta karta zacznie działać bez zmian w konfiguracji.'
      : 'Install <b>Energy Optimizer</b> from HACS (default catalog), then reload the page. This card will start working with no configuration changes.';
    const card = document.createElement('ha-card');
    card.innerHTML = `<div style="padding:16px;line-height:1.5"><div style="font-weight:600;margin-bottom:6px">${_esc(title)}</div><div style="color:var(--secondary-text-color)">${body}</div></div>`;
    this.shadowRoot.replaceChildren(card);
  }

  getCardSize() { return this._inner && typeof this._inner.getCardSize === 'function' ? this._inner.getCardSize() : 2; }

  getGridOptions() {
    return this._inner && typeof this._inner.getGridOptions === 'function'
      ? this._inner.getGridOptions()
      : { rows: 2, columns: 12, min_rows: 2, min_columns: 6 };
  }
}

if (!customElements.get(TAG)) customElements.define(TAG, HAEnergyEmailShim);

window.customCards = window.customCards || [];
if (!window.customCards.some(c => c.type === TAG)) {
  window.customCards.push({ type: TAG, name: 'Energy Email Reports', description: 'Energy usage reports by email (provided by Energy Optimizer).', preview: false });
}

})();
