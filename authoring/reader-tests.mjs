import fs from 'node:fs';
import {p, section, code, esc} from './html.mjs';

// Publish the existing test cases with imports relative to the reader's project.
// The collision chapter gets no code that depends on later animation fields.
const original = fs.readFileSync(new URL('../tests/room/room_test.odin', import.meta.url), 'utf8');
const marker = '@(test)\nanimation_uses_seconds_and_retains_facing_when_idle';
const split = original.indexOf(marker);
if (split < 0) throw Error('Cannot find the animation test boundary');
const imports = original.slice(0, original.indexOf('@(test)'))
  .replace('../../project/game', '../game').replace('../../project/renderer', '../renderer');
export const collisionTests = original.slice(0, split).trimEnd()
  .replace('../../project/game', '../game').replace('../../project/renderer', '../renderer') + '\n';
export const animationTests = imports + original.slice(split);
export function readerTestFiles(number) {
  return {
    ...(number >= 21 ? {'tests/collision_test.odin': collisionTests} : {}),
    ...(number >= 23 ? {'tests/animation_test.odin': animationTests} : {}),
  };
}
const listing = (file, source) => `<figure class="code-block"><figcaption>${file} · complete new file</figcaption><pre><code class="language-odin" data-reader-file="${file}">${esc(source)}</code></pre></figure>`;
export const testCommands = p('Run the tests from native-pixels-game. The test executable belongs in build so Windows can find the SDL3.dll placed there in chapter 1. Choose the same library setting as your application build:')
  + code(`odin test tests -out:build/room-tests -extra-linker-flags:"-L$BOOK_SDL_PREFIX/lib -Wl,-rpath,$BOOK_SDL_PREFIX/lib"`, 'shell', 'macOS/Linux with the source-built SDL prefix from chapter 1')
  + code(`odin test tests -out:build/room-tests -extra-linker-flags:"-L/opt/homebrew/lib"`, 'shell', 'macOS Apple Silicon with Homebrew SDL; Intel Homebrew uses /usr/local/lib')
  + code(`odin test tests -out:build/room-tests.exe`, 'powershell', 'Windows x64 with build/SDL3.dll in place');

export const collisionTestLesson = section('Write a check we can repeat',
  p('A test calls our procedures with known inputs and checks the result. It can repeat a 1000-unit movement exactly, which is difficult to do by holding a key. Create a directory named <code>tests</code> beside src, game, and renderer. Then create <code>tests/collision_test.odin</code> with the complete listing below.')
  + p('Odin’s <code>core:testing</code> package supplies the test runner. <code>@(test)</code> marks a procedure for it to call. The <code>t: ^testing.T</code> parameter holds information about that test; <code>testing.expect(t, condition)</code> records a failure if the condition is false. <code>odin test tests</code> builds and runs these procedures instead of the application’s main.')
  + p('Begin with <code>sweep_blocks_large_steps_in_both_directions</code>. It puts an obstacle from x = 100 to x = 120. Starting at x = 40, the feet’s right edge is x = 44. A 1000-unit request must stop with the center at 96, so the right edge touches 100. The second case approaches from the right and expects the center at 124. These assertions express the movement rule, not the loop used to implement it.')
  + listing('tests/collision_test.odin', collisionTests)
  + p('The contact test also checks sliding and moving away. The room test checks the authored wall and chair positions. A floating-point comparison uses a small tolerance where repeated fractional updates may round differently. <code>for _ in 0..&lt;60</code> repeats 60 times; the underscore discards the counter. The renderer tests inspect only the CPU sprite list and its capacity checks. They never call Init or submit GPU work.')
  + testCommands
  + p('Expect eight passing tests and no window. A failure names the test that needs attention. The imported game and renderer packages still require the native libraries at link time, even though these test procedures do not create a device. Keep this file for later chapters; its movement and recorder rules remain valid.')
  + p('After the tests pass, run the game and approach the chair from below. The player should stop with its feet anchor at y = 175. Test results establish the geometry; running the window lets you check how that geometry lines up with the artwork.'));

export const animationTestLesson = section('Test time, blocked movement, and image selection',
  p('Keep tests/collision_test.odin and add <code>tests/animation_test.odin</code> with the following complete file. It uses the same test package and imports. The first test advances two animation clocks for one second using different step counts. The second checks that a blocked northward request chooses a north-facing idle pose. The third checks both image bounds and the UV values recorded for a selected region.')
  + listing('tests/animation_test.odin', animationTests)
  + p('The time test allows a small floating-point difference instead of demanding exact equality after repeated additions. The blocked-motion test calls the real game.Update, so it checks the connection between collision and animation as well as the animation helper. UV checks confirm that the renderer records the requested image region without needing a GPU.')
  + testCommands
  + p('Expect eleven passing tests: the eight earlier checks and three new animation checks. Then run the window. Hold each direction, release the keys, and press into a wall. Facing should change with the requested direction; the walk cycle should stop when the player stops. Watch the boots while poses change and use F1 to confirm that the feet box stays the same size.'));
