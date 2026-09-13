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
