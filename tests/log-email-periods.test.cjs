const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const now = Date.parse('2026-10-03T10:00:00Z');
for (const source of ['ha-log-email.js', 'ha-tools-email-reports.js']) {
  for (const scenario of ['weekly', 'daily-future', 'fallback']) {
    test(`${source}: log digest period ${scenario} preserves actual retained coverage`, async () => {
      const dom = new JSDOM('<!doctype html><html><body></body></html>', {runScripts:'dangerously',url:'http://localhost/'});
      const w=dom.window;
      w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
      w.Date.now=()=>now;
      w.eval(fs.readFileSync(path.join(__dirname,'..',source),'utf8'));
      const card=w.document.createElement('ha-log-email');
      const sent=[];
      const entry=(age,message)=>({timestamp:(now-age)/1000,level:'ERROR',name:'fixture',message:[message],count:1});
      const day=86400000;
      card._config={max_entries:50,title:'Log Email',email_recipient:'fixture@example.invalid'};
      card._hass={language:'en',user:{is_admin:true},states:{},services:{ha_tools_email:{send:{}}},callWS:async()=>[entry(day/2,'RECENT'),entry(3*day,'THREE_DAYS_OLD'),entry(8*day,'EIGHT_DAYS_OLD'),entry(-day,'FUTURE')],callService:async(d,s,data)=>{if(s==='send')sent.push(data);return {};}};
      card._activeTab='send';
      try {
        if(scenario==='fallback')card._logData={errors:[{message:'SENSOR_SNAPSHOT'}],warnings:[],total:1};
        else await card._fetchLogData();
        await card._sendEmailNow(scenario==='daily-future'?'daily':'weekly');
        if(scenario==='fallback') {
          assert.equal(sent.length,0,'a current sensor snapshot cannot establish a seven-day digest');
          assert.equal(card._sendStatus.status,'error');
        } else {
          assert.equal(sent.length,1);
          assert.match(sent[0].body,/RECENT/);
          if(scenario==='weekly')assert.match(sent[0].body,/THREE_DAYS_OLD/,'weekly digest includes retained three-day-old entries');
          else assert.doesNotMatch(sent[0].body,/THREE_DAYS_OLD/);
          assert.doesNotMatch(sent[0].body,/EIGHT_DAYS_OLD|FUTURE/);
        }
      } finally {dom.window.close();}
    });
  }
}
