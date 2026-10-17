// Sync canonical local factories into Log Email's own closure.
'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const targetPath = path.join(root, 'ha-log-email.js');
let text = fs.readFileSync(targetPath, 'utf8');
const manifestPath = path.join(root, 'generated-sources.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
for (const [modulePath, marker, property] of [
  ['shared/ha-tools-email-schedules.js', 'ha-tools-email-schedules', 'sharedEmailSchedules'],
  ['shared/ha-tools-ui.js', 'ha-tools-ui', 'sharedUiV3'],
  ['shared/ha-tools-lists.js', 'ha-tools-lists', 'sharedLists'],
]) {
  const canonical = fs.readFileSync(path.join(root, modulePath), 'utf8');
  const inline = canonical.replace(/^export function /m, 'function ').split('// Node tests use')[0].trimEnd();
  const begin = '// BEGIN vendored ' + marker + ' factory', end = '// END vendored ' + marker + ' factory';
  if (text.split(begin).length !== 2 || text.split(end).length !== 2) throw new Error('Expected one factory: ' + marker);
  const start = text.indexOf(begin), finish = text.indexOf(end, start) + end.length;
  const next = text.slice(0, start) + begin + '\n' + inline + '\n' + end + text.slice(finish);
  const provenance = {path: modulePath, sha256: digest(canonical), inlineSha256: digest(inline + '\n')};
  if (process.argv.includes('--write')) manifest['ha-log-email.js'][property] = provenance;
  else if (next !== text || JSON.stringify(manifest['ha-log-email.js'][property]) !== JSON.stringify(provenance)) throw new Error('Factory parity failed: ' + marker);
  text = next;
}
if (process.argv.includes('--write')) {
  fs.writeFileSync(targetPath, text);
  manifest['ha-log-email.js'].sha256 = digest(text);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
} else if (manifest['ha-log-email.js'].sha256 !== digest(text)) throw new Error('Log source provenance failed');
