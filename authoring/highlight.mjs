import { createHighlighter } from 'shiki';

const highlighter = await createHighlighter({
  themes: ['light-plus', 'dark-plus'],
  langs: ['odin', 'wgsl', 'shellscript', 'powershell', 'diff'],
});
const escape = text => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const decode = text => text.replaceAll('&quot;', '"').replaceAll('&gt;', '>').replaceAll('&lt;', '<').replaceAll('&amp;', '&');
const labels = { odin: 'Odin', wgsl: 'WGSL', shell: 'Shell', powershell: 'PowerShell', diff: 'Diff', text: 'Text' };
const cache = new Map();

export function highlightCode(html) {
  return html.replace(/<figure class="code-block">(<figcaption>[\s\S]*?<\/figcaption>)?<pre><code class="language-([^"]+)"([^>]*)>([\s\S]*?)<\/code><\/pre><\/figure>/g,
    (_, caption, language, attributes, encoded) => {
      const source = decode(encoded);
      const lang = language === 'shell' ? 'shellscript' : language;
      const key = `${lang}:${source}`;
      if (!cache.has(key)) {
        const { tokens } = highlighter.codeToTokens(source, {
          lang, themes: { light: 'light-plus', dark: 'dark-plus' },
        });
        cache.set(key, tokens.map(line => line.map(token => {
          const styles = Object.entries(token.htmlStyle).map(([name, value]) => `${name}:${value}`).join(';');
          return `<span style="${styles}">${escape(token.content)}</span>`;
        }).join('')).join('\n'));
      }
      return `<figure class="code-block">${caption || `<figcaption>${escape(labels[language] || language)}</figcaption>`}<pre><code class="language-${language}"${attributes} data-highlighted="true">${cache.get(key)}</code></pre></figure>`;
    });
}
