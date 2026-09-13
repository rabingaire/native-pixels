import fs from 'node:fs';
import { snapshots } from '../authoring/source.mjs';
const finalSource = snapshots[18]; // Keep the foundation test's original contract.
// A disposable harness, outside the book source: real presentation, scripted update,
// resize, and orderly shutdown. No simulated result substitutes for a GPU call.
for (const [name, original] of Object.entries(finalSource)) {
  let source = original.replaceAll('\t', '    ');
  if (name === 'src/main.odin') {
    source = source.replace('    running := true', '    attempts, updates := 0, 0\n    resized_small, resized_large := false, false\n    running := true');
    source = source.replace('        event: sdl.Event', `        attempts += 1
        assert(attempts <= 600, "Timed out waiting for actual surface presentation")
        if smoke_presented == 30 && !resized_small {
            assert(sdl.SetWindowSize(window, 720, 480))
            resized_small = true
        }
        if smoke_presented == 60 && !resized_large {
            assert(sdl.SetWindowSize(window, 1100, 700))
            resized_large = true
        }
        if smoke_presented >= 100 {
            assert(updates == 100 && game.position.x == 520 && game.position.y == 100)
            pixel_width, pixel_height: c.int
            assert(sdl.GetWindowSizeInPixels(window, &pixel_width, &pixel_height))
            assert(gpu.config.width == u32(pixel_width) && gpu.config.height == u32(pixel_height))
            fmt.println("SMOKE PASS: 100 successful presents, two resizes, position:", game.position)
            break
        }
        event: sdl.Event`);
    source = source.replace('direction := read_movement(window)', 'direction := [2]f32{1, 0}');
    source = source.replace('game_update(&game, direction, f32(dt), view_size)', 'if updates < 100 {\n            game_update(&game, direction, 1.0/60.0, view_size)\n            updates += 1\n        }\n        _ = dt');
    source += '\nsmoke_presented: int\n';
  }
  if (name === 'src/renderer.odin') source = source.replace('    return !gpu_failed()\n}', '    smoke_presented += 1\n    return !gpu_failed()\n}');
  const target = `build/smoke/${name}`;
  fs.mkdirSync(target.slice(0, target.lastIndexOf('/')), { recursive: true });
  fs.writeFileSync(target, source);
}
fs.mkdirSync('build/NativePixelsSmoke.app/Contents/MacOS', { recursive: true });
fs.writeFileSync('build/NativePixelsSmoke.app/Contents/Info.plist', `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict><key>CFBundleExecutable</key><string>native-pixels</string><key>CFBundleIdentifier</key><string>book.nativepixels.smoke</string><key>CFBundleName</key><string>Native Pixels Smoke</string><key>CFBundlePackageType</key><string>APPL</string><key>NSHighResolutionCapable</key><true/></dict></plist>`);
console.log('Prepared disposable native smoke harness.');
