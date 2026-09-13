package room
import game "../game"
import renderer "../renderer"
import "core:fmt"
import sdl "vendor:sdl3"

main :: proc() {
	if !sdl.Init({.VIDEO}) { fmt.eprintln("SDL initialization:", sdl.GetError()); return }
	defer sdl.Quit()
	flags: sdl.WindowFlags = {.RESIZABLE, .HIGH_PIXEL_DENSITY}
	when ODIN_OS == .Darwin { flags += {.METAL} }
	window := sdl.CreateWindow(
		"Native Pixels — WASD / arrows · F1 collisions",
		1152,
		768,
		flags,
	)
	if window == nil { fmt.eprintln("Window creation:", sdl.GetError()); return }
	defer sdl.DestroyWindow(window)
	if !sdl.ShowWindow(window) { fmt.eprintln("Show window:", sdl.GetError()); return }
	if !sdl.RaiseWindow(window) { fmt.eprintln("Window focus request:", sdl.GetError()) }
	rendering: renderer.State
	defer renderer.Shutdown(&rendering)
	if !renderer.Init(
		&rendering,
		window,
	) { fmt.eprintln("Renderer initialization failed"); return }
	world: game.State
	if !game.Init(&world, &rendering) { fmt.eprintln("Game assets failed to load"); return }
	previous_ticks := sdl.GetTicksNS()
	running := true
	for running {
		input: game.Input
		event: sdl.Event
		for sdl.PollEvent(&event) {
			#partial switch event.type {
			case .QUIT, .WINDOW_CLOSE_REQUESTED:
				running = false
			case .WINDOW_PIXEL_SIZE_CHANGED, .WINDOW_RESTORED:
				renderer.Resize(&rendering)
			case .KEY_DOWN:
				if event.key.scancode == .F1 && !event.key.repeat { input.toggle_collision = true }
			}
		}
		if !running { break }
		now := sdl.GetTicksNS()
		dt := min(f64(now - previous_ticks) / 1_000_000_000.0, 0.05)
		previous_ticks = now
		if .MINIMIZED in sdl.GetWindowFlags(window) { sdl.Delay(10); continue }
		if .INPUT_FOCUS in sdl.GetWindowFlags(window) {
			keys := sdl.GetKeyboardState(nil)
			if keys[sdl.Scancode.D] || keys[sdl.Scancode.RIGHT] { input.movement.x += 1 }
			if keys[sdl.Scancode.A] || keys[sdl.Scancode.LEFT] { input.movement.x -= 1 }
			if keys[sdl.Scancode.S] || keys[sdl.Scancode.DOWN] { input.movement.y += 1 }
			if keys[sdl.Scancode.W] || keys[sdl.Scancode.UP] { input.movement.y -= 1 }
		}
		game.Update(&world, input, f32(dt))
		renderer.Begin_Frame(&rendering, game.WORLD_SIZE)
		game.Draw(&world, &rendering)
		result := renderer.End_Frame(&rendering)
		if result == .Fatal { fmt.eprintln("Rendering stopped after a GPU or API error"); break }
		if result == .Skipped { sdl.Delay(10) }
	}
}
