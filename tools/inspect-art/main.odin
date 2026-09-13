package inspect_art
import "core:c"
import "core:fmt"
import stbi "vendor:stb/image"
main :: proc() {
	data := #load("../../project/assets/player-walk.png", []u8)
	w, h, channels: c.int
	pixels := stbi.load_from_memory(raw_data(data), c.int(len(data)), &w, &h, &channels, 4)
	assert(pixels != nil)
	defer stbi.image_free(pixels)
	fmt.println("Sheet dimensions/source channels:", w, h, channels)
	assert(channels == 4 && pixels[3] == 0, "Sheet must have real alpha")
	for row in 0 ..< 4 {
		for col in 0 ..< 4 {
			low := [2]int{int(w), int(h)}
			high := [2]int{-1, -1}
			for y in row * int(h) / 4 ..< (row + 1) * int(h) / 4 {
				for x in col * int(w) / 4 ..< (col + 1) * int(w) / 4 {
					if pixels[(y * int(w) + x) * 4 + 3] > 128 {
						low.x = min(low.x, x); low.y = min(low.y, y)
						high.x = max(high.x, x); high.y = max(high.y, y)
					}
				}
			}
			// Include two transparent texels around the opaque silhouette.
			fmt.println("frame", row, col, low - [2]int{2, 2}, high - low + [2]int{5, 5})
		}
	}
}
