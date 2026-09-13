import { p } from './html.mjs';

// These explanations and extensions are deliberately independent of checkpoint
// generation: no challenge becomes an undocumented prerequisite for later code.
const lessons = {
  1: {
    title: 'Before you type the first program',
    paragraphs: [
      'You need basic programming experience: variables, functions, conditionals, loops, and structs. You do not need graphics experience. The CPU runs our Odin application; the GPU runs the small WGSL programs that decide where geometry goes and how it is colored. SDL connects the application to the operating system. We introduce each graphics object when the next visible result needs it.',
      'There are three steps between source and a running window. The compiler checks Odin and produces machine code. The linker connects that code to native libraries. The operating system then loads the executable and its required shared libraries. A binding is a set of declarations telling Odin how to call a library; it does not replace the library. The version probe separates installation failures from the rendering problems we will meet later.',
      'Choose a working method now. You can edit a copy of the preceding checkpoint, or read and run the supplied completed checkpoint. A checkpoint is a full project directory, not just main.odin: keep relative folders together. Excerpts show the relevant change; the expandable complete files are the reference when placement is unclear. The optional experiments and challenges never supply code required by the next chapter.'
    ],
    challenges: [
      ['A useful dependency report', 'Extend the probe to print a readable heading, decoded library versions, and whether they match this edition’s expected values. Keep the expected values together so the report is easy to update.', 'A deliberately changed expected version produces a clear mismatch message before any window is created.'],
      ['A portable launch note', 'Write a short setup note for a friend using your operating system: source folder, compiler command, executable location, and native library location. Explain which failure is a compile, link, or load failure.', 'Following the note from a fresh terminal runs the probe without relying on your current working directory.']
    ]
  },
  2: {
    title: 'Read the Odin notation as you meet it',
    paragraphs: [
      'In these listings, <code>name :: proc(...) { ... }</code> declares a procedure, while <code>value := expression</code> creates a local variable with an inferred type. A package groups source files that compile together. An import such as <code>sdl</code> gives us a name for another package’s declarations. A leading dot such as <code>.VIDEO</code> lets the surrounding type determine which enum member we mean.',
      'An event loop is a repeated conversation with the operating system: collect pending events, decide whether to continue, then do this iteration’s work. The window persists because the process keeps running that loop. Drawing will become another part of the loop later; an empty loop still has to process close and focus events.',
      '<code>defer</code> registers work to run when the current scope exits, including an early return. If SDL initialization succeeds and window creation fails, the SDL cleanup still runs. If both succeed, the later window cleanup runs first. Think of each successful acquisition as adding one matching cleanup obligation.'
    ],
    challenges: [
      ['A keyboard exit', 'Handle an Escape key-down event alongside the close event. Use the existing running flag so both actions take the same cleanup path.', 'Both Escape and the title-bar close control exit cleanly.'],
      ['A focus-aware title', 'Handle focus gain and loss events and update the window title to reflect whether the window is active.', 'Switching to another application and back changes the title without creating another window.']
    ]
  },
  3: {
    title: 'Follow one covered point',
    paragraphs: [
      'Imagine a rectangle’s four corners written on paper. Those corner records describe the boundary, not every point inside it. Two triangles tell the GPU which interior to cover. Rasterization is the step that determines which image sample locations those triangles cover. The fragment shader then supplies a color contribution at those locations.',
      'The vertex shader answers “where does this corner go?” and the fragment shader answers “what color does this part contribute?” Neither controls the desktop window. The CPU arranges the work and chooses the destination. Keeping these jobs separate explains why adding more detail to a face need not add more corners.',
      'For our 2D case, <code>w = 1</code> makes the perspective division harmless. A clip position of <code>(0, 0, 0, 1)</code> lands at the center of the viewport; <code>(−1, +1, 0, 1)</code> is its upper-left boundary. You can understand this renderer with multiplication, division, and coordinate pairs. Matrices are not a prerequisite.'
    ],
    challenges: [
      ['Plan a diamond marker', 'Sketch a diamond from a top, right, bottom, and left corner. List two triangle triplets that cover it. Save the sketch for chapter 10, where you can implement it.', 'The triangles share one edge and cover the diamond without a gap.'],
      ['Plan a split view', 'Draw two viewports in one window and map NDC center and corner points into each. This is a design exercise; chapter 13 introduces the calls needed to implement it.', 'The same NDC point maps to different framebuffer positions in the two viewports.']
    ]
  },
  4: {
    title: 'A handle, a descriptor, and an owner',
    paragraphs: [
      'A handle is an opaque reference returned by an API. You keep it to identify an object in later calls; you do not inspect or free the object’s internal memory yourself. A descriptor is ordinary CPU data containing the options for a call. An owner is our application’s chosen place to store a handle and arrange its release. These are three roles, not three interchangeable words for GPU memory.',
      'In Odin, <code>^GPU</code> is a pointer to a GPU struct, <code>&amp;gpu</code> takes its address, and <code>nil</code> means no pointer or handle. Passing a pointer lets a helper fill the original owner rather than a temporary copy. A native window pointer must be the platform handle the descriptor requests; having the same pointer-sized representation does not make unrelated handles interchangeable.',
      'The instance is the starting context for WebGPU. The surface connects that context to a presentation destination backed by our already-created window. We create the surface before selecting an adapter so selection can ask for a GPU that can actually present there. Configuration comes later, after we have a device to render the images.'
    ],
    challenges: [
      ['Explain the platform bridge in logs', 'Add one startup diagnostic naming the selected platform branch and whether its required native handles were obtained. Report the stage on failure without dumping raw pointers.', 'A failed handle lookup identifies the missing platform property and still follows cleanup.'],
      ['Make ownership visible', 'Add temporary creation and release messages for the instance, surface, and Metal view where applicable. Keep them behind one debug flag.', 'Normal close and a forced early return show that each successfully created object is released once, in dependency order.']
    ]
  },
  5: {
    title: 'Choose capability before creating resources',
    paragraphs: [
      'An adapter represents a candidate GPU and its capabilities. A device is the logical connection created from that candidate; buffers and pipelines belong to that device. The queue accepts ordered uploads and command submissions for it. A laptop with several GPUs makes the distinction obvious, but all three roles still exist on a machine with only one GPU.',
      'A callback is a procedure the library calls to deliver a result. Passing a result pointer through user data lets it write into state our requesting code can inspect. That state must remain valid until completion, not merely until the request function returns. The pinned implementation completes these requests inline; the chapter isolates that assumption so another implementation cannot silently borrow a dead local variable.',
      'A capability is available functionality; a limit is a numeric bound, such as the largest supported texture dimension. Ask for what this game needs. Requesting every optional feature can reject otherwise suitable hardware without making a single rectangle look better.'
    ],
    challenges: [
      ['A readable GPU report', 'Print a small startup report with the adapter information and selected device limits available through the pinned binding. Release any native strings or result members using their matching API.', 'The report appears once and helps identify which GPU is used on a multi-GPU machine.'],
      ['An explicit requirement', 'Choose a hypothetical maximum sprite-image dimension and compare it with the device limit before loading assets. Explain the requirement in the error message.', 'A deliberately excessive requirement is rejected clearly without attempting an invalid allocation.']
    ]
  },
  6: {
    title: 'Why we ask the surface what it supports',
    paragraphs: [
      'A configured surface is an agreement about future frame images: which device draws them, their dimensions, their color representation, and how they are presented. Configuration does not contain the room artwork, and it does not draw a frame. It prepares the presentation system for the acquisition we add next.',
      'Read <code>BGRA8UnormSrgb</code> in pieces: BGRA is the storage channel order, 8 is bits per channel, Unorm maps unsigned integers to a normalized range, and Srgb describes RGB color encoding. The shader still returns RGBA values. The backend performs the format conversion; manually swapping red and blue would introduce an error.',
      'A usage flag declares what operations an image permits. Our window images need RenderAttachment because a render pass writes them. Their dimensions use physical pixels because they describe actual backing images. The game’s own coordinate units are a separate choice that chapter 13 will make explicit.'
    ],
    challenges: [
      ['Show the negotiation', 'Print the advertised surface formats and presentation modes once, marking the selected entries. Do this before freeing the capability arrays.', 'The selected format and FIFO mode are visibly supported by this surface/adapter pair.'],
      ['A reconfiguration counter', 'Count actual SurfaceConfigure calls separately from calls to the refresh helper. Use the counter again when resizing is enabled in chapter 13.', 'An unchanged window does not continuously reconfigure, even though the helper is checked each frame.']
    ]
  },
  7: {
    title: 'A frame is a short-lived transaction',
    paragraphs: [
      'Acquire means “give me the image I may render now.” A view describes access to that image. The pass declares how we use it, the encoder records commands, and finishing produces the command buffer the queue accepts. Submit makes the recorded work available for execution. Present returns the image to the window’s presentation system. These verbs describe different boundaries.',
      'The clear is useful work even without a shader: the pass’s load operation replaces the attachment contents with a known background. Store preserves that result. This deliberately gives us the smallest visible proof of the entire presentation path before geometry introduces more possible failures.',
      'Every acquired reference needs cleanup on both success and early return. Ending a pass finishes its recording scope; releasing its handle ends our ownership. Neither action means the GPU has completed all work. This distinction lets the CPU prepare another frame while earlier submitted work is still executing.'
    ],
    challenges: [
      ['A keyboard palette', 'Use discrete key events to select among three clear colors. Store the choice on the CPU and supply it to the next render pass.', 'The background changes while the same window, device, and surface stay alive.'],
      ['Count visible progress', 'Add separate counters for attempted frames, successful presents, and skipped acquisitions. Print a summary at shutdown.', 'A temporarily occluded window can increase attempts without falsely counting every attempt as a presented image.']
    ]
  },
  8: {
    title: 'The pipeline describes the rules for a draw',
    paragraphs: [
      'A shader module contains GPU program code. A render pipeline combines chosen entry points with rules such as triangle assembly, output format, and blending. Binding the pipeline selects those rules for later commands; the draw command requests geometry under them. The pass still supplies the actual image receiving the result.',
      'For this first draw, the vertex index takes the values 0, 1, and 2. The shader uses those values to select three positions from its array. Rasterization fills their triangle, and the fragment shader returns the same green wherever that triangle contributes. There is no vertex buffer to misinterpret yet.',
      'The pipeline is created once because its rules are stable. The draw is recorded each frame because the acquired output image changes. Recreating a pipeline to change a position would confuse stable configuration with the data used by one frame.'
    ],
    challenges: [
      ['A geometric emblem', 'Expand the shader’s position array to six entries and draw two triangles that form a simple emblem. Keep every triangle inside the clip volume.', 'Both triangles appear with a draw count of six and no additional pipeline.'],
      ['Two color pipelines', 'Create two pipelines using fragment entry points with different constant colors. Switch the selected pipeline using a key, and release both at shutdown.', 'Switching colors selects an existing pipeline instead of creating one inside the frame loop.']
    ]
  },
  9: {
    title: 'Calculate an address before trusting the image',
    paragraphs: [
      'An ABI, or application binary interface, is an agreement about how data is represented across a boundary. Here Odin lays out bytes, WebGPU describes how vertex fetch reads them, and WGSL declares the receiving values. Matching field names is not enough; byte offsets, formats, and shader locations must agree.',
      'Each vertex occupies 24 bytes. Vertex number 1 starts 24 bytes after the buffer’s beginning, and its color starts another 8 bytes later: byte 32. Float32x4 asks vertex fetch to decode four 32-bit floating-point values there. A stride of 16 would instead start the next vertex inside the preceding color.',
      'A buffer slot chooses a stream of records. A shader location chooses an input within a particular stage interface. We bind one buffer in slot zero, but read two attributes at locations zero and one. Remembering those separate jobs prevents a large class of apparently mysterious shader errors.'
    ],
    challenges: [
      ['A second mesh', 'Put two independently shaped triangles into one six-vertex buffer, with a different color scheme for each. Update the upload size, bound range, and draw count together.', 'Both triangles render without changing the 24-byte vertex contract.'],
      ['An animated color field', 'Keep positions fixed and update vertex colors from a CPU-side clock. Add CopyDst only if it is missing, and reuse the buffer allocation.', 'Colors animate without rebuilding the pipeline or changing triangle positions.']
    ]
  },
  10: {
    title: 'Indices are references, not positions',
    paragraphs: [
      'The vertex buffer answers “what is stored at each corner?” The index buffer answers “which corners form each triangle?” An index value of 2 selects the third vertex record; it is neither a coordinate nor a byte offset. Six indices can therefore describe two triangles using only four stored corners.',
      'For the sequence 0, 1, 2, 0, 2, 3, the first group uses the top-left, top-right, and bottom-right. The second uses the top-left, bottom-right, and bottom-left. The shared diagonal comes from reusing zero and two. Moving a corner changes the geometry; changing an index changes how existing corners connect.',
      'The index format describes the stored integer width. Uint16 must read u16 data. The count supplied to DrawIndexed is the number of index entries to consume. Keeping “four stored vertices” and “six consumed indices” separate explains both the allocation sizes and the draw arguments.'
    ],
    challenges: [
      ['Build the diamond', 'Replace the rectangle’s corner positions with the diamond from chapter 3, or sketch one now. Reuse four vertices and six indices.', 'The diamond is completely filled and no extra center vertex is required.'],
      ['Two indexed quads', 'Store eight vertices and twelve indices for two rectangles. Add four to the second rectangle’s local indices so they reference its own vertices.', 'Changing only the second rectangle’s vertices leaves the first rectangle in place.']
    ]
  },
  11: {
    title: 'Keep the unit attached to the number',
    paragraphs: [
      'The pair (120, 100) is ambiguous until we name its coordinate space. Local coordinates describe a point inside the character, world coordinates place the character in the scene, and normalized device coordinates are the GPU’s common projection language. In this checkpoint only, world units are framebuffer pixels.',
      'Take the local bottom-right corner (1,1). Multiplying by the character size (48,64) and adding its position (120,100) gives (168,164). In a 960 × 640 image, divide each coordinate by its own extent, then map x to −1..+1 and reverse y. The result is (−0.65,+0.4875).',
      'We perform this arithmetic on a fresh CPU copy first so every intermediate value is easy to print. Next chapter moves the same calculation into WGSL. The temporary CPU implementation is a teaching step with a complete working result, not a second transformation to keep applying after the shader changes.'
    ],
    challenges: [
      ['Anchor a marker at its center', 'Define a center position for a rectangular marker and derive its top-left position by subtracting half its size. Keep the GPU conversion unchanged.', 'Increasing the marker’s size leaves its center in the same world position.'],
      ['Add a translation camera', 'Subtract a camera position from each world corner before projecting. Move the camera using two keys while keeping the character’s world position fixed.', 'Moving the camera right moves the character left on screen by the corresponding amount.']
    ]
  },
  12: {
    title: 'A layout is a promise; a binding fills it',
    paragraphs: [
      'A uniform buffer stores a small block of values shared by a draw’s shader invocations. The bind group layout describes the permitted contents of numbered slots. A bind group fills those slots with actual resources. The pipeline layout arranges groups into the interface the shader expects. Creating these objects does not upload position values; QueueWriteBuffer does that separately.',
      'Our shader reads group zero, binding zero. That slot refers to a 48-byte range in a persistent uniform buffer. Updating the position bytes changes the next draw’s input while the group continues to refer to exactly the same storage. We do not recreate a mailing address each time the contents at that address change.',
      'Alignment means a value must begin at an address divisible by a required number of bytes. The layout table makes the host and shader agree. Buffer-binding offset alignment is a separate constraint; our range starts at zero, which meets any positive alignment requirement. A valid 48-byte struct does not automatically need a 256-byte allocation.'
    ],
    challenges: [
      ['A scrolling camera', 'Use the existing camera field to pan the view with separate keys. Leave character position unchanged and upload the camera through the same uniform buffer.', 'Panning affects projection while game coordinates retain their meaning.'],
      ['Two independent characters', 'Create a second uniform buffer and bind group with the same layout, then bind each before its draw. Give the characters different positions and tints.', 'Both characters keep independent transforms; writing one shared buffer twice before submission is not used as a substitute.']
    ]
  },
  13: {
    title: 'Resize the image without changing the ruler',
    paragraphs: [
      'A high-density display can use two physical pixels for one logical window unit along each axis. The surface needs physical dimensions because it supplies the actual image. The game uses logical dimensions so a 48-unit character does not suddenly become half as wide relative to the window when display density changes.',
      'For a 960-unit window backed by 1920 pixels, the horizontal mapping is 1920 / 960 = 2 physical pixels per logical unit. A 48-unit character covers 96 physical pixels. The shader first maps its logical position into NDC; the viewport then maps NDC onto physical pixels. Multiplying by the density again would apply the scale twice.',
      'This chapter keeps a window-sized world. Chapter 19 deliberately changes the policy to a fixed 384 × 256 room with letterboxing. Both policies preserve shape; they answer different game-design questions. The surface always uses physical dimensions in either policy.'
    ],
    challenges: [
      ['An aspect-preserving preview', 'Choose a fixed logical canvas and fit it into the window using the smaller axis scale. Center the viewport and leave the cleared attachment visible around it.', 'A logical square stays square in both tall and wide windows.'],
      ['Two views of one scene', 'Render the character into two non-overlapping viewports using the appropriate view extent for each. Use scissors if geometry must stay inside each panel.', 'The panels show consistent character proportions and the attachment clear still covers the entire window.']
    ]
  },
  14: {
    title: 'State remembers; input requests; rendering shows',
    paragraphs: [
      'Game state is the information we preserve between iterations, such as position and tint. Input is this iteration’s request. Update applies rules to state using that request. Rendering reads the resulting values and makes an image. This separation means you can inspect or test a game update without needing to acquire a GPU image.',
      'Held-key state answers “is D down now?” A key-down event answers “was D pressed?” Movement uses the first because it should continue while a key is held. Toggles use the second because repeating a toggle every frame would immediately switch it back again. Chapter 22 uses this distinction for F1.',
      'We initially change only tint. That makes it easy to prove the path from SDL through game state into a uniform and onto the image. Movement needs elapsed time as well, so we introduce it in the next step after this input path works.'
    ],
    challenges: [
      ['A reset action', 'Use a nonrepeated key-down event to request resetting the character to its initial position. Apply the request in game update.', 'Holding the key does not repeatedly reset future movement, and rendering does not mutate game state.'],
      ['A selectable appearance', 'Add a small palette index to game state and cycle it with a discrete key press. Derive the tint from that index.', 'The selected appearance remains after release and survives a resize.']
    ]
  },
  15: {
    title: 'Use units to check the movement equation',
    paragraphs: [
      'Speed is distance per second. Multiplying 240 units/second by 1/60 second gives 4 units; the seconds cancel. At 144 updates per second, each step is about 1.667 units. More smaller steps and fewer larger steps cover approximately the same distance when the elapsed time is the same and the stall cap is not reached.',
      'A direction of (1,1) has length √2, so it must be shortened to a unit vector before applying speed. Normalization preserves direction while changing length to one. Skip division for the zero vector. Keep simulation positions as floating-point values so small fractions accumulate instead of disappearing.',
      'The 0.05-second cap is a deliberate responsiveness policy: after a long interruption we simulate at most a small step, discarding the rest. It prevents a surprising jump, but it does not make the simulation replay all real elapsed time. Timing the loop, timing GPU execution, and waiting for GPU completion are separate operations.'
    ],
    challenges: [
      ['Sprint without diagonal advantage', 'Add a held sprint input that changes speed before calculating displacement. Keep normalization and the seconds-based step.', 'Sprint multiplies cardinal and diagonal travel by the same factor.'],
      ['Acceleration and braking', 'Store velocity in game state and move it toward a target velocity at a rate measured in units/second². Integrate position using dt.', 'The character starts and stops gradually, and comparable uncapped elapsed times give similar travel at different update rates.']
    ]
  },
  16: {
    title: 'Color is a value; alpha is a blending input',
    paragraphs: [
      'RGB describes red, green, and blue contributions. Alpha tells our source-over blend how much of the source contributes. The blend rule combines the fragment shader’s source with the destination color already in the attachment. Writing alpha 0.5 alone does not enable blending; the pipeline must have matching blend factors.',
      'With straight-alpha output, a red source (1,0,0) at alpha 0.5 over opaque blue (0,0,1) produces linear RGB (0.5,0,0.5). The destination stays opaque. The sRGB attachment encodes RGB for storage afterward, so these linear arithmetic values are not the same as averaging encoded screenshot bytes.',
      'Interpolated local coordinates let the fragment shader identify an eye region inside the rectangle. They move with the character because they come from its local corners. This completes the geometric character; chapter 19 replaces the procedural face with a sampled picture using the same rendering foundation.'
    ],
    challenges: [
      ['A blinking face', 'Add a time or blink parameter to the uniform contract and use it to shorten the eye rectangles briefly. Update both host and WGSL layouts with their assertions.', 'Blinking changes the face without moving vertices or rebuilding the pipeline each frame.'],
      ['A translucent marker', 'Add a separately positioned translucent quad behind or in front of the character. Use independent per-draw data as described in chapter 12.', 'Swapping draw order changes overlapping colors in the way source-over blending predicts.']
    ]
  },
  17: {
    title: 'Reason about failure one acquisition at a time',
    paragraphs: [
      'Consider initialization that creates a vertex buffer but fails before creating an index buffer. Cleanup must release the vertex buffer and skip the absent index buffer. A zero-initialized owner plus conditional releases makes this partial state representable. Register cleanup early enough that a helper returning false still unwinds everything it already created.',
      'Now consider a frame that acquires a texture but fails to create a view. The texture still needs release. Defers belong immediately after successful acquisitions, before later operations can return. This local reasoning is more reliable than one long success-only cleanup list at the bottom of a procedure.',
      'A recoverable skip means this attempt cannot produce an image but a later attempt may succeed. Device loss means the resources owned by that device cannot simply be assumed usable. The book deliberately exits on that failure. Retrying surface configuration is not an implementation of complete device recreation.'
    ],
    challenges: [
      ['A controlled failure switch', 'Add development-only return points after selected successful initialization steps. Use ordinary cleanup rather than passing invalid handles to the native API.', 'Every forced stop reports the stage and releases only the resources already acquired.'],
      ['A small diagnostic summary', 'Track initialization stage, last acquisition result, and successful frame count. Print the summary when the program exits after a graphics error.', 'A failure report tells you the last successful boundary without thousands of per-frame log lines.']
    ]
  },
  18: {
    title: 'Read the program in two directions',
    paragraphs: [
      'Follow startup forward to understand dependencies: window, surface, compatible adapter, device, presentation configuration, drawing resources. Follow cleanup backward to understand ownership. Then follow a single changing value—position—from input through the CPU update, uniform upload, vertex transform, and resulting coverage.',
      'If position becomes (124,100) on the CPU but the uniform still contains (120,100), the renderer is displaying the old position correctly. Rebuilding a pipeline cannot fix the missing data copy. The purpose of this full walkthrough is to make every visible symptom traceable to a specific boundary.',
      'Checkpoint 18 is a finished geometric demo and a useful debugging reference. It is not the repository’s final application: chapters 19–23 add textures, room composition, collision, diagnostics, and animation. Continue with the baseline here; no optional challenge implementation is assumed in that migration.'
    ],
    challenges: [
      ['A reproducible replay', 'Represent a short sequence of direction/time pairs as CPU data and feed it through update in a diagnostic mode. Keep ordinary keyboard input as the default.', 'Repeated replays end at the same position within floating-point tolerance.'],
      ['A second controlled character', 'Add another game state and a different input mapping. Give each draw independent uniform storage or ranges.', 'Each character moves and changes appearance independently without moving input logic into the renderer.']
    ]
  },
  19: {
    title: 'Trace one picture through memory',
    paragraphs: [
      'A PNG file is compressed bytes. Decoding expands those bytes into a CPU array of pixels. Uploading copies that data into a GPU texture. A texture view exposes the image to a shader, and a sampler decides which texel to read for a texture coordinate. A texel is a pixel in a texture; it does not have to correspond one-to-one with a window pixel.',
      'The room image is 1536 × 1024 texels but occupies 384 × 256 world units. That is four source texels per world unit. A 768 × 512 framebuffer displays the world at two physical pixels per unit, so source texels are still being reduced. Nearest sampling chooses a texel without blending its neighbors; it does not turn high-resolution generated art into a perfectly uniform low-resolution tileset.',
      'This chapter changes several connected contracts. Read it in passes: first file layout and image loading, then shader inputs and bindings, then sprite recording and presentation. Compare each pass with the complete files below. Chapter 20 moves composition into game.Draw, so main temporarily contains those two scene calls here.'
    ],
    challenges: [
      ['A decoration layer', 'Draw an additional tinted or translucent decoration using an existing texture or the renderer’s white rectangle. Choose its place in painter’s order explicitly.', 'The decoration appears in front of or behind the player as intended and does not upload texture pixels every frame.'],
      ['An image-size diagnostic', 'Display or log source texel dimensions, chosen world size, and current viewport scale for an asset.', 'You can explain an image’s apparent size without treating its PNG dimensions as game coordinates.']
    ]
  },
  20: {
    title: 'The boundary follows who makes the decision',
    paragraphs: [
      'The game knows that a room goes behind a player. The renderer knows how to turn ordered image rectangles into GPU work. Main knows when to poll events, update, and render. A useful boundary puts each decision with the code that understands its meaning, even when that means moving only a few lines.',
      'Begin_Frame starts a CPU drawing list. Sprite appends geometry to it. End_Frame uploads and presents the result. Calling Sprite is therefore a description of a future draw, not an immediate picture update. Texture IDs identify renderer-owned assets; the game does not release native texture handles itself.',
      'Batching groups compatible work. We only merge adjacent equal textures because draw order affects transparency. For room, player, white, white, there are three runs. Sorting by texture could move a foreground image behind the player. Preserving the requested picture is the API’s first responsibility.'
    ],
    challenges: [
      ['A visible status indicator', 'Use Rect calls in game.Draw to display a simple bar or input indicator. Keep its state in the game and draw it after the scene.', 'The indicator uses the existing white texture and changes without adding WebGPU calls to the game package.'],
      ['Measure batching', 'Expose a read-only diagnostic count of sprites and texture runs from the renderer. Compare adjacent equal textures with an alternating sequence.', 'Your counter agrees with the actual run structure and measuring does not reorder the scene.']
    ]
  },
  21: {
    title: 'Collide with the feet, not the painted silhouette',
    paragraphs: [
      'An axis-aligned bounding box, or AABB, is a rectangle whose edges follow the world’s x and y axes. We use a small one around the feet because the head and torso visually rise above the floor. Making the whole sprite solid would stop the character when its hair reached a table, even though its feet were still far away.',
      'Suppose the feet box’s right edge is at x=270 and a wall begins at x=274, with overlap along y. A request to move 10 units right has only 4 units of free travel. The solver clips that displacement to 4. It checks the crossed interval, so even a large step cannot jump through that wall when starting outside solids.',
      'We resolve x first, then compute y from the updated position. That permits sliding along a wall, but makes corner behavior depend on axis order. This is a small solver for static rectangular obstacles, not a general physics engine. The floor art does not create colliders automatically; the authored boxes and valid spawn are part of the game data.'
    ],
    challenges: [
      ['A useful doorway', 'Split the south-wall solid around the painted doorway and add a trigger beyond the opening. Initially reset the player to the spawn or change the room’s tint instead of loading another level.', 'The doorway permits passage while the remaining south wall still blocks movement, including large steps.'],
      ['An interactable chest', 'Add an interaction request and a non-solid range box near the chest. Change game state when the player presses the action key in range.', 'The chest remains solid, while interaction is possible nearby without requiring the feet to overlap its solid box.']
    ]
  },
  22: {
    title: 'Choose evidence that can answer the question',
    paragraphs: [
      'A compiler can prove that host types and imports are accepted; it cannot prove that a driver accepts a WGSL pipeline. A collision test can prove a contact position; it cannot show whether the artwork looks the right size. A screenshot can show visual alignment; it cannot prove every movement path. These checks complement one another.',
      'F1 draws the actual authored solids and the current feet box over the room. Orange outlines mark obstacles, and green marks the feet. At the chair, the box should touch an edge without entering it. The body may overlap painted furniture because it is drawn above the floor; the overlay makes that intentional rule visible.',
      'This checkpoint adds diagnostics to the still-image character. Chapter 23 supplies the final animated player and its adjusted visual scale. The verification screenshots are captures of that final application, so the pose and apparent size can differ from this checkpoint even though the colliders are the same.'
    ],
    challenges: [
      ['A movement diagnostic', 'Draw a short line or thin rectangle showing requested movement and another showing resolved movement. Keep this behind the diagnostic toggle.', 'A wall contact shows a nonzero request but zero or shortened resolved displacement.'],
      ['An automated acceptance route', 'Extend the deterministic test route to approach another furniture edge and assert the expected foot coordinate. Count successful presentations separately from attempts.', 'The route fails on an incorrect collider and ends normally on the intended geometry.']
    ]
  },
  23: {
    title: 'Separate where the player stands from which pose we show',
    paragraphs: [
      'A sprite sheet stores several pictures in one texture. A source rectangle chooses a pose; its UV bounds select the corresponding part of that texture. Geometry determines the pose’s size and position in the world. The feet anchor keeps that geometry attached to the same game position even when cropped poses have slightly different widths.',
      'Our first south pose has a crop size of 134 × 268 texels. At PLAYER_TEXEL_SCALE = 0.16, it occupies 21.44 × 42.88 world units. Its anchor is half the width and one unit above the bottom. Increasing visual size changes that geometry, while the world, movement speed, and small floor-contact box retain their existing units.',
      'Requested direction chooses facing, but resolved movement chooses whether to walk. Against a north wall, pressing north still faces north; collision produces zero displacement, so the clock resets to an idle pose. With 0.1 seconds per pose and four columns, a walk cycle lasts 0.4 seconds regardless of how often Draw reads the current frame.'
    ],
    challenges: [
      ['A distance-driven gait', 'Advance the walk cycle from actual distance traveled instead of elapsed time. Choose a world distance for one cycle and use resolved displacement after collision.', 'Changing movement speed changes the pose rate proportionally, while being fully blocked keeps the player idle.'],
      ['An interaction pose', 'Extend animation state with a brief interaction mode, triggered near the chest or a simple test marker. Reuse a pose or add reviewed frames with matching anchors.', 'The interaction ends predictably, returns to the previous facing, and never changes collision size or advances time from Draw.'],
      ['A second inhabitant', 'Add a second character with its own position, facing, and animation clock. It may follow a short waypoint route while sharing the player’s texture ID.', 'Both characters animate independently using one uploaded sheet. Start with furniture collision; character-to-character collision is an additional design choice.']
    ]
  }
};

export function learningGuide(number) {
  const lesson = lessons[number];
  if (!lesson) throw Error(`Missing learning guide for chapter ${number}`);
  return `<section class="learning-guide"><h2>${lesson.title}</h2>${lesson.paragraphs.map(p).join('')}</section>`;
}
export function challenges(number) {
  const lesson = lessons[number];
  return `<section class="challenges"><h2>Challenges</h2><p class="challenge-intro">Optional extensions. The complete game in chapter 23 requires none of these. Work in a separate copy if you want to explore; ${number === 23 ? "the supplied final checkpoint remains a working reference." : "the next chapter starts from this chapter’s supplied baseline."}</p><ol>${lesson.challenges.map(([title, task, check])=>`<li><h3>${title}</h3><p>${task}</p><p class="challenge-check"><strong>Check your result:</strong> ${check}</p></li>`).join('')}</ol></section>`;
}
