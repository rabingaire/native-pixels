import assert from 'node:assert/strict';
import { test } from 'node:test';
import { extract, esc } from '../authoring/html.mjs';
import { formatOdin } from '../authoring/format.mjs';
import { highlightCode } from '../authoring/highlight.mjs';

test('procedure excerpts include the body after composite default arguments', () => {
  const source = extract(23, 'renderer/renderer.odin', 'Sprite :: proc');
  assert.match(source, /uv_max: \[2\]f32 = \{1, 1\}/);
  assert.match(source, /r\.count \+= 1\n\}$/);
  assert.equal(formatOdin(source, true), source);
});

test('statement and case fragments keep only their formatted contents', () => {
  const statements = formatOdin('value:=1\nif value>0 { value+=1 }', true);
  assert.equal(statements, 'value := 1\nif value > 0 { value += 1 }');
  const clause = formatOdin('case .QUIT:\n    running=false', true);
  assert.equal(clause, 'case .QUIT:\n\trunning = false');
});

test('highlighting preserves tabs, trailing newlines, and literal HTML for copying', () => {
  const source = 'package example\nmain :: proc() {\n\tfmt.println("</code>&lt;")\n}\n';
  const html = highlightCode(`<figure class="code-block"><pre><code class="language-odin" data-reader-file="src/main.odin">${esc(source)}</code></pre></figure>`);
  const code = html.match(/<code\b[^>]*>([\s\S]*?)<\/code>/)[1];
  const decoded = code.replace(/<[^>]*>/g, '').replaceAll('&quot;', '"').replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');
  assert.equal(decoded, source);
  assert.match(html, /data-reader-file="src\/main.odin"/);
  assert.match(html, /--shiki-dark:/);
});
