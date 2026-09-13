package character
import "core:fmt"
import sdl "vendor:sdl3"
import wgpu "vendor:wgpu"

main :: proc() {
    fmt.println("Native Pixels: dependency probe")
    fmt.println("SDL runtime:", sdl.GetVersion())
    fmt.printf("wgpu-native packed version: 0x%08x\n", wgpu.GetVersion())
    fmt.println("Expected WebGPU binding:", wgpu.BINDINGS_VERSION_STRING)
}
