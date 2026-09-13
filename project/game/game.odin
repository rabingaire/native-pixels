package game
import "core:math"
import renderer "../renderer"

WORLD_SIZE :: [2]f32{384, 256}
State :: struct {
    position: [2]f32,
    speed: f32,
    room, player: renderer.Texture_ID,
    show_collision: bool,
    animation: Animation,
}
Input :: struct { movement: [2]f32, toggle_collision: bool }

Init :: proc(g: ^State, r: ^renderer.State) -> bool {
    g.position = {192, 205}
    g.speed = 72
    g.room = renderer.Load_PNG(r, #load("../assets/room.png", []u8))
    if g.room == 0 { return false }
    g.player = renderer.Load_PNG(r, #load("../assets/player-walk.png", []u8))
    return g.player != 0
}

Update :: proc(g: ^State, input: Input, dt: f32) {
    assert(dt >= 0)
    if input.toggle_collision { g.show_collision = !g.show_collision }
    direction := input.movement
    length_squared := direction.x*direction.x + direction.y*direction.y
    if length_squared > 1 { direction /= math.sqrt(length_squared) }
    delta := direction * g.speed * dt
    previous := g.position
    Move(&g.position, delta, SOLIDS[:])
    Animate(&g.animation, direction, g.position-previous, dt)
}

Draw :: proc(g: ^State, r: ^renderer.State) {
    renderer.Sprite(r, g.room, {0, 0}, WORLD_SIZE)
    // Only the displayed position is snapped. Simulation retains subpixel motion.
    feet := [2]f32{math.round(g.position.x), math.round(g.position.y)}
    frame := Current_Frame(g.animation)
    size := frame.size * PLAYER_TEXEL_SCALE
    anchor := [2]f32{size.x/2, size.y-1}
    renderer.Sprite(r, g.player, feet-anchor, size,
                    uv_min = frame.min/SHEET_SIZE, uv_max = (frame.min+frame.size)/SHEET_SIZE)
    if g.show_collision {
        for solid in SOLIDS { outline(r, solid, {1, 0.15, 0.05, 0.85}) }
        outline(r, Feet(g.position), {0.1, 1, 0.2, 1})
    }
}

@(private)
outline :: proc(r: ^renderer.State, box: Box, color: [4]f32) {
    renderer.Rect(r, box.min, {box.size.x, 1}, color)
    renderer.Rect(r, box.min + [2]f32{0, box.size.y-1}, {box.size.x, 1}, color)
    renderer.Rect(r, box.min, {1, box.size.y}, color)
    renderer.Rect(r, box.min + [2]f32{box.size.x-1, 0}, {1, box.size.y}, color)
}
