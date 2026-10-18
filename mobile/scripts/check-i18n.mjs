// Fails if a literal t('…') key is missing from the ar or franco dictionary.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const files = dir =>
  readdirSync(dir).flatMap(f => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(f) ? [p] : [];
  });
// The dictionary file is plain data once its type annotations are stripped.
const js = readFileSync('src/lib/i18n-dicts.ts', 'utf8').replace(/: Record<string, string>/g, '');
const { ar, franco } = await import('data:text/javascript,' + encodeURIComponent(js));

const used = new Set();
for (const f of [...files('app'), ...files('src')]) {
  const src = readFileSync(f, 'utf8');
  // t('…') calls, plus labels/errors in constant tables that get passed through t() at render.
  const re = /(?:\bt\(\s*|\b(?:label|sub|title)(?:: |=)|\be\.\w+ = )(['"])((?:\\.|(?!\1).)*)\1/g;
  for (const m of src.matchAll(re))
    used.add(m[2].replace(/\\(['"\\])/g, '$1').replace(/\\n/g, '\n'));
}
const missing = [...used].filter(k => !(k in ar) || !(k in franco));
if (missing.length) {
  console.error('Missing translations:\n' + missing.map(k => '  ' + JSON.stringify(k)).join('\n'));
  process.exit(1);
}
console.log(`i18n OK: ${used.size} keys`);
