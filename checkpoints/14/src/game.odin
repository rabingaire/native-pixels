package character
import sdl "vendor:sdl3"

Game :: struct {
    position: [2]f32,
    size: [2]f32,
    tint: [4]f32,
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

game_update :: proc(game: ^Game, direction: [2]f32) {
    // Temporary input proof: color changes while any movement key is held.
    game.tint = {1, 1, 1, 1}
    if direction.x != 0 || direction.y != 0 { game.tint = {1, 0.35, 0.35, 1} }
}
