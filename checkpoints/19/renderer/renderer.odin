package renderer
import "core:fmt"
import "core:math"
import sdl "vendor:sdl3"
import wgpu "vendor:wgpu"

// API: Init, Shutdown, Load_PNG, Begin_Frame, Sprite, Rect, End_Frame, Resize.
// All calls occur on SDL's main thread. State must not be copied after Init.
Texture_ID :: distinct u32
Frame_Result :: enum { Presented, Skipped, Fatal }
MAX_SPRITES :: 256
MAX_TEXTURES :: 8
Vertex :: struct { position, uv: [2]f32, tint: [4]f32 }
View_Uniform :: struct #align(16) { size, padding: [2]f32 }
#assert(size_of(Vertex) == 32)
#assert(offset_of(Vertex, uv) == 8)
#assert(offset_of(Vertex, tint) == 16)
#assert(size_of(View_Uniform) == 16)
Texture_Slot :: struct { texture: wgpu.Texture, view: wgpu.TextureView, group: wgpu.BindGroup }
State :: struct {
    gpu: GPU,
    window: ^sdl.Window,
    pipeline: wgpu.RenderPipeline,
    vertex_buffer, index_buffer, view_buffer: wgpu.Buffer,
    view_group: wgpu.BindGroup,
    texture_layout: wgpu.BindGroupLayout,
    sampler: wgpu.Sampler,
    textures: [MAX_TEXTURES]Texture_Slot,
    texture_count: int,
    white: Texture_ID,
    vertices: [MAX_SPRITES * 4]Vertex,
    texture_ids: [MAX_SPRITES]Texture_ID,
    count: int,
    view_size: [2]f32,
    recording, overflow: bool,
}

Init :: proc(r: ^State, window: ^sdl.Window) -> bool {
    r.window = window
    if !gpu_init(&r.gpu, window) { return false }
    r.vertex_buffer = wgpu.DeviceCreateBuffer(r.gpu.device, &wgpu.BufferDescriptor{
        label = "sprite vertices", size = size_of(r.vertices), usage = {.Vertex, .CopyDst},
    })
    indices: [MAX_SPRITES * 6]u16
    quad := [6]u16{0, 1, 2, 0, 2, 3}
    for i in 0..<MAX_SPRITES {
        for value, j in quad { indices[i*6+j] = u16(i*4) + value }
    }
    r.index_buffer = wgpu.DeviceCreateBuffer(r.gpu.device, &wgpu.BufferDescriptor{
        label = "quad indices", size = size_of(indices), usage = {.Index, .CopyDst},
    })
    r.view_buffer = wgpu.DeviceCreateBuffer(r.gpu.device, &wgpu.BufferDescriptor{
        label = "world extent", size = size_of(View_Uniform), usage = {.Uniform, .CopyDst},
    })
    if r.vertex_buffer == nil || r.index_buffer == nil || r.view_buffer == nil { return false }
    wgpu.QueueWriteBuffer(r.gpu.queue, r.index_buffer, 0, &indices, size_of(indices))
    view_entry := wgpu.BindGroupLayoutEntry{
        binding = 0, visibility = {.Vertex},
        buffer = {type = .Uniform, minBindingSize = size_of(View_Uniform)},
    }
    view_layout := wgpu.DeviceCreateBindGroupLayout(r.gpu.device, &wgpu.BindGroupLayoutDescriptor{
        entryCount = 1, entries = &view_entry,
    })
    if view_layout == nil { return false }
    defer wgpu.BindGroupLayoutRelease(view_layout)
    uniform_entry := wgpu.BindGroupEntry{binding = 0, buffer = r.view_buffer, size = size_of(View_Uniform)}
    r.view_group = wgpu.DeviceCreateBindGroup(r.gpu.device, &wgpu.BindGroupDescriptor{
        layout = view_layout, entryCount = 1, entries = &uniform_entry,
    })
    texture_entries := [2]wgpu.BindGroupLayoutEntry{
        {binding = 0, visibility = {.Fragment}, texture = {sampleType = .Float, viewDimension = ._2D}},
        {binding = 1, visibility = {.Fragment}, sampler = {type = .Filtering}},
    }
    r.texture_layout = wgpu.DeviceCreateBindGroupLayout(r.gpu.device, &wgpu.BindGroupLayoutDescriptor{
        entryCount = len(texture_entries), entries = raw_data(texture_entries[:]),
    })
    r.sampler = wgpu.DeviceCreateSampler(r.gpu.device, &wgpu.SamplerDescriptor{
        label = "nearest, no repeat", addressModeU = .ClampToEdge,
        addressModeV = .ClampToEdge, addressModeW = .ClampToEdge,
        minFilter = .Nearest, magFilter = .Nearest, mipmapFilter = .Nearest,
        lodMinClamp = 0, lodMaxClamp = 0, maxAnisotropy = 1,
    })
    if r.view_group == nil || r.texture_layout == nil || r.sampler == nil { return false }
    layouts := [2]wgpu.BindGroupLayout{view_layout, r.texture_layout}
    layout := wgpu.DeviceCreatePipelineLayout(r.gpu.device, &wgpu.PipelineLayoutDescriptor{
        bindGroupLayoutCount = len(layouts), bindGroupLayouts = raw_data(layouts[:]),
    })
    if layout == nil { return false }
    defer wgpu.PipelineLayoutRelease(layout)
    source := wgpu.ShaderSourceWGSL{chain = {sType = .ShaderSourceWGSL}, code = #load("sprites.wgsl", string)}
    shader := wgpu.DeviceCreateShaderModule(r.gpu.device, &wgpu.ShaderModuleDescriptor{nextInChain = &source.chain})
    if shader == nil { return false }
    defer wgpu.ShaderModuleRelease(shader)
    blend := wgpu.BlendState{
        color = {operation = .Add, srcFactor = .SrcAlpha, dstFactor = .OneMinusSrcAlpha},
        alpha = {operation = .Add, srcFactor = .One, dstFactor = .OneMinusSrcAlpha},
    }
    target := wgpu.ColorTargetState{format = r.gpu.config.format, blend = &blend, writeMask = {.Red, .Green, .Blue, .Alpha}}
    fragment := wgpu.FragmentState{module = shader, entryPoint = "fs_main", targetCount = 1, targets = &target}
    attributes := [3]wgpu.VertexAttribute{
        {format = .Float32x2, offset = 0, shaderLocation = 0},
        {format = .Float32x2, offset = 8, shaderLocation = 1},
        {format = .Float32x4, offset = 16, shaderLocation = 2},
    }
    vertex_layout := wgpu.VertexBufferLayout{arrayStride = size_of(Vertex), stepMode = .Vertex,
        attributeCount = len(attributes), attributes = raw_data(attributes[:])}
    r.pipeline = wgpu.DeviceCreateRenderPipeline(r.gpu.device, &wgpu.RenderPipelineDescriptor{
        label = "sprite pipeline", layout = layout,
        vertex = {module = shader, entryPoint = "vs_main", bufferCount = 1, buffers = &vertex_layout},
        fragment = &fragment, primitive = {topology = .TriangleList, frontFace = .CCW, cullMode = .None},
        multisample = {count = 1, mask = 0xffffffff},
    })
    if r.pipeline == nil || gpu_failed() { return false }
    white := [4]u8{255, 255, 255, 255}
    r.white = upload_rgba(r, white[:], 1, 1)
    return r.white != 0 && !gpu_failed()
}

Resize :: proc(r: ^State) { r.gpu.dirty = true }

Begin_Frame :: proc(r: ^State, world_size: [2]f32) {
    assert(!r.recording && world_size.x > 0 && world_size.y > 0)
    r.recording = true
    r.count = 0
    r.overflow = false
    r.view_size = world_size
}

Sprite :: proc(r: ^State, texture: Texture_ID, position, size: [2]f32,
               tint: [4]f32 = {1, 1, 1, 1}) {
    assert(r.recording, "Sprite must be between Begin_Frame and End_Frame")
    if r.count == MAX_SPRITES || texture == 0 || int(texture) > r.texture_count {
        r.overflow = true
        return
    }
    assert(size.x > 0 && size.y > 0)
    corners := [4][2]f32{{0, 0}, {1, 0}, {1, 1}, {0, 1}}
    for corner, i in corners {
        r.vertices[r.count*4+i] = {position + corner*size, corner, tint}
    }
    r.texture_ids[r.count] = texture
    r.count += 1
}

Rect :: proc(r: ^State, position, size: [2]f32, color: [4]f32) {
    Sprite(r, r.white, position, size, color)
}

End_Frame :: proc(r: ^State) -> Frame_Result {
    assert(r.recording)
    r.recording = false
    if r.overflow { fmt.eprintln("Sprite capacity exceeded or invalid texture ID"); return .Fatal }
    gpu := &r.gpu
    wgpu.InstanceProcessEvents(gpu.instance)
    if gpu_failed() { return .Fatal }
    if !gpu_refresh_surface(gpu, r.window) {
        if gpu_failed() { return .Fatal }
        return .Skipped
    }
    frame := wgpu.SurfaceGetCurrentTexture(gpu.platform.surface)
    defer if frame.texture != nil { wgpu.TextureRelease(frame.texture) }
    #partial switch frame.status {
    case .SuccessOptimal:
    case .SuccessSuboptimal: gpu.dirty = true
    case .Timeout, .Occluded: return .Skipped
    case .Outdated: gpu.dirty = true; return .Skipped
    case: fmt.eprintln("Surface acquisition:", frame.status); return .Fatal
    }
    if frame.texture == nil { return .Fatal }
    view := wgpu.TextureCreateView(frame.texture, nil)
    if view == nil { return .Fatal }
    defer wgpu.TextureViewRelease(view)
    uniforms := View_Uniform{size = r.view_size}
    wgpu.QueueWriteBuffer(gpu.queue, r.view_buffer, 0, &uniforms, size_of(uniforms))
    if r.count > 0 {
        wgpu.QueueWriteBuffer(gpu.queue, r.vertex_buffer, 0, &r.vertices[0], uint(r.count*4*size_of(Vertex)))
    }
    encoder := wgpu.DeviceCreateCommandEncoder(gpu.device, &wgpu.CommandEncoderDescriptor{label = "room frame"})
    if encoder == nil { return .Fatal }
    defer wgpu.CommandEncoderRelease(encoder)
    attachment := wgpu.RenderPassColorAttachment{view = view, depthSlice = wgpu.DEPTH_SLICE_UNDEFINED,
        loadOp = .Clear, storeOp = .Store, clearValue = {0.012, 0.018, 0.025, 1}}
    pass := wgpu.CommandEncoderBeginRenderPass(encoder, &wgpu.RenderPassDescriptor{
        colorAttachmentCount = 1, colorAttachments = &attachment,
    })
    if pass == nil { return .Fatal }
    defer wgpu.RenderPassEncoderRelease(pass)
    width, height := f32(gpu.config.width), f32(gpu.config.height)
    scale := min(width/r.view_size.x, height/r.view_size.y)
    if scale >= 1 { scale = math.floor(scale) }
    viewport := r.view_size * scale
    // Guard floating-point roundoff at very small fractional fit scales.
    viewport.x = min(viewport.x, width)
    viewport.y = min(viewport.y, height)
    origin := [2]f32{math.floor((width-viewport.x)/2), math.floor((height-viewport.y)/2)}
    wgpu.RenderPassEncoderSetViewport(pass, origin.x, origin.y, viewport.x, viewport.y, 0, 1)
    wgpu.RenderPassEncoderSetScissorRect(pass, u32(origin.x), u32(origin.y), u32(math.ceil(viewport.x)), u32(math.ceil(viewport.y)))
    wgpu.RenderPassEncoderSetPipeline(pass, r.pipeline)
    wgpu.RenderPassEncoderSetBindGroup(pass, 0, r.view_group)
    wgpu.RenderPassEncoderSetVertexBuffer(pass, 0, r.vertex_buffer, 0, size_of(r.vertices))
    wgpu.RenderPassEncoderSetIndexBuffer(pass, r.index_buffer, .Uint16, 0, MAX_SPRITES*6*size_of(u16))
    // Adjacent equal textures form a run. Never sort transparent sprites by texture.
    first := 0
    for first < r.count {
        end := first + 1
        for end < r.count && r.texture_ids[end] == r.texture_ids[first] { end += 1 }
        slot := &r.textures[int(r.texture_ids[first])-1]
        wgpu.RenderPassEncoderSetBindGroup(pass, 1, slot.group)
        wgpu.RenderPassEncoderDrawIndexed(pass, u32((end-first)*6), 1, u32(first*6), 0, 0)
        first = end
    }
    wgpu.RenderPassEncoderEnd(pass)
    commands := wgpu.CommandEncoderFinish(encoder, &wgpu.CommandBufferDescriptor{})
    if commands == nil { return .Fatal }
    defer wgpu.CommandBufferRelease(commands)
    if gpu_failed() { return .Fatal }
    wgpu.QueueSubmit(gpu.queue, []wgpu.CommandBuffer{commands})
    if wgpu.SurfacePresent(gpu.platform.surface) != .Success || gpu_failed() { return .Fatal }
    return .Presented
}

Shutdown :: proc(r: ^State) {
    if r.gpu.device != nil { _ = wgpu.DevicePoll(r.gpu.device, true, nil) }
    for &slot in r.textures {
        if slot.group != nil { wgpu.BindGroupRelease(slot.group) }
        if slot.view != nil { wgpu.TextureViewRelease(slot.view) }
        if slot.texture != nil { wgpu.TextureRelease(slot.texture) }
    }
    if r.sampler != nil { wgpu.SamplerRelease(r.sampler) }
    if r.texture_layout != nil { wgpu.BindGroupLayoutRelease(r.texture_layout) }
    if r.view_group != nil { wgpu.BindGroupRelease(r.view_group) }
    if r.view_buffer != nil { wgpu.BufferRelease(r.view_buffer) }
    if r.index_buffer != nil { wgpu.BufferRelease(r.index_buffer) }
    if r.vertex_buffer != nil { wgpu.BufferRelease(r.vertex_buffer) }
    if r.pipeline != nil { wgpu.RenderPipelineRelease(r.pipeline) }
    gpu_destroy(&r.gpu)
    r^ = {}
}
