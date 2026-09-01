import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceNames = ['ha-energy-email.js', 'ha-log-email.js', 'ha-smart-reports.js'];
const outputPath = path.join(root, 'ha-tools-email-reports.js');
const manifestPath = path.join(root, 'generated-sources.json');
const footer = `\nconsole.info('%c HA Tools — Email & Reports %c v4.3.0 — 3 cards bundled',
  'background:#3b82f6;color:#fff;font-weight:bold;padding:2px 6px;border-radius:4px 0 0 4px;',
  'background:#e0f2fe;color:#1e40af;font-weight:bold;padding:2px 6px;border-radius:0 4px 4px 0;');\n`;

function digest(contents) {
  return crypto.createHash('sha256').update(contents).digest('hex');
}

function loadSources() {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const actualNames = Object.keys(manifest).sort();
  const expectedNames = sourceNames.slice().sort();
  if (JSON.stringify(actualNames) !== JSON.stringify(expectedNames)) {
    throw new Error(`manifest source set mismatch: expected ${expectedNames.join(', ')}, got ${actualNames.join(', ')}`);
  }
  return sourceNames.map((name) => {
    const entry = manifest[name];
    if (!entry || entry.path !== name || typeof entry.owner !== 'string' || !entry.owner || typeof entry.version !== 'string' || !/^\d+\.\d+\.\d+$/u.test(entry.version) || !/^[a-f0-9]{64}$/u.test(entry.sha256 || '')) {
      throw new Error(`invalid manifest entry: ${name}`);
    }
    const contents = fs.readFileSync(path.join(root, entry.path), 'utf8');
    const actualDigest = digest(contents);
    if (actualDigest !== entry.sha256) throw new Error(`digest mismatch for ${name}: expected ${entry.sha256}, got ${actualDigest}`);
    return { name, entry, contents: contents.replace(/\s+$/u, '') };
  });
}

export function buildBundle() {
  const sources = loadSources();
  const provenance = sources.map(({ name, entry }) => ` * ${name} — ${entry.owner}/${entry.path} v${entry.version} sha256:${entry.sha256}`).join('\n');
  const header = `/* GENERATED FILE — DO NOT EDIT\n * HA Tools Email Reports bundle v4.3.0\n${provenance}\n */\n`;
  return `${header}${sources.map((source) => source.contents).join('\n')}\n${footer}`;
}

try {
  const expected = buildBundle();
  if (process.argv.includes('--check')) {
    const current = fs.readFileSync(outputPath, 'utf8');
    if (current !== expected) {
      console.error('bundle parity mismatch: run node scripts/build-bundle.mjs');
      process.exitCode = 1;
    } else {
      console.log('bundle parity: clean');
    }
  } else {
    fs.writeFileSync(outputPath, expected, 'utf8');
    console.log(`wrote ${path.relative(root, outputPath)}`);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
