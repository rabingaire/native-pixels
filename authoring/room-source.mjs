import fs from 'node:fs';
const read = name => fs.readFileSync(new URL(`room-source/${name}`, import.meta.url), 'utf8');
export function extendRoom(snapshots) {
  const final = {};
  for (const file of ['renderer/renderer.odin','renderer/texture.odin','renderer/sprites.wgsl',
    'game/game.odin','game/collision.odin','src/main.odin']) final[file] = read(file);
  for (const file of ['gpu.odin','platform.odin']) {
    final['renderer/'+file] = snapshots[18]['src/'+file].replace('package character','package renderer');
  }
  const debug = `    if g.show_collision {
        for solid in SOLIDS { outline(r, solid, {1, 0.15, 0.05, 0.85}) }
        outline(r, Feet(g.position), {0.1, 1, 0.2, 1})
    }`;
  const preDebug = {...final,
    'game/game.odin': final['game/game.odin'].replace(debug, '').replace('    if input.toggle_collision { g.show_collision = !g.show_collision }\n', '').split('@(private)')[0].replace('    show_collision: bool,\n','').replace(', toggle_collision: bool',''),
    'src/main.odin': final['src/main.odin'].replace(' · F1 collisions','').replace('            case .KEY_DOWN:\n                if event.key.scancode == .F1 && !event.key.repeat { input.toggle_collision = true }\n',''),
  };
  snapshots[21] = preDebug;
  snapshots[20] = {...preDebug, 'game/game.odin': preDebug['game/game.odin'].replace('    Move(&g.position, delta, SOLIDS[:])',`    g.position += delta
    g.position.x = clamp(g.position.x, f32(28), f32(358))
    g.position.y = clamp(g.position.y, f32(51), f32(239))`)};
  delete snapshots[20]['game/collision.odin'];
  // In 19 the composition calls live in main; 20 moves them into game.Draw.
  const drawStart = snapshots[20]['game/game.odin'].indexOf('Draw :: proc');
  snapshots[19] = {...snapshots[20],
    'game/game.odin': snapshots[20]['game/game.odin'].slice(0,drawStart),
    'src/main.odin': snapshots[20]['src/main.odin'].replace('import "core:fmt"','import "core:fmt"\nimport "core:math"').replace('        game.Draw(&world, &rendering)',`        renderer.Sprite(&rendering, world.room, {0, 0}, game.WORLD_SIZE)
        feet := [2]f32{math.round(world.position.x), math.round(world.position.y)}
        renderer.Sprite(&rendering, world.player, feet - [2]f32{16, 30}, {32, 32})`),
  };
  snapshots[22] = final;
  snapshots[23] = {...final,
    'game/animation.odin': read('game/animation.odin'),
    'game/game.odin': final['game/game.odin']
      .replace('    show_collision: bool,','    show_collision: bool,\n    animation: Animation,')
      .replace('../assets/player.png','../assets/player-walk.png')
      .replace('    Move(&g.position, delta, SOLIDS[:])','    previous := g.position\n    Move(&g.position, delta, SOLIDS[:])\n    Animate(&g.animation, direction, g.position-previous, dt)')
      .replace('    renderer.Sprite(r, g.player, feet - [2]f32{16, 30}, {32, 32})',`    frame := Current_Frame(g.animation)
    size := frame.size * PLAYER_TEXEL_SCALE
    anchor := [2]f32{size.x/2, size.y-1}
    renderer.Sprite(r, g.player, feet-anchor, size,
                    uv_min = frame.min/SHEET_SIZE, uv_max = (frame.min+frame.size)/SHEET_SIZE)`),
    'renderer/renderer.odin': final['renderer/renderer.odin']
      .replace('tint: [4]f32 = {1, 1, 1, 1}) {','tint: [4]f32 = {1, 1, 1, 1},\n               uv_min: [2]f32 = {0, 0}, uv_max: [2]f32 = {1, 1}) {')
      .replace('    corners := [4][2]f32',`    assert(uv_min.x >= 0 && uv_min.y >= 0 && uv_max.x <= 1 && uv_max.y <= 1)
    assert(uv_max.x > uv_min.x && uv_max.y > uv_min.y)
    corners := [4][2]f32`)
      .replace('{position + corner*size, corner, tint}','{position + corner*size, uv_min + corner*(uv_max-uv_min), tint}'),
  };
}
