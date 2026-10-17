
'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
for(const source of ['ha-log-email.js','ha-tools-email-reports.js']) test(source+': human period labels and timezone-aware metadata',t=>{
 const dom=new JSDOM('<body></body>',{runScripts:'outside-only',url:'http://localhost/'});t.after(()=>dom.window.close());dom.window.eval(fs.readFileSync(path.join(__dirname,'..',source),'utf8'));
 const c=dom.window.document.createElement('ha-log-email');c._lang='pl';c._hass={locale:{language:'pl',date_format:'language',time_format:'24',time_zone:'server'},config:{time_zone:'Europe/Warsaw'}};c._mailCadence='monthly';c._mailPeriodMode='calendar';
 const controls=dom.window.document.createElement('div');controls.innerHTML=c._renderMailControls();
 assert.equal(controls.querySelector('option[value="calendar"]').textContent,'Poprzedni pełny miesiąc');
 assert.equal(controls.querySelector('option[value="rolling"]').textContent,'Ostatnie 30 dni');
 const box=dom.window.document.createElement('div');box.innerHTML=c._renderMailFrame({subject:'<unsafe>',html:'<b>server</b>',period:{from:'2026-09-01T00:00:00Z',to:'2026-10-01T00:00:00Z'},generated_at:'2026-10-15T16:00:00Z',effective_timezone:'Europe/Warsaw',source:{name:'system_log',complete:false}},'fixture');
 const raw=box.querySelector('details');assert.ok(raw);assert.equal(raw.open,false);assert.match(raw.textContent,/2026-09-01T/);const visible=box.cloneNode(true);visible.querySelectorAll('details').forEach(el=>el.remove());assert.doesNotMatch(visible.textContent,/system_log|2026-09-01T/);assert.match(box.textContent,/Od \(włącznie\)|From \(inclusive\)/);assert.match(box.textContent,/Do \(wyłącznie\)|To \(exclusive\)/);assert.match(box.textContent,/02:00/);assert.match(box.textContent,/Zachowane wpisy dziennika HA/);assert.match(box.textContent,/częściowe dane/);assert.equal(box.querySelector('unsafe'),null);assert.equal(box.querySelector('iframe').getAttribute('sandbox'),'');
 c._mailCadence='daily';controls.innerHTML=c._renderMailControls();assert.equal(controls.querySelector('option[value="calendar"]').textContent,'Poprzedni pełny dzień');
 c._lang='en';controls.innerHTML=c._renderMailControls();assert.equal(controls.querySelector('option[value="rolling"]').textContent,'Last 24 hours');
});
