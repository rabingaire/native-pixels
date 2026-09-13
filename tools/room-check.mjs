import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {finalSource} from '../authoring/source.mjs';
process.chdir(path.resolve(import.meta.dirname,'..'));
for (const [name,original] of Object.entries(finalSource)) {
  let source=original.replaceAll('\t', '    ');
  if(name==='renderer/renderer.odin') source=source
    .replace('    commands := wgpu.CommandEncoderFinish', '    capture := capture_encode(r, encoder, frame.texture)\n    commands := wgpu.CommandEncoderFinish')
    .replace('    if wgpu.SurfacePresent', '    capture_save(r, &capture)\n    if wgpu.SurfacePresent');
  if(name==='renderer/gpu.odin') source=source.replace('    fmt.println("Surface format:", format)', '    assert(.CopySrc in caps.usages, "Screenshot harness needs CopySrc surface support")\n    gpu.config.usage += {.CopySrc}\n    fmt.println("Surface format:", format)');
  if(name==='src/main.odin') {
    source=source.replace('import "core:fmt"','import "core:fmt"\nimport "core:math"');
    source=source.replace('    running := true','    attempts, presented := 0, 0\n    seen_frames: u32\n    resized_small, resized_large, toggled := false, false, false\n    running := true');
    source=source.replace('        input: game.Input',`        attempts += 1
        assert(attempts < 1200, "No presentation progress")
        if presented == 0 && attempts % 100 == 0 {
            fmt.println("Waiting for a drawable window:", sdl.GetWindowFlags(window))
            assert(sdl.ShowWindow(window))
            _ = sdl.RaiseWindow(window)
        }
        if presented == 100 && !resized_small { assert(sdl.SetWindowSize(window, 720, 480)); resized_small = true }
        if presented == 200 && !resized_large { assert(sdl.SetWindowSize(window, 1100, 700)); resized_large = true }
        if presented == 450 {
            assert(math.abs(world.position.x-192) < 0.01 && world.position.y == 51)
            assert(world.show_collision)
            assert(world.animation.facing == .North && !world.animation.moving)
            assert(seen_frames == 15, "All four walk-frame columns must be presented")
            fmt.println("ROOM PASS: 450 successful presents; texture uploads; chair/wall collision; F1; two resizes", world.position)
            break
        }
        if presented == 99 && !toggled {
            pushed := sdl.Event{key = {type = .KEY_DOWN, scancode = .F1}}
            assert(sdl.PushEvent(&pushed))
            toggled = true
        }
        input: game.Input`);
    source=source.replace('        game.Update(&world, input, f32(dt))',`        _ = dt
        if presented < 100 { input.movement = {1, 0} }
        else if presented < 200 { input.movement = {0, -1} }
        else if presented < 300 { input.movement = {-1, 0} }
        else { input.movement = {0, -1} }
        previous_position := world.position
        game.Update(&world, input, 1.0/60.0)`);
    source=source.replace('        if result == .Fatal',`        if result == .Presented {
            if world.animation.moving { seen_frames |= 1 << u32(min(int(world.animation.phase/game.FRAME_SECONDS),3)) }
            presented += 1
            if presented == 200 { assert(world.position.y == 175) }
        } else { world.position = previous_position }
        if result == .Fatal`);
  }
  const target='build/room-smoke/'+name;
  fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,source);
}
fs.mkdirSync('build/room-smoke/assets',{recursive:true});
fs.mkdirSync('build/screenshots',{recursive:true});
fs.copyFileSync('tools/room-capture.odin','build/room-smoke/renderer/capture.odin');
for(const name of ['room.png','player.png','player-walk.png']) fs.copyFileSync('project/assets/'+name,'build/room-smoke/assets/'+name);
const flags=process.env.BOOK_LINKER_FLAGS || (process.platform==='darwin'?'-L/opt/homebrew/lib':'');
const args=['build','build/room-smoke/src','-vet','-debug','-out:build/room-smoke-app'];if(flags)args.push('-extra-linker-flags:'+flags);
const build=spawnSync('odin',args,{encoding:'utf8'});assert.equal(build.status,0,build.stdout+build.stderr);
if(process.argv.includes('--run')) {
  const result=spawnSync('./build/room-smoke-app',[],{encoding:'utf8',timeout:45000});
  fs.writeFileSync('build/room-smoke.log',result.stdout+result.stderr);
  console.log(result.stdout+result.stderr);
  assert.equal(result.status,0,`Native run failed: ${result.error || result.signal}`);
  assert.match(result.stdout,/ROOM PASS: 450 successful presents/);
  fs.copyFileSync('build/screenshots/room-native.png','assets/room-gameplay.png');
  fs.copyFileSync('build/screenshots/room-collision-native.png','assets/room-collision.png');
  const report=JSON.parse(fs.readFileSync('verification.json','utf8'));
  report.roomSmoke={status:'passed',successfulPresents:450,resizes:2,scriptedMovement:true,syntheticF1Event:true,chairContactY:175,finalPosition:[192,51],allFourWalkColumnsPresented:true,blockedNorthIdle:true,framebufferCaptures:['assets/room-gameplay.png','assets/room-collision.png'],captureRequiresCopySrc:true,platform:process.platform,architecture:process.arch};
  fs.writeFileSync('verification.json',JSON.stringify(report,null,2)+'\n');
} else console.log('Built room smoke harness; add --run to open its native window.');
