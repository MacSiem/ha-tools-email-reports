// Source-only contract tests; no SMTP or live HA. RED/GREEN execution belongs to the owner.
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../shared/ha-tools-email-schedules.js'), 'utf8');
const settle = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
const deferred = () => { let resolve; const promise = new Promise(r => resolve = r); return { promise, resolve }; };
function fixture(t, options = {}) {
  const deadlines = new Map(); let timer = 0, rows = options.rows || [];
  const sandbox = { Intl, Uint8Array, crypto: require('node:crypto').webcrypto,
    setTimeout: fn => { deadlines.set(++timer, fn); return timer; }, clearTimeout: id => deadlines.delete(id) };
  vm.createContext(sandbox); vm.runInContext(source.replace('export function ', 'function ') + '\nthis.factory = createHaToolsEmailSchedules;', sandbox);
  const calls = [], connection = new EventTarget(); connection.connected = true;
  const hass = { user: { id: 'a', is_admin: true }, connection,
    callWS: async msg => {
      calls.push(msg);
      if (msg.type === 'manifest/get') return { domain: 'ha_tools_email', version: '2.2.0' };
      if (msg.type.endsWith('/list_schedules')) return options.list ? options.list(calls.filter(c => c.type.endsWith('/list_schedules')).length) : { schedules: rows };
      if (msg.type.endsWith('/set_schedule')) {
        if (options.save) return options.save(msg);
        if (msg.action === 'delete') rows = rows.filter(r => r.id !== msg.schedule_id);
        else { const existing = rows.find(r => r.id === msg.schedule.id) || {}; const row = { ...existing, ...msg.schedule };
          if (row.use_ha_timezone) delete row.timezone; delete row.use_ha_timezone;
          rows = rows.filter(r => r.id !== row.id).concat(row); }
        return { schedules: rows };
      }
      if (msg.type.includes('/preview_')) return options.preview;
      throw new Error('Unexpected API');
    } };
  const controller = sandbox.factory({ kind: options.kind || 'energy_report', recipientEditor: options.recipients !== false });
  controller.setContext(hass); t.after(() => controller.discard());
  return { controller, hass, calls, deadlines, connection, setRows: value => rows = value,
    expire: () => { const callbacks = [...deadlines.values()]; deadlines.clear(); callbacks.forEach(fn => fn()); } };
}
const row = extra => ({ id: 'existing', kind: 'energy_report', cadence: 'weekly', weekday: 0, time: '08:30', enabled: false,
  effective_timezone: 'Europe/Warsaw', next_fire: null, recipients: ['old@example.invalid'], private_unknown: 'PRIVATE', ...extra });
const json = value => JSON.parse(JSON.stringify(value));
test('default log controller keeps recipients/private fields out of metadata and mutation', async t => {
  const f = fixture(t, { kind: 'log_digest', rows: [row({ kind: 'log_digest' })] }); await f.controller.refresh(); f.controller.edit('existing');
  assert.equal(f.controller.recipientModel(), null); assert.equal('recipients' in f.controller.model().draft, false);
  f.controller.update('time', '09:00'); await f.controller.save();
  assert.equal(f.calls.find(c => c.type.endsWith('/set_schedule')).schedule.kind, 'log_digest');
  assert.equal('recipients' in f.calls.find(c => c.type.endsWith('/set_schedule')).schedule, false);
  assert.equal(f.controller.model().status.reason, 'saved');
});
test('energy recipient edit is private and independent read confirms cadence/month/day/HA timezone without overwriting extras', async t => {
  const f = fixture(t, { rows: [row({ timezone: 'Europe/Warsaw', weekday: 4 })] }); await f.controller.refresh(); f.controller.edit('existing');
  f.controller.update('cadence', 'monthly'); f.controller.update('month_day', 31); f.controller.update('timezone', '');
  f.controller.updateRecipients(['new@example.invalid']);
  assert.doesNotMatch(JSON.stringify(f.controller.model()), /example.invalid|PRIVATE/);
  await f.controller.save(); const writes = f.calls.filter(c => c.type.endsWith('/set_schedule'));
  assert.equal(writes.length, 1); assert.equal(writes[0].schedule.id, 'existing'); assert.equal(writes[0].schedule.kind, 'energy_report');
  assert.equal(writes[0].schedule.month_day, 31); assert.equal(writes[0].schedule.use_ha_timezone, true);
  assert.deepEqual(json(writes[0].schedule.recipients), ['new@example.invalid']); assert.equal('private_unknown' in writes[0].schedule, false);
  assert.equal(f.calls.filter(c => c.type.endsWith('/list_schedules')).length, 2); assert.equal(f.controller.model().status.reason, 'saved');
});
for (const mismatch of ['recipients', 'kind', 'id', 'timezone', 'month_day']) test('matching acknowledgement never confirms mismatched ' + mismatch, async t => {
  const f = fixture(t, { rows: [row()], save: msg => ({ schedule: msg.schedule }) }); await f.controller.refresh(); f.controller.edit('existing');
  f.controller.update('cadence', 'monthly'); f.controller.update('month_day', 31); f.controller.update('timezone', 'America/New_York'); f.controller.updateRecipients(['new@example.invalid']);
  const expected = { ...row(), cadence: 'monthly', month_day: 31, timezone: 'America/New_York', recipients: ['new@example.invalid'] };
  expected[mismatch] = { recipients: ['old@example.invalid'], kind: 'log_digest', id: 'other', timezone: 'UTC', month_day: 1 }[mismatch];
  f.setRows([expected]); await f.controller.save(); assert.equal(f.controller.model().status.state, 'unconfirmed');
  await f.controller.save(); assert.equal(f.calls.filter(c => c.type.endsWith('/set_schedule')).length, 1);
});
test('unknown write timeout locks Save and only explicit read can confirm; late ACK is ignored', async t => {
  const pending = deferred(); let saved;
  const f = fixture(t, { rows: [row()], save: msg => { saved = msg.schedule; return pending.promise; } });
  await f.controller.refresh(); f.controller.edit('existing'); f.controller.update('time', '10:00'); const work = f.controller.save();
  await settle(); f.expire(); await work; assert.equal(f.controller.model().status.state, 'unconfirmed');
  pending.resolve({ schedule: saved }); await settle(); assert.equal(f.controller.model().locked, true);
  f.setRows([row(saved)]); await f.controller.refresh(); assert.equal(f.controller.model().status.reason, 'saved');
});
test('New is explicit UUID disabled; reads coalesce; Cancel and old late results cannot leak draft', async t => {
  const pending = deferred(); const f = fixture(t, { list: () => pending.promise });
  assert.equal(f.calls.length, 0); const a = f.controller.ensureRead(), b = f.controller.ensureRead(); await settle();
  assert.equal(f.calls.length, 2); pending.resolve({ schedules: [] }); await Promise.all([a,b]);
  f.controller.create(); assert.match(f.controller.model().draft.id, /^[0-9a-f-]{36}$/i); assert.equal(f.controller.model().draft.enabled, false);
  f.controller.cancel(); assert.equal(f.controller.model().draft, null); assert.equal(f.calls.length, 2);
});
for (const boundary of ['user','role','connection','offline','connection-event']) test('context fence clears private draft and pending read on ' + boundary, async t => {
  const pending = deferred(); let reads = 0;
  const f = fixture(t, { list: () => ++reads === 1 ? { schedules: [row()] } : pending.promise });
  await f.controller.refresh(); f.controller.edit('existing'); const read = f.controller.refresh(); await settle();
  if (boundary === 'connection-event') f.connection.dispatchEvent(new Event('disconnected'));
  else f.controller.setContext({ ...f.hass, ...(boundary === 'role' ? { user: { id: 'a', is_admin: false } } :
    boundary === 'user' ? { user: { id: 'b', is_admin: true } } : boundary === 'offline' ? { connected: false } : { connection: { connected: true } }) });
  pending.resolve({ schedules: [row({ id: 'old-user' })] }); await read;
  assert.deepEqual(json(f.controller.model().rows), []); assert.equal(f.controller.model().draft, null); assert.equal(f.controller.recipientModel(), null);
});
test('weekly boundaries and invalid month/timezone prevent writes', async t => {
  const f = fixture(t, { rows: [row()] }); await f.controller.refresh(); f.controller.edit('existing');
  for (const weekday of [-1,7]) { f.controller.update('weekday', weekday); await f.controller.save(); assert.equal(f.controller.model().status.state, 'error'); }
  f.controller.update('weekday', 6); f.controller.update('timezone', 'bad/zone'); await f.controller.save(); assert.equal(f.calls.filter(c => c.type.endsWith('/set_schedule')).length, 0);
  f.controller.update('timezone', 'Asia/Tokyo'); await f.controller.save(); assert.equal(f.calls.find(c => c.type.endsWith('/set_schedule')).schedule.weekday, 6);
});
test('explicit delete is one independent-readback operation and never sends', async t => {
  const f = fixture(t, { rows: [row()] }); await f.controller.refresh(); await f.controller.remove('existing');
  assert.equal(f.controller.model().status.reason, 'deleted'); assert.equal(f.calls.filter(c => c.type.endsWith('/set_schedule')).length,1);
  assert.equal(f.calls.filter(c => c.type.endsWith('/list_schedules')).length,2); assert.equal(f.calls.some(c=>c.type.includes('send')),false);
});

test('read timeout is bounded and late list cannot replace explicit fresh read',async t=>{
  const pending=deferred();const f=fixture(t,{list:n=>n===1?pending.promise:{schedules:[row({id:'fresh'})]}});
  const first=f.controller.refresh();await settle();f.expire();await first;assert.equal(f.controller.model().status.reason,'read_timeout');
  await f.controller.refresh();pending.resolve({schedules:[row({id:'stale'})]});await settle();assert.equal(f.controller.model().rows[0].id,'fresh');
});
test('oversized or malformed schedule list cannot enable New or expose private metadata',async t=>{
  const f=fixture(t,{rows:Array.from({length:501},(_,i)=>row({id:'energy-'+i}))});await f.controller.refresh();f.controller.create();
  assert.equal(f.controller.model().draft,null);assert.equal(f.controller.model().status.state,'not_checked');assert.deepEqual(json(f.controller.model().rows),[]);
});
test('Cancel invalidates a pending preview without changing persisted row or writing',async t=>{
  const pending=deferred();const f=fixture(t,{kind:'log_digest',rows:[row({kind:'log_digest'})],preview:pending.promise});await f.controller.refresh();f.controller.edit('existing');
  const work=f.controller.preview();await settle();f.controller.cancel();pending.resolve({cadence:'weekly',total:999});await work;
  assert.equal(f.controller.model().preview,null);assert.equal(f.controller.model().draft,null);assert.equal(f.calls.some(c=>c.type.endsWith('/set_schedule')),false);
});
