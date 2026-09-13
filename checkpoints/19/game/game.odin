package game
import renderer "../renderer"
import "core:math"

WORLD_SIZE :: [2]f32{384, 256}
State :: struct {
	position:     [2]f32,
	speed:        f32,
	room, player: renderer.Texture_ID,
}
Input :: struct {
	movement: [2]f32,
}

Init :: proc(g: ^State, r: ^renderer.State) -> bool {
	g.position = {192, 205}
	g.speed = 72
	g.room = renderer.Load_PNG(r, #load("../assets/room.png", []u8))
	if g.room == 0 { return false }
	g.player = renderer.Load_PNG(r, #load("../assets/player.png", []u8))
	return g.player != 0
}

Update :: proc(g: ^State, input: Input, dt: f32) {
	assert(dt >= 0)
	direction := input.movement
	length_squared := direction.x * direction.x + direction.y * direction.y
	if length_squared > 1 { direction /= math.sqrt(length_squared) }
	delta := direction * g.speed * dt
	g.position += delta
	g.position.x = clamp(g.position.x, f32(28), f32(358))
	g.position.y = clamp(g.position.y, f32(51), f32(239))
}
