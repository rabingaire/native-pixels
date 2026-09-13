// Runnable snapshots are assembled in teaching order. These are real Odin files,
// not pseudocode; every replacement asserts that its predecessor still exists.
import { extendRoom } from './room-source.mjs';
const snapshots = [];
let files = {};
const add = (p, s) => { files[p] = s.trim() + '\n'; };
const change = (p, before, after) => {
  if (!files[p]?.includes(before)) throw Error(`Missing source anchor: ${p}: ${before}`);
  files[p] = files[p].replace(before, after);
};
const save = n => { snapshots[n] = structuredClone(files); };

add('src/main.odin', `
package character
import "core:fmt"
import sdl "vendor:sdl3"
import wgpu "vendor:wgpu"

main :: proc() {
    fmt.println("Native Pixels: dependency probe")
    fmt.println("SDL runtime:", sdl.GetVersion())
    fmt.printf("wgpu-native packed version: 0x%08x\\n", wgpu.GetVersion())
    fmt.println("Expected WebGPU binding:", wgpu.BINDINGS_VERSION_STRING)
}
`);
save(1);

add('src/main.odin', `
package character
import "core:fmt"
import sdl "vendor:sdl3"

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

    running := true
    for running {
        event: sdl.Event
        for sdl.PollEvent(&event) {
            #partial switch event.type {
            case .QUIT, .WINDOW_CLOSE_REQUESTED: running = false
            }
        }
        if !running { break }
        sdl.Delay(10)
    }
}
`);
save(2); save(3);

add('src/platform.odin', `
package character
import "core:fmt"
import sdl "vendor:sdl3"
import wgpu "vendor:wgpu"

// SDL owns the window. We own this extra Metal view, when one exists.
Platform_Surface :: struct {
    surface: wgpu.Surface,
    metal_view: sdl.MetalView, // nil on Windows and Linux
}

platform_surface_create :: proc(instance: wgpu.Instance, window: ^sdl.Window) -> Platform_Surface {
    result: Platform_Surface
    when ODIN_OS == .Darwin {
        result.metal_view = sdl.Metal_CreateView(window)
        if result.metal_view == nil {
            fmt.eprintln("Metal view:", sdl.GetError())
            return result
        }
        layer := sdl.Metal_GetLayer(result.metal_view)
        if layer == nil { return result }
        source := wgpu.SurfaceSourceMetalLayer{
            chain = {sType = .SurfaceSourceMetalLayer}, layer = layer,
        }
        descriptor := wgpu.SurfaceDescriptor{nextInChain = &source.chain, label = "SDL Metal surface"}
        result.surface = wgpu.InstanceCreateSurface(instance, &descriptor)
    } else when ODIN_OS == .Windows {
        properties := sdl.GetWindowProperties(window)
        hwnd := sdl.GetPointerProperty(properties, sdl.PROP_WINDOW_WIN32_HWND_POINTER, nil)
        instance_handle := sdl.GetPointerProperty(properties, sdl.PROP_WINDOW_WIN32_INSTANCE_POINTER, nil)
        if hwnd == nil || instance_handle == nil { return result }
        source := wgpu.SurfaceSourceWindowsHWND{
            chain = {sType = .SurfaceSourceWindowsHWND}, hwnd = hwnd, hinstance = instance_handle,
        }
        descriptor := wgpu.SurfaceDescriptor{nextInChain = &source.chain, label = "SDL Win32 surface"}
        result.surface = wgpu.InstanceCreateSurface(instance, &descriptor)
    } else when ODIN_OS == .Linux {
        properties := sdl.GetWindowProperties(window)
        switch sdl.GetCurrentVideoDriver() {
        case "wayland":
            display := sdl.GetPointerProperty(properties, sdl.PROP_WINDOW_WAYLAND_DISPLAY_POINTER, nil)
            surface := sdl.GetPointerProperty(properties, sdl.PROP_WINDOW_WAYLAND_SURFACE_POINTER, nil)
            if display == nil || surface == nil { return result }
            source := wgpu.SurfaceSourceWaylandSurface{
                chain = {sType = .SurfaceSourceWaylandSurface}, display = display, surface = surface,
            }
            descriptor := wgpu.SurfaceDescriptor{nextInChain = &source.chain, label = "SDL Wayland surface"}
            result.surface = wgpu.InstanceCreateSurface(instance, &descriptor)
        case "x11":
            display := sdl.GetPointerProperty(properties, sdl.PROP_WINDOW_X11_DISPLAY_POINTER, nil)
            window_id := sdl.GetNumberProperty(properties, sdl.PROP_WINDOW_X11_WINDOW_NUMBER, 0)
            if display == nil || window_id == 0 { return result }
            source := wgpu.SurfaceSourceXlibWindow{
                chain = {sType = .SurfaceSourceXlibWindow}, display = display, window = u64(window_id),
            }
            descriptor := wgpu.SurfaceDescriptor{nextInChain = &source.chain, label = "SDL X11 surface"}
            result.surface = wgpu.InstanceCreateSurface(instance, &descriptor)
        case:
            fmt.eprintln("Unsupported SDL video driver:", sdl.GetCurrentVideoDriver())
        }
    } else {
        #panic("This book targets macOS, Windows, and Linux desktop windows")
    }
    return result
}

platform_surface_destroy :: proc(platform: ^Platform_Surface) {
    if platform.surface != nil { wgpu.SurfaceRelease(platform.surface) }
    when ODIN_OS == .Darwin {
        if platform.metal_view != nil { sdl.Metal_DestroyView(platform.metal_view) }
    }
    platform^ = {}
}
`);
add('src/gpu.odin', `
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
`);
change('src/main.odin', '    running := true', `    gpu: GPU
    defer gpu_destroy(&gpu)
    if !gpu_init(&gpu, window) { return }

    running := true`);
save(4);

change('src/gpu.odin', 'import "core:fmt"', 'import "core:fmt"\nimport "base:runtime"\nimport "base:intrinsics"');
change('src/gpu.odin', '    platform: Platform_Surface,', `    platform: Platform_Surface,
    adapter: wgpu.Adapter,
    device: wgpu.Device,
    queue: wgpu.Queue,
    adapter_done, device_done: bool,`);
change('src/gpu.odin', '    return true\n}\n\ngpu_destroy', '    return gpu_request_device(gpu)\n}\n\ngpu_destroy');
change('src/gpu.odin', '    platform_surface_destroy(&gpu.platform)', `    if gpu.device != nil { _ = wgpu.DevicePoll(gpu.device, true, nil) }
    if gpu.queue != nil { wgpu.QueueRelease(gpu.queue) }
    if gpu.device != nil { wgpu.DeviceRelease(gpu.device) }
    if gpu.adapter != nil { wgpu.AdapterRelease(gpu.adapter) }
    platform_surface_destroy(&gpu.platform)`);
files['src/gpu.odin'] += `
// Process-lifetime storage: native diagnostic callbacks may arrive on other threads.
gpu_fault: bool

gpu_failed :: proc() -> bool { return intrinsics.atomic_load(&gpu_fault) }

adapter_ready :: proc "c" (status: wgpu.RequestAdapterStatus, adapter: wgpu.Adapter,
                          message: wgpu.StringView, userdata1, userdata2: rawptr) {
    context = runtime.default_context()
    gpu := cast(^GPU)userdata1
    gpu.adapter_done = true
    if status == .Success { gpu.adapter = adapter }
    else { fmt.eprintln("Adapter request:", status, message) }
}

device_ready :: proc "c" (status: wgpu.RequestDeviceStatus, device: wgpu.Device,
                         message: wgpu.StringView, userdata1, userdata2: rawptr) {
    context = runtime.default_context()
    gpu := cast(^GPU)userdata1
    gpu.device_done = true
    if status == .Success { gpu.device = device }
    else { fmt.eprintln("Device request:", status, message) }
}

device_lost :: proc "c" (device: ^wgpu.Device, reason: wgpu.DeviceLostReason,
                        message: wgpu.StringView, userdata1, userdata2: rawptr) {
    context = runtime.default_context()
    if reason == .Destroyed { return }
    fmt.eprintln("Device lost:", reason, message)
    intrinsics.atomic_store(&gpu_fault, true)
}

uncaptured_error :: proc "c" (device: ^wgpu.Device, error_type: wgpu.ErrorType,
                             message: wgpu.StringView, userdata1, userdata2: rawptr) {
    context = runtime.default_context()
    fmt.eprintln("WebGPU error:", error_type, message)
    intrinsics.atomic_store(&gpu_fault, true)
}

gpu_request_device :: proc(gpu: ^GPU) -> bool {
    options := wgpu.RequestAdapterOptions{
        compatibleSurface = gpu.platform.surface,
        powerPreference = .HighPerformance,
        featureLevel = .Core,
    }
    _ = wgpu.InstanceRequestAdapter(gpu.instance, &options, {
        mode = .AllowSpontaneos, callback = adapter_ready, userdata1 = gpu,
    })
    // Verified wgpu-native 29.0.1.1 behavior: these two request callbacks run inline.
    // Do not carry this assumption to Dawn or to a later native implementation.
    assert(gpu.adapter_done, "Pinned wgpu-native request contract changed")
    if gpu.adapter == nil { return false }
    descriptor := wgpu.DeviceDescriptor{
        label = "2D device", defaultQueue = {label = "2D queue"},
        deviceLostCallbackInfo = {mode = .AllowSpontaneos, callback = device_lost},
        uncapturedErrorCallbackInfo = {callback = uncaptured_error},
    }
    _ = wgpu.AdapterRequestDevice(gpu.adapter, &descriptor, {
        mode = .AllowSpontaneos, callback = device_ready, userdata1 = gpu,
    })
    assert(gpu.device_done, "Pinned wgpu-native request contract changed")
    if gpu.device == nil { return false }
    gpu.queue = wgpu.DeviceGetQueue(gpu.device)
    return gpu.queue != nil && !gpu_failed()
}
`;
change('src/main.odin', 'import sdl "vendor:sdl3"', 'import sdl "vendor:sdl3"\nimport wgpu "vendor:wgpu"');
change('src/main.odin', '        sdl.Delay(10)', '        wgpu.InstanceProcessEvents(gpu.instance)\n        if gpu_failed() { break }\n        sdl.Delay(10)');
save(5);

change('src/gpu.odin', 'import "core:fmt"', 'import "core:fmt"\nimport "core:c"');
change('src/gpu.odin', '    adapter_done, device_done: bool,', `    adapter_done, device_done: bool,
    config: wgpu.SurfaceConfiguration,
    configured, dirty: bool,
    max_texture_dimension: u32,`);
change('src/gpu.odin', '    return gpu_request_device(gpu)', `    if !gpu_request_device(gpu) { return false }
    if !gpu_choose_surface(gpu) { return false }
    gpu.dirty = true
    _ = gpu_refresh_surface(gpu, window)
    return !gpu_failed()`);
change('src/gpu.odin', '    if gpu.queue != nil', '    if gpu.configured { wgpu.SurfaceUnconfigure(gpu.platform.surface) }\n    if gpu.queue != nil');
files['src/gpu.odin'] += `
gpu_choose_surface :: proc(gpu: ^GPU) -> bool {
    caps, status := wgpu.SurfaceGetCapabilities(gpu.platform.surface, gpu.adapter)
    if status != .Success {
        fmt.eprintln("Surface capabilities unavailable:", status)
        return false
    }
    defer wgpu.SurfaceCapabilitiesFreeMembers(caps)
    format: wgpu.TextureFormat = .Undefined
    for candidate in caps.formats[:caps.formatCount] {
        if candidate == .BGRA8UnormSrgb || candidate == .RGBA8UnormSrgb {
            format = candidate
            break
        }
    }
    if format == .Undefined || !(.RenderAttachment in caps.usages) {
        fmt.eprintln("This example needs an sRGB RGBA/BGRA renderable surface")
        return false
    }
    fifo := false
    for mode in caps.presentModes[:caps.presentModeCount] {
        if mode == .Fifo { fifo = true }
    }
    if !fifo { fmt.eprintln("Surface does not offer FIFO presentation"); return false }
    alpha: wgpu.CompositeAlphaMode = .Auto
    for mode in caps.alphaModes[:caps.alphaModeCount] {
        if mode == .Opaque { alpha = .Opaque }
    }
    limits, limit_status := wgpu.DeviceGetLimits(gpu.device)
    if limit_status != .Success { return false }
    gpu.max_texture_dimension = limits.maxTextureDimension2D
    gpu.config = {
        device = gpu.device, format = format, usage = {.RenderAttachment},
        presentMode = .Fifo, alphaMode = alpha,
    }
    fmt.println("Surface format:", format)
    return true
}

gpu_refresh_surface :: proc(gpu: ^GPU, window: ^sdl.Window) -> bool {
    width, height: c.int
    if !sdl.GetWindowSizeInPixels(window, &width, &height) {
        fmt.eprintln("Drawable size:", sdl.GetError())
        intrinsics.atomic_store(&gpu_fault, true)
        return false
    }
    if width <= 0 || height <= 0 { return false }
    if u32(width) > gpu.max_texture_dimension || u32(height) > gpu.max_texture_dimension {
        return false
    }
    if gpu.dirty || !gpu.configured || gpu.config.width != u32(width) || gpu.config.height != u32(height) {
        gpu.config.width = u32(width)
        gpu.config.height = u32(height)
        wgpu.SurfaceConfigure(gpu.platform.surface, &gpu.config)
        gpu.configured = !gpu_failed()
        gpu.dirty = false
    }
    return gpu.configured
}
`;
save(6);

add('src/renderer.odin', `
package character
import "core:fmt"
import sdl "vendor:sdl3"
import wgpu "vendor:wgpu"

renderer_frame :: proc(gpu: ^GPU, window: ^sdl.Window) -> bool {
    if !gpu_refresh_surface(gpu, window) { sdl.Delay(10); return !gpu_failed() }
    frame := wgpu.SurfaceGetCurrentTexture(gpu.platform.surface)
    // Release any returned handle on every exit path, including a failed acquisition.
    defer if frame.texture != nil { wgpu.TextureRelease(frame.texture) }
    #partial switch frame.status {
    case .SuccessOptimal:
    case .SuccessSuboptimal: gpu.dirty = true
    case .Timeout, .Occluded: sdl.Delay(10); return true
    case .Outdated: gpu.dirty = true; sdl.Delay(10); return true
    case .Lost:
        fmt.eprintln("Surface lost; close and restart this small example")
        return false
    case:
        fmt.eprintln("Surface acquisition:", frame.status)
        return false
    }
    if frame.texture == nil { fmt.eprintln("Successful acquisition without a texture"); return false }
    view := wgpu.TextureCreateView(frame.texture, nil)
    if view == nil { return false }
    defer wgpu.TextureViewRelease(view)
    encoder := wgpu.DeviceCreateCommandEncoder(gpu.device, &wgpu.CommandEncoderDescriptor{label = "frame"})
    if encoder == nil { return false }
    defer wgpu.CommandEncoderRelease(encoder)
    attachment := wgpu.RenderPassColorAttachment{
        view = view, depthSlice = wgpu.DEPTH_SLICE_UNDEFINED,
        loadOp = .Clear, storeOp = .Store, clearValue = {0.018, 0.028, 0.048, 1},
    }
    pass_descriptor := wgpu.RenderPassDescriptor{
        label = "window color pass", colorAttachmentCount = 1, colorAttachments = &attachment,
    }
    pass := wgpu.CommandEncoderBeginRenderPass(encoder, &pass_descriptor)
    if pass == nil { return false }
    defer wgpu.RenderPassEncoderRelease(pass)
    wgpu.RenderPassEncoderEnd(pass)
    commands := wgpu.CommandEncoderFinish(encoder, &wgpu.CommandBufferDescriptor{label = "finished frame"})
    if commands == nil { return false }
    defer wgpu.CommandBufferRelease(commands)
    if gpu_failed() { return false }
    wgpu.QueueSubmit(gpu.queue, []wgpu.CommandBuffer{commands})
    if wgpu.SurfacePresent(gpu.platform.surface) != .Success {
        fmt.eprintln("Surface presentation failed")
        return false
    }
    return !gpu_failed()
}
`);
change('src/main.odin', '        sdl.Delay(10)', '        if !renderer_frame(&gpu, window) { break }');
save(7);

const triangleShader = `
@vertex
fn vs_main(@builtin(vertex_index) index: u32) -> @builtin(position) vec4f {
    let positions = array<vec2f, 3>(
        vec2f(-0.6, -0.5), vec2f(0.6, -0.5), vec2f(0.0, 0.6)
    );
    return vec4f(positions[index], 0.0, 1.0);
}

@fragment
fn fs_main() -> @location(0) vec4f {
    return vec4f(0.12, 0.78, 0.55, 1.0);
}
`;
add('shaders/character.wgsl', triangleShader);
const pipelineCode = `
Renderer :: struct {
    pipeline: wgpu.RenderPipeline,
}

renderer_init :: proc(renderer: ^Renderer, gpu: ^GPU) -> bool {
    source := wgpu.ShaderSourceWGSL{
        chain = {sType = .ShaderSourceWGSL}, code = #load("../shaders/character.wgsl", string),
    }
    shader := wgpu.DeviceCreateShaderModule(gpu.device, &wgpu.ShaderModuleDescriptor{
        label = "character WGSL", nextInChain = &source.chain,
    })
    if shader == nil { return false }
    defer wgpu.ShaderModuleRelease(shader)
    if gpu_failed() { return false }
    layout := wgpu.DeviceCreatePipelineLayout(gpu.device, &wgpu.PipelineLayoutDescriptor{
        label = "empty resource interface",
    })
    if layout == nil { return false }
    defer wgpu.PipelineLayoutRelease(layout)
    target := wgpu.ColorTargetState{format = gpu.config.format, writeMask = {.Red, .Green, .Blue, .Alpha}}
    fragment := wgpu.FragmentState{module = shader, entryPoint = "fs_main", targetCount = 1, targets = &target}
    descriptor := wgpu.RenderPipelineDescriptor{
        label = "character pipeline", layout = layout,
        vertex = {module = shader, entryPoint = "vs_main"},
        fragment = &fragment,
        primitive = {topology = .TriangleList, frontFace = .CCW, cullMode = .None},
        multisample = {count = 1, mask = 0xffffffff},
    }
    renderer.pipeline = wgpu.DeviceCreateRenderPipeline(gpu.device, &descriptor)
    return renderer.pipeline != nil && !gpu_failed()
}

renderer_destroy :: proc(renderer: ^Renderer) {
    if renderer.pipeline != nil { wgpu.RenderPipelineRelease(renderer.pipeline) }
    renderer^ = {}
}
`;
files['src/renderer.odin'] += pipelineCode;
change('src/renderer.odin', 'renderer_frame :: proc(gpu: ^GPU, window: ^sdl.Window)', 'renderer_frame :: proc(gpu: ^GPU, window: ^sdl.Window, renderer: ^Renderer)');
change('src/renderer.odin', '    wgpu.RenderPassEncoderEnd(pass)', `    wgpu.RenderPassEncoderSetPipeline(pass, renderer.pipeline)
    wgpu.RenderPassEncoderDraw(pass, 3, 1, 0, 0)
    wgpu.RenderPassEncoderEnd(pass)`);
change('src/main.odin', '    running := true', `    renderer: Renderer
    defer renderer_destroy(&renderer)
    if !renderer_init(&renderer, &gpu) { return }

    running := true`);
change('src/main.odin', 'renderer_frame(&gpu, window)', 'renderer_frame(&gpu, window, &renderer)');
save(8);

add('shaders/character.wgsl', `
struct Vertex_Out {
    @builtin(position) clip_position: vec4f,
    @location(0) color: vec4f,
}

@vertex
fn vs_main(@location(0) position: vec2f, @location(1) color: vec4f) -> Vertex_Out {
    var out: Vertex_Out;
    out.clip_position = vec4f(position, 0.0, 1.0);
    out.color = color;
    return out;
}

@fragment
fn fs_main(in: Vertex_Out) -> @location(0) vec4f {
    return in.color;
}
`);
change('src/renderer.odin', 'Renderer :: struct {', `Vertex :: struct {
    position: [2]f32,
    color: [4]f32,
}
#assert(size_of(Vertex) == 24)
#assert(offset_of(Vertex, position) == 0)
#assert(offset_of(Vertex, color) == 8)

VERTICES :: [3]Vertex{
    {{-0.6, -0.5}, {1, 0.1, 0.1, 1}},
    {{ 0.6, -0.5}, {0.1, 1, 0.1, 1}},
    {{ 0.0,  0.6}, {0.1, 0.1, 1, 1}},
}

Renderer :: struct {`);
change('src/renderer.odin', '    pipeline: wgpu.RenderPipeline,', '    pipeline: wgpu.RenderPipeline,\n    vertex_buffer: wgpu.Buffer,');
change('src/renderer.odin', '    source := wgpu.ShaderSourceWGSL{', `    renderer.vertex_buffer = wgpu.DeviceCreateBuffer(gpu.device, &wgpu.BufferDescriptor{
        label = "character vertices", size = size_of(VERTICES), usage = {.Vertex, .CopyDst},
    })
    if renderer.vertex_buffer == nil { return false }
    vertices := VERTICES
    wgpu.QueueWriteBuffer(gpu.queue, renderer.vertex_buffer, 0, &vertices, size_of(vertices))
    source := wgpu.ShaderSourceWGSL{`);
change('src/renderer.odin', '    descriptor := wgpu.RenderPipelineDescriptor{', `    attributes := [2]wgpu.VertexAttribute{
        {format = .Float32x2, offset = u64(offset_of(Vertex, position)), shaderLocation = 0},
        {format = .Float32x4, offset = u64(offset_of(Vertex, color)), shaderLocation = 1},
    }
    vertex_layout := wgpu.VertexBufferLayout{
        arrayStride = size_of(Vertex), stepMode = .Vertex,
        attributeCount = len(attributes), attributes = raw_data(attributes[:]),
    }
    descriptor := wgpu.RenderPipelineDescriptor{`);
change('src/renderer.odin', 'vertex = {module = shader, entryPoint = "vs_main"}', 'vertex = {module = shader, entryPoint = "vs_main", bufferCount = 1, buffers = &vertex_layout}');
change('src/renderer.odin', '    wgpu.RenderPassEncoderDraw(pass, 3, 1, 0, 0)', `    wgpu.RenderPassEncoderSetVertexBuffer(pass, 0, renderer.vertex_buffer, 0, size_of(VERTICES))
    wgpu.RenderPassEncoderDraw(pass, 3, 1, 0, 0)`);
change('src/renderer.odin', '    if renderer.pipeline != nil', '    if renderer.vertex_buffer != nil { wgpu.BufferRelease(renderer.vertex_buffer) }\n    if renderer.pipeline != nil');
save(9);

change('src/renderer.odin', `VERTICES :: [3]Vertex{
    {{-0.6, -0.5}, {1, 0.1, 0.1, 1}},
    {{ 0.6, -0.5}, {0.1, 1, 0.1, 1}},
    {{ 0.0,  0.6}, {0.1, 0.1, 1, 1}},
}`, `VERTICES :: [4]Vertex{
    {{-0.25,  0.35}, {0.12, 0.78, 0.55, 1}},
    {{ 0.25,  0.35}, {0.12, 0.78, 0.55, 1}},
    {{ 0.25, -0.35}, {0.12, 0.78, 0.55, 1}},
    {{-0.25, -0.35}, {0.12, 0.78, 0.55, 1}},
}
INDICES :: [6]u16{0, 1, 2, 0, 2, 3}`);
change('src/renderer.odin', '    vertex_buffer: wgpu.Buffer,', '    vertex_buffer: wgpu.Buffer,\n    index_buffer: wgpu.Buffer,');
change('src/renderer.odin', '    source := wgpu.ShaderSourceWGSL{', `    renderer.index_buffer = wgpu.DeviceCreateBuffer(gpu.device, &wgpu.BufferDescriptor{
        label = "quad indices", size = size_of(INDICES), usage = {.Index, .CopyDst},
    })
    if renderer.index_buffer == nil { return false }
    indices := INDICES
    wgpu.QueueWriteBuffer(gpu.queue, renderer.index_buffer, 0, &indices, size_of(indices))
    source := wgpu.ShaderSourceWGSL{`);
change('src/renderer.odin', '    wgpu.RenderPassEncoderDraw(pass, 3, 1, 0, 0)', `    wgpu.RenderPassEncoderSetIndexBuffer(pass, renderer.index_buffer, .Uint16, 0, size_of(INDICES))
    wgpu.RenderPassEncoderDrawIndexed(pass, 6, 1, 0, 0, 0)`);
change('src/renderer.odin', '    if renderer.vertex_buffer != nil', '    if renderer.index_buffer != nil { wgpu.BufferRelease(renderer.index_buffer) }\n    if renderer.vertex_buffer != nil');
save(10);

change('src/renderer.odin', '{{-0.25,  0.35}', '{{0, 0}');
change('src/renderer.odin', '{{ 0.25,  0.35}', '{{1, 0}');
change('src/renderer.odin', '{{ 0.25, -0.35}', '{{1, 1}');
change('src/renderer.odin', '{{-0.25, -0.35}', '{{0, 1}');
change('src/renderer.odin', '    frame := wgpu.SurfaceGetCurrentTexture', `    // Temporary: transform and upload all four vertices on the CPU.
    vertices := VERTICES
    for &vertex in vertices {
        pixel := [2]f32{120, 100} + vertex.position * [2]f32{48, 64}
        vertex.position = {2 * pixel.x / f32(gpu.config.width) - 1,
                           1 - 2 * pixel.y / f32(gpu.config.height)}
    }
    wgpu.QueueWriteBuffer(gpu.queue, renderer.vertex_buffer, 0, &vertices, size_of(vertices))
    frame := wgpu.SurfaceGetCurrentTexture`);
save(11);

const cpuTransform = `    // Temporary: transform and upload all four vertices on the CPU.
    vertices := VERTICES
    for &vertex in vertices {
        pixel := [2]f32{120, 100} + vertex.position * [2]f32{48, 64}
        vertex.position = {2 * pixel.x / f32(gpu.config.width) - 1,
                           1 - 2 * pixel.y / f32(gpu.config.height)}
    }
    wgpu.QueueWriteBuffer(gpu.queue, renderer.vertex_buffer, 0, &vertices, size_of(vertices))`;
change('src/renderer.odin', cpuTransform, `    uniforms := Uniforms{
        position = {120, 100}, size = {48, 64},
        view_size = {f32(gpu.config.width), f32(gpu.config.height)},
        camera = {0, 0}, tint = {1, 1, 1, 1},
    }
    wgpu.QueueWriteBuffer(gpu.queue, renderer.uniform_buffer, 0, &uniforms, size_of(uniforms))`);
change('src/renderer.odin', 'Renderer :: struct {', `Uniforms :: struct #align(16) {
    position: [2]f32,
    size: [2]f32,
    view_size: [2]f32,
    camera: [2]f32,
    tint: [4]f32,
}
#assert(size_of(Uniforms) == 48)
#assert(offset_of(Uniforms, position) == 0)
#assert(offset_of(Uniforms, size) == 8)
#assert(offset_of(Uniforms, view_size) == 16)
#assert(offset_of(Uniforms, camera) == 24)
#assert(offset_of(Uniforms, tint) == 32)

Renderer :: struct {`);
change('src/renderer.odin', '    index_buffer: wgpu.Buffer,', '    index_buffer: wgpu.Buffer,\n    uniform_buffer: wgpu.Buffer,\n    bind_group: wgpu.BindGroup,');
change('src/renderer.odin', `    layout := wgpu.DeviceCreatePipelineLayout(gpu.device, &wgpu.PipelineLayoutDescriptor{
        label = "empty resource interface",
    })`, `    renderer.uniform_buffer = wgpu.DeviceCreateBuffer(gpu.device, &wgpu.BufferDescriptor{
        label = "character uniforms", size = size_of(Uniforms), usage = {.Uniform, .CopyDst},
    })
    if renderer.uniform_buffer == nil { return false }
    binding_layout := wgpu.BindGroupLayoutEntry{
        binding = 0, visibility = {.Vertex},
        buffer = {type = .Uniform, minBindingSize = size_of(Uniforms)},
    }
    group_layout := wgpu.DeviceCreateBindGroupLayout(gpu.device, &wgpu.BindGroupLayoutDescriptor{
        label = "character resource interface", entryCount = 1, entries = &binding_layout,
    })
    if group_layout == nil { return false }
    defer wgpu.BindGroupLayoutRelease(group_layout)
    entry := wgpu.BindGroupEntry{binding = 0, buffer = renderer.uniform_buffer, offset = 0, size = size_of(Uniforms)}
    renderer.bind_group = wgpu.DeviceCreateBindGroup(gpu.device, &wgpu.BindGroupDescriptor{
        label = "character resources", layout = group_layout, entryCount = 1, entries = &entry,
    })
    if renderer.bind_group == nil { return false }
    layout := wgpu.DeviceCreatePipelineLayout(gpu.device, &wgpu.PipelineLayoutDescriptor{
        label = "character pipeline interface", bindGroupLayoutCount = 1, bindGroupLayouts = &group_layout,
    })`);
change('src/renderer.odin', '    wgpu.RenderPassEncoderSetVertexBuffer(pass', '    wgpu.RenderPassEncoderSetBindGroup(pass, 0, renderer.bind_group)\n    wgpu.RenderPassEncoderSetVertexBuffer(pass');
change('src/renderer.odin', '    if renderer.index_buffer != nil', '    if renderer.bind_group != nil { wgpu.BindGroupRelease(renderer.bind_group) }\n    if renderer.uniform_buffer != nil { wgpu.BufferRelease(renderer.uniform_buffer) }\n    if renderer.index_buffer != nil');
change('shaders/character.wgsl', 'struct Vertex_Out', `struct Uniforms {
    position: vec2f,
    size: vec2f,
    view_size: vec2f,
    camera: vec2f,
    tint: vec4f,
}
@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct Vertex_Out`);
change('shaders/character.wgsl', '    out.clip_position = vec4f(position, 0.0, 1.0);\n    out.color = color;', `    let pixel = uniforms.position + position * uniforms.size - uniforms.camera;
    let ndc = vec2f(2.0 * pixel.x / uniforms.view_size.x - 1.0,
                   1.0 - 2.0 * pixel.y / uniforms.view_size.y);
    out.clip_position = vec4f(ndc, 0.0, 1.0);
    out.color = color * uniforms.tint;`);
save(12);

change('src/main.odin', 'flags: sdl.WindowFlags = {}', 'flags: sdl.WindowFlags = {.RESIZABLE, .HIGH_PIXEL_DENSITY}');
change('src/main.odin', '            case .QUIT, .WINDOW_CLOSE_REQUESTED: running = false', `            case .QUIT, .WINDOW_CLOSE_REQUESTED: running = false
            case .WINDOW_PIXEL_SIZE_CHANGED, .WINDOW_RESTORED: gpu.dirty = true`);
change('src/gpu.odin', '    width, height: c.int\n    if !sdl.GetWindowSizeInPixels', `    if .MINIMIZED in sdl.GetWindowFlags(window) { return false }
    width, height: c.int
    if !sdl.GetWindowSizeInPixels`);
change('src/renderer.odin', 'import "core:fmt"', 'import "core:fmt"\nimport "core:c"');
change('src/renderer.odin', '    uniforms := Uniforms{', `    width, height: c.int
    if !sdl.GetWindowSize(window, &width, &height) { return false }
    if width <= 0 || height <= 0 { sdl.Delay(10); return true }
    uniforms := Uniforms{`);
change('src/renderer.odin', 'view_size = {f32(gpu.config.width), f32(gpu.config.height)}', 'view_size = {f32(width), f32(height)}');
save(13);

add('src/game.odin', `
package character
import sdl "vendor:sdl3"

Game :: struct {
    position: [2]f32,
    size: [2]f32,
    tint: [4]f32,
}

read_movement :: proc(window: ^sdl.Window) -> [2]f32 {
    if !(.INPUT_FOCUS in sdl.GetWindowFlags(window)) { return {} }
    keys := sdl.GetKeyboardState(nil)
    direction: [2]f32
    if keys[sdl.Scancode.D] || keys[sdl.Scancode.RIGHT] { direction.x += 1 }
    if keys[sdl.Scancode.A] || keys[sdl.Scancode.LEFT]  { direction.x -= 1 }
    if keys[sdl.Scancode.S] || keys[sdl.Scancode.DOWN]  { direction.y += 1 }
    if keys[sdl.Scancode.W] || keys[sdl.Scancode.UP]    { direction.y -= 1 }
    return direction
}

game_update :: proc(game: ^Game, direction: [2]f32) {
    // Temporary input proof: color changes while any movement key is held.
    game.tint = {1, 1, 1, 1}
    if direction.x != 0 || direction.y != 0 { game.tint = {1, 0.35, 0.35, 1} }
}
`);
change('src/main.odin', 'import "core:fmt"', 'import "core:fmt"\nimport "core:c"');
change('src/main.odin', '    running := true', `    game := Game{position = {120, 100}, size = {48, 64}, tint = {1, 1, 1, 1}}
    running := true`);
change('src/main.odin', '        if !renderer_frame(&gpu, window, &renderer) { break }', `        width, height: c.int
        if !sdl.GetWindowSize(window, &width, &height) { break }
        if width <= 0 || height <= 0 || .MINIMIZED in sdl.GetWindowFlags(window) {
            sdl.Delay(10)
            continue
        }
        view_size := [2]f32{f32(width), f32(height)}
        direction := read_movement(window)
        game_update(&game, direction)
        if !renderer_frame(&gpu, window, &renderer, game.position, game.size, game.tint, view_size) { break }`);
change('src/renderer.odin', 'import "core:c"\n', '');
change('src/renderer.odin', 'renderer_frame :: proc(gpu: ^GPU, window: ^sdl.Window, renderer: ^Renderer)', `renderer_frame :: proc(gpu: ^GPU, window: ^sdl.Window, renderer: ^Renderer,
                       position, size: [2]f32, tint: [4]f32, view_size: [2]f32)`);
change('src/renderer.odin', `    width, height: c.int
    if !sdl.GetWindowSize(window, &width, &height) { return false }
    if width <= 0 || height <= 0 { sdl.Delay(10); return true }
`, '');
change('src/renderer.odin', 'position = {120, 100}, size = {48, 64}', 'position = position, size = size');
change('src/renderer.odin', 'view_size = {f32(width), f32(height)},\n        camera = {0, 0}, tint = {1, 1, 1, 1}', 'view_size = view_size,\n        camera = {0, 0}, tint = tint');
save(14);

change('src/main.odin', '    running := true', '    previous_ticks := sdl.GetTicksNS()\n    running := true');
change('src/main.odin', '        if !running { break }', `        if !running { break }
        now := sdl.GetTicksNS()
        dt := min(f64(now - previous_ticks) / 1_000_000_000.0, 0.05)
        previous_ticks = now`);
change('src/main.odin', 'game_update(&game, direction)', 'game_update(&game, direction, f32(dt), view_size)');
change('src/game.odin', 'import sdl', 'import "core:math"\nimport sdl');
change('src/game.odin', '    tint: [4]f32,', '    tint: [4]f32,\n    speed: f32,');
change('src/main.odin', 'tint = {1, 1, 1, 1}}', 'tint = {1, 1, 1, 1}, speed = 240}');
change('src/game.odin', `game_update :: proc(game: ^Game, direction: [2]f32) {
    // Temporary input proof: color changes while any movement key is held.
    game.tint = {1, 1, 1, 1}
    if direction.x != 0 || direction.y != 0 { game.tint = {1, 0.35, 0.35, 1} }
}`, `game_update :: proc(game: ^Game, direction: [2]f32, dt: f32, view_size: [2]f32) {
    direction := direction
    length_squared := direction.x * direction.x + direction.y * direction.y
    if length_squared > 0 { direction /= math.sqrt(length_squared) }
    game.position += direction * game.speed * dt
    // If the window is smaller than the character, anchor that axis at zero.
    game.position.x = clamp(game.position.x, 0, max(f32(0), view_size.x - game.size.x))
    game.position.y = clamp(game.position.y, 0, max(f32(0), view_size.y - game.size.y))
}`);
save(15);

change('src/renderer.odin', '    target := wgpu.ColorTargetState{format = gpu.config.format, writeMask = {.Red, .Green, .Blue, .Alpha}}', `    blend := wgpu.BlendState{
        color = {operation = .Add, srcFactor = .SrcAlpha, dstFactor = .OneMinusSrcAlpha},
        alpha = {operation = .Add, srcFactor = .One, dstFactor = .OneMinusSrcAlpha},
    }
    target := wgpu.ColorTargetState{
        format = gpu.config.format, blend = &blend, writeMask = {.Red, .Green, .Blue, .Alpha},
    }`);
change('shaders/character.wgsl', '    @location(0) color: vec4f,', '    @location(0) color: vec4f,\n    @location(1) local_position: vec2f,');
change('shaders/character.wgsl', '    out.color = color * uniforms.tint;', '    out.color = color * uniforms.tint;\n    out.local_position = position;');
change('shaders/character.wgsl', '    return in.color;', `    let p = in.local_position;
    let left_eye = p.x > 0.22 && p.x < 0.36 && p.y > 0.25 && p.y < 0.39;
    let right_eye = p.x > 0.64 && p.x < 0.78 && p.y > 0.25 && p.y < 0.39;
    let mouth = p.x > 0.35 && p.x < 0.65 && p.y > 0.62 && p.y < 0.69;
    if left_eye || right_eye || mouth {
        return vec4f(0.012, 0.025, 0.040, in.color.a);
    }
    return in.color;`);
save(16); save(17); save(18);

extendRoom(snapshots);

export { snapshots };
export const finalSource = snapshots[23];
