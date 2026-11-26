// Checks that relative links and `npm run` commands in the docs point at things that exist.
// Usage: node scripts/check-docs.mjs   (from the repository root)
import fs from 'node:fs';
import path from 'node:path';

const files = ['README.md', ...fs.readdirSync('docs').filter((f) => f.endsWith('.md')).map((f) => `docs/${f}`)];
const scripts = new Set(
  ['package.json', 'server/package.json', 'client/package.json'].flatMap((p) => Object.keys(JSON.parse(fs.readFileSync(p, 'utf8')).scripts)),
);

let problems = 0;
let links = 0;
let commands = 0;
const fail = (file, message) => {
  problems++;
  console.log(`✗ ${file}: ${message}`);
};

for (const file of files) {
  const text = fs.readFileSync(file, 'utf8');
  for (const [, target] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    links++;
    if (!fs.existsSync(path.join(path.dirname(file), target.split('#')[0]))) fail(file, `broken link ${target}`);
  }
  for (const [, name] of text.matchAll(/npm (?:--prefix \S+ )?run ([a-z][\w:-]*)/g)) {
    commands++;
    if (!scripts.has(name)) fail(file, `"npm run ${name}" does not exist`);
  }
}

console.log(`${files.length} files, ${links} file links, ${commands} commands checked; ${problems} problem(s)`);
process.exit(problems ? 1 : 0);
