# Native Pixels

> [!WARNING]
> This book is AI-generated. I have not yet read it in full or independently verified that every explanation and example works as described. The AI did test the final game, and I personally saw it running in a native macOS window, with the UI elements visible and collisions working. That gives me confidence in the final demo, but it is not a complete review of the book. Please treat the content as unreviewed and expect possible mistakes.

A complete static programming book about native 2D WebGPU in Odin with SDL3.

[Read the book online](https://rabingaire.com.np/native-pixels/) · [MIT License](LICENSE)

Open [index.html](index.html) directly in a browser. No server, package installation, CDN, or build step is needed to read it. [Contents](contents.html) lists all 23 chapters and five reference appendices.

## Application

The canonical final application is in `project/`: eight Odin files across `src`, `game`, and `renderer`, one WGSL shader, and embedded PNG assets. It displays a pixel-art room with a bed, tables, bookshelf, chair, chest, and plant; the animated character collides with furniture and walls. The game composes sprites through a renderer API and never imports WebGPU.

Independent runnable snapshots run from `checkpoints/01` through `checkpoints/23`. The original 18-checkpoint untextured foundation is preserved. Chapters 19–23 add texture uploads, the renderer/game package boundary, collision, F1 diagnostics, and four-direction animation. Each chapter includes a beginner walkthrough, exact changes, complete source, and required asset links. All 23 chapters include optional extension challenges with acceptance criteria. These are independent of the main path: skipping every challenge still produces the complete final game.

Pinned stack: Odin `dev-2026-09:a2fb372b7`, its `vendor:sdl3` and `vendor:wgpu`, SDL runtime 3.4.16, wgpu-native 29.0.1.1. See [build instructions](appendix/build.html) for exact downloads, hashes, library locations, and Windows/Linux/macOS commands. Native dependencies are not bundled with this website.

With the verified Homebrew macOS dependencies installed:

```sh
mkdir -p build
odin build project/src -out:build/native-pixels -debug -vet -extra-linker-flags:"-L/opt/homebrew/lib"
./build/native-pixels
```

Hold WASD or arrow keys; press F1 to toggle collision outlines. Animation idles when movement stops or is blocked. Close with normal window controls. The room stays 384 × 256 world units while the window uses an aspect-preserving, usually integer-scale viewport. The program reports and exits on unrecoverable device/surface loss; it does not implement automatic device recreation.

Art was generated with the built-in image-generation tool and is checked in under `project/assets/`. Exact prompts are saved there. The final player uses 0.16 world units per source texel (roughly 43–44 units tall), with a bottom-center visual anchor and a separate 8 × 4 ground-contact box. The animated sheet has real alpha; reviewed per-frame source rectangles compensate for imperfect grid registration. These are pixel-art-style generated assets, not a claim of a perfectly hand-authored low-resolution tileset. All required images and WGSL are embedded at compilation; no runtime server or working-directory asset search is needed. The pinned Odin distribution supplies the `vendor:stb/image` decoder.

## Authoring and verification

Node 22+ is only required for these developer commands:

```sh
node tools/generate.mjs
node tools/verify.mjs
node tools/verify.mjs --native
node tools/package.mjs
```

Generation uses the system `diff` command to produce exact checkpoint patches. On Windows, use Git Bash/WSL for generation or make `diff` available in PATH; reading and compiling the pre-generated application do not depend on it. Set `BOOK_LINKER_FLAGS` if your SDL library requires a different linker search path. `--native` builds and links all 23 checkpoints and runs three foundation movement tests plus eleven room/collision/renderer/animation tests; it does not launch an interactive window.

Run the final room's real-GPU test in a desktop session:

```sh
node tools/room-check.mjs --run
```

It requires 450 successful surface presents, drives a deterministic route into the chair and north wall, sends an SDL F1 event, requests two sizes, verifies all four walk columns and blocked directional idle, and captures actual framebuffers under `build/screenshots/`. The capture harness requires a surface with `CopySrc` capability; the canonical application does not. While waiting for its first frame, the test repeats a bounded visibility request because some automated macOS launches remain occluded. Screenshots are copied into website assets for the verification appendix. This checks scripted input and GPU execution, not physical key delivery or all operating systems.

The preserved chapter-18 foundation harness is prepared and run on macOS with:

```sh
node tools/native-smoke.mjs
odin build build/smoke/src -out:build/NativePixelsSmoke.app/Contents/MacOS/native-pixels -debug -extra-linker-flags:"-L/opt/homebrew/lib"
./build/NativePixelsSmoke.app/Contents/MacOS/native-pixels
```

It counts 100 successful surface presents, requests two sizes, drives 100 actual updates with deterministic rightward input, prints `SMOKE PASS` and position `[520, 100]`, then shuts down. It checks the final configured physical extent against SDL. It does not verify physical keyboard input or image appearance. It does not alter canonical source.

`node tools/native-check.mjs` additionally compiles and launches bounded harnesses for every distinct rendering checkpoint (7–16), confirming real shader/pipeline creation and successful presentation. It opens short-lived native windows and requires a desktop/GPU session.

On macOS, `node tools/native-check.mjs --with-final` runs those foundation stage checks followed by the chapter-18 100-present/resize harness and records both in `verification.json`. Use `room-check.mjs` for the extended final application.

`node tools/browser-check.mjs` uses installed Google Chrome over its debugging protocol to check all pages at five widths (360, 390, 768, 1440, and 1680 pixels) in light and dark themes, offline navigation, theme, search, coordinate interaction, and reading with scripts disabled. `BOOK_CHROME` can select a different Chrome executable. Browser profiles are isolated under a temporary directory; screenshots go under ignored `build/screenshots/`.

Results are recorded in [verification.json](verification.json). The macOS native execution and all-platform build instructions are distinguished in [sources and verification](appendix/sources.html). Windows/Linux runtime behavior still requires testing on those operating systems.

## Editing

Edit `authoring/source.mjs` for foundation application changes; `authoring/room-source/` and `authoring/room-source.mjs` own the extension and its snapshot migrations. Prose lives in `authoring/chapters.mjs`, `room-chapters.mjs`, `animation-chapter.mjs`, and `appendices.mjs`; beginner walkthroughs and optional extension challenges live in `authoring/learning.mjs`; the homepage is `home.mjs`. Regenerate afterward. Generated source, checkpoints, full-source listings, and HTML should not be edited independently. PNGs and prompts under `project/assets/` are original source assets, not generated by the website builder. Reader styling and optional interaction live in `assets/style.css` and `assets/book.js`.

## Repository and publishing

- `index.html`, `contents.html`, `chapters/`, `appendix/`, `assets/`: generated book and reader assets, committed for offline reading.
- `authoring/`, `tools/`: editable book sources, generation, verification, and publishing tools.
- `project/`, `checkpoints/`, `tests/`: native application, chapter downloads, and tests.
- `build/`: ignored executables, captures, release archives, and the staged website.

The GitHub Actions workflow in `.github/workflows/pages.yml` verifies pull requests and deploys pushes to `main`. In repository **Settings → Pages → Build and deployment**, set **Source** to **GitHub Actions** before the first deployment. This follows [GitHub's custom workflow publishing setup](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

```sh
node tools/site.mjs
python3 -m http.server 8000 --directory build/site
```

Open `http://localhost:8000`. The staging script publishes only the book, required reader downloads, license, and verification records. Build binaries, caches, local planning notes, credentials, and editor settings stay out of Git and the deployed artifact. Keep native compiler outputs under `build/`.

The production address is `https://rabingaire.com.np/native-pixels/`; the `github.io` address redirects to this account-level custom domain. Edit `authoring/site.mjs` when changing the hostname or repository path and regenerate. Every reading page has its own title, description, canonical URL, social preview, and structured book metadata. `sitemap.xml` lists the 30 canonical reading URLs; the custom 404 page is excluded from indexing. Relative navigation continues to work offline and under the GitHub Pages project path.

Submit `https://rabingaire.com.np/native-pixels/sitemap.xml` in Google Search Console after deployment, using the `rabingaire.com.np` domain property or a URL-prefix property covering `https://rabingaire.com.np/native-pixels/`; see [Google's sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap). A project's `/native-pixels/robots.txt` does not control crawlers at the origin. For automatic discovery, add `Sitemap: https://rabingaire.com.np/native-pixels/sitemap.xml` to `https://rabingaire.com.np/robots.txt` in the account-level Pages repository, alongside its existing sitemap declaration. That origin-level file is maintained outside this repository. The generated robots file also works if this book is later served at the root of a custom domain.

## License

The book and original project files are available under the [MIT License](LICENSE), copyright 2026 Rabin Gaire. External native dependencies retain their own licenses and are not bundled. The reader bundles Crimson Text under the SIL Open Font License; see `assets/fonts/OFL.txt`. The reading layout takes inspiration from the typography and chapter navigation of Crafting Interpreters, with original styling and content.
