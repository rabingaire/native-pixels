// Reconstruct the reader's project from published HTML, never from source snapshots.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const decode = s => s.replace(/<[^>]*>/g, '').replaceAll('&quot;', '"').replaceAll('&gt;', '>').replaceAll('&lt;', '<').replaceAll('&amp;', '&');
const chapters = fs.readdirSync(path.join(root, 'chapters')).filter(f => f.endsWith('.html')).sort();
const native = process.argv.includes('--native');
fs.mkdirSync(path.join(root, 'build'), {recursive: true});
const output = fs.mkdtempSync(path.join(root, 'build/reader-check-'));
const extra = process.env.BOOK_LINKER_FLAGS || (process.platform === 'darwin' ? '-L/opt/homebrew/lib' : '');
const linker = extra ? [`-extra-linker-flags:${extra}`] : [];
const results = [];
let previousApplication = new Map();

for (const chapter of chapters) {
  const number = Number(chapter.slice(0, 2));
  const html = fs.readFileSync(path.join(root, 'chapters', chapter), 'utf8');
  const article = html.match(/<article class="chapter">([\s\S]*?)<\/article>/)?.[1];
  assert(article, `${chapter}: no chapter article`);
  const prose = decode(article.replace(/<pre>[\s\S]*?<\/pre>/g, '').replace(/<[^>]+>/g, ' '));
  assert(!/\brepository\b|\bGitHub\b|odin (?:run|build) checkpoints\/|node tools\//i.test(prose), `${chapter}: source-checkout dependency in instructional prose`);
  for (const match of article.matchAll(/<code class="language-(?:shell|powershell)"[^>]*>([\s\S]*?)<\/code>/g)) {
    assert(!/odin (?:run|build) checkpoints\/|node tools\//i.test(decode(match[1])), `${chapter}: source-checkout dependency in a command`);
  }
  const files = new Map();
  for (const match of html.matchAll(/<code\b[^>]*data-reader-file="([^"]+)"[^>]*>([\s\S]*?)<\/code>/g)) {
    const file = match[1], source = decode(match[2]);
    assert(!path.isAbsolute(file) && !file.split('/').includes('..'), `Unsafe reader path: ${file}`);
    if (files.has(file)) assert.equal(files.get(file), source, `${chapter}: contradictory listings for ${file}`);
    files.set(file, source);
  }
  assert(files.has('src/main.odin'), `${chapter}: no complete entry point`);
  if (number >= 21) assert(files.has('tests/collision_test.odin'));
  if (number >= 23) assert(files.has('tests/animation_test.odin'));
  // Check the visible instructions against adjacent complete listings. Independent
  // reconstructions alone cannot reveal a missing removal during a package move.
  const application = new Map([...files].filter(([file]) => !file.startsWith('tests/')));
  const changes = [...article.matchAll(/<section\b[^>]*><h2\b[^>]*>([\s\S]*?)<\/h2>([\s\S]*?)<\/section>/g)]
    .find(match => match[1].replace(/<[^>]+>/g, '').includes('Apply the changes to your project'))?.[2];
  assert(changes, `${chapter}: missing project-change instructions`);
  const operations = new Map();
  const changeTable = changes.match(/<table\b[^>]*>([\s\S]*?)<\/table>/)?.[1] || '';
  for (const match of changeTable.matchAll(/<tr><td><code>([^<]+)<\/code><\/td><td>([^<]+)<\/td><\/tr>/g)) {
    const file = decode(match[1]), operation = match[2];
    assert(!operations.has(file), `${chapter}: repeated change instruction for ${file}`);
    operations.set(file, operation);
  }
  const changed = [...new Set([...previousApplication.keys(), ...application.keys()])]
    .filter(file => previousApplication.get(file) !== application.get(file));
  assert.deepEqual([...operations.keys()].sort(), [...changed].sort(), `${chapter}: change table must describe every changed application file`);
  for (const file of changed) {
    const expected = !application.has(file) ? 'Remove' : !previousApplication.has(file) ? 'Add' : 'Replace';
    assert(operations.get(file).startsWith(expected), `${chapter}: ${file} needs a ${expected} instruction`);
  }
  previousApplication = application;
  const directory = path.join(output, chapter.slice(0, 2));
  fs.mkdirSync(path.join(directory, 'build'), {recursive: true});
  for (const [file, source] of files) {
    const target = path.join(directory, file);
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.writeFileSync(target, source);
  }
  const assets = new Set();
  for (const [file, source] of files) {
    for (const match of source.matchAll(/#load\("([^"]+\.png)"/g)) {
      const asset = path.basename(match[1]);
      const anchors = [...html.matchAll(/<a\b[^>]*>/g)].map(m => m[0]);
      const link = anchors.find(tag => tag.includes(`download="${asset}"`));
      assert(link, `${chapter}: no book attachment for ${asset}`);
      const href = link.match(/href="([^"]+)"/)?.[1];
      assert(href && !href.includes('://'), `${chapter}: asset requires an external download`);
      const supplied = path.resolve(root, 'chapters', href);
      assert(supplied.startsWith(root + path.sep), 'Asset escapes book');
      const target = path.resolve(directory, path.dirname(file), match[1]);
      assert(target.startsWith(directory + path.sep), 'Asset escapes reader project');
      fs.mkdirSync(path.dirname(target), {recursive: true});
      fs.copyFileSync(supplied, target);
      assets.add(asset);
    }
  }
  const run = args => {
    const result = spawnSync('odin', args, {cwd: directory, encoding: 'utf8'});
    assert.equal(result.status, 0, `Chapter ${number}: odin ${args.join(' ')}\n${result.error || ''}\n${result.stdout}\n${result.stderr}`);
    return (result.stdout + result.stderr).trim();
  };
  let testOutput;
  if (native) {
    run(['build', 'src', '-out:build/native-pixels', '-debug', '-vet', ...linker]);
    if (number >= 21) testOutput = run(['test', 'tests', '-out:build/room-tests', ...linker]);
  }
  results.push({chapter: number, files: files.size, assets: [...assets], ...(native ? {build: 'passed'} : {}), ...(testOutput ? {tests: testOutput} : {})});
  console.log(`Chapter ${number}: reconstructed ${files.size} files and ${assets.size} images${native ? '; build passed' : ''}${testOutput ? '; tests passed' : ''}`);
}
const reportFile = path.join(root, 'verification.json');
const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
const evidence = {status: 'passed', checkedAt: new Date().toISOString(), source: 'Complete code listings and image attachments in chapter HTML', chapterTransitions: 'passed', chapters: results};
if (native) {
  report.readerReconstruction = {...evidence, platform: process.platform, architecture: process.arch, nativeBuilds: true};
} else {
  report.readerReconstructionStatic = {...evidence, nativeBuilds: false};
}
fs.writeFileSync(reportFile, JSON.stringify(report, null, 2) + '\n');
console.log(`Reader projects saved under ${path.relative(root, output)}.`);
