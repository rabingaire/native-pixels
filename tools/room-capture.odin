package renderer
import "core:c"
import "core:fmt"
import "base:runtime"
import stbi "vendor:stb/image"
import wgpu "vendor:wgpu"

Capture :: struct { buffer: wgpu.Buffer, done, ok: bool, stride, width, height: u32 }
capture_count: int

capture_encode :: proc(r: ^State, encoder: wgpu.CommandEncoder, texture: wgpu.Texture) -> Capture {
    capture_count += 1
    if capture_count != 60 && capture_count != 140 { return {} }
    c := Capture{width = r.gpu.config.width, height = r.gpu.config.height}
    c.stride = (c.width*4+255)/256*256
    c.buffer = wgpu.DeviceCreateBuffer(r.gpu.device, &wgpu.BufferDescriptor{
        size = u64(c.stride)*u64(c.height), usage = {.CopyDst, .MapRead},
    })
    assert(c.buffer != nil)
    src := wgpu.TexelCopyTextureInfo{texture = texture, aspect = .All}
    dst := wgpu.TexelCopyBufferInfo{buffer = c.buffer, layout = {bytesPerRow = c.stride, rowsPerImage = c.height}}
    extent := wgpu.Extent3D{c.width,c.height,1}
    wgpu.CommandEncoderCopyTextureToBuffer(encoder, &src, &dst, &extent)
    return c
}

capture_ready :: proc "c" (status: wgpu.MapAsyncStatus, message: wgpu.StringView, userdata1, userdata2: rawptr) {
    context = runtime.default_context()
    c := cast(^Capture)userdata1
    c.done = true
    c.ok = status == .Success
}

capture_save :: proc(r: ^State, capture: ^Capture) {
    if capture.buffer == nil { return }
    defer wgpu.BufferRelease(capture.buffer)
    size := uint(capture.stride)*uint(capture.height)
    _ = wgpu.BufferMapAsync(capture.buffer, {.Read}, 0, size,
        {mode = .AllowProcessEvents, callback = capture_ready, userdata1 = capture})
    _ = wgpu.DevicePoll(r.gpu.device, true, nil)
    wgpu.InstanceProcessEvents(r.gpu.instance)
    assert(capture.done && capture.ok)
    data := cast([^]u8)wgpu.RawBufferGetConstMappedRange(capture.buffer,0,size)
    assert(data != nil)
    defer wgpu.BufferUnmap(capture.buffer)
    rgba := make([]u8, int(capture.width)*int(capture.height)*4)
    defer delete(rgba)
    for y in 0..<int(capture.height) {
        for x in 0..<int(capture.width) {
            src := y*int(capture.stride)+x*4
            dst := (y*int(capture.width)+x)*4
            if r.gpu.config.format == .BGRA8UnormSrgb {
                rgba[dst+0]=data[src+2];rgba[dst+1]=data[src+1];rgba[dst+2]=data[src+0]
            } else {
                rgba[dst+0]=data[src+0];rgba[dst+1]=data[src+1];rgba[dst+2]=data[src+2]
            }
            rgba[dst+3]=data[src+3]
        }
    }
    filename: cstring = "build/screenshots/room-native.png"
    if capture_count == 140 { filename = "build/screenshots/room-collision-native.png" }
    assert(stbi.write_png(filename, c.int(capture.width), c.int(capture.height), 4, raw_data(rgba), c.int(capture.width*4)) != 0)
    fmt.println("Captured actual WebGPU framebuffer:",filename)
}
