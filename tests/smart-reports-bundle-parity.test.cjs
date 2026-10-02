'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const { JSDOM } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
const VENDORED = path.join(ROOT, 'ha-smart-reports.js');
const BUNDLE = path.join(ROOT, 'ha-tools-email-reports.js');
const MANIFEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'generated-sources.json'), 'utf8'));
const CROSS_REPO_CANONICAL = process.env.CANONICAL_SMART_REPORTS_PATH || null;
const SOURCE_NAMES = ['ha-energy-email.js', 'ha-log-email.js', 'ha-smart-reports.js'];

function fixtureRepo() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'smart-reports-bundle-'));
  fs.mkdirSync(path.join(directory, 'scripts'));
  for (const relative of [...SOURCE_NAMES, 'generated-sources.json', 'ha-tools-email-reports.js', 'scripts/build-bundle.mjs']) {
    fs.copyFileSync(path.join(ROOT, relative), path.join(directory, relative));
  }
  return directory;
}

function check(directory) {
  return spawnSync(process.execPath, ['scripts/build-bundle.mjs', '--check'], { cwd: directory, encoding: 'utf8' });
}

function occurrences(haystack, needle) {
  let count = 0;
  let offset = 0;
  while ((offset = haystack.indexOf(needle, offset)) !== -1) {
    count += 1;
    offset += needle.length;
  }
  return count;
}

function loadOrder(files) {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    url: 'http://localhost/lovelace/demo',
  });
  const { window } = dom;
  Object.defineProperty(window.navigator, 'language', { configurable: true, value: 'en-US' });
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  const banners = [];
  window.console.info = (...args) => banners.push(args.map(String).join(' '));
  for (const file of files) window.eval(fs.readFileSync(file, 'utf8'));
  const Card = window.customElements.get('ha-smart-reports');
  const card = window.document.createElement('ha-smart-reports');
  const editor = typeof Card.getConfigElement === 'function' ? Card.getConfigElement() : null;
  card._energyViewState = {
    status: 'not_configured',
    period: {
      key: '7d',
      start: '2026-08-23T22:00:00.000Z',
      end: '2026-08-30T12:00:00.000Z',
      time_zone: 'Europe/Warsaw',
    },
    source_mode: 'energy_dashboard',
    total: { value: null, unit: 'kWh', source_statistic_ids: [] },
    cost: { value: null, currency: null, method: 'unavailable', rate: null, source_statistic_ids: [], reason: 'not_configured' },
    devices: [], warnings: [],
  };
  const document = card._buildExportDocument(new Date('2026-08-30T12:00:00.000Z'));
  return {
    dom,
    className: Card.name,
    document,
    smartMetadataCount: (window.customCards || []).filter((entry) => entry.type === 'ha-smart-reports').length,
    hasEditor: Boolean(window.customElements.get('ha-smart-reports-editor')),
    hasEditorContract: Boolean(editor && editor.localName === 'ha-smart-reports-editor'),
    smartBannerCount: banners.filter((line) => line.includes('HA-SMART-REPORTS')).length,
  };
}

test('vendored Smart Reports matches its declared source digest and optional canonical path', () => {
  const vendored = fs.readFileSync(VENDORED);
  const digest = crypto.createHash('sha256').update(vendored).digest('hex');
  assert.equal(digest, MANIFEST['ha-smart-reports.js'].sha256);
  if (CROSS_REPO_CANONICAL) {
    assert.equal(fs.readFileSync(CROSS_REPO_CANONICAL, 'utf8'), vendored.toString('utf8'));
  }
});

test('bundle contains each source exactly once and --check is clean', () => {
  const bundle = fs.readFileSync(BUNDLE, 'utf8');
  for (const name of ['ha-energy-email.js', 'ha-log-email.js', 'ha-smart-reports.js']) {
    const source = fs.readFileSync(path.join(ROOT, name), 'utf8').trimEnd();
    assert.equal(occurrences(bundle, source), 1, name);
  }
  const result = spawnSync(process.execPath, ['scripts/build-bundle.mjs', '--check'], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});

test('vendored then bundle and bundle then vendored produce identical Smart Reports behavior', () => {
  const first = loadOrder([VENDORED, BUNDLE]);
  const second = loadOrder([BUNDLE, VENDORED]);
  assert.deepEqual(JSON.parse(JSON.stringify(first.document)), JSON.parse(JSON.stringify(second.document)));
  assert.equal(first.document.schema_version, 2);
  first.dom.window.close(); second.dom.window.close();
});

test('version banner, customCards metadata and editor exist once per loaded runtime', () => {
  for (const files of [[VENDORED, BUNDLE], [BUNDLE, VENDORED]]) {
    const result = loadOrder(files);
    assert.equal(result.smartBannerCount, 1);
    assert.equal(result.smartMetadataCount, 1);
    assert.equal(result.hasEditor, true);
    assert.equal(result.hasEditorContract, true);
    result.dom.window.close();
  }
});

test('generated bundle passes the shared N-01 through N-05 fix-pass-2 behavior suite', () => {
  const result = spawnSync(process.execPath, ['--test', 'tests/smart-reports-fix-pass-2.test.cjs'], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, SMART_REPORTS_SOURCE_PATH: BUNDLE },
  });
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
});

test('F08 manifest owns all and only three sources with repository, path, version and digest', () => {
  assert.deepEqual(Object.keys(MANIFEST).sort(), SOURCE_NAMES.slice().sort());
  for (const name of SOURCE_NAMES) {
    const entry = MANIFEST[name];
    assert.equal(typeof entry.owner, 'string');
    assert.equal(entry.path, name);
    assert.match(entry.version, /^\d+\.\d+\.\d+$/);
    assert.match(entry.sha256, /^[a-f0-9]{64}$/);
  }
});

for (const name of SOURCE_NAMES) test(`F08 builder rejects tampered ${name} by digest`, () => {
  const directory = fixtureRepo();
  fs.appendFileSync(path.join(directory, name), '\n/* tampered */\n');
  const result = check(directory);
  assert.notEqual(result.status, 0);
  assert.match(`${result.stdout}\n${result.stderr}`, new RegExp(`digest mismatch.*${name}`, 'i'));
  fs.rmSync(directory, { recursive: true, force: true });
});

test('F08 builder rejects missing and extra manifest sources', () => {
  for (const mutation of ['missing', 'extra']) {
    const directory = fixtureRepo();
    const manifestPath = path.join(directory, 'generated-sources.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (mutation === 'missing') delete manifest['ha-log-email.js'];
    else manifest['unexpected.js'] = { owner: 'MacSiem/ha-tools-email-reports', path: 'unexpected.js', version: '1.0.0', sha256: '0'.repeat(64) };
    fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    const result = check(directory);
    assert.notEqual(result.status, 0, mutation);
    assert.match(`${result.stdout}\n${result.stderr}`, /manifest source set mismatch/i);
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('F08 generated header is deterministic provenance and two builds are byte-identical', () => {
  const directory = fixtureRepo();
  try {
    const fixtureBundle = path.join(directory, 'ha-tools-email-reports.js');
    const first = spawnSync(process.execPath, ['scripts/build-bundle.mjs'], { cwd: directory, encoding: 'utf8' });
    assert.equal(first.status, 0, first.stderr);
    const one = fs.readFileSync(fixtureBundle);
    const second = spawnSync(process.execPath, ['scripts/build-bundle.mjs'], { cwd: directory, encoding: 'utf8' });
    assert.equal(second.status, 0, second.stderr);
    const two = fs.readFileSync(fixtureBundle);
    assert.deepEqual(one, two);
    const header = two.toString('utf8').split('\n').slice(0, 8).join('\n');
    assert.match(header, /DO NOT EDIT/);
    for (const name of SOURCE_NAMES) {
      assert.match(header, new RegExp(name.replace('.', '\\.')));
      assert.match(header, new RegExp(MANIFEST[name].sha256));
    }
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('F08 CI runs Python persistence tests as well as JavaScript tests', () => {
  const workflow = fs.readFileSync(path.join(ROOT, '.github/workflows/validate.yml'), 'utf8');
  assert.match(workflow, /python3\s+-m\s+unittest\s+discover/);
});
