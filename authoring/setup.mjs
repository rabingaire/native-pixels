import fs from 'node:fs';
import {p, section as s, code, table, note} from './html.mjs';
const lock = JSON.parse(fs.readFileSync(new URL('../dependency-lock.json', import.meta.url)));

// Shared by the first lesson and the installation reference.
export const installation =
  s('Choose the version for your computer', p('Use Odin <code>dev-2026-09</code> with its bundled vendor packages, wgpu-native <code>v29.0.1.1</code>, and SDL <code>3.4.16</code>. The Odin SDL declarations identify version 3.4.2; the runtime baseline is the later compatible 3.4.16 bugfix release. Do not combine a different native WebGPU binary with these descriptor declarations. Use a dedicated writable Odin installation for this book so adding libraries does not modify another project’s toolchain.')
  + table(['Platform', 'Odin archive architecture', 'wgpu archive architecture', 'Verification'], [['macOS Apple Silicon', 'arm64', 'macos-aarch64', 'Built and run on this platform'], ['macOS Intel', 'amd64', 'macos-x86_64', 'Instructions; runtime not tested here'], ['Windows 64-bit', 'amd64', 'windows-x86_64-msvc', 'Instructions; runtime not tested here'], ['Linux 64-bit', 'amd64 or arm64', 'linux-x86_64 or linux-aarch64', 'Instructions; runtime not tested here']])
  + p('Although wgpu-native publishes other architectures, the pinned Odin wgpu import only covers the desktop combinations above. This book does not claim Windows ARM64, mobile, browser, or headless-surface support. Graphics support depends on the computer and its installed graphics driver, the system software that controls the GPU. Windows and Linux source branches are provided, but no runtime verification on those platforms was performed for this edition.'))
  + p('On macOS, About This Mac identifies an Apple chip or an Intel processor. On Windows, Settings → System → About shows the system type; use these instructions for x64. On Linux, <code>uname -m</code> prints <code>x86_64</code> for amd64 or <code>aarch64</code> for arm64. Choose the matching row; similarly named archives for a different CPU cannot be substituted.')
  + s('1. Install the matching Odin release', p('Download the appropriate <a href="https://github.com/odin-lang/Odin/releases/tag/dev-2026-09">official Odin release archive</a> from the table below. Extract it to a writable tools directory, keeping its <code>core</code>, <code>base</code>, and <code>vendor</code> directories beside the compiler. PATH is the list of directories your terminal searches for commands. On macOS/Linux, run <code>export PATH="/absolute/path/to/odin-folder:$PATH"</code>, replacing the example directory with the folder containing the compiler. In Windows PowerShell use <code>$env:Path = "C:\\tools\\odin;" + $env:Path</code> with your actual compiler folder. These changes apply to the current terminal; repeat them in a new terminal. Keep tool directories free of spaces for the linker commands below. Run <code>odin version</code> and <code>odin root</code> to confirm which installation you are using. The tested compiler reports <code>dev-2026-09:a2fb372b7</code>.')
  + p('macOS needs the Apple command-line developer tools/SDK and a Metal-capable Mac. Windows needs Visual Studio Build Tools with the Desktop development with C++ workload and a Windows SDK, even though application code is Odin: these supply the system linker and libraries. Linux needs a compatible system linker/libc and graphics drivers; use the binary archive for the machine architecture. On macOS, run <code>xcode-select --install</code> in Terminal and finish the installer. On Windows, install the named C++ workload through the Visual Studio Installer, then open Developer PowerShell for Visual Studio with the x64 tools. If your installer provides an x64 Native Tools Command Prompt instead, enter <code>powershell</code> there before using this book’s PowerShell commands. Return to your native-pixels-game directory with <code>cd</code> and its full path. The Linux packages appear in the Linux subsection below.')
  + table(['Platform', 'Pinned Odin archive'], lock.assets.filter(x=>x.component==='odin').map(x=>[x.name.replace('odin-','').replace('-dev-2026-09.tar.gz','').replace('-dev-2026-09.zip',''),`<a href="${x.url}">${x.name}</a>`])))
  + s('2. Put wgpu-native where the binding looks', p('Download the matching <a href="https://github.com/gfx-rs/wgpu-native/releases/tag/v29.0.1.1">wgpu-native release</a> archive. Inside the Odin root, the binding expects a directory named after the archive without <code>.zip</code>, then an inner <code>lib</code> directory. Extract <em>into</em> that named directory; do not accidentally insert a second identical directory level. Run the commands from native-pixels-game. <code>BOOK_ODIN_ROOT</code> stores the compiler installation path returned by <code>odin root</code>. Shell variables hold text we reuse in later commands; this one tells the extraction command where to put the native library.')
  + code(`BOOK_ODIN_ROOT="$(odin root)"
curl -L --fail -o wgpu.zip https://github.com/gfx-rs/wgpu-native/releases/download/v29.0.1.1/wgpu-macos-aarch64-release.zip
shasum -a 256 wgpu.zip
mkdir -p "$BOOK_ODIN_ROOT/vendor/wgpu/lib/wgpu-macos-aarch64-release"
unzip wgpu.zip -d "$BOOK_ODIN_ROOT/vendor/wgpu/lib/wgpu-macos-aarch64-release"`, 'shell', 'macOS Apple Silicon · run in native-pixels-game; compare the hash below before extraction')
  + p('A hash is a calculated fingerprint of a file. Run the download and hash commands first, compare the printed value with the table at the end of this installation section, and only then run the extraction commands. A matching SHA-256 value confirms that you have the listed archive. For Intel macOS substitute <code>wgpu-macos-x86_64-release</code> in both places. Linux uses <code>wgpu-linux-x86_64-release</code> or <code>wgpu-linux-aarch64-release</code> and <code>sha256sum wgpu.zip</code>. The exact extracted static library path is shown below. The default binding links a static release build of wgpu-native. <code>-debug</code> for Odin does not switch the native library to a debug archive; that separate switch is <code>-define:WGPU_DEBUG=true</code> and is not used here.')
  + code(`vendor/wgpu/lib/wgpu-macos-aarch64-release/lib/libwgpu_native.a
vendor/wgpu/lib/wgpu-macos-x86_64-release/lib/libwgpu_native.a
vendor/wgpu/lib/wgpu-linux-x86_64-release/lib/libwgpu_native.a
vendor/wgpu/lib/wgpu-linux-aarch64-release/lib/libwgpu_native.a
vendor/wgpu/lib/wgpu-windows-x86_64-msvc-release/lib/wgpu_native.lib`, 'text', 'Paths relative to odin root; install only your platform’s archive')
  + code(`$BookOdinRoot = (odin root).Trim()
Invoke-WebRequest https://github.com/gfx-rs/wgpu-native/releases/download/v29.0.1.1/wgpu-windows-x86_64-msvc-release.zip -OutFile wgpu.zip
Get-FileHash wgpu.zip -Algorithm SHA256
Expand-Archive wgpu.zip -DestinationPath "$BookOdinRoot/vendor/wgpu/lib/wgpu-windows-x86_64-msvc-release"`, 'powershell', 'Windows x64 · compare the hash before extracting')
  + p('A static library is linked into the executable. The wgpu-native archive used here is static, so you do not copy a separate WebGPU library beside your application. Odin’s binding already names the required system libraries. SDL uses a shared library in this setup: the operating system must be able to find that separate file when the executable runs.'))
  + s('3a. SDL on macOS', p('The locally verified runtime was Homebrew SDL3 3.4.16. <code>brew install sdl3</code> is convenient only while it resolves to that version; it is not a permanent version pin. For a versioned installation, download the <a href="https://github.com/libsdl-org/SDL/releases/download/release-3.4.16/SDL3-3.4.16.tar.gz">SDL3 3.4.16 source archive</a>, verify its hash, and build a shared library into a writable prefix. Install CMake from <a href="https://cmake.org/download/">its official macOS installer</a>. In Terminal run <code>export PATH="/Applications/CMake.app/Contents/bin:$PATH"</code> if you installed it in Applications, then check <code>cmake --version</code>. The Apple command-line tools supply the build tool. CMake builds SDL; you will use Odin to build the game.')
  + code(`curl -L --fail -o SDL3-3.4.16.tar.gz https://github.com/libsdl-org/SDL/releases/download/release-3.4.16/SDL3-3.4.16.tar.gz
shasum -a 256 SDL3-3.4.16.tar.gz
tar -xzf SDL3-3.4.16.tar.gz
BOOK_SDL_PREFIX="$PWD/sdl-install"
cmake -S SDL3-3.4.16 -B sdl-build -DCMAKE_BUILD_TYPE=Release -DCMAKE_INSTALL_PREFIX="$BOOK_SDL_PREFIX" -DCMAKE_INSTALL_LIBDIR=lib -DSDL_SHARED=ON -DSDL_STATIC=OFF -DSDL_TESTS=OFF
cmake --build sdl-build --config Release --parallel
cmake --install sdl-build --config Release`, 'shell', 'macOS · pinned source build, no system installation required')
  + p('From your native-pixels-game directory, build with the absolute install prefix retained in <code>BOOK_SDL_PREFIX</code>. The -L option tells the linker where to find SDL while building. The rpath option records where the executable can find that shared library when it runs. Paths embedded in the linker flag string below are assumed not to contain spaces; use a simple tools prefix for reproducibility. For Homebrew Apple Silicon use <code>/opt/homebrew/lib</code>; for Intel Homebrew normally <code>/usr/local/lib</code>.')
  + code(`mkdir -p build
odin build src -out:build/native-pixels -debug -vet -extra-linker-flags:"-L$BOOK_SDL_PREFIX/lib -Wl,-rpath,$BOOK_SDL_PREFIX/lib"
./build/native-pixels`, 'shell', 'macOS · final program with source-built SDL')
  + code(`odin build src -out:build/native-pixels -debug -vet -extra-linker-flags:"-L/opt/homebrew/lib"
./build/native-pixels`, 'shell', 'macOS · locally verified Homebrew configuration')
  + p('Terminal launching is sufficient; no Xcode project or app bundle is required to follow the book. Keep using the terminal build and launch commands throughout the book.'))
  + s('3b. SDL on Linux', p('Install a C/C++ toolchain, CMake, Ninja or Make, pkg-config, and SDL’s window-backend development dependencies before building the pinned SDL source. On Ubuntu 24.04-style systems, a focused desktop starting set is below. Package names vary by distribution. SDL’s <a href="https://wiki.libsdl.org/SDL3/README-linux">Linux build dependency guide</a> lists broader backend options. You also need a working Vulkan loader and a driver for your GPU; an installed loader alone is not a GPU driver.')
  + code(`sudo apt-get install build-essential cmake ninja-build pkg-config curl unzip \
  libx11-dev libxext-dev libxrandr-dev libxcursor-dev libxfixes-dev libxi-dev \
  libxss-dev libxtst-dev libxkbcommon-dev libwayland-dev wayland-protocols \
  libdecor-0-dev libegl1-mesa-dev libdrm-dev libgbm-dev libvulkan1
# Install the Vulkan driver appropriate to your GPU separately.
# For supported Mesa GPUs, the distribution package is commonly mesa-vulkan-drivers.`, 'shell')
  + p('Download and extract the same SDL source archive as macOS, checking it with <code>sha256sum</code>. Run the CMake configure/build/install commands above with a Linux <code>BOOK_SDL_PREFIX</code>. Inspect CMake’s summary and confirm that X11 and/or Wayland video support was enabled. Optional audio-device warnings do not require adding audio to this application, but missing both desktop window backends is a blocker.')
  + code(`mkdir -p build
odin build src -out:build/native-pixels -debug -vet -extra-linker-flags:"-L$BOOK_SDL_PREFIX/lib -Wl,-rpath,$BOOK_SDL_PREFIX/lib"
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
odin build src -out:build/native-pixels.exe -debug -vet
./build/native-pixels.exe`, 'powershell', 'Run build commands from your native-pixels-game directory; download directory paths are relative to that root here')
  + p('Use the x64 compiler, SDL library, and wgpu-native MSVC archive together. Keep the SDK system libraries available to Odin’s linker. A missing SDL3.dll is a runtime dependency problem; a missing symbol during linking usually means a mismatched import library. No SDL2main or hand-written C entry point is required for this Odin main procedure. Windows source is supplied but was not executed here.'))
  + s('Release archive hashes', p('These SHA-256 values came from official release asset metadata, recorded 2026-09-13. Compare a downloaded archive before extraction. They fix the chosen release artifacts; OS drivers, system SDKs, and a locally compiled SDL binary are still platform prerequisites rather than bit-for-bit pinned system images. Keep the matching compiler and native libraries together when you return to the project.')
  + table(['Archive', 'SHA-256'], lock.assets.map(x=>[`<a href="${x.url}">${x.name}</a>`,`<code class="hash">${x.sha256}</code>`]))
  + table(['SDL archive', 'SHA-256'], [['SDL3-3.4.16.tar.gz','<code class="hash">7322236cd12090c3eb40b9728be4d49c76f66ad17d04369584d4ecad5cf77c68</code>'],['SDL3-devel-3.4.16-VC.zip','<code class="hash">1a784cb2a5c64d56fe7a62090fe9d242d9865f235e4ea9678f1a6ba4e693e7de</code>']]));
