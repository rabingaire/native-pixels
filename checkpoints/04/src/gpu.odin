package character
import "core:fmt"
import sdl "vendor:sdl3"
import wgpu "vendor:wgpu"

GPU :: struct {
    instance: wgpu.Instance,
    platform: Platform_Surface,
}

gpu_init :: proc(gpu: ^GPU, window: ^sdl.Window) -> bool {
    gpu.instance = wgpu.CreateInstance(nil)
    if gpu.instance == nil {
        fmt.eprintln("Cannot create a WebGPU instance")
        return false
    }
    gpu.platform = platform_surface_create(gpu.instance, window)
    if gpu.platform.surface == nil {
        fmt.eprintln("Cannot connect WebGPU to the SDL window")
        return false
    }
    return true
}

gpu_destroy :: proc(gpu: ^GPU) {
    platform_surface_destroy(&gpu.platform)
    if gpu.instance != nil { wgpu.InstanceRelease(gpu.instance) }
    gpu^ = {}
}
