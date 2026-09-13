import { snapshots } from './source.mjs';
import { formatOdin } from './format.mjs';
export const esc = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
export const code = (text, language = 'odin', caption = '') => `<figure class="code-block">${caption ? `<figcaption>${esc(caption)}</figcaption>` : ''}<pre><code class="language-${language}">${esc(language === 'odin' ? formatOdin(text, true) : text.trim())}</code></pre></figure>`;
export const note = (title, text, kind = 'note') => `<aside class="callout ${kind}"><strong>${title}</strong><p>${text}</p></aside>`;
export const table = (headers, rows) => `<div class="table-scroll"><table><thead><tr>${headers.map(x=>`<th scope="col">${x}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(x=>`<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
export const section = (title, body) => `<section><h2>${title}</h2>${body}</section>`;
export const p = s => `<p>${s}</p>`;
export const list = items => `<ul>${items.map(x=>`<li>${x}</li>`).join('')}</ul>`;
export function extract(n, file, start, end) {
  const s = snapshots[n][file];
  if (start == null) return s;
  const anchor = value => value.replace(/^(?: {4})+/gm, spaces => '\t'.repeat(spaces.length / 4));
  const a = s.indexOf(anchor(start));
  if (a < 0) throw Error(`Missing excerpt ${n}/${file}: ${start}`);
  if (end) {
    const b = s.indexOf(anchor(end), a + anchor(start).length);
    if (b < 0) throw Error(`Missing excerpt end ${n}/${file}: ${end}`);
    return s.slice(a, b).trim();
  }
  // Ignore default-value literals in a procedure signature, and braces inside
  // comments/strings, when locating the declaration's actual body.
  let depth = 0, parentheses = 0, brackets = 0, body = false;
  const tokens = /\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|`[^`]*`|'(?:\\.|[^'\\])*'|[()[\]{}]/g;
  tokens.lastIndex = a;
  for (let match; (match = tokens.exec(s));) {
    const token = match[0];
    if (token === '(') parentheses++;
    if (token === ')') parentheses--;
    if (token === '[') brackets++;
    if (token === ']') brackets--;
    if (token === '{' && (body || (parentheses === 0 && brackets === 0))) {
      body = true;
      depth++;
    }
    if (token === '}' && body && --depth === 0) return s.slice(a, match.index + 1);
  }
  throw Error('Unclosed excerpt');
}
export const sourceId = file => `source-${file.replaceAll('/', '-').replaceAll('.', '-')}`;
export function snippet(n, file, start, end, label = '', placement = '') {
  const source = extract(n, file, start, end);
  const previous = snapshots[n - 1]?.[file];
  const declaration = start?.match(/^(\w+)\s*::(?:\s*(proc|struct|enum))?|^(fn)\s+(\w+)/);
  const name = declaration?.[1] || declaration?.[4];
  const kind = declaration?.[3] ? 'function' : source.match(/^\w+\s*::\s*(proc|struct|enum)\b/)?.[1] || 'declaration';
  const noun = kind === 'proc' ? 'procedure' : kind;
  if (!placement) {
    if (!start) {
      placement = previous === source ? 'Read this complete file; no edits are needed here.'
        : previous ? 'Replace the entire file with this listing.'
        : 'Create this file with the complete contents below.';
    } else if (name && !end) {
      const existed = previous && new RegExp(`^${name}\\s*(?:::|\\()|^fn\\s+${name}\\b`, 'm').test(previous);
      placement = previous?.includes(source) ? `Read the existing ${name} ${noun}; it is unchanged.`
        : existed ? `Replace the entire ${name} ${noun}, including its body, with the version below. Keep the rest of the file.`
        : `Add the complete ${name} ${noun} at file scope, after the package/import lines and outside every other procedure. Keep the other declarations.`;
    } else {
      throw Error(`Partial snippet needs placement instructions: ${n}/${file}: ${start}`);
    }
  }
  const title = label || `${file} · ${name ? `${name} ${noun}` : start ? 'excerpt' : 'complete file'}`;
  return `<p class="snippet-placement">In <code>${esc(file)}</code>: ${esc(placement)} <a href="#${sourceId(file)}">Complete file with surrounding code</a>.</p>`
    + code(source, file.endsWith('wgsl') ? 'wgsl' : 'odin', title);
}
export const frame = rows => section('When this work happens', table(['Operation', 'Frequency', 'Reason'], rows));
export const mistakes = rows => section('If the result is different', table(['Symptom', 'What to inspect', 'Why it matters'], rows));
export const experiments = items => section('Experiments', `<p>These short, optional checks help you test the explanation. Predict the result first, then run the program. Restore the chapter’s baseline before continuing; later chapters start from the result taught here, without the optional changes.</p><ol>${items.map(x=>`<li>${x}</li>`).join('')}</ol>`);
export const flow = (title, labels) => {
  return `<figure class="diagram flow-diagram"><ol aria-label="${esc(title)}">${labels.map(label=>`<li>${esc(label)}</li>`).join('')}</ol><figcaption>${title}</figcaption></figure>`;
};
export const diagrams = {
  pipeline: flow('A draw records work; submission makes that work available to the GPU.', ['Odin / CPU', 'Encoder', 'Command buffer', 'Queue', 'GPU']),
  transforms: flow('The same character, described in successively different spaces.', ['Local corner', 'World position', 'Clip position', 'Rasterization', 'Window pixels']),
  objects: `<figure class="diagram object-diagram"><div class="diagram-canvas" tabindex="0" role="region" aria-label="Object dependencies diagram"><svg viewBox="0 0 680 440" role="img" aria-labelledby="object-title object-description"><title id="object-title">From an instance to a configured surface</title><desc id="object-description">The instance creates a surface wrapping the SDL native window and requests a compatible adapter. The adapter creates a device. Configuring the surface requires both the surface and device. The device also supplies a queue and creates drawing resources. Arrows show dependencies, not inheritance or automatic destruction.</desc><defs><marker id="object-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path class="arrowhead" d="M0 0 10 5 0 10Z"/></marker></defs><g class="connections" marker-end="url(#object-arrow)"><path d="M290 66V92H150V120"/><path d="M390 66V92H520V120"/><path d="M520 180V250"/><path d="M150 180V250"/><path d="M420 280H260"/><path d="M520 310V366"/></g><rect x="235" y="12" width="210" height="54" rx="4"/><text x="340" y="45" text-anchor="middle">Instance</text><rect x="40" y="120" width="220" height="60" rx="4"/><text x="150" y="145" text-anchor="middle">Surface</text><text class="diagram-detail" x="150" y="166" text-anchor="middle">wraps SDL’s native window</text><rect x="420" y="120" width="200" height="60" rx="4"/><text x="520" y="145" text-anchor="middle">Adapter</text><text class="diagram-detail" x="520" y="166" text-anchor="middle">compatible with this surface</text><rect x="420" y="250" width="200" height="60" rx="4"/><text x="520" y="285" text-anchor="middle">Device</text><rect x="40" y="250" width="220" height="60" rx="4"/><text x="150" y="275" text-anchor="middle">Surface configuration</text><text class="diagram-detail" x="150" y="296" text-anchor="middle">device + image settings</text><rect x="370" y="366" width="300" height="60" rx="4"/><text x="520" y="391" text-anchor="middle">Queue and drawing resources</text><text class="diagram-detail" x="520" y="412" text-anchor="middle">buffers, textures, pipelines</text><text class="diagram-detail" x="340" y="265" text-anchor="middle">uses device</text><text class="diagram-detail" x="530" y="219">request</text></svg><svg class="mobile-object-diagram" viewBox="0 0 340 540" role="img" aria-labelledby="mobile-object-title mobile-object-description"><title id="mobile-object-title">Object dependencies in a narrow view</title><desc id="mobile-object-description">Instance branches to surface and compatible adapter. Adapter requests device. Both surface and device connect to surface configuration. Device also supplies the queue and drawing resources.</desc><defs><marker id="mobile-object-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path class="arrowhead" d="M0 0 10 5 0 10Z"/></marker></defs><g marker-end="url(#mobile-object-arrow)"><path d="M130 65V85H82V110"/><path d="M210 65V85H257V110"/><path d="M82 180V350"/><path d="M257 180V240"/><path d="M180 275H170V385H160"/><path d="M257 310V450"/></g><rect x="95" y="10" width="150" height="55" rx="4"/><text x="170" y="43" text-anchor="middle">Instance</text><rect x="5" y="110" width="155" height="70" rx="4"/><text x="82" y="138" text-anchor="middle">Surface</text><text class="diagram-detail" x="82" y="160" text-anchor="middle">wraps native window</text><rect x="180" y="110" width="155" height="70" rx="4"/><text x="257" y="138" text-anchor="middle">Adapter</text><text class="diagram-detail" x="257" y="160" text-anchor="middle">surface-compatible</text><rect x="180" y="240" width="155" height="70" rx="4"/><text x="257" y="268" text-anchor="middle">Device</text><text class="diagram-detail" x="257" y="290" text-anchor="middle">owns resources</text><rect x="5" y="350" width="155" height="76" rx="4"/><text x="82" y="375" text-anchor="middle">Surface</text><text x="82" y="393" text-anchor="middle">configuration</text><text class="diagram-detail" x="82" y="413" text-anchor="middle">uses this device</text><rect x="180" y="450" width="155" height="76" rx="4"/><text x="257" y="480" text-anchor="middle">Queue, buffers,</text><text x="257" y="502" text-anchor="middle">textures, pipelines</text><text class="diagram-detail" x="265" y="215">request</text></svg></div><figcaption>Read downward from the instance. The two branches meet at surface configuration: a surface alone cannot supply renderable frames. The SDL window is a separate object that must already exist.</figcaption></figure>`,
  quad: `<figure class="diagram"><svg viewBox="0 0 700 300" role="img" aria-label="Rectangle made from indexed triangles 0 1 2 and 0 2 3"><title>Four vertices, two triangles</title><path class="fill-accent" d="M130 45H530V255Z"/><path class="fill-muted" d="M130 45 530 255H130Z"/><path d="M130 45H530V255H130ZM130 45 530 255"/><text x="112" y="32">0 · (0,0)</text><text x="515" y="32">1 · (1,0)</text><text x="515" y="285">2 · (1,1)</text><text x="112" y="285">3 · (0,1)</text><text x="377" y="115">0, 1, 2</text><text x="210" y="217">0, 2, 3</text></svg><figcaption>The diagonal is shared. Index order reuses corners; it does not draw an outline.</figcaption></figure>`,
  memory: `<figure class="diagram"><svg viewBox="0 0 760 175" role="img" aria-label="24 byte vertex: x at byte 0, y at byte 4, RGBA at bytes 8 12 16 20"><title>Vertex memory layout</title>${['x','y','r','g','b','a'].map((x,i)=>`<rect x="${25+i*116}" y="42" width="116" height="54"/><text x="${83+i*116}" y="75" text-anchor="middle">${x}: f32</text><text x="${25+i*116}" y="28">${i*4}</text>`).join('')}<path d="M25 117v12h696v-12"/><text x="373" y="157" text-anchor="middle">stride = 24 bytes → next vertex</text></svg><figcaption>Location 0 reads Float32x2 at offset 0. Location 1 reads Float32x4 at offset 8.</figcaption></figure>`,
  coordinates: `<figure class="diagram coordinate-demo"><svg viewBox="0 0 700 350" role="img" aria-label="Pixel top left maps to NDC minus one plus one; bottom right maps to plus one minus one"><title>Pixel coordinates to NDC</title><rect x="100" y="50" width="480" height="240" rx="0"/><path d="M340 50v240M100 170h480"/><text x="100" y="29">(0,0) → (−1,+1)</text><text x="383" y="324">(W,H) → (+1,−1)</text><text x="350" y="193">center → (0,0)</text><rect class="demo-character fill-accent" x="160" y="105" width="24" height="32"/><text x="125" y="345" class="coordinate-readout">World x = 120 · NDC x = −0.750</text></svg><div class="interactive-only" hidden><label>Character x <input class="coordinate-slider" type="range" min="0" max="912" value="120" step="1"/></label></div><figcaption>A 960 × 480 world drawn at half size here. The conversion divides by the full world extent; the SVG is only a diagram.</figcaption></figure>`,
};
