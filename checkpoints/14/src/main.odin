package character
import "core:fmt"
import "core:c"
import sdl "vendor:sdl3"
import wgpu "vendor:wgpu"

main :: proc() {
    if !sdl.Init({.VIDEO}) {
        fmt.eprintln("SDL initialization:", sdl.GetError())
        return
    }
    defer sdl.Quit()
    flags: sdl.WindowFlags = {.RESIZABLE, .HIGH_PIXEL_DENSITY}
    when ODIN_OS == .Darwin { flags += {.METAL} }
    window := sdl.CreateWindow("Native Pixels", 960, 640, flags)
    if window == nil {
        fmt.eprintln("Window creation:", sdl.GetError())
        return
    }
    defer sdl.DestroyWindow(window)
    if !sdl.ShowWindow(window) {
        fmt.eprintln("Show window:", sdl.GetError())
        return
    }
    if !sdl.RaiseWindow(window) { fmt.eprintln("Window focus request:", sdl.GetError()) }

    gpu: GPU
    defer gpu_destroy(&gpu)
    if !gpu_init(&gpu, window) { return }

    renderer: Renderer
    defer renderer_destroy(&renderer)
    if !renderer_init(&renderer, &gpu) { return }

    game := Game{position = {120, 100}, size = {48, 64}, tint = {1, 1, 1, 1}}
    running := true
    for running {
        event: sdl.Event
        for sdl.PollEvent(&event) {
            #partial switch event.type {
            case .QUIT, .WINDOW_CLOSE_REQUESTED: running = false
            case .WINDOW_PIXEL_SIZE_CHANGED, .WINDOW_RESTORED: gpu.dirty = true
            }
        }
        if !running { break }
        wgpu.InstanceProcessEvents(gpu.instance)
        if gpu_failed() { break }
        width, height: c.int
        if !sdl.GetWindowSize(window, &width, &height) { break }
        if width <= 0 || height <= 0 || .MINIMIZED in sdl.GetWindowFlags(window) {
            sdl.Delay(10)
            continue
        }
        view_size := [2]f32{f32(width), f32(height)}
        direction := read_movement(window)
        game_update(&game, direction)
        if !renderer_frame(&gpu, window, &renderer, game.position, game.size, game.tint, view_size) { break }
    }
}
