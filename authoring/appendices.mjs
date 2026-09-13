import fs from 'node:fs';
import { finalSource } from './source.mjs';
import { esc, code, p, section as s, table, note, list, flow } from './html.mjs';
const lock = JSON.parse(fs.readFileSync(new URL('../dependency-lock.json', import.meta.url)));
const terms = [
  ['CPU', 'Central processing unit: the processor running our Odin application, event loop, simulation, and command recording.'],
  ['Handle', 'An opaque reference identifying an API object. Keeping a pointer variable does not automatically manage the referenced object’s lifetime.'],
  ['Checkpoint', 'A complete runnable snapshot of the project at the end of one chapter. Optional exercises are not included or assumed.'],
  ['Adapter', 'A candidate GPU implementation and capability provider from which a logical device can be requested.'],
  ['Alignment', 'A required multiple for a memory address, field offset, binding offset, or operation size. These are separate rules.'],
  ['Alpha', 'A color component used by an explicitly chosen opacity/composition convention; it does not enable blending by itself.'],
  ['Attachment', 'A texture view used as a render-pass output, with declared load and store behavior.'],
  ['Attribute', 'A per-vertex input decoded from buffer bytes and routed to a vertex shader location.'],
  ['Backend', 'The platform graphics API and implementation used beneath WebGPU, such as Metal, Vulkan, or D3D12.'],
  ['Base vertex', 'An offset added to decoded indices before fetching vertex records in an indexed draw.'],
  ['Bind group', 'An object connecting concrete resources and ranges to numbered bindings under a bind group layout.'],
  ['Bind group layout', 'A description of allowed binding numbers, resource types, shader visibility, and related constraints.'],
  ['Binding', 'A numbered resource entry within one bind group; distinct from a vertex location or vertex buffer slot.'],
  ['Blending', 'Combining fragment output with an existing attachment value using pipeline-defined factors and operations.'],
  ['Buffer', 'A device-owned byte-storage resource with declared usage permissions and native reference ownership.'],
  ['Buffer usage flags', 'Permissions describing which WebGPU operations may use a buffer, such as Vertex, Index, Uniform, or CopyDst.'],
  ['Built-in', 'A shader input or output with a pipeline-defined meaning, such as vertex_index or position.'],
  ['Callback', 'A native function invoked to deliver an operation result or diagnostic, with explicit calling convention and userdata.'],
  ['Callback mode', 'The native contract governing how completion may be delivered: waiting, event processing, or spontaneous delivery.'],
  ['Camera', 'Our view’s world-space origin; subtracting it converts a world point into a view-relative point.'],
  ['Chained descriptor', 'A native descriptor extension whose common header contains an sType and next pointer.'],
  ['Clear', 'An attachment load operation that initializes contents to a specified value before draws.'],
  ['Clip coordinates', 'Four-component vertex-shader positions tested against WebGPU’s clipping volume before division by w.'],
  ['Clipping', 'Removing or trimming primitive portions outside the allowed clip volume; distinct from depth testing and scissoring.'],
  ['Color target', 'A pipeline output slot describing the attachment format, write mask, and optional blending for fragment output.'],
  ['Command buffer', 'A finished command sequence submitted once to a queue; distinct from resource byte buffers.'],
  ['Command encoder', 'A CPU-visible object for recording commands before producing a command buffer.'],
  ['Composite alpha', 'The window-system rule for combining the surface image with the desktop; separate from in-pass character blending.'],
  ['CopyDst', 'A usage permission allowing a resource to receive copy/upload operations, including QueueWriteBuffer for buffers.'],
  ['Culling', 'Discarding primitives based on facing; our 2D pipeline culls neither front nor back faces.'],
  ['Delta time', 'Elapsed simulation time for an update, measured in seconds in this program.'],
  ['Depth test', 'A comparison involving fragment depth and a depth attachment. This renderer has no depth attachment or test.'],
  ['Descriptor', 'CPU-side input metadata used to create/configure an object or begin an operation. It is not itself the GPU object.'],
  ['Destroy', 'An explicit resource invalidation operation for objects that support it; it does not replace releasing a native reference.'],
  ['Device', 'A logical resource-owning graphics connection created from an adapter with a selected feature/limit contract.'],
  ['Device loss', 'The device becoming unusable, requiring recreation of device-dependent resources or, here, orderly exit and restart.'],
  ['Drawable / framebuffer extent', 'The physical pixel dimensions of the image rendered for the window.'],
  ['Error object', 'A returned API object representing a failed creation/validation path; non-null alone does not prove success.'],
  ['Error scope', 'A native/API mechanism for capturing errors from a selected scope of work; optional diagnostic tooling here.'],
  ['Feature', 'An optional capability explicitly enabled on a device when supported by its adapter.'],
  ['Fence / completion wait', 'A mechanism for observing completion of GPU work; not the same as ordering work on a queue.'],
  ['FIFO', 'A presentation mode that queues images in order with display pacing.'],
  ['Fragment', 'A candidate contribution generated by rasterization near an output sample; not necessarily one final visible pixel.'],
  ['Fragment shader', 'A shader stage computing values such as color for rasterized fragments.'],
  ['Front face / winding', 'A primitive orientation convention based on ordered vertices, used when culling is enabled.'],
  ['Future', 'A native token for tracking an operation that may complete asynchronously; pinned request operations here return null futures.'],
  ['GPU', 'A processor designed for parallel graphics and compute work; the CPU-facing API objects also include backend bookkeeping.'],
  ['Index buffer', 'A buffer read as integer vertex references by an indexed draw.'],
  ['Instance', 'The native WebGPU entry context used for adapter discovery and surface creation.'],
  ['Instance count', 'The number of repeated instances requested by a draw; one in this book, distinct from the WebGPU Instance object.'],
  ['Interpolation', 'Producing per-fragment values from vertex-stage outputs across primitive coverage.'],
  ['Limit', 'A bound on supported sizes/counts/alignments; device limits constrain valid resource configurations.'],
  ['Linear-light color', 'RGB values proportional to light intensity, used for shader color calculations and blending here.'],
  ['Load operation', 'The render-pass decision to clear an attachment or preserve its previous contents at pass start.'],
  ['Local coordinates', 'Positions relative to the character, using a unit rectangle before scale and translation.'],
  ['Location', 'A numeric stage-interface identifier for attributes, interpolated values, or fragment color outputs; scoped to that interface.'],
  ['Logical window units', 'SDL’s window coordinate extent, potentially different from framebuffer pixels on high-density displays.'],
  ['Mapping', 'Making an allowed buffer range accessible to the CPU, under usage and synchronization rules; not needed for our writes.'],
  ['Mip level', 'One resolution level of a texture. The surface and sprite textures here use only level zero.'],
  ['Multisampling', 'Representing multiple coverage samples per pixel; the final pipeline uses one sample.'],
  ['Native ABI', 'The binary contract of function signatures, calling conventions, structs, enum values, and exported symbols.'],
  ['NDC', 'Normalized device coordinates obtained by dividing clip x/y/z by w; x/y span −1..+1 and z spans 0..1.'],
  ['Offset', 'A byte displacement within a record, buffer, or binding; its origin depends on which descriptor field uses it.'],
  ['Pipeline layout', 'An ordered set of bind group layouts describing a pipeline’s resource interface.'],
  ['Pixel', 'An element of an output image grid; geometry describes coverage over pixels rather than listing them individually.'],
  ['Premultiplied alpha', 'A convention where RGB already includes multiplication by alpha, requiring matching blend factors.'],
  ['Presentation', 'Handing a rendered surface image to the window system for display; separate from command submission.'],
  ['Primitive topology', 'The rule that assembles vertex references into primitives, here groups of three for TriangleList.'],
  ['Queue', 'The device’s ordered work stream receiving submissions and data writes.'],
  ['Rasterization', 'Determining primitive sample coverage and interpolating shader values across that coverage.'],
  ['Release', 'Dropping one native application-owned reference; backend destruction may be deferred by other references or in-flight work.'],
  ['Render pass', 'A recording scope declaring attachments and their load/store behavior, within which rendering commands are encoded.'],
  ['Render pipeline', 'A stable object combining shader entry points, input layouts, resource layout, and fixed rendering/output state.'],
  ['Resolve target', 'A texture view receiving a resolved single-sample result from multisampled rendering; nil in our renderer.'],
  ['Resource lifetime', 'The span over which an object and its dependencies remain valid, including native references and backend work.'],
  ['Sampler', 'A device resource defining texture filtering/addressing. The room renderer uses nearest filtering and clamp-to-edge addressing.'],
  ['Scissor rectangle', 'A framebuffer-space restriction on draw writes that crops without rescaling the geometry.'],
  ['Shader', 'A GPU program executed as a selected pipeline stage.'],
  ['Shader module', 'An object containing shader code that pipelines select entry points from.'],
  ['Shader visibility', 'The stages allowed to access a binding according to its bind group layout.'],
  ['sRGB', 'A nonlinear RGB encoding commonly used for displayed color; alpha does not use its transfer function.'],
  ['Storage buffer', 'A shader-bound buffer supporting larger data structures and optionally shader writes; unnecessary for this small uniform block.'],
  ['Store operation', 'The render-pass decision to preserve or discard attachment results at pass end.'],
  ['Straight alpha', 'Unmultiplied RGB plus a separate opacity component; the convention used by this book’s blend state.'],
  ['Stride', 'The byte distance from the start of one vertex record to the next record in a vertex stream.'],
  ['Submission', 'Handing a finished command buffer to a queue; it does not imply CPU-visible completion.'],
  ['Surface', 'A native presentation destination wrapped by WebGPU, associated with a window or platform rendering object.'],
  ['Surface capabilities', 'Formats, usage flags, and presentation/compositing choices supported by a surface/adapter pair.'],
  ['Surface configuration', 'The device, extent, format, usage, and presentation choices governing acquired images.'],
  ['Surface texture', 'The current presentable texture reference acquired for a frame, then presented and released.'],
  ['Swap chain', 'A common name in other APIs for managed presentable images; native WebGPU exposes surface configuration and acquisition.'],
  ['Texel', 'An element of texture storage; a surface texture’s texels provide the output image storage.'],
  ['Texture', 'A structured image-storage resource with format, dimensions, usage, and subresources.'],
  ['Texture format', 'The representation and interpretation of texels, including channel widths, numeric type, and optional sRGB encoding.'],
  ['Texture view', 'An interpretation and subresource selection of a texture for attachment or shader access.'],
  ['Uniform buffer', 'A shader-readable parameter buffer shared across shader invocations, updated explicitly from the CPU.'],
  ['Vertex', 'An input record describing a geometric point and associated attributes.'],
  ['Vertex buffer', 'A buffer bound as a source of vertex attributes according to a pipeline’s vertex layouts.'],
  ['Vertex buffer slot', 'The numbered input stream to which a buffer is bound; distinct from attribute locations.'],
  ['Vertex shader', 'The stage producing clip positions and per-vertex outputs from fetched inputs and bound resources.'],
  ['Viewport', 'The mapping from NDC into a framebuffer region. The room renderer sets a centered, aspect-preserving viewport.'],
  ['WGSL', 'WebGPU Shading Language, used for this application’s vertex and fragment programs.'],
  ['World coordinates', 'The position system used by game state, before camera subtraction and projection.'],
  ['Write mask', 'The color channels permitted to be written by a pipeline target.'],
  ['AABB', 'Axis-aligned bounding box: here a ground-plane rectangle with minimum corner and size.'],
  ['Atlas / sprite sheet', 'One texture containing multiple image regions selected using texture-coordinate rectangles.'],
  ['Animation phase', 'Elapsed position within a repeating frame cycle; measured in seconds, not render count.'],
  ['Batch / texture run', 'Consecutive sprites sharing a texture, encoded as one indexed draw without changing scene order.'],
  ['Footprint', 'The small ground-contact collision shape, independent of a character image’s visual height or transparency.'],
  ['Gutter', 'Padding between image regions that helps prevent neighboring atlas frames from bleeding into sampling.'],
  ['Letterboxing', 'Unused framebuffer bars around an aspect-preserving view of a fixed world extent.'],
  ['Nearest filtering', 'Selecting the nearest texel rather than blending neighboring texels during sampling.'],
  ['Painter’s order', 'Drawing later items over earlier ones; important because transparent blending is order-dependent.'],
  ['Sprite anchor', 'An authored point placing image geometry relative to a game position, such as the boots.'],
  ['Swept axis collision', 'Clipping a requested axis displacement at crossed obstacle edges rather than testing only its endpoint.'],
  ['Texture ID', 'A renderer-owned slot identifier borrowed by the game; not a WebGPU handle or persistent save identifier.'],
  ['UV coordinates', 'Two coordinates selecting locations in a texture; our Sprite API uses normalized image bounds.'],
];

export const appendices = [
{slug:'final-source', title:'Complete final source', deck:'The exact final room application: Odin packages, WGSL, and downloadable image assets. No omitted graphics helpers.', body:
  p('These listings are generated from the same source model as <code>project/</code> and checkpoint 23. Their escaped HTML contents preserve every source byte. The original untextured foundation remains in checkpoint 18. Save the files under the names shown, or build the provided project tree. Host application code is entirely Odin; the shader is WGSL. Authoring and verification scripts are not application dependencies.')
  + code(`project/
  src/
    main.odin       — SDL lifetime, input translation, update/draw ordering
  renderer/
    platform.odin   — explicit SDL native surface bridge
    gpu.odin        — connection, callbacks, capabilities, configuration
    renderer.odin   — public drawing API, pipeline, buffers, frame encoding
    texture.odin    — PNG decode, explicit texture upload and binding
    sprites.wgsl    — world-to-clip transform and texture sampling
  game/
    game.odin       — assets, movement, scene composition, F1 overlay
    collision.odin  — authored solids and swept axis collision
    animation.odin  — directional frame metadata and seconds-based cycle
  assets/
    room.png        — background image, 1536 × 1024
    player-walk.png — transparent animated character sheet, 1254 × 1254
    player.png      — earlier still character used by checkpoints 19–22
    PROMPTS.json, ANIMATION-PROMPT.txt, ANIMATION-ALPHA-PROMPT.txt`, 'text')
  + p('Build from the book root using the <a href="build.html">platform-specific dependency instructions</a>. Odin compiles src and its imported game/renderer packages. WGSL and the two required PNGs are embedded at build time, so the executable does not depend on its working directory. Copying only main.odin is not sufficient.')
  + s('Image assets',p('<a download href="../project/assets/room.png">room.png</a> · <a download href="../project/assets/player-walk.png">player-walk.png</a> · <a download href="../project/assets/player.png">earlier player.png</a>. Preserve the assets directory beside the three packages. <a href="../project/assets/PROMPTS.json">Room/player prompts</a> · <a href="../project/assets/ANIMATION-PROMPT.txt">Animation prompt</a> · <a href="../project/assets/ANIMATION-ALPHA-PROMPT.txt">Transparency edit prompt</a>. These are generated, checked-in art assets; no image-generation service runs in the native application.'))
  + Object.entries(finalSource).map(([file,source])=>`<section id="${file.replaceAll('/','-').replaceAll('.','-')}"><h2>${file}</h2><p><a download href="../project/${file}">Download ${file}</a></p><figure class="code-block"><figcaption>project/${file} · complete file</figcaption><pre><code class="language-${file.endsWith('.wgsl')?'wgsl':'odin'}" data-source="project/${file}">${esc(source)}</code></pre></figure></section>`).join('')},
{slug:'build', title:'Reproducible desktop builds', deck:'Install one matching toolchain, verify its libraries, then build any chapter without changing application code.', body:
  s('Version and platform contract', p('Use Odin <code>dev-2026-09</code> with its bundled vendor packages, wgpu-native <code>v29.0.1.1</code>, and SDL <code>3.4.16</code>. The Odin SDL declarations identify version 3.4.2; the runtime baseline is the later compatible 3.4.16 bugfix release. Do not combine a different native WebGPU binary with these descriptor declarations. Use a dedicated writable Odin installation for this book so adding libraries does not modify another project’s toolchain.')
  + table(['Platform', 'Odin archive architecture', 'wgpu archive architecture', 'Surface / backend'], [['macOS Apple Silicon', 'arm64', 'macos-aarch64', 'SDL Metal view / Metal; executed here'], ['macOS Intel', 'amd64', 'macos-x86_64', 'SDL Metal view / Metal; instructions only'], ['Windows 64-bit', 'amd64', 'windows-x86_64-msvc', 'Win32 HWND / D3D12 or Vulkan; instructions only'], ['Linux 64-bit', 'amd64 or arm64', 'linux-x86_64 or linux-aarch64', 'X11 or Wayland / Vulkan; instructions only']])
  + p('Although wgpu-native publishes other architectures, the pinned Odin wgpu import only covers the desktop combinations above. This book does not claim Windows ARM64, mobile, browser, or headless-surface support. Backend availability still depends on drivers and the actual adapter. Windows and Linux source branches are provided, but no runtime verification on those platforms was performed in this workspace.'))
  + s('1. Install the matching Odin release', p('Download the appropriate <a href="https://github.com/odin-lang/Odin/releases/tag/dev-2026-09">official Odin release archive</a> from the table below. Extract it to a writable tools directory, keeping its <code>core</code>, <code>base</code>, and <code>vendor</code> directories beside the compiler. Add that extracted compiler directory to PATH, or invoke it by its absolute path. Run <code>odin version</code> and <code>odin root</code> to confirm which installation you are using. The tested compiler reports <code>dev-2026-09:a2fb372b7</code>.')
  + p('macOS needs the Apple command-line developer tools/SDK and a Metal-capable Mac. Windows needs Visual Studio Build Tools with the Desktop development with C++ workload and a Windows SDK, even though application code is Odin: these supply the system linker and libraries. Linux needs a compatible system linker/libc and graphics drivers; use the binary archive for the machine architecture. Refer to <a href="https://odin-lang.org/docs/install/">Odin’s official installation prerequisites</a> if the compiler itself cannot run.')
  + table(['Platform', 'Pinned Odin archive'], lock.assets.filter(x=>x.component==='odin').map(x=>[x.name.replace('odin-','').replace('-dev-2026-09.tar.gz','').replace('-dev-2026-09.zip',''),`<a href="${x.url}">${x.name}</a>`])))
  + s('2. Put wgpu-native where the binding looks', p('Download the matching <a href="https://github.com/gfx-rs/wgpu-native/releases/tag/v29.0.1.1">wgpu-native release</a> archive. Inside the Odin root, the binding expects a directory named after the archive without <code>.zip</code>, then an inner <code>lib</code> directory. Extract <em>into</em> that named directory; do not accidentally insert a second identical directory level. The examples below use <code>BOOK_ODIN_ROOT</code>, a task-specific variable, to avoid altering system home variables.')
  + code(`BOOK_ODIN_ROOT="$(odin root)"
curl -L --fail -o wgpu.zip https://github.com/gfx-rs/wgpu-native/releases/download/v29.0.1.1/wgpu-macos-aarch64-release.zip
shasum -a 256 wgpu.zip
mkdir -p "$BOOK_ODIN_ROOT/vendor/wgpu/lib/wgpu-macos-aarch64-release"
unzip wgpu.zip -d "$BOOK_ODIN_ROOT/vendor/wgpu/lib/wgpu-macos-aarch64-release"`, 'shell', 'macOS Apple Silicon · run in a download directory; compare hash below before extraction')
  + p('For Intel macOS substitute <code>wgpu-macos-x86_64-release</code> in both places. Linux uses <code>wgpu-linux-x86_64-release</code> or <code>wgpu-linux-aarch64-release</code> and <code>sha256sum wgpu.zip</code>. The exact extracted static library path is shown below. The default binding links a static release build of wgpu-native. <code>-debug</code> for Odin does not switch the native library to a debug archive; that separate switch is <code>-define:WGPU_DEBUG=true</code> and is not used here.')
  + code(`vendor/wgpu/lib/wgpu-macos-aarch64-release/lib/libwgpu_native.a
vendor/wgpu/lib/wgpu-macos-x86_64-release/lib/libwgpu_native.a
vendor/wgpu/lib/wgpu-linux-x86_64-release/lib/libwgpu_native.a
vendor/wgpu/lib/wgpu-linux-aarch64-release/lib/libwgpu_native.a
vendor/wgpu/lib/wgpu-windows-x86_64-msvc-release/lib/wgpu_native.lib`, 'text', 'Paths relative to odin root; install only your platform’s archive')
  + code(`$BookOdinRoot = (odin root).Trim()
Invoke-WebRequest https://github.com/gfx-rs/wgpu-native/releases/download/v29.0.1.1/wgpu-windows-x86_64-msvc-release.zip -OutFile wgpu.zip
Get-FileHash wgpu.zip -Algorithm SHA256
Expand-Archive wgpu.zip -DestinationPath "$BookOdinRoot/vendor/wgpu/lib/wgpu-windows-x86_64-msvc-release"`, 'powershell', 'Windows x64 · compare the hash before extracting')
  + p('The static native library still depends on operating-system libraries. Odin’s vendor foreign-import declarations list those system libraries for each platform. Do not replace them with custom handwritten imports. With the default static wgpu build, there is no wgpu-native DLL/dylib/so to copy beside the executable. SDL remains a separate dynamic dependency in these instructions.'))
  + s('3a. SDL on macOS', p('The locally verified runtime was Homebrew SDL3 3.4.16. <code>brew install sdl3</code> is convenient only while it resolves to that version; it is not a permanent version pin. For a versioned installation, download the <a href="https://github.com/libsdl-org/SDL/releases/download/release-3.4.16/SDL3-3.4.16.tar.gz">SDL3 3.4.16 source archive</a>, verify its hash, and build a shared library into a writable prefix. CMake and a build tool are dependency-building tools; they do not become part of the Odin application.')
  + code(`curl -L --fail -o SDL3-3.4.16.tar.gz https://github.com/libsdl-org/SDL/releases/download/release-3.4.16/SDL3-3.4.16.tar.gz
shasum -a 256 SDL3-3.4.16.tar.gz
tar -xzf SDL3-3.4.16.tar.gz
BOOK_SDL_PREFIX="$PWD/sdl-install"
cmake -S SDL3-3.4.16 -B sdl-build -DCMAKE_BUILD_TYPE=Release -DCMAKE_INSTALL_PREFIX="$BOOK_SDL_PREFIX" -DCMAKE_INSTALL_LIBDIR=lib -DSDL_SHARED=ON -DSDL_STATIC=OFF -DSDL_TESTS=OFF
cmake --build sdl-build --config Release --parallel
cmake --install sdl-build --config Release`, 'shell', 'macOS · pinned source build, no system installation required')
  + p('From the book root, build with the absolute install prefix retained in <code>BOOK_SDL_PREFIX</code>. The -L option resolves the library during linking; the rpath resolves @rpath-based dynamic library names at runtime. Paths embedded in the linker flag string below are assumed not to contain spaces; use a simple tools prefix for reproducibility. For Homebrew Apple Silicon use <code>/opt/homebrew/lib</code>; for Intel Homebrew normally <code>/usr/local/lib</code>.')
  + code(`mkdir -p build
odin build project/src -out:build/native-pixels -debug -vet -extra-linker-flags:"-L$BOOK_SDL_PREFIX/lib -Wl,-rpath,$BOOK_SDL_PREFIX/lib"
./build/native-pixels`, 'shell', 'macOS · final program with source-built SDL')
  + code(`odin build project/src -out:build/native-pixels -debug -vet -extra-linker-flags:"-L/opt/homebrew/lib"
./build/native-pixels`, 'shell', 'macOS · locally verified Homebrew configuration')
  + p('Terminal launching is sufficient; no Xcode project or app bundle is required to follow the book. The renderer’s Metal view is created by SDL. A distributable .app bundle and code signing are separate packaging concerns, not rendering setup.'))
  + s('3b. SDL on Linux', p('Install a C/C++ toolchain, CMake, Ninja or Make, pkg-config, and SDL’s window-backend development dependencies before building the pinned SDL source. On Ubuntu 24.04-style systems, a focused desktop starting set is below. Package names vary by distribution. SDL’s <a href="https://wiki.libsdl.org/SDL3/README-linux">Linux build dependency guide</a> lists broader backend options. You also need a working Vulkan loader and a driver for your GPU; an installed loader alone is not a GPU driver.')
  + code(`sudo apt-get install build-essential cmake ninja-build pkg-config curl unzip \
  libx11-dev libxext-dev libxrandr-dev libxcursor-dev libxfixes-dev libxi-dev \
  libxss-dev libxtst-dev libxkbcommon-dev libwayland-dev wayland-protocols \
  libdecor-0-dev libegl1-mesa-dev libdrm-dev libgbm-dev libvulkan1
# Install the Vulkan driver appropriate to your GPU separately.
# For supported Mesa GPUs, the distribution package is commonly mesa-vulkan-drivers.`, 'shell')
  + p('Download and extract the same SDL source archive as macOS, checking it with <code>sha256sum</code>. Run the CMake configure/build/install commands above with a Linux <code>BOOK_SDL_PREFIX</code>. Inspect CMake’s summary and confirm that X11 and/or Wayland video support was enabled. Optional audio-device warnings do not require adding audio to this application, but missing both desktop window backends is a blocker.')
  + code(`mkdir -p build
odin build project/src -out:build/native-pixels -debug -vet -extra-linker-flags:"-L$BOOK_SDL_PREFIX/lib -Wl,-rpath,$BOOK_SDL_PREFIX/lib"
./build/native-pixels
# Optional backend-specific manual checks in a session supporting that backend:
SDL_VIDEO_DRIVER=x11 ./build/native-pixels
SDL_VIDEO_DRIVER=wayland ./build/native-pixels`, 'shell')
  + p('Run inside an actual desktop session with permission to access its display and GPU. A dummy SDL video driver cannot supply a presentable X11/Wayland surface. A Vulkan adapter failure should be investigated with the installed graphics driver and surface backend before changing shader code. These Linux instructions and branches have not been executed on a Linux machine during this edition’s verification.'))
  + s('3c. SDL on Windows x64', p('Download the <a href="https://github.com/libsdl-org/SDL/releases/download/release-3.4.16/SDL3-devel-3.4.16-VC.zip">SDL3 3.4.16 Visual C++ development archive</a>, not the MinGW archive. The pinned vendor:sdl3 Windows import names <code>SDL3.lib</code> relative to that package. Copy the matching x64 import library into the dedicated Odin installation’s vendor/sdl3 directory and put its matching DLL beside the executable. This intentionally replaces that dedicated installation’s bundled SDL library pair with the pinned runtime pair.')
  + code(`$BookOdinRoot = (odin root).Trim()
Invoke-WebRequest https://github.com/libsdl-org/SDL/releases/download/release-3.4.16/SDL3-devel-3.4.16-VC.zip -OutFile SDL3-devel.zip
Get-FileHash SDL3-devel.zip -Algorithm SHA256
Expand-Archive SDL3-devel.zip -DestinationPath sdl-download
Copy-Item sdl-download/SDL3-3.4.16/lib/x64/SDL3.lib "$BookOdinRoot/vendor/sdl3/SDL3.lib"
New-Item -ItemType Directory -Force build
Copy-Item sdl-download/SDL3-3.4.16/lib/x64/SDL3.dll build/SDL3.dll
odin build project/src -out:build/native-pixels.exe -debug -vet
./build/native-pixels.exe`, 'powershell', 'Run build commands from the book root; download directory paths are relative to that root here')
  + p('Use the x64 compiler, SDL library, and wgpu-native MSVC archive together. Keep the SDK system libraries available to Odin’s linker. A missing SDL3.dll is a runtime dependency problem; a missing symbol during linking usually means a mismatched import library. No SDL2main or hand-written C entry point is required for this Odin main procedure. Windows source is supplied but was not executed here.'))
  + s('4. Build any chapter and compare the final source', code(`odin check checkpoints/12/src -vet
odin build checkpoints/12/src -out:build/chapter-12 -debug
odin build project/src -out:build/native-pixels -debug
# Append your platform's SDL linker flags as described above.`, 'shell')
  + p('The first chapter only prints versions. Chapters 2–6 deliberately do not produce WebGPU pixels. Chapter 7 clears; chapter 8 draws a triangle; chapters 9–10 add buffers; chapter 11 transforms on the CPU; chapter 12 moves the transform to uniforms/WGSL; chapter 13 handles logical scaling; chapter 14 proves input through color; chapter 15 adds movement; chapter 16 adds the face and blending. Chapters 3, 17, and 18 intentionally retain their preceding runnable implementation.')
  + p('Chapters 19–23 extend the foundation with PNG textures, separate renderer/game packages, authored collision, an F1 overlay, and directional animation. Their assets are embedded at compile time. The same Odin release includes vendor:stb/image and its native decoder library; no additional image package installation or host C code is required. Keep each checkpoint’s assets directory alongside its imported packages. The full final program is checkpoint 23 and project/src; run with WASD/arrows and toggle diagnostics with F1.')
  + note('If your Odin installation lacks the STB archive', 'The pinned decoder binding checks for vendor/stb/lib/stb_image.a on Linux, vendor/stb/lib/darwin/stb_image.a on macOS, and vendor/stb/lib/stb_image.lib on Windows. Release installations normally supply these; a source checkout or a mismatched Unix architecture may require rebuilding them. In your dedicated writable Odin installation, run <code>sh "$(odin root)/vendor/stb/src/build_stb.sh"</code> with a working system C compiler. This builds the third-party decoder, not the application host code. Windows users should retain the compiler release’s matching bundled library. Inspect the pinned vendor script before running it in a customized installation.')
  + note('Reading is offline; building needs installed dependencies', 'Open index.html directly to read. There are no CDN fonts, scripts, fetched chapter fragments, or server routes. Once native dependencies are installed, the application also builds and runs without a network connection. External reference links are optional further reading.'))
  + s('Release archive hashes', p('These SHA-256 values came from official GitHub release asset metadata, recorded 2026-09-13. Compare a downloaded archive before extraction. They fix the chosen release artifacts; OS drivers, system SDKs, and a locally compiled SDL binary are still platform prerequisites rather than bit-for-bit pinned system images. The same metadata is available in <a download href="../dependency-lock.json">dependency-lock.json</a>.')
  + table(['Archive', 'SHA-256'], lock.assets.map(x=>[`<a href="${x.url}">${x.name}</a>`,`<code class="hash">${x.sha256}</code>`]))
  + table(['SDL archive', 'SHA-256'], [['SDL3-3.4.16.tar.gz','<code class="hash">7322236cd12090c3eb40b9728be4d49c76f66ad17d04369584d4ecad5cf77c68</code>'],['SDL3-devel-3.4.16-VC.zip','<code class="hash">1a784cb2a5c64d56fe7a62090fe9d242d9865f235e4ea9678f1a6ba4e693e7de</code>']]))},
{slug:'glossary', title:'Glossary', deck:'The vocabulary used in this renderer, with the distinctions that matter in code.', body:
  p('Use the page search in your browser to find a term. Definitions describe this project’s usage; they do not attempt to enumerate every WebGPU feature.')
  + `<dl class="glossary">${terms.sort((a,b)=>a[0].localeCompare(b[0])).map(([term,meaning])=>`<dt id="${term.toLowerCase().replace(/[^a-z0-9]+/g,'-')}">${esc(term)}</dt><dd>${esc(meaning)}</dd>`).join('')}</dl>`},
{slug:'cheat-sheets', title:'Initialization, frame, and lifetime sheets', deck:'A compact map to use after the explanations—not a replacement for them.', body:
  s('Final room: initialization',flow('The renderer owns GPU mechanism; the game selects content.',['SDL window','renderer.Init','GPU resources','game.Init','PNG uploads'])
  + p('renderer.Init retains the foundation’s instance/surface/adapter/device/queue/capability setup, then creates three GPU buffers, view and texture layouts, sampler, pipeline, view group, and white texture. game.Init selects the spawn/speed and uploads room.png and player-walk.png through Load_PNG. The decoder and shader module are temporary; sampled textures, views, and groups live until Shutdown.'))
  + s('Final room: one frame',code(`SDL events → held-key state / F1 edge → capped dt
game.Update: requested direction → swept X/Y collision → resolved position
Animate: facing + actual displacement + seconds → animation phase
renderer.Begin_Frame: clear CPU sprite list
game.Draw: room → current player frame/UVs → optional debug outlines
renderer.End_Frame:
  process native callbacks → check faults → refresh surface dimensions
  acquire surface texture → create texture view
  write 16-byte view uniform + used 32-byte vertex records
  create encoder → begin Clear/Store pass
  set viewport/scissor, pipeline, view group, vertex/index buffers
  for each contiguous texture run: bind texture group → draw indexed
  end pass → finish command buffer → submit → present
  release frame-local native references
Skipped: throttle; Fatal: leave loop and clean up`, 'text'))
  + s('Final room: binding facts',table(['Contract','Value'],[
    ['World','384 × 256; fixed regardless of window size'],
    ['Vertex','32 bytes: position offset 0/location 0, UV offset 8/location 1, tint offset 16/location 2'],
    ['Group 0','Binding 0: 16-byte uniform; vec2 world size + vec2 padding; vertex visibility'],
    ['Group 1','Binding 0: float 2D texture view; binding 1: nearest sampler; fragment visibility'],
    ['Images','RGBA8UnormSrgb, TextureBinding + CopyDst, one mip, one sample'],
    ['Capacity','256 sprites, 8 textures including internal white; no per-frame recorder heap allocations'],
    ['Draws','room run + player run + optional white debug run; indices are absolute Uint16 references'],
    ['Player scale','0.16 world units per source texel; roughly 43–44 units tall, anchored at the feet; 8 × 4 collision footprint'],
    ['Animation','Four direction rows, four frame columns, 0.1 seconds per frame; selected by game, sampled by renderer'],
  ]))
  + note('The original foundation follows', 'The remaining sheets describe checkpoint 18 specifically. Its one-character uniform and 24-byte vertex are not the final sprite renderer’s ABI.')
  + s('Foundation: initialization', flow('Dependencies determine startup order.', ['Instance', 'Surface', 'Adapter', 'Device', 'Queue'])
  + table(['Step', 'Function in our code', 'Persistent result'], [['SDL init and window', '<code>main</code>', 'SDL window'], ['Instance and native surface', '<code>gpu_init → platform_surface_create</code>', 'Instance, surface, Metal view if needed'], ['Adapter, device, queue', '<code>gpu_request_device</code>', 'Connection handles, diagnostic callbacks'], ['Capabilities and configure', '<code>gpu_choose_surface → gpu_refresh_surface</code>', 'Selected format/modes, current extent'], ['Geometry and shaders', '<code>renderer_init</code>', 'Vertex/index buffers, temporary shader module'], ['Resources and pipeline', '<code>renderer_init</code>', 'Uniform buffer, bind group, pipeline'], ['Game state', '<code>main</code>', 'Position, size, tint, speed']])
  + p('The common shorthand “shader → pipeline → buffers” describes conceptual dependencies, not a required total order. Our renderer creates static geometry buffers before the shader, and uniform storage before binding it. Pipeline creation depends on layouts and format, not on the order in which independent vertex storage was allocated.'))
  + s('Per-frame sequence', code(`process SDL events
measure elapsed seconds; advance previous timestamp
process native WebGPU completion events; stop on fault
query logical size; suspend update/render when minimized or zero
sample keyboard → normalize direction → update and clamp position
refresh physical surface extent before acquisition
write the 48-byte uniform block
acquire current surface texture → create texture view
create encoder → begin color pass (Clear / Store)
set pipeline → bind group → vertex buffer → index buffer
draw indexed: 6 indices, 1 instance
end pass → finish encoder → submit command buffer
present surface
release command buffer, pass, encoder, view, texture`, 'text'))
  + s('Four kinds of work', table(['Frequency', 'Operations'], [['Once', 'Instance, window/surface bridge, adapter/device/queue, capabilities, static buffers, pipeline, bind group'], ['On resize/status refresh', 'SurfaceConfigure when physical extent changes or dirty flag is set; logical projection updates through the uniform'], ['Per rendered frame', 'Uniform write, current texture/view, encoder/pass/command buffer, bind and draw, submit/present, frame-local releases'], ['When assets change', 'A new geometry upload or shader/pipeline rebuild as appropriate; no asset changes occur during the final program']]))
  + s('Binding and byte facts', table(['Contract', 'Checkpoint 18 value'], [['Vertex record size / stride', '24 bytes'], ['Position attribute', 'Float32x2, offset 0, shader input location 0'], ['Color attribute', 'Float32x4, offset 8, shader input location 1'], ['Vertex buffer slot', '0'], ['Index type / count', 'Uint16 / 6'], ['Uniform binding', 'Group 0, binding 0, Vertex visibility, offset 0, size 48'], ['Uniform member offsets', 'position 0; size 8; view_size 16; camera 24; tint 32'], ['Color format', 'Selected BGRA8UnormSrgb or RGBA8UnormSrgb'], ['Projection', 'x = 2×pixel_x/W − 1; y = 1 − 2×pixel_y/H; z=0; w=1'], ['Blend RGB', 'source×source_alpha + destination×(1−source_alpha)']]))
  + s('Cleanup', p('End each pass before finishing its encoder. Submit a finished command buffer only once. Release frame-local references before refreshing the next frame’s configuration. On application shutdown, release renderer references, drain the device queue, unconfigure the surface, release queue/device/adapter, release surface and native view, release instance, destroy the window, then quit SDL. Submitted work retains needed backend resources independently of our released handles.'))},
{slug:'sources', title:'Sources and verification record', deck:'What was pinned, what was read, what was executed, and what still requires platform testing.', body:
  s('Primary API references', p('This book’s implementation was checked against the installed Odin vendor declarations and the pinned wgpu-native implementation, not reconstructed from older tutorials. The prose and project are original. The following primary sources establish the relevant API contracts; the chapter text contains the working explanations, so external pages are not required to read the book.')
  + list([
    '<a href="https://github.com/odin-lang/Odin/releases/tag/dev-2026-09">Odin dev-2026-09 release</a> — toolchain and asset names.',
    '<a href="https://github.com/odin-lang/Odin/blob/dev-2026-09/vendor/wgpu/wgpu.odin">Pinned Odin WebGPU declarations</a> — descriptors, handles, enums, native functions, and thin slice wrappers.',
    '<a href="https://github.com/odin-lang/Odin/blob/dev-2026-09/vendor/wgpu/wgpu_native_types.odin">Pinned native extensions/version</a> and <a href="https://github.com/odin-lang/Odin/blob/dev-2026-09/vendor/wgpu/wgpu_native.odin">native polling API</a>.',
    '<a href="https://github.com/odin-lang/Odin/tree/dev-2026-09/vendor/sdl3">Pinned SDL3 bindings</a> — boolean returns, C integer pointers, keyboard scancodes, window properties.',
    '<a href="https://github.com/gfx-rs/wgpu-native/releases/tag/v29.0.1.1">wgpu-native 29.0.1.1 release</a> and <a href="https://github.com/gfx-rs/wgpu-native/blob/v29.0.1.1/src/lib.rs">implementation source</a> — inline request callbacks, acquisition statuses, presentation, and release semantics.',
    '<a href="https://webgpu-native.github.io/webgpu-headers/Surfaces.html">Native WebGPU surface documentation</a> — creation, capabilities, configuration, frame ownership. This rolling reference is explanatory; pinned bindings control the code.',
    '<a href="https://wiki.libsdl.org/SDL3/SDL_GetWindowProperties">SDL window properties</a>, <a href="https://wiki.libsdl.org/SDL3/SDL_Metal_CreateView">Metal view creation</a>, and <a href="https://wiki.libsdl.org/SDL3/SDL_Metal_DestroyView">view destruction</a> — native window bridge.',
    '<a href="https://wiki.libsdl.org/SDL3/SDL_GetWindowSizeInPixels">SDL physical drawable dimensions</a>, <a href="https://wiki.libsdl.org/SDL3/SDL_GetWindowSize">logical dimensions</a>, <a href="https://wiki.libsdl.org/SDL3/SDL_GetKeyboardState">keyboard state</a>, and <a href="https://wiki.libsdl.org/SDL3/SDL_GetTicksNS">nanosecond clock</a>.',
    '<a href="https://www.w3.org/TR/webgpu/">WebGPU specification</a> — pipeline, resources, coordinate and execution model. Native surface and callback details differ from the JavaScript API.',
    '<a href="https://www.w3.org/TR/WGSL/#alignment-and-size">WGSL memory layout</a> and <a href="https://www.w3.org/TR/WGSL/#pipeline-inputs-outputs">stage interfaces</a> — uniform layout and shader IO.',
    '<a href="https://github.com/libsdl-org/SDL/releases/tag/release-3.4.16">SDL 3.4.16 release</a> — reproducible runtime baseline.',
    '<a href="https://github.com/odin-lang/Odin/blob/dev-2026-09/vendor/stb/image/stb_image.odin">Pinned Odin image decoder declarations</a> and <a href="https://www.w3.org/TR/WGSL/#texturesample">WGSL textureSample</a> — native RGBA decoding and shader sampling. QueueWriteTexture, sampler, texture layout, and copy/readback descriptors were also inspected in the installed matching WebGPU bindings.',
  ]))
  + s('Verification performed', '<div id="verification-record"><p>The checked-in <a href="../verification.json">verification.json</a> records automated site/source checks and locally executed native checks. See its test descriptions for the difference between compiling, exercising real presentation, and manual input/visual testing.</p></div>'
  + p('The native test environment is macOS arm64, Odin dev-2026-09:a2fb372b7, SDL 3.4.16, and wgpu-native 29.0.1.1. Each distinct foundation rendering checkpoint, 7 through 16, completed 12 successful surface presents. The preserved checkpoint-18 harness counts 100 actual successful SurfacePresent calls, requests two window resizes, checks the final configured physical extent against SDL, and feeds 100 deterministic updates into the actual movement procedure. Its final position is (520,100), from a starting value of (120,100). Initial Occluded results are skipped and are not counted as presented frames. This is not a simulated WebGPU implementation.')
  + p('The extended room harness completes 450 successful presents with actual room and animated-player PNG uploads, two size requests, scripted chair/north-wall collisions, and a synthetic SDL F1 press. It checks that all four walk-frame columns were presented and the final state is a north-facing blocked idle. Framebuffer readback captures below show actual GPU output, not a browser reconstruction. The screenshot harness alone enables surface CopySrc when supported and waits for mapped readback; these test-only features do not add synchronization or requirements to the canonical renderer. Automated launches intermittently remained occluded and timed out; the bounded harness now repeats a window visibility request while waiting for its first image. The final run passed. Skipped iterations were never counted as successful frames.')
  + `<figure class="art-preview"><img src="../assets/room-gameplay.png" width="2304" height="1536" alt="Captured native WebGPU output with animated player in the room"><figcaption>Actual GPU framebuffer from chapter 23. The final player uses 0.16 world units per source texel (roughly 43–44 units tall).</figcaption></figure><figure class="art-preview"><img src="../assets/room-collision.png" width="1440" height="960" alt="Captured native WebGPU output after resize with orange furniture colliders and green player feet"><figcaption>Actual GPU framebuffer after resizing. The larger sprite remains anchored to the same green 8 × 4 feet box; orange outlines show solid furniture and walls.</figcaption></figure>`
  + p('Compilation alone cannot establish that WGSL validates on the backend: shaders are embedded text until runtime. The native smoke check supplies that additional evidence. Scripted movement checks the update-to-uniform/render path; it does not establish physical keyboard delivery, visual pixel correctness, or every minimize/loss path. Cross-platform runtime testing remains a documented limitation. The <a href="../README.md">README</a> gives commands for rerunning checks.'))
  + s('Manual acceptance pass', list(['Run project/src, hold each WASD and arrow direction, verify release stops motion and opposite keys cancel.', 'Compare diagonal and cardinal speeds; the diagonal should not be faster.', 'Resize smaller and larger, minimize and restore, and check that the character keeps proportions and stays reachable.', 'Move between displays with different scaling if available; compare logical size with physical drawable size.', 'Close normally and confirm there are no validation diagnostics. If a failure occurs, retain the first labeled error message.']))
  + s('Rebuilding the book', p('The static HTML is already generated. Node is needed only to rebuild/check authoring output. <code>authoring/source.mjs</code> constructs exact snapshots with asserted replacements. Chapter excerpts come from those snapshots, each chapter includes the full end state and an exact patch, and the final-source appendix is generated from the canonical final snapshot. The verifier compares the resulting files and HTML source blocks byte-for-byte and checks relative paths/fragments. No code snippets are fetched at reading time.'))},
];
