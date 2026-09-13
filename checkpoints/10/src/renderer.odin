package character
import "core:fmt"
import sdl "vendor:sdl3"
import wgpu "vendor:wgpu"

renderer_frame :: proc(gpu: ^GPU, window: ^sdl.Window, renderer: ^Renderer) -> bool {
	if !gpu_refresh_surface(gpu, window) { sdl.Delay(10); return !gpu_failed() }
	frame := wgpu.SurfaceGetCurrentTexture(gpu.platform.surface)
	// Release any returned handle on every exit path, including a failed acquisition.
	defer if frame.texture != nil { wgpu.TextureRelease(frame.texture) }
	#partial switch frame.status {
	case .SuccessOptimal:
	case .SuccessSuboptimal:
		gpu.dirty = true
	case .Timeout, .Occluded:
		sdl.Delay(10); return true
	case .Outdated:
		gpu.dirty = true; sdl.Delay(10); return true
	case .Lost:
		fmt.eprintln("Surface lost; close and restart this small example")
		return false
	case:
		fmt.eprintln("Surface acquisition:", frame.status)
		return false
	}
	if frame.texture ==
	   nil { fmt.eprintln("Successful acquisition without a texture"); return false }
	view := wgpu.TextureCreateView(frame.texture, nil)
	if view == nil { return false }
	defer wgpu.TextureViewRelease(view)
	encoder := wgpu.DeviceCreateCommandEncoder(
		gpu.device,
		&wgpu.CommandEncoderDescriptor{label = "frame"},
	)
	if encoder == nil { return false }
	defer wgpu.CommandEncoderRelease(encoder)
	attachment := wgpu.RenderPassColorAttachment {
		view       = view,
		depthSlice = wgpu.DEPTH_SLICE_UNDEFINED,
		loadOp     = .Clear,
		storeOp    = .Store,
		clearValue = {0.018, 0.028, 0.048, 1},
	}
	pass_descriptor := wgpu.RenderPassDescriptor {
		label                = "window color pass",
		colorAttachmentCount = 1,
		colorAttachments     = &attachment,
	}
	pass := wgpu.CommandEncoderBeginRenderPass(encoder, &pass_descriptor)
	if pass == nil { return false }
	defer wgpu.RenderPassEncoderRelease(pass)
	wgpu.RenderPassEncoderSetPipeline(pass, renderer.pipeline)
	wgpu.RenderPassEncoderSetVertexBuffer(pass, 0, renderer.vertex_buffer, 0, size_of(VERTICES))
	wgpu.RenderPassEncoderSetIndexBuffer(pass, renderer.index_buffer, .Uint16, 0, size_of(INDICES))
	wgpu.RenderPassEncoderDrawIndexed(pass, 6, 1, 0, 0, 0)
	wgpu.RenderPassEncoderEnd(pass)
	commands := wgpu.CommandEncoderFinish(
		encoder,
		&wgpu.CommandBufferDescriptor{label = "finished frame"},
	)
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

Vertex :: struct {
	position: [2]f32,
	color:    [4]f32,
}
#assert(size_of(Vertex) == 24)
#assert(offset_of(Vertex, position) == 0)
#assert(offset_of(Vertex, color) == 8)

VERTICES :: [4]Vertex {
	{{-0.25, 0.35}, {0.12, 0.78, 0.55, 1}},
	{{0.25, 0.35}, {0.12, 0.78, 0.55, 1}},
	{{0.25, -0.35}, {0.12, 0.78, 0.55, 1}},
	{{-0.25, -0.35}, {0.12, 0.78, 0.55, 1}},
}
INDICES :: [6]u16{0, 1, 2, 0, 2, 3}

Renderer :: struct {
	pipeline:      wgpu.RenderPipeline,
	vertex_buffer: wgpu.Buffer,
	index_buffer:  wgpu.Buffer,
}

renderer_init :: proc(renderer: ^Renderer, gpu: ^GPU) -> bool {
	renderer.vertex_buffer = wgpu.DeviceCreateBuffer(gpu.device, &wgpu.BufferDescriptor {
			label = "character vertices",
			size  = size_of(VERTICES),
			usage = {.Vertex, .CopyDst},
		})
	if renderer.vertex_buffer == nil { return false }
	vertices := VERTICES
	wgpu.QueueWriteBuffer(gpu.queue, renderer.vertex_buffer, 0, &vertices, size_of(vertices))
	renderer.index_buffer = wgpu.DeviceCreateBuffer(gpu.device, &wgpu.BufferDescriptor {
			label = "quad indices",
			size  = size_of(INDICES),
			usage = {.Index, .CopyDst},
		})
	if renderer.index_buffer == nil { return false }
	indices := INDICES
	wgpu.QueueWriteBuffer(gpu.queue, renderer.index_buffer, 0, &indices, size_of(indices))
	source := wgpu.ShaderSourceWGSL {
		chain = {sType = .ShaderSourceWGSL},
		code = #load("../shaders/character.wgsl", string),
	}
	shader := wgpu.DeviceCreateShaderModule(gpu.device, &wgpu.ShaderModuleDescriptor {
			label       = "character WGSL",
			nextInChain = &source.chain,
		})
	if shader == nil { return false }
	defer wgpu.ShaderModuleRelease(shader)
	if gpu_failed() { return false }
	layout := wgpu.DeviceCreatePipelineLayout(gpu.device, &wgpu.PipelineLayoutDescriptor {
			label = "empty resource interface",
		})
	if layout == nil { return false }
	defer wgpu.PipelineLayoutRelease(layout)
	target := wgpu.ColorTargetState {
		format    = gpu.config.format,
		writeMask = {.Red, .Green, .Blue, .Alpha},
	}
	fragment := wgpu.FragmentState {
		module      = shader,
		entryPoint  = "fs_main",
		targetCount = 1,
		targets     = &target,
	}
	attributes := [2]wgpu.VertexAttribute {
		{format = .Float32x2, offset = u64(offset_of(Vertex, position)), shaderLocation = 0},
		{format = .Float32x4, offset = u64(offset_of(Vertex, color)), shaderLocation = 1},
	}
	vertex_layout := wgpu.VertexBufferLayout {
		arrayStride    = size_of(Vertex),
		stepMode       = .Vertex,
		attributeCount = len(attributes),
		attributes     = raw_data(attributes[:]),
	}
	descriptor := wgpu.RenderPipelineDescriptor {
		label = "character pipeline",
		layout = layout,
		vertex = {
			module = shader,
			entryPoint = "vs_main",
			bufferCount = 1,
			buffers = &vertex_layout,
		},
		fragment = &fragment,
		primitive = {topology = .TriangleList, frontFace = .CCW, cullMode = .None},
		multisample = {count = 1, mask = 0xffffffff},
	}
	renderer.pipeline = wgpu.DeviceCreateRenderPipeline(gpu.device, &descriptor)
	return renderer.pipeline != nil && !gpu_failed()
}

renderer_destroy :: proc(renderer: ^Renderer) {
	if renderer.index_buffer != nil { wgpu.BufferRelease(renderer.index_buffer) }
	if renderer.vertex_buffer != nil { wgpu.BufferRelease(renderer.vertex_buffer) }
	if renderer.pipeline != nil { wgpu.RenderPipelineRelease(renderer.pipeline) }
	renderer^ = {}
}
