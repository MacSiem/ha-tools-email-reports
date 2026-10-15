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

// The actual MIME/excerpt contract now belongs to backend mail rendering.
// Here assert the frontend boundary: full Unicode source remains escaped in
// retained rows; none of those strings are copied into a send_now payload.
for (const source of ['ha-log-email.js', 'ha-tools-email-reports.js']) {
  for (const locale of ['pl','en']) for (const kind of ['errors','warnings']) {
    for (const fixture of fixtures) test(`${source}: ${locale}/${kind}: full source survives UI; ${fixture.name}`, async t => {
      const dom=new JSDOM('<body></body>',{runScripts:'outside-only',url:'http://localhost/'});t.after(()=>dom.window.close());
      const w=dom.window;w.eval(fs.readFileSync(path.join(__dirname,'..',source),'utf8'));
      const card=w.document.createElement('ha-log-email'),sent=[];
      card._config={max_entries:50,email_recipient:'fixture@example.invalid'};card._lang=locale;
      const entry={message:fixture.message,domain:'fixture<&',count:3,when:''};
      card._logData={errors:kind==='errors'?[entry]:[],warnings:kind==='warnings'?[entry]:[],total:1};
      card._hass={locale:{language:locale},language:locale==='pl'?'en':'pl',user:{is_admin:true},states:{},services:{},callWS:async message=>{
        if(message.type==='manifest/get')return {domain:'ha_tools_email',version:'2.3.0'};
        if(message.type==='ha_tools_email/send_now'){sent.push(message);return {};}
        throw Error('manual send must not fetch browser log records');
      },callService:()=>assert.fail('manual send must delegate to backend renderer')};
      card._activeTab='overview';card._render();
      const cells=card.shadowRoot.querySelectorAll('tbody tr td');
      assert.equal(cells[1].textContent,'fixture<&');assert.equal(cells[3].textContent,fixture.message);
      assert.equal(cells[3].children.length,0,'message markup stays text');
      assert.equal(card.shadowRoot.querySelector('img'),null);
      card._activeTab='send';await card._sendEmailNow('daily');
      assert.equal(sent.length,1);assert.equal(card._sendStatus.status,'unconfirmed');
      for(const key of ['body','html','subject'])assert.equal(key in sent[0],false);
      assert.equal(JSON.stringify(sent[0]).includes(fixture.message),false);
      assert.equal(entry.message,fixture.message,'source data is not rewritten');
    });
  }
}
