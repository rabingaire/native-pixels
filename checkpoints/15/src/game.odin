package character
import "core:math"
import sdl "vendor:sdl3"

Game :: struct {
    position: [2]f32,
    size: [2]f32,
    tint: [4]f32,
    speed: f32,
}

read_movement :: proc(window: ^sdl.Window) -> [2]f32 {
    if !(.INPUT_FOCUS in sdl.GetWindowFlags(window)) { return {} }
    keys := sdl.GetKeyboardState(nil)
    direction: [2]f32
    if keys[sdl.Scancode.D] || keys[sdl.Scancode.RIGHT] { direction.x += 1 }
    if keys[sdl.Scancode.A] || keys[sdl.Scancode.LEFT]  { direction.x -= 1 }
    if keys[sdl.Scancode.S] || keys[sdl.Scancode.DOWN]  { direction.y += 1 }
    if keys[sdl.Scancode.W] || keys[sdl.Scancode.UP]    { direction.y -= 1 }
    return direction
}

game_update :: proc(game: ^Game, direction: [2]f32, dt: f32, view_size: [2]f32) {
    direction := direction
    length_squared := direction.x * direction.x + direction.y * direction.y
    if length_squared > 0 { direction /= math.sqrt(length_squared) }
    game.position += direction * game.speed * dt
    // If the window is smaller than the character, anchor that axis at zero.
    game.position.x = clamp(game.position.x, 0, max(f32(0), view_size.x - game.size.x))
    game.position.y = clamp(game.position.y, 0, max(f32(0), view_size.y - game.size.y))
}
