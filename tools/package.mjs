import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
process.chdir(path.resolve(import.meta.dirname,'..'));
fs.mkdirSync('build',{recursive:true});
// Build a new archive: updating an old zip would retain retired source files.
const temporary=`build/native-pixels-${Date.now()}.zip`;
const inputs=['index.html','contents.html','chapters','appendix','assets','project','checkpoints',
  'authoring','tools','tests','README.md','EDITORIAL.md','LICENSE','404.html','sitemap.xml','robots.txt','.nojekyll','.github','dependency-lock.json','verification.json','.gitignore'];
const packed=spawnSync('zip',['-q','-r',temporary,...inputs],{encoding:'utf8'});
assert.equal(packed.status,0,packed.stderr);
const tested=spawnSync('unzip',['-t',temporary],{encoding:'utf8'});
assert.equal(tested.status,0,tested.stdout+tested.stderr);
const listing=spawnSync('unzip',['-Z1',temporary],{encoding:'utf8'});
assert.equal(listing.status,0,listing.stderr);
const names=new Set(listing.stdout.trim().split('\n'));
assert(names.has('project/game/animation.odin'));
assert(names.has('project/assets/player-walk.png'));
assert(names.has('checkpoints/18/src/renderer.odin'));
assert(!names.has('project/src/renderer.odin'),'Archive retained retired source');
assert(!names.has('checkpoints/19/game/collision.odin'),'Archive retained a future-chapter file');
fs.renameSync(temporary,'build/native-pixels-book.zip');
console.log('Packaged and checked build/native-pixels-book.zip');
