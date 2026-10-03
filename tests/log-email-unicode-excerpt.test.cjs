'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

// Explicit expected values avoid copying the excerpt algorithm into the test.
const fixtures = [
  { name: 'pair split at unit 200', message: 'a'.repeat(199) + '😀TRAIL', expected: 'a'.repeat(199) },
  { name: 'pair fits exactly at unit 200', message: 'a'.repeat(198) + '😀TRAIL', expected: 'a'.repeat(198) + '😀' },
  { name: 'ASCII remains limited to 200 units', message: 'a'.repeat(201), expected: 'a'.repeat(200) },
  { name: 'escaping follows excerpt limit', message: '<&"\'>'.repeat(40) + 'TRAIL', expected: '<&"\'>'.repeat(40) },
  { name: 'escaping and pair split together', message: '<&"\'>' + 'a'.repeat(194) + '😀TRAIL', expected: '<&"\'>' + 'a'.repeat(194) },
  { name: 'malformed raw surrogates become replacement characters', message: 'żółć\uD800middle\uDC00😀', expected: 'żółć\uFFFDmiddle\uFFFD😀' },
  { name: 'valid Unicode is preserved', message: 'Zażółć gęślą jaźń 😀 & <b>hello</b>', expected: 'Zażółć gęślą jaźń 😀 & <b>hello</b>' },
];

for (const source of ['ha-log-email.js', 'ha-tools-email-reports.js']) {
  for (const locale of ['pl', 'en']) {
    for (const period of ['daily', 'weekly']) {
      for (const kind of ['errors', 'warnings']) {
        for (const fixture of fixtures) {
          test(`${source}: ${locale}/${period}/${kind}: ${fixture.name}`, async () => {
            const dom = new JSDOM('<!doctype html><html><body></body></html>', {
              runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/',
            });
            const { window } = dom;
            window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
            window.eval(fs.readFileSync(path.join(__dirname, '..', source), 'utf8'));
            try {
              const sent = [];
              const card = window.document.createElement('ha-log-email');
              card._config = { title: 'Log Email', max_entries: 50, email_recipient: 'fixture@example.invalid' };
              card._firstRender = true;
              card._activeTab = 'send';
              const entry = { message: fixture.message, domain: 'fixture<&', count: 3, when: '' };
              const report = { errors: kind === 'errors' ? [entry] : [], warnings: kind === 'warnings' ? [entry] : [], total: 1 };
              card._logData = { ...report, weekly: report };
              const hass = {
                locale: { language: locale }, language: locale === 'pl' ? 'en' : 'pl',
                user: { is_admin: true }, themes: { darkMode: false }, states: {},
                services: { ha_tools_email: { send: {} } },
                callWS() { assert.fail('Sending retained data must not fetch logs'); },
                async callService(domain, service, data) {
                  assert.equal(domain, 'ha_tools_email'); assert.equal(service, 'send'); sent.push(data); return {};
                },
              };
              card._hass = hass; card.hass = hass;
              await card._sendEmailNow(period);
              assert.equal(sent.length, 1);
              assert.equal(card._sendStatus.status, 'success');
              const payload = sent[0];
              assert.deepEqual(Object.keys(payload).sort(), ['body', 'html', 'subject', 'to']);
              assert.equal(payload.to, 'fixture@example.invalid');
              assert.equal(payload.html, payload.body);
              // Buffer silently repairs lone surrogates. A lossless round trip is
              // therefore required, not just successful Buffer construction.
              for (const key of ['subject', 'body', 'html', 'to']) {
                assert.equal(Buffer.from(payload[key], 'utf8').toString('utf8'), payload[key], `${key} must survive UTF-8 byte encoding unchanged`);
              }
              const fragment = window.document.createElement('div'); fragment.innerHTML = payload.html;
              const li = fragment.querySelector('li');
              assert.ok(li);
              assert.equal(fragment.querySelectorAll('li').length, 1);
              assert.equal(li.textContent, `fixture<&: ${fixture.expected} (x3)`);
              assert.ok(fixture.expected.length <= 200, 'excerpt remains at most 200 UTF-16 units before escaping');
              assert.equal(li.querySelectorAll('*').length, 1, 'message markup stays text');
              assert.equal(li.firstElementChild.tagName, 'B');
              assert.match(payload.body, /<b>fixture&lt;&amp;<\/b>/);
              if (fixture.message.includes('<')) assert.match(payload.body, /&lt;/);
              if (period === 'weekly') assert.match(payload.body, locale === 'pl' ? /Zachowane wpisy z ostatnich 7 dni/ : /Retained entries from the last 7 days/);
              else assert.doesNotMatch(payload.body, /Zachowane wpisy z ostatnich 7 dni|Retained entries from the last 7 days/);
              assert.match(payload.subject, locale === 'pl' ? (period === 'daily' ? /Raport dzienny/ : /Raport tygodniowy/) : (period === 'daily' ? /Daily Report/ : /Weekly Report/));
              assert.equal(entry.message, fixture.message, 'source data is not rewritten');
            } finally { dom.window.close(); }
          });
        }
      }
    }
  }
}
