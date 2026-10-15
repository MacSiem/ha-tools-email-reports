// Old 2.1.2 accepts schedule dictionaries but drops calendar-only fields.
// A post-write mismatch is too late once an enabled schedule reaches that server.
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { JSDOM } = require('jsdom');
const settle = async () => { for (let n=0;n<40;n++) await Promise.resolve(); };
function legacy() {
  const calls=[], rows=[];
  return {calls, rows, callWS: async message => {
    calls.push(message);
    if(message.type==='system_log/list') return [];
    if(message.type==='ha_tools_email/list_schedules') return {schedules:rows};
    if(message.type==='ha_tools_email/set_schedule') {
      const row=Object.fromEntries(Object.entries(message.schedule || {}).filter(([key])=>['id','kind','cadence','time','enabled','recipients'].includes(key)));
      rows.push(row);return {schedule:row,schedules:rows};
    }
    // The new backend is not proved merely by recognizing list_schedules.
    throw {code:'unknown_command'};
  }};
}
test('shared Energy calendar cannot activate a legacy backend schedule that ignores timezone and month day',async t=>{
  const source=fs.readFileSync(path.join(__dirname,'../shared/ha-tools-email-schedules.js'),'utf8');
  const sandbox={Intl,Uint8Array,crypto:require('node:crypto').webcrypto,setTimeout,clearTimeout};
  vm.createContext(sandbox);vm.runInContext(source.replace('export function ','function ')+';this.factory=createHaToolsEmailSchedules;',sandbox);
  const old=legacy(), controller=sandbox.factory({kind:'energy_report'});
  t.after(()=>controller.discard());controller.setContext({user:{id:'admin',is_admin:true},connection:{connected:true},callWS:old.callWS});
  await controller.refresh();controller.create();
  if(controller.model().draft) {
    controller.update('cadence','monthly');controller.update('month_day',31);controller.update('timezone','Europe/Zurich');controller.update('enabled',true);
    await controller.save();
  }
  assert.equal(old.calls.filter(x=>x.type==='ha_tools_email/set_schedule').length,0,'unsupported calendar must be rejected before the first server mutation');
  assert.equal(controller.model().draft,null);assert.equal(controller.model().status.reason,'unavailable');
});
test('actual Reports bundle cannot activate a legacy Log schedule before backend calendar support is known',async t=>{
  const dom=new JSDOM('<body></body>',{runScripts:'outside-only',pretendToBeVisual:true,url:'http://localhost/'});t.after(()=>dom.window.close());
  dom.window.eval(fs.readFileSync(path.join(__dirname,'../ha-tools-email-reports.js'),'utf8'));
  const old=legacy(), card=dom.window.document.createElement('ha-log-email');card.setConfig({show_support:false});dom.window.document.body.append(card);
  card.hass={user:{id:'admin',is_admin:true},connection:{connected:true},connected:true,locale:{language:'en'},config:{time_zone:'Europe/Warsaw'},states:{},services:{},callWS:old.callWS,callService:async()=>{throw new Error('No service call expected');}};
  await settle();card.setActiveTab('schedule');await settle();let root=card.shadowRoot;
  const newButton=root.getElementById('schedule-new');assert.ok(newButton);
  if(!newButton.disabled) {
    newButton.click();await settle();
    for(const [id,value] of [['schedule-cadence','monthly'],['schedule-month-day','31'],['schedule-timezone','Europe/Zurich'],['schedule-enabled',true]]) {
      const el=root.getElementById(id);assert.ok(el,id);if(el.type==='checkbox')el.checked=value;else el.value=value;
      el.dispatchEvent(new dom.window.Event('input',{bubbles:true}));el.dispatchEvent(new dom.window.Event('change',{bubbles:true}));
    }
    root.getElementById('schedule-save').click();await settle();
  }
  assert.equal(old.calls.filter(x=>x.type==='ha_tools_email/set_schedule').length,0,'bundle must not write an enabled schedule to the legacy API');
  assert.match(root.textContent,/2\.2\.0/);assert.equal(root.getElementById('schedule-new').disabled,true);
});
