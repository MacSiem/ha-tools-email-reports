'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const NOW = Date.parse('2026-10-12T12:00:00Z');
async function setup(tab = 'overview', lang = 'en', supported = true) {
  const dom = new JSDOM('', { runScripts:'dangerously', pretendToBeVisual:true, url:'http://localhost/' });
  const w = dom.window, observers = [], reads = [], writes = [];
  const NativeDate = w.Date;
  w.Date = class extends NativeDate {
    constructor(...args){super(...(args.length?args:[NOW]));}
    static now(){return NOW;}
  };
  w.matchMedia = () => ({ matches:false, addEventListener(){}, removeEventListener(){} });
  // Observer delivery only; browser layout is never mocked.
  if (supported) w.ResizeObserver = class {
    constructor(callback){this.callback=callback;this.targets=[];this.disconnected=false;observers.push(this);}
    observe(target){this.targets.push(target);}
    disconnect(){this.disconnected=true;}
    deliver(width){this.callback(this.targets.map(target=>({target,contentRect:{width}})));}
  };
  const entrypoint = process.env.HA_LOG_TEST_ENTRYPOINT || 'ha-log-email.js';
  w.eval(fs.readFileSync(path.join(__dirname,'..',entrypoint),'utf8'));
  const card = w.document.createElement('ha-log-email');
  card._config={max_entries:50,show_support:false};
  card._lang=lang;
  const hass={language:lang,locale:{language:lang},user:{id:'record-viewer',is_admin:true},connection:{connected:true},states:{},services:{},
    callWS:async request=>{
      reads.push(request.type);
      if(request.type==='system_log/list')return [
        {id:'exact-error',timestamp:(NOW-1000)/1000,level:'ERROR',name:'fixture',source:['a.py',1],message:['Long original <message>'],count:0},
        {id:'exact-warning',timestamp:(NOW-2000)/1000,level:'WARNING',name:'fixture',source:['b.py',2],message:['Other problem'],count:2}];
      if(request.type==='ha_tools_email/get_attempt_history')return {schema:1,limit:128,retention_days:90,attempts:[
        {id:'12345678-1234-4234-8234-123456789abc',timestamp:new Date(NOW-1000).toISOString(),source:'schedule',kind:'log_digest',cadence:'daily',period:'daily:2026-10-11',schedule_ref:'a'.repeat(64),recipient_count:0,outcome:'transport_outcome_unknown'}]};
      throw Error('Unexpected read '+request.type);
    },callService:async(...args)=>{writes.push(args);return {};}};
  card._hass=hass;w.document.body.append(card);
  await card._fetchLogData();
  card.setActiveTab(tab);
  if(tab==='history')await card._refreshAttemptHistory();
  const root=card.shadowRoot;
  const observer=()=>observers.findLast(o=>!o.disconnected&&o.targets.some(t=>t.classList.contains('ht-log-layout')));
  const resize=width=>{assert.ok(observer(),'Record layout observes its own container');observer().deliver(width);};
  return {dom,w,card,hass,root,reads,writes,observers,observer,resize,close(){card.disconnectedCallback();w.close();}};
}
function values(table){return Array.from(table.tBodies[0].rows,row=>Array.from(row.cells,c=>c.textContent));}
for(const lang of ['en','pl'])for(const tab of ['overview','history'])test(`${tab} ${lang}: native records retain every original metadata value and zero`,async()=>{
 const f=await setup(tab,lang);
 try{
  const tables=Array.from(f.root.querySelectorAll('table.history-records'));
  const before=tables.map(values), readCount=f.reads.length;
  f.resize(499.5);
  const mounts=Array.from(f.root.querySelectorAll('.ht-log-layout'));
  assert.equal(mounts.length,tables.length);
  mounts.forEach((mount,i)=>{
   assert.equal(tables[i].hidden,true);
   const records=Array.from(mount.querySelectorAll('.ht-log-records > details'));
   assert.deepEqual(records.map(d=>Array.from(d.querySelectorAll('dd'),e=>e.textContent)),before[i]);
   assert.ok(records.every(d=>d.querySelector('summary strong').textContent&&d.querySelector('summary .log-record-state').textContent));
   assert.equal(records[0].open,false);
   records[0].open=true;
   assert.equal(records[0].querySelectorAll('dt').length,tables[i].tHead.rows[0].cells.length);
  });
  if(tab==='overview'){
   const summary=f.root.querySelector('.ht-log-records summary').textContent;
   assert.match(summary,/Long original <message>/);assert.match(summary,/ERROR/);
   assert.match(summary,lang==='pl'?/Wystąpienia \(HA\): 0/:/Occurrences \(HA\): 0/);
   assert.match(summary,lang==='pl'?/Ostatnie wystąpienie:/:/Last occurrence:/);
   assert.equal(f.root.querySelectorAll('.ht-log-records > details')[1].open,false);
   assert.match(f.root.querySelectorAll('.ht-log-records > details > summary')[1].textContent,lang==='pl'?/Wystąpienia \(HA\): 2/:/Occurrences \(HA\): 2/);
   assert.equal(f.root.querySelector('.ht-log-records dd:last-child').textContent,'0');
  }else{
   const summary=f.root.querySelector('.attempt-history .ht-log-records summary').textContent;
   assert.match(summary,lang==='pl'?/Raport dziennika/:/Log digest/);
   assert.match(summary,lang==='pl'?/Nieznany wynik transportu/:/Transport outcome unknown/);
   assert.doesNotMatch(summary,/Delivered|Dostarczono|Success|Sukces/);
  }
  f.resize(500);
  assert.ok(tables.every(t=>!t.hidden));assert.deepEqual(tables.map(values),before);
  assert.equal(f.reads.length,readCount);assert.equal(f.writes.length,0);
  assert.equal(f.root.querySelector('message'),null);
 }finally{f.close();}
});
test('resize moves existing value nodes, preserves disclosure and keyboard focus without source rebuild',async()=>{
 const f=await setup();try{
  const table=f.root.querySelector('.history-records'),node=table.tBodies[0].rows[0].cells[3].firstChild;
  const snapshot=JSON.stringify(f.card._retainedLogs),reads=f.reads.length;
  f.resize(390);let detail=f.root.querySelector('.ht-log-records > details');detail.open=true;
  detail.querySelector('summary').focus();f.resize(900);
  assert.equal(f.root.activeElement,table.tBodies[0].rows[0]);assert.equal(f.root.activeElement.closest('[hidden]'),null);
  assert.equal(table.tBodies[0].rows[0].cells[3].firstChild,node);
  f.resize(260);assert.equal(f.root.activeElement,detail.querySelector('summary'));assert.equal(detail.open,true);
  assert.equal(detail.querySelectorAll('dd')[3].firstChild,node);
  assert.equal(JSON.stringify(f.card._retainedLogs),snapshot);assert.equal(f.reads.length,reads);assert.equal(f.writes.length,0);
 }finally{f.close();}
});
test('locale repaint preserves the same record disclosure/focus and rejects stale observer deliveries',async()=>{
 const f=await setup('history');try{
  f.resize(390);const old=f.observer(),detail=f.root.querySelector('.attempt-history .ht-log-records > details');
  detail.open=true;detail.querySelector('summary').focus();f.card._lang='pl';f.card._render();
  assert.equal(old.disconnected,true);
  const next=f.root.querySelector('.attempt-history .ht-log-records > details');assert.equal(next.open,true);
  assert.equal(f.root.activeElement,next.querySelector('summary'));
  old.deliver(900);assert.equal(f.root.querySelector('.attempt-history table').hidden,true);
  f.resize(900);assert.equal(f.root.querySelector('.attempt-history table').hidden,false);
 }finally{f.close();}
});
test('source identity/role change removes records; detach ends observation and read-only history remains',async()=>{
 const f=await setup('history');try{
  f.resize(390);const old=f.observer();f.card._firstRender=true;
  f.card.hass={...f.hass,user:{id:'household',is_admin:false}};
  assert.equal(old.disconnected,true);old.deliver(200);
  assert.equal(f.root.querySelector('.ht-log-records'),null);assert.equal(f.card._attemptHistory.state.attempts.length,0);
  assert.equal(f.writes.length,0);
  f.card.disconnectedCallback();assert.equal(f.root.children.length,0);
 }finally{f.close();}
});
test('unsupported observer keeps all original tables and source metadata',async()=>{
 const f=await setup('history','en',false);try{
  const tables=Array.from(f.root.querySelectorAll('.history-records'));
  assert.equal(tables.length,2);assert.ok(tables.every(t=>!t.hidden&&t.tBodies[0].rows.length));
  assert.equal(f.writes.length,0);
 }finally{f.close();}
});
test('two actual browser reads at the same timestamp retain independent disclosures and focus on repaint',async()=>{
 const f=await setup('history');try{
  await f.card._fetchLogData();f.card.setActiveTab('history');f.resize(390);
  const rows=Array.from(f.root.querySelectorAll('.browser-snapshots .ht-log-records > details'));
  assert.equal(rows.length,2);
  assert.equal(f.card._logHistory[0].ts,f.card._logHistory[1].ts);
  assert.notEqual(rows[0].dataset.recordKey,rows[1].dataset.recordKey);
  rows[1].open=true;rows[1].querySelector('summary').focus();
  const before=JSON.stringify(f.card._logHistory);
  f.card._lang='pl';f.card._render();
  const after=Array.from(f.root.querySelectorAll('.browser-snapshots .ht-log-records > details'));
  assert.equal(after[0].open,false);assert.equal(after[1].open,true);
  assert.equal(f.root.activeElement,after[1].querySelector('summary'));
  assert.equal(JSON.stringify(f.card._logHistory),before);
 }finally{f.close();}
});
