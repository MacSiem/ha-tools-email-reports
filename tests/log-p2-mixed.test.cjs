'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
const rows=JSON.parse(fs.readFileSync('tests/fixtures/log-p2-mixed.json','utf8'));
for(const lang of ['en','pl'])test(`retained mixed sources and bounded reason ${lang}`,()=>{
 const dom=new JSDOM('',{runScripts:'outside-only',url:'http://localhost/'});try{
  const w=dom.window;w.eval(fs.readFileSync('ha-log-email.js','utf8'));const card=w.document.createElement('ha-log-email');
  const now=Date.parse('2026-11-03T01:00:00Z');w.Date.now=()=>now;card._config={max_entries:50};card._lang=lang;
  card._hass={locale:{language:lang},language:lang,user:{is_admin:true},connected:true,states:{},services:{}};
  card._retainedLogs=card._groupRetainedLogs(rows,now);const m=card._retainedModel({severity:'all',source:'all',period:'24h'},'overview');
  assert.equal(m.unique,4);assert.equal(m.occurrences,18);
  const html=card._renderRetainedLogs();const d=new JSDOM(html);try{
   const row=[...d.window.document.querySelectorAll('tbody tr')].find(r=>r.textContent.includes('fixture.large'));
   const cell=row.cells[3],summary=cell.querySelector('[data-log-excerpt]'),full=cell.querySelector('details > pre');
   assert.ok(summary);assert.ok(summary.textContent.includes('DEVICE_OFFLINE_SYNTHETIC'));assert.ok(summary.textContent.length<500);
   assert.ok(full.textContent.includes('x'.repeat(40000)));assert.equal(cell.querySelector('details').open,false);
  }finally{d.window.close()}
 }finally{dom.window.close()}
});
test('long diagnostic repr keeps a middle reason and full source locally',()=>{
 const dom=new JSDOM('',{runScripts:'outside-only',url:'http://localhost/'});try{
  const w=dom.window;w.eval(fs.readFileSync('ha-log-email.js','utf8'));const card=w.document.createElement('ha-log-email');const now=Date.parse('2026-11-03T01:00:00Z');w.Date.now=()=>now;
  card._config={max_entries:50};card._lang='en';card._hass={locale:{language:'en'},language:'en',user:{is_admin:true},connected:true,states:{},services:{}};
  const msg="{'message':'one','message':'two','message':'three','noise':'"+'x'.repeat(9000)+"','reason':'REPR_TIMEOUT_SYNTHETIC','tail':'"+'y'.repeat(9000)+"'}";
  card._retainedLogs=card._groupRetainedLogs([{id:'repr',timestamp:now/1000,level:'ERROR',name:'fixture',message:[msg],count:1}],now);
  const d=new JSDOM(card._renderRetainedLogs());try{const excerpt=d.window.document.querySelector('[data-log-excerpt]');assert.match(excerpt.textContent,/REPR_TIMEOUT_SYNTHETIC/);assert.equal(d.window.document.querySelector('pre').textContent,msg);}finally{d.window.close()}
 }finally{dom.window.close()}
});
test('undated error remains visible but is not counted in the selected period',()=>{
 const dom=new JSDOM('',{runScripts:'outside-only',url:'http://localhost/'});try{
  const w=dom.window;w.eval(fs.readFileSync('ha-log-email.js','utf8'));const card=w.document.createElement('ha-log-email');const now=Date.parse('2026-11-03T01:00:00Z');w.Date.now=()=>now;
  card._config={max_entries:50};card._lang='en';card._hass={locale:{language:'en'},language:'en',user:{is_admin:true},connected:true,states:{},services:{}};
  card._retainedLogs=card._groupRetainedLogs([...rows,{id:'undated',name:'fixture.undated',level:'ERROR',message:['UNPLACED_SYNTHETIC'],count:5}],now);
  const model=card._retainedModel({severity:'all',source:'all',period:'24h'},'overview');assert.equal(model.occurrences,18);
  const html=card._renderRetainedLogs();assert.match(html,/Unknown time/);assert.match(html,/UNPLACED_SYNTHETIC/);
 }finally{dom.window.close()}
});
test('exception details remain accessible and their later reason appears in the summary',()=>{
 const dom=new JSDOM('',{runScripts:'outside-only',url:'http://localhost/'});try{
  const w=dom.window;w.eval(fs.readFileSync('ha-log-email.js','utf8'));const card=w.document.createElement('ha-log-email');const now=Date.parse('2026-11-03T01:00:00Z');w.Date.now=()=>now;
  card._config={max_entries:50};card._lang='en';card._hass={locale:{language:'en'},language:'en',user:{is_admin:true},connected:true,states:{},services:{}};
  const exception='Traceback '+('x'.repeat(3000))+" {'reason':'AUTH_EXPIRED_SYNTHETIC','tail':'"+'y'.repeat(1000)+"'}";
  card._retainedLogs=card._groupRetainedLogs([{id:'trace',timestamp:now/1000,level:'ERROR',name:'fixture',message:['Connection failed'],exception,count:1}],now);
  const d=new JSDOM(card._renderRetainedLogs());try{const excerpt=d.window.document.querySelector('[data-log-excerpt]');assert.match(excerpt.textContent,/Connection failed/);assert.match(excerpt.textContent,/AUTH_EXPIRED_SYNTHETIC/);assert.ok(d.window.document.querySelector('pre').textContent.includes(exception));}finally{d.window.close()}
 }finally{dom.window.close()}
});
