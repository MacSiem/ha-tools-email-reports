'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {JSDOM}=require('jsdom');
function fixture(lang='en',source='ha-log-email.js') {
 const dom=new JSDOM('<body></body>',{runScripts:'outside-only',pretendToBeVisual:true,url:'http://localhost/'}),w=dom.window;
 w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});w.eval(fs.readFileSync(source,'utf8'));
 const card=w.document.createElement('ha-log-email'),now=Date.parse('2026-11-03T01:00:00Z');w.Date.now=()=>now;
 card._config={max_entries:1};card._lang=lang;card._hass={locale:{language:lang},language:lang,user:{id:'admin',is_admin:true},connected:true,states:{},services:{}};
 const logs=[{id:'first',name:'first.source',level:'WARNING',timestamp:now/1000,count:2,message:['ordinary']},{id:'second',name:'special.źródło',level:'ERROR',timestamp:(now-1000)/1000,count:4,message:['prefix '+ 'x'.repeat(4000)+' HiddenNeedle']},{id:'undated',name:'unplaced.source',level:'ERROR',count:7,message:['HiddenNeedle undated']},{id:'old',name:'old.source',level:'ERROR',timestamp:(now-2*86400000)/1000,count:8,message:['HiddenNeedle old']}];
 card._retainedLogs=card._groupRetainedLogs(logs,now);return {dom,w,card};
}
for(const source of ['ha-log-email.js','ha-tools-email-reports.js'])for(const lang of ['en','pl'])test(`${source} ${lang}: full-message search before cap with period, severity and undated`,t=>{
 const {dom,w,card}=fixture(lang,source);t.after(()=>dom.window.close());
 card._render();const input=card.shadowRoot.getElementById('log-search');assert.ok(input,'search control exists');
 input.value='hiddenneedle';input.dispatchEvent(new w.Event('input',{bubbles:true}));
 let m=card._retainedModel();assert.equal(m.unique,1);assert.equal(m.occurrences,4);assert.equal(m.rows[0].domain,'special.źródło');assert.equal(m.undated.length,1);assert.equal(m.undated[0].count,7);assert.equal(m.filteredUnique,1);
 const selected=card.shadowRoot.getElementById('log-severity');selected.value='WARNING';selected.dispatchEvent(new w.Event('change',{bubbles:true}));m=card._retainedModel();assert.equal(m.unique,0);assert.equal(m.undated.length,0);
});
test('source and level matching, focus, draft, and identity revocation',t=>{
 const {dom,w,card}=fixture();t.after(()=>dom.window.close());card._initialLogSettled=true;w.document.body.appendChild(card);card._render();
 let input=card.shadowRoot.getElementById('log-search');assert.ok(input);input.focus();input.value='ŹRÓDŁO';input.setSelectionRange(1,3);input.dispatchEvent(new w.Event('input',{bubbles:true}));
 input=card.shadowRoot.getElementById('log-search');assert.equal(card.shadowRoot.activeElement,input);assert.equal(input.value,'ŹRÓDŁO');assert.equal(input.selectionStart,1);assert.equal(input.selectionEnd,3);assert.equal(card._retainedModel().rows[0].domain,'special.źródło');
 card._logFilters.search='ERROR';assert.equal(card._retainedModel().rows[0].level,'ERROR');assert.equal(card._retainedModel().undated.length,1);
 card.hass={...card._hass,user:{id:'household',is_admin:false}};assert.equal(card._retainedLogs,null);assert.equal(card._logFilters.search,'');assert.doesNotMatch(card.shadowRoot.textContent,/HiddenNeedle/);
});
test('search keeps unknown count unknown and escapes typed text',t=>{
 const {dom,w,card}=fixture();t.after(()=>dom.window.close());const now=w.Date.now();
 card._retainedLogs=card._groupRetainedLogs([{id:'unknown',name:'fixture',level:'ERROR',timestamp:now/1000,message:['<img src=x onerror=alert(1)> needle']}],now);
 card._render();let field=card.shadowRoot.getElementById('log-search');field.value='<img';field.dispatchEvent(new w.Event('input',{bubbles:true}));
 assert.equal(card._retainedModel().occurrences,null);assert.equal(card.shadowRoot.querySelector('img'),null);assert.equal(card.shadowRoot.getElementById('log-search').value,'<img');
});
test('sensor fallback is searched locally without implying full history',t=>{
 const {dom,card}=fixture();t.after(()=>dom.window.close());card._retainedLogs=null;card._logData={errors:[{domain:'sensor.source',message:'SENSOR_NEEDLE',count:2}],warnings:[],total:1};card._logFilters.search='needle';
 const m=card._retainedModel();assert.equal(m.partial,true);assert.equal(m.rows.length,1);assert.equal(m.occurrences,2);assert.match(card._renderRetainedLogs(),/Current sensor snapshot/);
});
test('query persists across log tabs and does not enter server mail selection',t=>{
 const {dom,w,card}=fixture();t.after(()=>dom.window.close());card._activeTab='overview';card._render();let input=card.shadowRoot.getElementById('log-search');input.value='HiddenNeedle';input.dispatchEvent(new w.Event('input',{bubbles:true}));
 card._activeTab='warnings';card._render();assert.equal(card.shadowRoot.getElementById('log-search').value,'HiddenNeedle');assert.equal(card._retainedModel().rows.length,0);
 card._activeTab='errors';card._render();assert.equal(card._retainedModel().rows[0].level,'ERROR');assert.equal(card._retainedModel().undated.length,1);
 const selection=card._mailSelection('daily');assert.equal('search' in selection,false);assert.equal(JSON.stringify(selection).includes('HiddenNeedle'),false);
});

for(const source of ['ha-log-email.js','ha-tools-email-reports.js'])test(`${source}: full dated and undated retained details explicitly allow native text selection`,t=>{
 const {dom,card}=fixture('en',source);t.after(()=>dom.window.close());
 const now=Date.parse('2026-11-03T01:00:00Z');
 card._retainedLogs=card._groupRetainedLogs([{id:'dated',name:'fixture',level:'ERROR',timestamp:now/1000,message:['D'.repeat(400)]},{id:'undated',name:'fixture',level:'ERROR',message:['U'.repeat(400)]}],now);
 card._render();const details=[...card.shadowRoot.querySelectorAll('details[data-log-disclosure-key] pre')];
 assert.equal(details.length,2);
 for(const pre of details){assert.equal(pre.style.userSelect,'text');assert.match(pre.getAttribute('style'),/-webkit-user-select\s*:\s*text/);}
});
