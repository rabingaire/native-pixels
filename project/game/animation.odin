package game
import "core:math"

Facing :: enum {
	South,
	West,
	East,
	North,
}
Animation :: struct {
	facing: Facing,
	phase:  f32,
	moving: bool,
}
FRAME_SECONDS :: f32(0.1)
// Visual world units per source texel; independent of the collision footprint.
PLAYER_TEXEL_SCALE :: f32(0.16)
SHEET_SIZE :: [2]f32{1254, 1254}
Sprite_Frame :: struct {
	min, size: [2]f32,
}
// Reviewed rectangles in source texels, including transparent padding.
// The generated sheet is not perfectly registered, so draw each cropped frame
// around its own bottom-center anchor at PLAYER_TEXEL_SCALE world units per texel.
PLAYER_FRAMES := [4][4]Sprite_Frame {
	{
		{{121, 29}, {134, 268}},
		{{401, 29}, {138, 270}},
		{{706, 29}, {137, 268}},
		{{1002, 29}, {138, 269}},
	},
	{
		{{116, 332}, {142, 274}},
		{{401, 331}, {140, 273}},
		{{705, 332}, {142, 274}},
		{{998, 333}, {139, 272}},
	},
	{
		{{112, 641}, {147, 276}},
		{{400, 641}, {145, 272}},
		{{705, 641}, {147, 277}},
		{{1003, 639}, {145, 274}},
	},
	{
		{{112, 945}, {145, 273}},
		{{400, 946}, {142, 274}},
		{{702, 946}, {145, 271}},
		{{998, 944}, {142, 274}},
	},
}

Animate :: proc(animation: ^Animation, requested, displacement: [2]f32, dt: f32) {
	assert(dt >= 0)
	facing := animation.facing
	if requested.x != 0 || requested.y != 0 {
		if math.abs(requested.x) > math.abs(requested.y) {
			facing = .East if requested.x > 0 else .West
		} else { facing = .South if requested.y > 0 else .North }
	}
	if facing != animation.facing { animation.phase = 0 }
	animation.facing = facing
	animation.moving = displacement.x * displacement.x + displacement.y * displacement.y > 0.000001
	if animation.moving {
		animation.phase = math.mod(animation.phase + dt, FRAME_SECONDS * 4)
	} else { animation.phase = 0 }
}

Current_Frame :: proc(animation: Animation) -> Sprite_Frame {
	column := 0
	if animation.moving { column = min(int(animation.phase / FRAME_SECONDS), 3) }
	return PLAYER_FRAMES[int(animation.facing)][column]
}
