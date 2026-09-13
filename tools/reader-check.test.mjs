import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {test} from 'node:test';

const root = path.resolve(import.meta.dirname, '..');

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'native-pixels-reader-test-'));
  t.after(() => fs.rmSync(directory, {recursive: true, force: true}));
  for (const entry of ['chapters', 'project/assets', 'verification.json', 'tools/reader-check.mjs']) {
    const target = path.join(directory, entry);
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.cpSync(path.join(root, entry), target, {recursive: true});
  }
  return {
    report: () => JSON.parse(fs.readFileSync(path.join(directory, 'verification.json'), 'utf8')),
    edit(chapter, change) {
      const file = fs.readdirSync(path.join(directory, 'chapters')).find(name => name.startsWith(chapter));
      const target = path.join(directory, 'chapters', file);
      const original = fs.readFileSync(target, 'utf8');
      const edited = change(original);
      assert.notEqual(edited, original, 'The fixture mutation must change the chapter');
      fs.writeFileSync(target, edited);
    },
    run: () => spawnSync(process.execPath, ['tools/reader-check.mjs'], {cwd: directory, encoding: 'utf8'}),
  };
}

test('static reconstruction checks all transitions and preserves native evidence', t => {
  const book = fixture(t), before = book.report().readerReconstruction;
  const result = book.run();
  assert.equal(result.status, 0, result.stderr);
  const after = book.report();
  assert.deepEqual(after.readerReconstruction, before);
  assert.equal(after.readerReconstructionStatic.chapterTransitions, 'passed');
  assert.equal(after.readerReconstructionStatic.chapters.length, 23);
  assert.equal(after.readerReconstructionStatic.nativeBuilds, false);
});

test('missing removal during the chapter 19 package move fails', t => {
  const book = fixture(t);
  book.edit('19-', html => html.replace(/<tr><td><code>src\/gpu\.odin<\/code><\/td><td>Remove[^<]*<\/td><\/tr>/, ''));
  const result = book.run();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /change table must describe every changed application file/);
});

test('an addition mislabeled as a replacement fails', t => {
  const book = fixture(t);
  book.edit('01-', html => html.replace('<td>Add this file</td>', '<td>Replace this file</td>'));
  const result = book.run();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /src\/main\.odin needs a Add instruction/);
});

test('source-checkout commands fail even when they occur only in code blocks', t => {
  const book = fixture(t);
  book.edit('01-', html => html.replace(/(<code class="language-shell"[^>]*>)[\s\S]*?(<\/code>)/, '$1odin build checkpoints/01/src$2'));
  const result = book.run();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /source-checkout dependency in a command/);
});
