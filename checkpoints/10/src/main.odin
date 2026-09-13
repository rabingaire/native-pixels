package character
import "core:fmt"
import sdl "vendor:sdl3"
import wgpu "vendor:wgpu"

main :: proc() {
    if !sdl.Init({.VIDEO}) {
        fmt.eprintln("SDL initialization:", sdl.GetError())
        return
    }
    defer sdl.Quit()
    flags: sdl.WindowFlags = {}
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

    running := true
    for running {
        event: sdl.Event
        for sdl.PollEvent(&event) {
            #partial switch event.type {
            case .QUIT, .WINDOW_CLOSE_REQUESTED: running = false
            }
        }
        if !running { break }
        wgpu.InstanceProcessEvents(gpu.instance)
        if gpu_failed() { break }
        if !renderer_frame(&gpu, window, &renderer) { break }
    }
}
