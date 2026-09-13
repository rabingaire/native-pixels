package game_test
import app "../../checkpoints/18/src"
import "core:math"
import "core:testing"

@(test)
elapsed_time_not_frame_count :: proc(t: ^testing.T) {
	a := app.Game {
		position = {120, 100},
		size     = {48, 64},
		speed    = 240,
	}
	b := a
	for _ in 0 ..< 60 { app.game_update(&a, {1, 0}, 1.0 / 60.0, {2000, 2000}) }
	for _ in 0 ..< 144 { app.game_update(&b, {1, 0}, 1.0 / 144.0, {2000, 2000}) }
	testing.expect(t, math.abs(a.position.x - 360) < 0.01)
	testing.expect(t, math.abs(a.position.x - b.position.x) < 0.01)
}

@(test)
diagonal_speed_matches_cardinal :: proc(t: ^testing.T) {
	game := app.Game {
		position = {120, 100},
		size     = {48, 64},
		speed    = 240,
	}
	app.game_update(&game, {1, 1}, 1, {2000, 2000})
	delta := game.position - [2]f32{120, 100}
	distance := math.sqrt(delta.x * delta.x + delta.y * delta.y)
	testing.expect(t, math.abs(distance - 240) < 0.01)
}

@(test)
zero_direction_and_small_window :: proc(t: ^testing.T) {
	game := app.Game {
		position = {120, 100},
		size     = {48, 64},
		speed    = 240,
	}
	app.game_update(&game, {}, 1, {960, 640})
	testing.expect(t, game.position.x == 120 && game.position.y == 100)
	app.game_update(&game, {1, 1}, 1, {20, 20})
	testing.expect(t, game.position.x == 0 && game.position.y == 0)
}
