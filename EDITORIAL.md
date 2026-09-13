# Editorial revision

The reader builds one project named `native-pixels-game`, starting with an empty
directory. The final result remains the existing Odin/SDL3/WebGPU room, with
keyboard movement, furniture collision, an F1 overlay, and directional animation.
No graphics or Odin knowledge is assumed. Basic computer skills (editing a text
file, opening a terminal, and choosing a download for an operating system) are
introduced where they affect the build.

## Dependency and continuity review

| Chapter | Already available | New learning and resulting capability |
| --- | --- | --- |
| 1 | Empty directory | Files, packages, procedures, calls, compiler/linker, dependency installation; version report |
| 2 | Working compiler and libraries | Variables, booleans, branches, loops, pointers to output values, defer; responsive window |
| 3 | Window and event loop | Vertices, triangles, shaders, rasterization, recording versus execution; unchanged program |
| 4 | Window, pointers, cleanup | Structs, ownership, descriptors and their extensions; native surface |
| 5 | Instance and surface | Callback example, native calling convention, request lifetime, atomic diagnostic flag; device and queue |
| 6 | Surface-compatible device | Formats, color encoding, capabilities, pointer/count lists; configured surface |
| 7 | Configured surface | Acquire/view/pass/submit/present with local cleanup; visible background |
| 8 | Clear frame and pipeline overview | WGSL syntax, clip coordinates, pipeline descriptors; triangle |
| 9 | Triangle shader | Arrays, bytes, offsets, stride and stage locations; uploaded colored vertices |
| 10 | Vertex buffer | Integer indices and indexed draws; rectangle |
| 11 | Indexed rectangle | Local/world/NDC coordinates with worked arithmetic; pixel-sized rectangle |
| 12 | CPU transform and buffer uploads | Uniform memory layout and resource binding; shader transform |
| 13 | Transform and surface refresh | Logical versus physical size; resizable window |
| 14 | Window loop and shader inputs | Held input and retained game state; keyboard-controlled tint |
| 15 | Game state and input | Seconds, normalized direction, movement and bounds; moving character |
| 16 | Interpolation and tint | Straight alpha, blend equation and local face regions; geometric character |
| 17 | All foundation owners | Audit partial initialization and frame exits; unchanged program |
| 18 | Completed foundation | Follow startup, input, upload and draw in order; unchanged program |
| 19 | Buffers, bindings, blending, coordinates | Motivate two-image recording; packages, UVs, image decoding/upload, fixed-world viewport; textured room |
| 20 | Working sprite API | Move scene composition out of main; same picture with clearer ownership |
| 21 | Movement in fixed world | Feet AABB, overlap, axis sweep, reproducible tests; solid furniture |
| 22 | Collision data and rectangle drawing | Event edge versus held state, overlay, manual acceptance; visible diagnostics |
| 23 | Collision result and UVs | Frame rectangles, facing and seconds-based phase, reproducible tests; animated character |

## Editing decisions

- Keep chapter numbers and existing runnable source milestones. Reorder teaching
  within chapters rather than break links or silently change the final application.
- Move prerequisite explanations ahead of the first code that needs them. Remove
  early discussions of features the reader does not yet use.
- Preserve useful diagrams, exact source excerpts, layout tables, failure policies,
  optional exercises, and platform qualifications.
- Include setup in chapter 1 and commands targeting the reader's `src` directory.
  Supply every complete application file inside its chapter. Separate focused
  changes from the full-file reference; explain how to read the change listing.
- Include image assets as book attachments and provide test source before test
  commands. No instructional step requires a source checkout or authoring tools.
- Confine optional completed-source/checkpoint information to an appendix.
- Keep the pinned toolchain. Do not treat the dated native verification record as
  new execution evidence from this prose revision.

## Validation

Regenerate the HTML, check links and exact code listings, reconstruct a reader's
project from chapter listings, and build the reconstructed milestones. Verify the
new in-book tests against the chapter where each is first introduced. Review the
rendered text for leftover source-checkout commands and unintroduced terminology.
These checks support reproducibility; a complete beginner usability study and
runtime testing on Windows/Linux remain outside the evidence available here.

## Revision results

- All 23 chapter openings now state the existing project capability and the next
  problem. Required Odin notation is taught before the first application use.
- Chapter 3 focuses on the drawing model. Exact clip coordinates move to chapter
  8, and the full graphics-object dependency diagram moves to chapter 18.
- Chapter 19 explains the need for two-image recording, package moves, UVs and
  resource bindings, image uploads, ordered draws, and loop integration separately.
- Chapters 21 and 23 print complete test files with imports for the reader's
  project. Optional source downloads have their own appendix.
- Reconstructed all 23 projects solely from generated chapter listings and image
  attachments; every project compiled and linked on macOS arm64 using the pinned
  Odin compiler. The eight in-book tests passed at chapters 21 and 22; all eleven
  passed at chapter 23. Application source and existing checkpoints are unchanged.
- Static verification passed for 31 pages, all local links, HTML nesting, and all
  124 application source listings. Browser verification passed 434 combinations
  of page, width, and theme, plus offline and scripts-disabled interaction checks.
- No new native-window rendering run was needed for the unchanged application.
  Earlier native captures retain their original evidentiary scope. Windows/Linux
  runtime behavior and a study with novice readers have not been newly tested.
