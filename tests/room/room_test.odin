package room_test
import "core:testing"
import "core:math"
import game "../../project/game"
import renderer "../../project/renderer"

@(test)
spawn_is_clear :: proc(t: ^testing.T) {
    for box in game.SOLIDS { testing.expect(t, !game.Overlaps(game.Feet({192, 205}), box)) }
}
@(test)
sweep_blocks_large_steps_in_both_directions :: proc(t: ^testing.T) {
    solids := [1]game.Box{{{100, 0}, {20, 100}}}
    a := [2]f32{40, 50}
    game.Move(&a, {1000, 0}, solids[:])
    testing.expect(t, a.x == 96)
    b := [2]f32{200, 50}
    game.Move(&b, {-1000, 0}, solids[:])
    testing.expect(t, b.x == 124)
}
@(test)
contact_slides_and_can_move_away :: proc(t: ^testing.T) {
    solids := [1]game.Box{{{100, 0}, {20, 100}}}
    p := [2]f32{96, 50}
    game.Move(&p, {20, 20}, solids[:])
    testing.expect(t, p.x == 96 && p.y == 70)
    game.Move(&p, {-10, 0}, solids[:])
    testing.expect(t, p.x == 86)
}
@(test)
room_walls_and_chair :: proc(t: ^testing.T) {
    p := [2]f32{192, 205}
    game.Move(&p, {1000, 0}, game.SOLIDS[:])
    testing.expect(t, p.x == 358)
    game.Move(&p, {0, 1000}, game.SOLIDS[:])
    testing.expect(t, p.y == 239)
    p = {312, 205}
    game.Move(&p, {0, -1000}, game.SOLIDS[:])
    testing.expect(t, p.y == 175)
    p = {192, 205}
    game.Move(&p, {0, -1000}, game.SOLIDS[:])
    testing.expect(t, p.y == 51)
}
@(test)
elapsed_time_and_diagonal_speed :: proc(t: ^testing.T) {
    a := game.State{position = {150, 200}, speed = 20}
    b := a
    for _ in 0..<60 { game.Update(&a, {movement = {1, 0}}, 1.0/60.0) }
    for _ in 0..<144 { game.Update(&b, {movement = {1, 0}}, 1.0/144.0) }
    testing.expect(t, math.abs(a.position.x-b.position.x) < 0.01)
    c := game.State{position = {150, 200}, speed = 20}
    game.Update(&c, {movement = {1, 1}}, 1)
    delta := c.position-[2]f32{150, 200}
    testing.expect(t, math.abs(math.sqrt(delta.x*delta.x+delta.y*delta.y)-20) < 0.001)
}
@(test)
touching_edges_are_not_overlap :: proc(t: ^testing.T) {
    testing.expect(t, !game.Overlaps({{0, 0}, {10, 10}}, {{10, 0}, {10, 10}}))
    testing.expect(t, game.Overlaps({{0, 0}, {10, 10}}, {{9, 0}, {10, 10}}))
}
@(test)
renderer_records_order_and_detects_capacity :: proc(t: ^testing.T) {
    r := renderer.State{texture_count = 2}
    renderer.Begin_Frame(&r, {384, 256})
    renderer.Sprite(&r, 1, {10, 20}, {30, 40})
    renderer.Sprite(&r, 2, {20, 30}, {32, 32})
    testing.expect(t, r.count == 2 && r.texture_ids[0] == 1 && r.texture_ids[1] == 2)
    testing.expect(t, r.vertices[2].position == [2]f32{40, 60})
    for _ in 2..<renderer.MAX_SPRITES { renderer.Sprite(&r, 1, {}, {1, 1}) }
    renderer.Sprite(&r, 1, {}, {1, 1})
    testing.expect(t, r.overflow && r.count == renderer.MAX_SPRITES)
}
@(test)
invalid_texture_id_is_detected :: proc(t: ^testing.T) {
    r: renderer.State
    renderer.Begin_Frame(&r, {384, 256})
    renderer.Sprite(&r, 0, {}, {1, 1})
    testing.expect(t, r.overflow && r.count == 0)
}

@(test)
animation_uses_seconds_and_retains_facing_when_idle :: proc(t: ^testing.T) {
    a,b: game.Animation
    for _ in 0..<60 { game.Animate(&a, {1,0}, {1,0}, 1.0/60.0) }
    for _ in 0..<144 { game.Animate(&b, {1,0}, {1,0}, 1.0/144.0) }
    testing.expect(t, math.abs(a.phase-b.phase) < 0.0001)
    testing.expect(t, a.facing == .East && a.moving)
    game.Animate(&a, {}, {}, 0.016)
    testing.expect(t, a.facing == .East && !a.moving && a.phase == 0)
    testing.expect(t, game.Current_Frame(a) == game.PLAYER_FRAMES[2][0])
}

@(test)
blocked_movement_idles_and_direction_rows_match :: proc(t: ^testing.T) {
    g := game.State{position = {192,51}, speed = 72}
    game.Update(&g, {movement = {0,-1}}, 0.11)
    testing.expect(t, g.animation.facing == .North && !g.animation.moving)
    a: game.Animation
    game.Animate(&a, {-1,0}, {-1,0}, 0.11)
    testing.expect(t, game.Current_Frame(a) == game.PLAYER_FRAMES[1][1])
    game.Animate(&a, {0,1}, {0,1}, 0.11)
    testing.expect(t, game.Current_Frame(a) == game.PLAYER_FRAMES[0][1])
}

@(test)
atlas_rectangles_and_uv_recording :: proc(t: ^testing.T) {
    for row in game.PLAYER_FRAMES {
        for frame in row {
            testing.expect(t, frame.min.x >= 0 && frame.min.y >= 0 && frame.size.x > 0 && frame.size.y > 0)
            testing.expect(t, frame.min.x+frame.size.x <= game.SHEET_SIZE.x && frame.min.y+frame.size.y <= game.SHEET_SIZE.y)
        }
    }
    r := renderer.State{texture_count = 1}
    renderer.Begin_Frame(&r, {384,256})
    renderer.Sprite(&r,1,{}, {10,20}, uv_min = {0.25,0.5}, uv_max = {0.5,0.75})
    testing.expect(t, r.vertices[0].uv == [2]f32{0.25,0.5})
    testing.expect(t, r.vertices[2].uv == [2]f32{0.5,0.75})
}
