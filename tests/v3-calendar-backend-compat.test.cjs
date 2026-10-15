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

function calendar(t, initialManifest = {domain:'ha_tools_email',version:'2.2.0'}) {
  const deadlines=new Map();let timer=0, manifest=initialManifest, rows=[];
  const sandbox={Intl,Uint8Array,crypto:require('node:crypto').webcrypto,
    setTimeout:fn=>{deadlines.set(++timer,fn);return timer;},clearTimeout:id=>deadlines.delete(id)};
  vm.createContext(sandbox);vm.runInContext(fs.readFileSync(path.join(__dirname,'../shared/ha-tools-email-schedules.js'),'utf8').replace('export function ','function ')+';this.factory=createHaToolsEmailSchedules;',sandbox);
  const calls=[], connection=new EventTarget();connection.connected=true;
  const hass={user:{id:'admin',is_admin:true},connection,callWS:async msg=>{
    calls.push(msg);
    if(msg.type==='manifest/get') {assert.equal(msg.integration,'ha_tools_email');return typeof manifest==='function'?manifest():manifest;}
    if(msg.type==='ha_tools_email/list_schedules') return {schedules:rows};
    if(msg.type==='ha_tools_email/set_schedule') {rows=msg.action==='delete'?[]:[{...msg.schedule}];return {schedules:rows};}
    throw new Error('Unexpected API');
  }};
  const controller=sandbox.factory({kind:'energy_report'});controller.setContext(hass);t.after(()=>controller.discard());
  return {controller,hass,calls,connection,setManifest:value=>manifest=value,
    expire:()=>{const callbacks=[...deadlines.values()];deadlines.clear();callbacks.forEach(fn=>fn());}};
}
for(const version of ['2.2.0','2.2.1','2.10.0','3.0.0']) test('stable backend '+version+' enables calendar and independent readback',async t=>{
  const f=calendar(t,{domain:'ha_tools_email',version});await f.controller.refresh();f.controller.create();
  assert.ok(f.controller.model().draft);f.controller.update('cadence','monthly');f.controller.update('month_day',31);f.controller.update('timezone','Europe/Zurich');
  await f.controller.save();assert.equal(f.controller.model().status.reason,'saved');
  assert.equal(f.calls.filter(x=>x.type==='ha_tools_email/set_schedule').length,1);
  assert.equal(f.calls.filter(x=>x.type==='ha_tools_email/list_schedules').length,2);
  await f.controller.remove(f.controller.model().rows[0].id);assert.equal(f.controller.model().status.reason,'deleted');
});
for(const manifest of [null,{}, {version:'2.2.0'}, {domain:'other',version:'2.2.0'},
  ...['2.1.2','2.1.99','1.99.0','2.2','v2.2.0','2.2.0b1','2.2.0-rc.1','2.2.0+dev','02.2.0','2.2.0\n','999999999999999999999.0.0'].map(version=>({domain:'ha_tools_email',version}))])
  test('unconfirmed backend '+JSON.stringify(manifest)+' cannot enable or mutate calendar',async t=>{
    const f=calendar(t,manifest);await f.controller.refresh();f.controller.create();await f.controller.save();await f.controller.remove('existing');await f.controller.preview();
    assert.equal(f.controller.model().draft,null);assert.equal(f.controller.model().status.reason,'unavailable');
    assert.deepEqual(f.calls.map(x=>x.type),['manifest/get']);
  });
test('explicit refresh discovers updated backend and rechecks before saving an existing draft',async t=>{
  const f=calendar(t,{domain:'ha_tools_email',version:'2.1.2'});await f.controller.refresh();f.controller.create();assert.equal(f.controller.model().draft,null);
  f.setManifest({domain:'ha_tools_email',version:'2.2.0'});await f.controller.refresh();f.controller.create();assert.ok(f.controller.model().draft);
  f.setManifest({domain:'ha_tools_email',version:'2.1.2'});await f.controller.refresh();await f.controller.save();
  assert.equal(f.calls.some(x=>x.type==='ha_tools_email/set_schedule'),false);
  // A generic editor validation Error must never stand in for confirmed capability.
  f.controller.update('time','invalid');await f.controller.save();assert.equal(f.calls.some(x=>x.type==='ha_tools_email/set_schedule'),false);
});
test('manifest timeout remains locked; late version cannot unlock; explicit refresh recovers',async t=>{
  let resolve;const pending=new Promise(r=>resolve=r);const f=calendar(t,()=>pending);
  const work=f.controller.refresh();await settle();f.expire();await work;assert.equal(f.controller.model().status.reason,'read_timeout');
  resolve({domain:'ha_tools_email',version:'2.2.0'});await settle();f.controller.create();assert.equal(f.controller.model().draft,null);
  f.setManifest({domain:'ha_tools_email',version:'2.2.0'});await f.controller.refresh();f.controller.create();assert.ok(f.controller.model().draft);
});
for(const boundary of ['user','role','connection','offline','reconnect','discard']) test('late manifest cannot cross '+boundary+' context boundary',async t=>{
  let resolve;const pending=new Promise(r=>resolve=r);const f=calendar(t,()=>pending);const work=f.controller.refresh();await settle();
  if(boundary==='reconnect') {f.connection.dispatchEvent(new Event('disconnected'));f.connection.dispatchEvent(new Event('ready'));}
  else if(boundary==='discard') f.controller.discard();
  else f.controller.setContext({...f.hass,...(boundary==='user'?{user:{id:'other',is_admin:true}}:boundary==='role'?{user:{id:'admin',is_admin:false}}:boundary==='offline'?{connected:false}:{connection:{connected:true}})});
  resolve({domain:'ha_tools_email',version:'2.2.0'});await work;await settle();f.controller.create();await f.controller.save();
  assert.equal(f.controller.model().draft,null);assert.equal(f.calls.some(x=>x.type==='ha_tools_email/set_schedule'),false);
  if(boundary==='reconnect') {f.setManifest({domain:'ha_tools_email',version:'2.2.0'});await f.controller.refresh();f.controller.create();assert.ok(f.controller.model().draft);assert.equal(f.calls.filter(x=>x.type==='manifest/get').length,2);}
});
