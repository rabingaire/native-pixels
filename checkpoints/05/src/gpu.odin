package character
import "base:intrinsics"
import "base:runtime"
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
	return gpu_request_device(gpu)
}

gpu_destroy :: proc(gpu: ^GPU) {
	if gpu.device != nil { _ = wgpu.DevicePoll(gpu.device, true, nil) }
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
