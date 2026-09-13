import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const platform = { darwin: 'darwin', linux: 'unknown-linux-gnu', win32: 'pc-windows-msvc.exe' }[process.platform];
const architecture = { arm64: 'arm64', x64: 'x86_64' }[process.arch];
const local = path.join(root, 'build/formatter', `odinfmt-${architecture}-${platform}`);
const command = process.env.ODINFMT || (fs.existsSync(local) ? local : 'odinfmt');
const cache = new Map();

function run(source) {
  const result = spawnSync(command, ['-stdin', `-config:${path.join(root, 'odinfmt.json')}`], {
    input: source, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024,
  });
  if (result.error) throw Error(`Cannot run odinfmt. Install OLS dev-2026-08 or set ODINFMT. ${result.error.message}`);
  return result;
}

export function formatOdin(source, fragment = false) {
  const key = `${fragment}:${source}`;
  if (cache.has(key)) return cache.get(key);
  let result;
  let formatted;
  if (!fragment || /^\s*package\b/.test(source)) {
    result = run(source);
    formatted = result.stdout;
  } else {
    // odinfmt parses files. Supply temporary context for declarations or statements,
    // then remove it so readers only see the original teaching excerpt.
    const prefix = 'package snippet\n';
    result = run(prefix + source + '\n');
    if (result.status === 0) {
      formatted = result.stdout.replace(/^package snippet\s*\n/, '');
    } else if (/^\s*case\b/.test(source)) {
      result = run(`${prefix}snippet :: proc() {\nswitch value {\n${source}\n}\n}\n`);
      formatted = result.stdout.replace(/^package snippet\s*\nsnippet :: proc\(\) \{\n\tswitch value \{\n/, '')
        .replace(/\n\t\}\n\}\s*$/, '\n').replace(/^\t/gm, '');
    } else {
      result = run(`${prefix}snippet :: proc() {\n${source}\n}\n`);
      formatted = result.stdout.replace(/^package snippet\s*\nsnippet :: proc\(\) \{\n/, '')
        .replace(/\n\}\s*$/, '\n').replace(/^\t/gm, '');
    }
  }
  if (result.status !== 0) throw Error(`odinfmt failed:\n${result.stderr}\n${source}`);
  formatted = fragment ? formatted.trim() : formatted.trimEnd() + '\n';
  cache.set(key, formatted);
  return formatted;
}
