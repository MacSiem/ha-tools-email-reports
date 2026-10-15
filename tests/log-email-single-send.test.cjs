'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const { JSDOM } = require('jsdom');
const flush = async () => { for (let i=0;i<30;i++) await Promise.resolve(); };
for (const source of ['ha-log-email.js','ha-tools-email-reports.js']) {
  for (const outcome of ['success','failure']) {
    test(`${source}: one raw send blocks every cadence and SMTP; explicit retry after ${outcome}`, async t => {
      const dom = new JSDOM('<body></body>',{runScripts:'outside-only',pretendToBeVisual:true,url:'http://localhost/'});
      t.after(()=>dom.window.close());
      dom.window.eval(fs.readFileSync(path.join(__dirname,'..',source),'utf8'));
      const card=dom.window.document.createElement('ha-log-email'), requests=[];
      let resolve,reject; const pending=new Promise((a,b)=>{resolve=a;reject=b;});
      card._config={max_entries:50,email_recipient:'fixture@example.invalid'};
      card._hass={language:'en',user:{id:'admin',is_admin:true},states:{},services:{ha_tools_email:{send:{},test:{}}},
        callWS:message=>{
          if(message.type==='manifest/get')return Promise.resolve({domain:'ha_tools_email',version:'2.3.0'});
          if(message.type==='ha_tools_email/send_now'){requests.push(message);return requests.length===1?pending:Promise.resolve({});}
          return Promise.resolve({schedules:[]});
        },callService:()=>assert.fail('SMTP and old send service must remain blocked during raw send')};
      card._logData=null;card._activeTab='send';card._render();
      let first;
      try {
        first=card._sendEmailNow('daily');await flush();
        assert.equal(requests.length,1);assert.equal(card._sendStatus.status,'not_checked');
        for(const cadence of ['daily','weekly','monthly']){
          const button=card.shadowRoot.getElementById('btn-send-'+cadence);
          assert.equal(button.disabled,true);button.click();await card._sendEmailNow(cadence);
        }
        await card._testSmtp();assert.equal(requests.length,1);
        if(outcome==='success')resolve({});else reject(Error('Synthetic SMTP unavailable'));
        await first;
        assert.equal(card._sendStatus.status,'unconfirmed');
        assert.equal(card._sendStatus.reason,outcome==='success'?'completed':'transport_unknown');
        for(const cadence of ['daily','weekly','monthly'])assert.equal(card.shadowRoot.getElementById('btn-send-'+cadence).disabled,false);
        assert.equal(requests.length,1,'settlement must never auto-retry');
        await card._sendEmailNow('monthly');assert.equal(requests.length,2);
        assert.equal(requests[1].type,'ha_tools_email/send_now');assert.equal(requests[1].cadence,'monthly');
        assert.equal(requests[1].period_mode,'rolling');assert.equal('html' in requests[1],false);
      } finally {resolve({});if(first)await first;}
    });
  }
}
