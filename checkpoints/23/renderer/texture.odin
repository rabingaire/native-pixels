package renderer
import "core:c"
import "core:fmt"
import stbi "vendor:stb/image"
import wgpu "vendor:wgpu"

// Trusted, embedded PNG assets only. The decoder does not create GPU resources.
Load_PNG :: proc(r: ^State, encoded: []u8) -> Texture_ID {
    assert(!r.recording, "Load textures during initialization")
    if len(encoded) == 0 || len(encoded) > 0x7fffffff { return 0 }
    width, height, channels: c.int
    if stbi.info_from_memory(raw_data(encoded), c.int(len(encoded)), &width, &height, &channels) == 0 {
        fmt.eprintln("Invalid image header"); return 0
    }
    if width <= 0 || height <= 0 || u32(width) > r.gpu.max_texture_dimension ||
       u32(height) > r.gpu.max_texture_dimension { fmt.eprintln("Image dimensions exceed device limits"); return 0 }
    pixels := stbi.load_from_memory(raw_data(encoded), c.int(len(encoded)), &width, &height, &channels, 4)
    if pixels == nil { fmt.eprintln("PNG decoding failed"); return 0 }
    defer stbi.image_free(pixels)
    return upload_rgba(r, pixels[:int(width)*int(height)*4], u32(width), u32(height))
}

@(private)
upload_rgba :: proc(r: ^State, pixels: []u8, width, height: u32) -> Texture_ID {
    if r.texture_count == MAX_TEXTURES { fmt.eprintln("Texture capacity exceeded"); return 0 }
    slot := &r.textures[r.texture_count]
    slot.texture = wgpu.DeviceCreateTexture(r.gpu.device, &wgpu.TextureDescriptor{
        label = "sprite RGBA", size = {width, height, 1}, dimension = ._2D,
        format = .RGBA8UnormSrgb, mipLevelCount = 1, sampleCount = 1,
        usage = {.TextureBinding, .CopyDst},
    })
    if slot.texture == nil { return 0 }
    destination := wgpu.TexelCopyTextureInfo{texture = slot.texture, aspect = .All}
    layout := wgpu.TexelCopyBufferLayout{bytesPerRow = width*4, rowsPerImage = height}
    extent := wgpu.Extent3D{width, height, 1}
    wgpu.QueueWriteTexture(r.gpu.queue, &destination, raw_data(pixels), uint(len(pixels)), &layout, &extent)
    slot.view = wgpu.TextureCreateView(slot.texture, nil)
    if slot.view == nil { return 0 }
    entries := [2]wgpu.BindGroupEntry{
        {binding = 0, textureView = slot.view},
        {binding = 1, sampler = r.sampler},
    }
    slot.group = wgpu.DeviceCreateBindGroup(r.gpu.device, &wgpu.BindGroupDescriptor{
        layout = r.texture_layout, entryCount = len(entries), entries = raw_data(entries[:]),
    })
    if slot.group == nil || gpu_failed() { return 0 }
    r.texture_count += 1
    return Texture_ID(r.texture_count)
}
