'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
for(const source of ['ha-log-email.js','ha-tools-email-reports.js']) {
  for(const cadence of ['daily','weekly','monthly'])for(const mode of ['rolling','calendar']) {
    test(`${source}: ${cadence}/${mode} delegates period selection independently from local data/filters`,async t=>{
      const dom=new JSDOM('<body></body>',{runScripts:'outside-only',url:'http://localhost/'});t.after(()=>dom.window.close());
      dom.window.eval(fs.readFileSync(path.join(__dirname,'..',source),'utf8'));
      const card=dom.window.document.createElement('ha-log-email'),sent=[];
      card._config={max_entries:23,email_recipient:'fixture@example.invalid'};
      card._hass={language:'en',user:{id:'admin',is_admin:true},states:{},services:{},callWS:async message=>{
        if(message.type==='manifest/get')return {domain:'ha_tools_email',version:'2.3.0'};
        if(message.type==='ha_tools_email/send_now'){sent.push(message);return {};}
        throw Error('manual send must not read client log data');
      },callService:()=>assert.fail('No client mail construction')};
      card._activeTab='send';card._mailPeriodMode=mode;
      // Null and a sensor-only snapshot must both delegate to backend retained data.
      for(const data of [null,{errors:[{message:'SENSOR_SNAPSHOT'}],warnings:[],total:1}]) {
        card._logData=data;card._logFilters={period:'24h',severity:'WARNING',source:'unrelated'};
        await card._sendEmailNow(cadence);
        const req=sent.at(-1);assert.ok(req);assert.equal(req.cadence,cadence);assert.equal(req.period_mode,mode);assert.equal(req.max_entries,23);
        assert.equal(req.kind,'log_digest');assert.equal(JSON.stringify(req.recipients),'["fixture@example.invalid"]');
        for(const key of ['subject','html','body','severity','source','calendar_period'])assert.equal(key in req,false,key);
        assert.equal(card._sendStatus.status,'unconfirmed');
      }
      assert.equal(sent.length,2,'one WS mutation for each deliberate send');
    });
  }
}
