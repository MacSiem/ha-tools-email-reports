'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const NOW = Date.parse('2026-10-12T12:00:00Z');
const DAY = 86400000;
function fixture() {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/'
  });
  const w = dom.window;
  w.Date.now = () => NOW;
  w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  w.eval(fs.readFileSync(path.join(__dirname, '..', 'ha-log-email.js'), 'utf8'));
  const card = w.document.createElement('ha-log-email');
  w.document.body.append(card);
  card._config = { title: 'Log Email', max_entries: 50, untouched: { future: true } };
  const reads = [], writes = [];
  const connection = { connected: true };
  const hass = { locale: { language: 'en' }, language: 'en', user: { id: 'admin-a', is_admin: true },
    connection, states: {}, services: {},
    callWS: async (request) => { reads.push(request); return []; },
    callService: async (...args) => { writes.push(args); return {}; } };
  card._hass = hass;
  return { dom, w, card, hass, reads, writes, close() { card.disconnectedCallback(); dom.window.close(); } };
}
function entry(age, extra = {}) {
  return { timestamp: (NOW - age) / 1000, level: 'ERROR', name: 'fixture',
    source: ['fixture.py', 10], message: ['EXACT'], exception: '', count: 1, ...extra };
}
function attempt(extra = {}) {
  return { id: '12345678-1234-4234-8234-123456789abc', timestamp: new Date(NOW - DAY).toISOString(),
    source: 'schedule', kind: 'log_digest', cadence: 'daily', period: 'daily:2026-10-11',
    schedule_ref: 'a'.repeat(64), recipient_count: 2, outcome: 'accepted_by_smtp', ...extra };
}
function response(rows = [attempt()]) { return { schema: 1, limit: 128, retention_days: 90, attempts: rows }; }
function pending() { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; }

test('history opens without reads or writes; refresh uses the one persisted metadata API', async () => {
  const f = fixture();
  try {
    f.card.setActiveTab('history');
    assert.equal(f.reads.length, 0); assert.equal(f.writes.length, 0);
    f.hass.callWS = async request => { f.reads.push(request); return response(); };
    await f.card._refreshAttemptHistory();
    assert.deepEqual(JSON.parse(JSON.stringify(f.reads)), [{ type: 'ha_tools_email/get_attempt_history' }]);
    const content = f.card.shadowRoot.querySelector('.attempt-history').textContent;
    assert.match(content, /Accepted by SMTP server/); assert.match(content, /does not confirm delivery/);
    assert.match(content, /Scheduled/); assert.match(content, /Log digest/); assert.match(content, /Day 2026-10-11/);
    const row = f.card.shadowRoot.querySelector('.attempt-history tbody tr');
    assert.equal(row.dataset.source, 'schedule'); assert.equal(row.dataset.kind, 'log_digest'); assert.equal(row.dataset.period, 'daily:2026-10-11');
    assert.match(content, /128/); assert.match(content, /90/); assert.match(content, /Oldest/); assert.match(content, /Newest/);
    assert.equal(f.writes.length, 0);
    assert.equal(f.card._config.untouched.future, true);
  } finally { f.close(); }
});

test('history allowlist never renders or persists addresses, content, config, raw errors', async () => {
  const f = fixture();
  try {
    f.hass.callWS = async () => response([attempt({ recipient: 'PRIVATE@example.invalid', subject: 'SECRET_SUBJECT',
      message: 'SECRET_MESSAGE', password: 'SECRET_PASSWORD', config: { host: 'SECRET_HOST' } })]);
    f.card.setActiveTab('history'); await f.card._refreshAttemptHistory();
    assert.doesNotMatch(f.card.shadowRoot.textContent, /PRIVATE|SECRET_/);
    assert.doesNotMatch(JSON.stringify(f.card._attemptHistory.state), /PRIVATE|SECRET_/);
    for (let i=0; i<f.w.sessionStorage.length; i++) assert.doesNotMatch(f.w.sessionStorage.getItem(f.w.sessionStorage.key(i)), /PRIVATE|SECRET_/);
    f.hass.callWS = async () => { throw new Error('PRIVATE@example.invalid SECRET_ERROR'); };
    await f.card._refreshAttemptHistory();
    assert.equal(f.card._attemptHistory.state.status, 'error');
    assert.doesNotMatch(f.card.shadowRoot.textContent, /PRIVATE|SECRET_/);
    assert.equal(f.card._attemptHistory.state.attempts.length, 0);
  } finally { f.close(); }
});

test('test/manual and scheduled energy rows retain exact metadata and neutral non-success outcomes PL/EN', async () => {
  const f=fixture();
  try {
    f.hass.callWS=async()=>response([attempt({source:'manual',kind:'test',cadence:null,period:null,outcome:'transport_outcome_unknown'}),
      attempt({id:'22345678-1234-4234-8234-123456789abc',source:'schedule',kind:'energy_report',cadence:'monthly',period:'monthly:2026-10',outcome:'partial_acceptance'})]);
    f.card.setActiveTab('history'); await f.card._refreshAttemptHistory();
    for(const lang of ['en','pl']) {
      f.card._lang=lang; f.card._render();
      const text=f.card.shadowRoot.querySelector('.attempt-history').textContent;
      assert.match(text, lang === 'pl' ? /Ręcznie.*Test.*Raport energii/s : /Manual.*Test.*Energy report/s);
      assert.match(text, lang === 'pl' ? /Miesiąc 2026-10/ : /Month 2026-10/);
      const rows = f.card.shadowRoot.querySelectorAll('.attempt-history tbody tr');
      assert.equal(rows[0].dataset.source,'manual'); assert.equal(rows[0].dataset.kind,'test');
      assert.equal(rows[0].dataset.outcome,'transport_outcome_unknown'); assert.equal(rows[1].dataset.outcome,'partial_acceptance');
      assert.doesNotMatch(text,/Email sent|Email wysłany|Delivered|Dostarczono/);
    }
  } finally {f.close();}
});

test('malformed response, duplicate IDs, out of range and unknown codes do not produce confirmed history', async () => {
  const f=fixture();
  try {
    f.card.setActiveTab('history'); f.hass.callWS=async()=>({schema:2,attempts:[attempt()]});
    await f.card._refreshAttemptHistory(); assert.equal(f.card._attemptHistory.state.status,'unconfirmed');
    assert.equal(f.card._attemptHistory.state.attempts.length,0);
    f.hass.callWS=async()=>response([attempt(),attempt(),attempt({id:'22345678-1234-4234-8234-123456789abc',timestamp:new Date(NOW+DAY).toISOString()}),
      attempt({id:'32345678-1234-4234-8234-123456789abc',timestamp:new Date(NOW-91*DAY).toISOString()}),
      attempt({id:'42345678-1234-4234-8234-123456789abc',outcome:'SECRET_RAW_ERROR'})]);
    await f.card._refreshAttemptHistory(); assert.equal(f.card._attemptHistory.state.status,'partial');
    assert.equal(f.card._attemptHistory.state.attempts.length,2);
    assert.doesNotMatch(f.card.shadowRoot.textContent,/SECRET_RAW_ERROR/);
  } finally {f.close();}
});

test('refresh coalesces; timeout discards late results and explicit discard is safe', async () => {
  const f=fixture();
  try {
    const d=pending(); let calls=0; f.hass.callWS=()=>{calls++;return d.promise;};
    f.card._attemptHistory.timeoutMs=5;
    const first=f.card._refreshAttemptHistory(), second=f.card._refreshAttemptHistory();
    await Promise.all([first,second]);
    assert.equal(calls,1); assert.equal(f.card._attemptHistory.state.status,'unconfirmed');
    d.resolve(response()); await Promise.resolve(); await Promise.resolve();
    assert.equal(f.card._attemptHistory.state.attempts.length,0);
    f.card._discardAttemptHistory(); assert.equal(f.card._attemptHistory.state.status,'idle');
    assert.equal(f.writes.length,0);
  } finally {f.close();}
});

for(const change of ['household','user','connection','offline','disconnect']) test(`privileged rows and pending reads discarded on ${change}`, async()=>{
  const f=fixture();
  try {
    f.card.setActiveTab('history'); f.hass.callWS=async()=>response(); await f.card._refreshAttemptHistory();
    assert.equal(f.card._attemptHistory.state.attempts.length,1);
    const d=pending(); f.hass.callWS=()=>d.promise; const read=f.card._refreshAttemptHistory();
    f.card._firstRender=true;
    const next={...f.hass};
    if(change==='household')next.user={id:'resident',is_admin:false};
    if(change==='user')next.user={id:'admin-b',is_admin:true};
    if(change==='connection')next.connection={connected:true};
    if(change==='offline')next.connection={connected:false};
    if(change==='disconnect')f.card.disconnectedCallback(); else f.card.hass=next;
    d.resolve(response()); await read;
    assert.equal(f.card._attemptHistory.state.attempts.length,0);
    assert.doesNotMatch(f.card.shadowRoot.textContent,/daily:2026-10-11/);
    if(change==='household') {
      let forbidden=0; next.callWS=async()=>{forbidden++;return response();};
      await f.card._refreshAttemptHistory(); assert.equal(forbidden,0);
    }
    assert.equal(f.writes.length,0);
  } finally {f.close();}
});

test('stable backend identities use aggregate maximum; exact structured fallback sums counts without normalizing', async()=>{
  const f=fixture();
  try {
    f.hass.callWS=async()=>[entry(100,{id:'backend-a',count:4}),entry(80,{id:'backend-a',count:7}),
      entry(60,{message:['separate','parts'],count:3}),entry(40,{message:['separate','parts'],count:2}),
      entry(20,{message:['separate parts'],count:1}),entry(10,{message:[' separate parts '],count:1}),
      entry(5,{message:['separate parts'],exception:'different',count:1})];
    await f.card._fetchLogData();
    const model=f.card._retainedModel();
    assert.equal(model.unique,5); assert.equal(model.occurrences,15);
    assert.equal(model.rows.find(r=>r.backendIdentity==='backend-a').count,7);
    assert.equal(model.rows.find(r=>r.message==='separate parts'&&r.count===5).count,5);
    assert.equal(f.writes.length,0);
  } finally {f.close();}
});

test('filters share retained model, respect cap and time bounds, never reread or send', async()=>{
  const f=fixture();
  try {
    f.card._config.max_entries=2;
    f.hass.callWS=async request=>{f.reads.push(request);return [entry(DAY/2,{name:'a',count:5}),entry(3*DAY,{name:'b',count:2}),
      entry(20*DAY,{name:'c',level:'WARNING',count:8}),entry(31*DAY,{name:'old'}),entry(-DAY,{name:'future'}),entry(1,{timestamp:null})];};
    await f.card._fetchLogData(); f.card.setActiveTab('overview');
    const period=f.card.shadowRoot.getElementById('log-period'); period.value='30d'; period.dispatchEvent(new f.w.Event('change'));
    let model=f.card._retainedModel(); assert.equal(model.unique,2); assert.equal(model.occurrences,7); assert.equal(model.filteredUnique,3);
    assert.doesNotMatch(JSON.stringify(model.rows),/old|future/);
    const severity=f.card.shadowRoot.getElementById('log-severity'); severity.value='WARNING'; severity.dispatchEvent(new f.w.Event('change'));
    model=f.card._retainedModel(); assert.equal(model.unique,1);assert.equal(model.occurrences,8);
    assert.match(f.card.shadowRoot.textContent,/1 unique problem/); assert.match(f.card.shadowRoot.textContent,/8 occurrences/);
    const source=f.card.shadowRoot.getElementById('log-source'); source.value=source.options[1].value; source.dispatchEvent(new f.w.Event('change'));
    assert.equal(f.reads.length,1); assert.equal(f.writes.length,0);
    assert.match(f.card.shadowRoot.textContent,/system_log\/list/); assert.match(f.card.shadowRoot.textContent,/max_entries/);
    assert.match(f.card.shadowRoot.textContent,/First retained/);assert.match(f.card.shadowRoot.textContent,/Last retained/);
    const emptyPeriod=f.card.shadowRoot.getElementById('log-period'); emptyPeriod.value='24h';emptyPeriod.dispatchEvent(new f.w.Event('change'));
    assert.match(f.card.shadowRoot.textContent,/No retained entries for the selected period and filters/);
  } finally {f.close();}
});

test('sensor fallback is partial current-only, never fabricated period history', async()=>{
  const f=fixture();
  try {
    f.hass.states={'sensor.ha_log_summary':{attributes:{errors:[{message:'SENSOR',count:9}],warnings:[],total:9},last_updated:new Date(NOW).toISOString()}};
    f.hass.callWS=async()=>{throw Error('offline');}; await f.card._fetchLogData();
    f.card.setActiveTab('overview'); assert.match(f.card.shadowRoot.textContent,/Partial.*current sensor snapshot/);
    f.card._logFilters.period='7d'; f.card._render();
    assert.equal(f.card._retainedModel().rows.length,0);
    assert.match(f.card.shadowRoot.textContent,/cannot establish the selected retained period/);
    assert.equal(f.card._logData.weekly,undefined);
  } finally {f.close();}
});

test('filter and native tab focus survives filter/locale/hass updates; records share one accessible DOM', async()=>{
  const f=fixture();
  try {
    f.hass.callWS=async()=>[entry(100)]; await f.card._fetchLogData(); f.card._firstRender=true;
    f.card.setActiveTab('overview'); let filter=f.card.shadowRoot.getElementById('log-period');
    filter.focus(); filter.value='7d'; filter.dispatchEvent(new f.w.Event('change'));
    assert.equal(f.card.shadowRoot.activeElement.id,'log-period');
    f.card.hass={...f.hass,locale:{language:'pl'}};assert.equal(f.card.shadowRoot.activeElement.id,'log-period');
    f.card.hass={...f.hass,locale:{language:'en'}};assert.equal(f.card.shadowRoot.activeElement.id,'log-period');
    const tabs=f.card.shadowRoot.getElementById('log-tab-select');tabs.focus();tabs.value='history';tabs.dispatchEvent(new f.w.Event('change'));
    assert.equal(f.card.shadowRoot.activeElement.id,'log-tab-select');
    f.card._hass.callWS=async()=>response(); await f.card._refreshAttemptHistory();
    const table=f.card.shadowRoot.querySelector('.attempt-history .history-records');
    assert.equal(table.querySelectorAll('tbody tr').length,1); assert.equal(table.querySelectorAll('tbody td[data-label]').length,7);
    assert.match(f.card.shadowRoot.querySelector('style').textContent,/@container log-email-card \(max-width: 499px\)/);
    assert.match(f.card.shadowRoot.querySelector('style').textContent,/@container log-email-card \(max-width: 279px\)/);
    f.card.shadowRoot.getElementById('history-refresh').focus();f.card._render();
    assert.equal(f.card.shadowRoot.activeElement.id,'history-refresh');
  } finally {f.close();}
});

test('browser snapshot counts are separate, allowlisted, and disappear on user change', async()=>{
  const f=fixture();
  try {
    f.card._logHistory=[{ts:new Date(NOW).toISOString(),errors:1,warnings:2,total:3,subject:'SECRET'}];
    f.card.setActiveTab('history');
    assert.match(f.card.shadowRoot.textContent,/Browser session log snapshots/); assert.match(f.card.shadowRoot.textContent,/not SMTP attempts/);
    assert.doesNotMatch(f.card.shadowRoot.textContent,/SECRET/);
    f.card._firstRender=true; f.card.hass={...f.hass,user:{id:'admin-b',is_admin:true}};
    assert.equal(f.card._logHistory.length,0);
    assert.equal(f.writes.length,0);
  } finally {f.close();}
});

test('retained aggregates preserve zero and unknown counts; loaded older range remains explicit', async()=>{
  const f=fixture();
  try {
    f.hass.callWS=async()=>[entry(1,{message:['ZERO'],count:0}),entry(40*DAY,{message:['OLDER_RETAINED']}),entry(2,{message:['UNKNOWN_COUNT'],count:'broken'})];
    await f.card._fetchLogData();
    const model=f.card._retainedModel();
    assert.equal(model.rows.find(row=>row.message==='ZERO').count,0);
    assert.equal(model.rows.find(row=>row.message==='UNKNOWN_COUNT').count,null);
    assert.equal(model.occurrences,null,'malformed aggregate cannot be turned into one claimed occurrence');
    assert.equal(model.first,NOW-40*DAY,'explicit source window includes retained older entries, outside selected period');
    assert.equal(model.rows.length,2);
    f.card.setActiveTab('overview');assert.doesNotMatch(f.card.shadowRoot.textContent,/OLDER_RETAINED/);
  } finally {f.close();}
});

test('late system log data cannot restore a previous admin user snapshot', async()=>{
  const f=fixture();
  try {
    const d=pending(),next=pending();let reads=0;f.hass.callWS=()=>++reads===1?d.promise:next.promise;const fetch=f.card._fetchLogData();
    f.card._firstRender=true;f.card.hass={...f.hass,user:{id:'admin-b',is_admin:true}};
    d.resolve([entry(100,{message:['STALE_ADMIN_DATA']})]);await fetch;
    assert.equal(f.card._logData,null);assert.equal(f.card._retainedLogs,null);
    assert.doesNotMatch(f.card.shadowRoot.textContent,/STALE_ADMIN_DATA/);
    assert.equal(reads,2,'current admin first load resumes only after old raw read settles');
    next.resolve([]);await f.card._logRead.promise;
    assert.equal(f.writes.length,0);
  } finally {f.close();}
});

test('pure reusable factory has bounded, coalesced reads and deterministic timeout without DOM or send dependencies', async()=>{
  const source=fs.readFileSync(path.join(__dirname,'..','shared','ha-tools-email-history.js'),'utf8');
  const factory=new Function(source.replace('export function ','function ')+'\nreturn createHaToolsEmailHistory;')();
  const d=pending();let timer,reads=0,changed=0;
  const h={user:{id:'admin',is_admin:true},connection:{connected:true},callWS:request=>{reads++;assert.equal(request.type,'ha_tools_email/get_attempt_history');return d.promise;}};
  const controller=factory({clock:()=>NOW,setTimer:callback=>{timer=callback;return 1;},clearTimer:()=>{},changed:()=>{changed++;}});
  const a=controller.refresh(h),b=controller.refresh(h);
  assert.equal(a,b);await Promise.resolve();assert.equal(reads,1);
  assert.equal(controller.state.status,'loading');timer();await a;
  assert.equal(controller.state.status,'unconfirmed');d.resolve(response());await Promise.resolve();await Promise.resolve();
  assert.equal(controller.state.attempts.length,0);assert.ok(changed>=2);
  controller.discard();assert.equal(controller.state.status,'idle');
  await controller.refresh({...h,user:{id:'resident',is_admin:false}});assert.equal(reads,1);
});

test('pure factory keeps a successful empty history and exact boundary metadata with zero recipients', async()=>{
  const source=fs.readFileSync(path.join(__dirname,'..','shared','ha-tools-email-history.js'),'utf8');
  const factory=new Function(source.replace('export function ','function ')+'\nreturn createHaToolsEmailHistory;')();
  const h={user:{id:'admin',is_admin:true},connection:{connected:true},callWS:async()=>response([])};
  const controller=factory({clock:()=>NOW});await controller.refresh(h);
  assert.equal(controller.state.status,'ready');assert.match(controller.render('en'),/No retained send attempts/);
  h.callWS=async()=>response([attempt({timestamp:new Date(NOW-90*DAY).toISOString(),recipient_count:0})]);
  await controller.refresh(h);assert.equal(controller.state.status,'ready');
  assert.equal(controller.state.attempts[0].recipient_count,0);assert.equal(controller.state.attempts.length,1);
  assert.match(controller.render('pl'),/Przyjęte przez serwer SMTP/);
});

test('retained coverage is concise while full count semantics stay in a collapsed disclosure',async()=>{
 const f=fixture();try{
  f.hass.callWS=async r=>{f.reads.push(r);return [entry(DAY/2),entry(3*DAY)]};
  await f.card._fetchLogData();f.card.setActiveTab('overview');const section=f.card.shadowRoot.querySelector('.retained-logs');
  const limitation=[...section.querySelectorAll('p')].find(x=>/HA aggregate counts can include older repetitions/.test(x.textContent));assert.ok(limitation);
  const detail=limitation.closest('details');assert.ok(detail,'complete limitations are collapsible');assert.equal(detail.open,false);
  const outside=[...section.querySelectorAll('p')].filter(x=>!x.closest('details')).map(x=>x.textContent).join(' ');
  assert.match(outside,/system_log\/list/);assert.match(outside,/24/);assert.match(outside,/retained|coverage|complete/i);assert.equal(f.reads.length,1);assert.equal(f.writes.length,0);
 }finally{f.close()}
});
test('missing retained data warning is visible outside collapsed explanatory text',async()=>{
 const f=fixture();try{
  f.hass.callWS=async()=>{throw Error('offline')};await f.card._fetchLogData();f.card.setActiveTab('overview');
  const section=f.card.shadowRoot.querySelector('.retained-logs');const warning=[...section.querySelectorAll('p')].find(x=>/Log data unavailable or not checked yet/.test(x.textContent));assert.ok(warning);assert.equal(warning.closest('details'),null);
 }finally{f.close()}
});

test('history follows an in-place System date preference without rereading attempts',async()=>{
 const f=fixture();try{
  Object.defineProperty(f.w.navigator,'language',{value:'en-US',configurable:true});
  f.hass.locale={language:'pl',date_format:'language',time_format:'24',time_zone:'local'};f.card._lang='pl';f.card._firstRender=true;
  f.hass.callWS=async r=>{f.reads.push(r);return response()};await f.card._refreshAttemptHistory();f.card.setActiveTab('history');
  const before=f.reads.length;f.hass.locale.date_format='system';f.card.hass=f.hass;
  assert.match(f.card.shadowRoot.querySelector('.attempt-history').textContent,/Oct/,'history uses system date language independently of Polish UI');
  assert.equal(f.reads.length,before);assert.equal(f.writes.length,0);
 }finally{f.close()}
});
