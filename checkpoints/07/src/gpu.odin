package character
import "base:intrinsics"
import "base:runtime"
import "core:c"
import "core:fmt"
import sdl "vendor:sdl3"
import wgpu "vendor:wgpu"

GPU :: struct {
	instance:                  wgpu.Instance,
	platform:                  Platform_Surface,
	adapter:                   wgpu.Adapter,
	device:                    wgpu.Device,
	queue:                     wgpu.Queue,
	adapter_done, device_done: bool,
	config:                    wgpu.SurfaceConfiguration,
	configured, dirty:         bool,
	max_texture_dimension:     u32,
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
	if !gpu_request_device(gpu) { return false }
	if !gpu_choose_surface(gpu) { return false }
	gpu.dirty = true
	_ = gpu_refresh_surface(gpu, window)
	return !gpu_failed()
}

gpu_destroy :: proc(gpu: ^GPU) {
	if gpu.device != nil { _ = wgpu.DevicePoll(gpu.device, true, nil) }
	if gpu.configured { wgpu.SurfaceUnconfigure(gpu.platform.surface) }
	if gpu.queue != nil { wgpu.QueueRelease(gpu.queue) }
	if gpu.device != nil { wgpu.DeviceRelease(gpu.device) }
	if gpu.adapter != nil { wgpu.AdapterRelease(gpu.adapter) }
	platform_surface_destroy(&gpu.platform)
	if gpu.instance != nil { wgpu.InstanceRelease(gpu.instance) }
	gpu^ = {}
}

// Process-lifetime storage: native diagnostic callbacks may arrive on other threads.
gpu_fault: bool

gpu_failed :: proc() -> bool { return intrinsics.atomic_load(&gpu_fault) }

adapter_ready :: proc "c" (
	status: wgpu.RequestAdapterStatus,
	adapter: wgpu.Adapter,
	message: wgpu.StringView,
	userdata1, userdata2: rawptr,
) {
	context = runtime.default_context()
	gpu := cast(^GPU)userdata1
	gpu.adapter_done = true
	if status ==
	   .Success { gpu.adapter = adapter } else { fmt.eprintln("Adapter request:", status, message) }
}

device_ready :: proc "c" (
	status: wgpu.RequestDeviceStatus,
	device: wgpu.Device,
	message: wgpu.StringView,
	userdata1, userdata2: rawptr,
) {
	context = runtime.default_context()
	gpu := cast(^GPU)userdata1
	gpu.device_done = true
	if status ==
	   .Success { gpu.device = device } else { fmt.eprintln("Device request:", status, message) }
}

device_lost :: proc "c" (
	device: ^wgpu.Device,
	reason: wgpu.DeviceLostReason,
	message: wgpu.StringView,
	userdata1, userdata2: rawptr,
) {
	context = runtime.default_context()
	if reason == .Destroyed { return }
	fmt.eprintln("Device lost:", reason, message)
	intrinsics.atomic_store(&gpu_fault, true)
}

uncaptured_error :: proc "c" (
	device: ^wgpu.Device,
	error_type: wgpu.ErrorType,
	message: wgpu.StringView,
	userdata1, userdata2: rawptr,
) {
	context = runtime.default_context()
	fmt.eprintln("WebGPU error:", error_type, message)
	intrinsics.atomic_store(&gpu_fault, true)
}

gpu_request_device :: proc(gpu: ^GPU) -> bool {
	options := wgpu.RequestAdapterOptions {
		compatibleSurface = gpu.platform.surface,
		powerPreference   = .HighPerformance,
		featureLevel      = .Core,
	}
	_ = wgpu.InstanceRequestAdapter(gpu.instance, &options, {
		mode      = .AllowSpontaneos,
		callback  = adapter_ready,
		userdata1 = gpu,
	})
	// Verified wgpu-native 29.0.1.1 behavior: these two request callbacks run inline.
	// Do not carry this assumption to Dawn or to a later native implementation.
	assert(gpu.adapter_done, "Pinned wgpu-native request contract changed")
	if gpu.adapter == nil { return false }
	descriptor := wgpu.DeviceDescriptor {
		label = "2D device",
		defaultQueue = {label = "2D queue"},
		deviceLostCallbackInfo = {mode = .AllowSpontaneos, callback = device_lost},
		uncapturedErrorCallbackInfo = {callback = uncaptured_error},
	}
	_ = wgpu.AdapterRequestDevice(gpu.adapter, &descriptor, {
		mode      = .AllowSpontaneos,
		callback  = device_ready,
		userdata1 = gpu,
	})
	assert(gpu.device_done, "Pinned wgpu-native request contract changed")
	if gpu.device == nil { return false }
	gpu.queue = wgpu.DeviceGetQueue(gpu.device)
	return gpu.queue != nil && !gpu_failed()
}

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
		device      = gpu.device,
		format      = format,
		usage       = {.RenderAttachment},
		presentMode = .Fifo,
		alphaMode   = alpha,
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
	if gpu.dirty ||
	   !gpu.configured ||
	   gpu.config.width != u32(width) ||
	   gpu.config.height != u32(height) {
		gpu.config.width = u32(width)
		gpu.config.height = u32(height)
		wgpu.SurfaceConfigure(gpu.platform.surface, &gpu.config)
		gpu.configured = !gpu_failed()
		gpu.dirty = false
	}
	return gpu.configured
}
