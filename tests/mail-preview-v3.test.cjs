// Actual mail preview/send contract, source and generated consumer.
'use strict';
const {test}=require('node:test'), assert=require('node:assert/strict');
const fs=require('node:fs'), path=require('node:path'), vm=require('node:vm');
const {JSDOM}=require('jsdom');
const settle=async()=>{for(let i=0;i<60;i++)await Promise.resolve();};
const defer=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const mail=(cadence,kind='log_digest',mode='rolling')=>({cadence,subject:'Server <subject>',body:'server text',html:'<h1 id="server-only">REAL SERVER HTML</h1><script>parent.pwned=true</script><img src="https://example.invalid/tracker"><form action="https://example.invalid"><input></form>',period:{from:'2026-09-01T00:00:00Z',to:'2026-10-01T00:00:00Z',semantics:mode==='calendar'?'previous_completed_calendar_period':kind==='log_digest'?'rolling_retained_last_observed':'rolling_completed_hours'},source:{name:kind==='log_digest'?'system_log':'recorder',complete:false},generated_at:'2026-10-15T00:00:00Z'});
function fixture(t,source,version='2.3.0'){
 const dom=new JSDOM('<body></body>',{runScripts:'outside-only',pretendToBeVisual:true,url:'http://localhost/'});t.after(()=>dom.window.close());
 dom.window.eval(fs.readFileSync(path.join(__dirname,'..',source),'utf8'));
 const card=dom.window.document.createElement('ha-log-email');card.setConfig({show_support:false,max_entries:23,email_recipient:'fixture@example.invalid'});
 const calls=[],connection=new dom.window.EventTarget();connection.connected=true;
 let respond=message=>message.type==='manifest/get'?{domain:'ha_tools_email',version}:message.type==='system_log/list'?[]:message.type==='ha_tools_email/preview_log_digest'?mail(message.cadence,'log_digest',message.period_mode):message.type==='ha_tools_email/list_schedules'?{schedules:[]}:{};
 const hass={user:{id:'admin',is_admin:true},connection,connected:true,states:{},services:{},locale:{language:'en'},config:{time_zone:'Europe/Warsaw'},callWS:message=>{calls.push(message);return Promise.resolve(respond(message));},callService:()=>{throw Error('manual mail must use WS');}};
 dom.window.document.body.append(card);card.hass=hass;
 return {dom,card,hass,connection,calls,respond:fn=>respond=fn};
}
for(const source of ['ha-log-email.js','ha-tools-email-reports.js']){
 for(const version of ['2.2.0','2.2.99','2.3.0-rc.1','2.3.0\n','02.3.0'])test(`${source}: unsupported ${JSON.stringify(version)} cannot preview or send new API`,async t=>{
  const f=fixture(t,source,version);await settle();f.card.setActiveTab('preview');await f.card._mailPreview.previewMail(f.card._mailSelection());await f.card._sendEmailNow('monthly');
  assert.equal(f.calls.some(m=>['ha_tools_email/send_now','ha_tools_email/preview_log_digest'].includes(m.type)),false);
  assert.equal(f.card._mailPreview.model().previewStatus.reason,'mail_upgrade_required');
  assert.equal(f.card._sendStatus.reason,'mail_upgrade_required');
 });
 test(`${source}: monthly server preview, isolated actual HTML and binding invalidation`,async t=>{
  const f=fixture(t,source);await settle();f.card._logData=null;f.card.setActiveTab('preview');
  for(const [id,value]of [['mail-cadence','monthly'],['mail-period-mode','calendar']]){const el=f.card.shadowRoot.getElementById(id);el.value=value;el.dispatchEvent(new f.dom.window.Event('change'));}
  f.card.shadowRoot.getElementById('btn-refresh-preview').click();await settle();
  const req=f.calls.find(m=>m.type==='ha_tools_email/preview_log_digest');assert.equal(req.format,'mail');assert.equal(req.cadence,'monthly');assert.equal(req.period_mode,'calendar');assert.equal(req.max_entries,23);
  const frame=f.card.shadowRoot.getElementById('manual-mail-frame');assert.ok(frame);assert.equal(frame.getAttribute('sandbox'),'');assert.equal(frame.getAttribute('referrerpolicy'),'no-referrer');assert.match(frame.srcdoc,/REAL SERVER HTML/);assert.match(frame.srcdoc,/form-action 'none'/);assert.match(frame.srcdoc,/default-src 'none'/);
  assert.equal(f.card.shadowRoot.querySelector('#server-only'),null);assert.equal(f.dom.window.pwned,undefined);
  const field=f.card.shadowRoot.getElementById('mail-period-mode');field.value='rolling';field.dispatchEvent(new f.dom.window.Event('change'));assert.equal(f.card.shadowRoot.querySelector('iframe'),null);
 });
 test(`${source}: no client data dependency; server WS send monthly has no client HTML`,async t=>{
  const f=fixture(t,source);await settle();f.card._logData=null;f.card._mailPeriodMode='rolling';await f.card._sendEmailNow('monthly');
  const m=f.calls.find(m=>m.type==='ha_tools_email/send_now');assert.ok(m);assert.equal(m.kind,'log_digest');assert.equal(m.cadence,'monthly');assert.equal(m.period_mode,'rolling');assert.equal(m.max_entries,23);assert.equal(JSON.stringify(m.recipients),'["fixture@example.invalid"]');
  assert.equal('html'in m,false);assert.equal('body'in m,false);assert.equal('subject'in m,false);assert.equal(f.card._sendStatus.status,'unconfirmed');
 });
 for(const boundary of ['role','user','connection','disconnect','remove'])test(`${source}: raw send occupied after ${boundary}; late settlement stays stale`,async t=>{
  const f=fixture(t,source);await settle();const wire=defer();f.respond(m=>m.type==='manifest/get'?{domain:'ha_tools_email',version:'2.3.0'}:m.type==='ha_tools_email/send_now'?wire.promise:[]);
  const send=f.card._sendEmailNow('monthly');await settle();assert.equal(f.calls.filter(m=>m.type==='ha_tools_email/send_now').length,1);
  if(boundary==='remove')f.card.remove();else if(boundary==='disconnect')f.connection.dispatchEvent(new f.dom.window.Event('disconnected'));else f.card.hass={...f.hass,...(boundary==='role'?{user:{id:'admin',is_admin:false}}:boundary==='user'?{user:{id:'other',is_admin:true}}:{connection:{connected:true}})};
  assert.ok(f.card._emailRequest);await f.card._sendEmailNow('daily');assert.equal(f.calls.filter(m=>m.type==='ha_tools_email/send_now').length,1);
  wire.resolve({});await send;assert.equal(f.card._emailRequest,null);assert.equal(f.card._sendStatus,null);
 });
 test(`${source}: server acceptance is distinct from inbox delivery`,async t=>{
  const f=fixture(t,source);await settle();f.respond(m=>m.type==='manifest/get'?{domain:'ha_tools_email',version:'2.3.0'}:{ok:true,status:'accepted_by_smtp',attempt_id:'synthetic-attempt'});
  await f.card._sendEmailNow('daily');assert.equal(f.card._sendStatus.status,'success');assert.equal(f.card._sendStatus.reason,'accepted_by_smtp');
  assert.match(f.card._renderEmailResult(f.card._sendStatus),/Inbox delivery remains unconfirmed/);
  f.card._config.max_entries=2000;assert.equal(f.card._mailSelection().max_entries,1000);
 });
 test(`${source}: transport failure remains UNKNOWN without automatic retry`,async t=>{
  const f=fixture(t,source);await settle();f.respond(m=>m.type==='manifest/get'?{domain:'ha_tools_email',version:'2.3.0'}:m.type==='ha_tools_email/send_now'?Promise.reject(Error('lost acknowledgement')):[]);
  await f.card._sendEmailNow('monthly');await settle();assert.equal(f.card._sendStatus.reason,'transport_unknown');assert.equal(f.calls.filter(m=>m.type==='ha_tools_email/send_now').length,1);
 });
 test(`${source}: source/selection change rejects late preview`,async t=>{
  const f=fixture(t,source);await settle();const pending=defer();f.respond(m=>m.type==='manifest/get'?{domain:'ha_tools_email',version:'2.3.0'}:m.type==='ha_tools_email/preview_log_digest'?pending.promise:[]);
  f.card.setActiveTab('preview');const work=f.card._mailPreview.previewMail(f.card._mailSelection('monthly'));await settle();
  f.card._mailPreview.clearPreview();pending.resolve(mail('monthly'));await work;assert.equal(f.card._mailPreview.model().preview,null);assert.equal(f.card.shadowRoot.querySelector('iframe'),null);
 });
}
function controller(t,kind,version='2.3.0'){
 const deadlines=new Map();let id=0;const sandbox={Intl,setTimeout:fn=>{deadlines.set(++id,fn);return id;},clearTimeout:id=>deadlines.delete(id)};vm.createContext(sandbox);
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../shared/ha-tools-email-schedules.js'),'utf8').replace('export function ','function ')+';this.factory=createHaToolsEmailSchedules;',sandbox);
 const calls=[];let handler=m=>m.type==='manifest/get'?{domain:'ha_tools_email',version}:m.type==='ha_tools_email/list_schedules'?{schedules:[{id:'fixture',kind,cadence:'monthly',time:'08:00',enabled:false,timezone:'Europe/Warsaw',month_day:31}]}:mail(m.cadence,kind,m.period_mode);
 const c=sandbox.factory({kind,projectPreview:()=>({state:'partial',value:{legacy:true}})}),hass={user:{id:'admin',is_admin:true},connection:{connected:true},callWS:m=>{calls.push(m);return Promise.resolve(handler(m));}};
 c.setContext(hass);t.after(()=>c.discard());return {c,hass,calls,respond:fn=>handler=fn,expire:()=>{[...deadlines.values()].forEach(fn=>fn());}};
}
for(const kind of ['log_digest','energy_report']){
 test(`${kind}: current calendar requests actual mail, optional timezone preserved`,async t=>{
  const f=controller(t,kind);await f.c.refresh();f.c.edit('fixture');await f.c.preview();
  const req=f.calls.find(m=>m.type==='ha_tools_email/preview_'+(kind==='log_digest'?'log_digest':'energy_report'));assert.equal(req.format,'mail');assert.equal(req.period_mode,'calendar');assert.equal(req.timezone,'Europe/Warsaw');assert.equal('calendar_period'in req,false);assert.match(f.c.model().preview.html,/REAL SERVER HTML/);
 });
 test(`${kind}: manual readonly timeout rejects late response and requires explicit retry`,async t=>{
  const f=controller(t,kind),pending=defer();f.respond(m=>m.type==='manifest/get'?{domain:'ha_tools_email',version:'2.3.0'}:pending.promise);
  const work=f.c.previewMail({cadence:'monthly',period_mode:'rolling'});await settle();f.expire();await work;assert.equal(f.c.model().previewStatus.reason,'read_timeout');pending.resolve(mail('monthly'));await settle();assert.equal(f.c.model().preview,null);
 });
}
test('Energy 2.2 retains existing summary projector and old calendar protocol',async t=>{
 const f=controller(t,'energy_report','2.2.0');await f.c.refresh();f.c.edit('fixture');await f.c.preview();assert.equal(f.c.model().preview.legacy,true);const req=f.calls.find(m=>m.type==='ha_tools_email/preview_energy_report');assert.equal(req.calendar_period,true);assert.equal('format'in req,false);
});
test('Log 2.2 retains summary without requesting unsupported mail API',async t=>{
 const f=controller(t,'log_digest','2.2.0');await f.c.refresh();f.c.edit('fixture');
 f.respond(m=>({cadence:'monthly',total:4,unique_problems:2,counts_complete:false,period:{from:'2026-09-01T00:00:00Z',to:'2026-10-01T00:00:00Z',semantics:'previous_completed_calendar_period'},effective_timezone:'Europe/Warsaw',source:{name:'system_log',complete:false,count_semantics:'retained_aggregates',retained_entries:2}}));
 await f.c.preview();assert.equal(f.c.model().preview.total,4);assert.equal(f.c.model().previewStatus.state,'partial');const req=f.calls.find(m=>m.type==='ha_tools_email/preview_log_digest');assert.equal('format'in req,false);
});
