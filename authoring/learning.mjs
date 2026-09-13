import { p } from './html.mjs';

// These explanations and extensions are deliberately independent of checkpoint
// generation: no challenge becomes an undocumented prerequisite for later code.
const lessons = {
  1: {
    title: 'Start with an empty project',
    paragraphs: [
      'You will build one application from the first source file to the final animated room. This chapter creates the working directory, introduces the notation in the first program, and installs the tools needed to run it. No Odin or graphics knowledge is assumed.',
      'You need a desktop computer running macOS, Windows, or Linux, a plain-text editor, and a terminal. Commands for installing the native tools are included below. The result of this chapter is a version report in the terminal; the window comes next.'
    ],
    challenges: [
      ['A useful dependency report', 'Extend the probe to print a readable heading, decoded library versions, and whether they match this edition’s expected values. Keep the expected values together so the report is easy to update.', 'A deliberately changed expected version produces a clear mismatch message before any window is created.'],
      ['A portable launch note', 'Write a short setup note for a friend using your operating system: source folder, compiler command, executable location, and native library location. Explain which failure is a compile, link, or load failure.', 'Following the note from a fresh terminal runs the probe without relying on your current working directory.']
    ]
  },
  2: {
    title: 'From a report to a window',
    paragraphs: [
      'Your program can call SDL and WebGPU, print their versions, and exit. A desktop application needs to stay running until the user closes it. We will replace the version report with an SDL window and a loop that handles window events.',
      'An event is a notification such as a request to close the window. Before writing the loop, we will learn the variables, decisions, and cleanup notation it uses. This chapter changes only src/main.odin.'
    ],
    challenges: [
      ['A keyboard exit', 'Handle an Escape key-down event alongside the close event. Use the existing running flag so both actions take the same cleanup path.', 'Both Escape and the title-bar close control exit cleanly.'],
      ['A focus-aware title', 'Handle focus gain and loss events and update the window title to reflect whether the window is active.', 'Switching to another application and back changes the title without creating another window.']
    ]
  },
  3: {
    title: 'Understand the picture before writing the drawing code',
    paragraphs: [
      'The application now opens a window and responds to its close button. It does not draw a picture yet. Leave the files unchanged while we examine how a few corners can describe a filled shape.',
      'This chapter introduces the jobs of the CPU, shaders, and rasterizer. You only need to understand the order of those jobs; we will teach the exact coordinate rules and API calls when we use them.'
    ],
    challenges: [
      ['Plan a diamond marker', 'Sketch a diamond from a top, right, bottom, and left corner. List two triangle triplets that cover it. Save the sketch for chapter 10, where you can implement it.', 'The triangles share one edge and cover the diamond without a gap.'],
      ['Draw the same shape at two sizes', 'Sketch the same triangle on two image grids, one twice as wide and tall as the other. Mark the corners and the area each triangle covers.', 'The larger image has more covered pixels without needing more corner records.']
    ]
  },
  4: {
    title: 'Connect the window to WebGPU',
    paragraphs: [
      'SDL already owns a responsive window. To draw into that window, WebGPU needs a connection to its native drawing destination. That connection is called a surface. An instance is the WebGPU object used to create it.',
      'We will add src/platform.odin for the operating-system-specific connection and src/gpu.odin to keep its handles together. First we will learn structs and ownership, then create the connection, and finally add cleanup. The window will still have no application-drawn pixels.'
    ],
    challenges: [
      ['Explain the platform bridge in logs', 'Add one startup diagnostic naming the selected platform branch and whether its required native handles were obtained. Report the stage on failure without dumping raw pointers.', 'A failed handle lookup identifies the missing platform property and still follows cleanup.'],
      ['Make ownership visible', 'Add temporary creation and release messages for the instance, surface, and Metal view where applicable. Keep them behind one debug flag.', 'Normal close and a forced early return show that each successfully created object is released once, in dependency order.']
    ]
  },
  5: {
    title: 'Choose a GPU that can use our window',
    paragraphs: [
      'We have an instance and a surface, but no device for creating drawing resources. We will ask for an adapter compatible with the surface, create a device from it, and obtain the queue that accepts its work.',
      'This request introduces callbacks: procedures the library calls with a result. We will learn that mechanism in a small example before using it for native requests and error reporting. Keep the existing platform file; this chapter extends src/gpu.odin and the main loop.'
    ],
    challenges: [
      ['A readable GPU report', 'Print a small startup report with the adapter information and selected device limits available through the pinned binding. Release any native strings or result members using their matching API.', 'The report appears once and helps identify which GPU is used on a multi-GPU machine.'],
      ['An explicit requirement', 'Choose a hypothetical maximum sprite-image dimension and compare it with the device limit before loading assets. Explain the requirement in the error message.', 'A deliberately excessive requirement is rejected clearly without attempting an invalid allocation.']
    ]
  },
  6: {
    title: 'Choose the images the window will display',
    paragraphs: [
      'The device and queue now exist. Before requesting a frame image, we must choose its size, color format, and presentation settings. The supported choices come from the surface and adapter together.',
      'We will read those choices, save a supported configuration, and apply it using the window’s actual pixel dimensions. The new procedures belong in src/gpu.odin. Configuration prepares images for use; the following chapter will put a background color into one.'
    ],
    challenges: [
      ['Show the negotiation', 'Print the advertised surface formats and presentation modes once, marking the selected entries. Do this before freeing the capability arrays.', 'The selected format and FIFO mode are visibly supported by this surface/adapter pair.'],
      ['A reconfiguration counter', 'Count actual SurfaceConfigure calls separately from calls to the refresh helper. Use the counter again when resizing is enabled in chapter 13.', 'An unchanged window does not continuously reconfigure, even though the helper is checked each frame.']
    ]
  },
  7: {
    title: 'Make the first visible frame',
    paragraphs: [
      'The window is connected to a device and its surface is configured. Now we can ask for an image, fill it with one color, and send it to the window. A frame is one such image produced by the application.',
      'Create src/renderer.odin for this work and call its frame procedure from main. We will walk through acquisition, command recording, and presentation separately. The clear background gives us a useful working result before adding geometry.'
    ],
    challenges: [
      ['A keyboard palette', 'Use discrete key events to select among three clear colors. Store the choice on the CPU and supply it to the next render pass.', 'The background changes while the same window, device, and surface stay alive.'],
      ['Count visible progress', 'Add separate counters for attempted frames, successful presents, and skipped acquisitions. Print a summary at shutdown.', 'A temporarily occluded window can increase attempts without falsely counting every attempt as a presented image.']
    ]
  },
  8: {
    title: 'Draw inside the frame',
    paragraphs: [
      'The background proves that the application can acquire, clear, submit, and present an image. To draw a triangle over it, we need a shader that supplies its corners and a shader that supplies its color.',
      'We will create shaders/character.wgsl and extend the renderer with a pipeline that selects those shaders. The first shader stores three fixed corners so we can learn shader syntax without also learning vertex-buffer layout.'
    ],
    challenges: [
      ['A geometric emblem', 'Expand the shader’s position array to six entries and draw two triangles that form a simple emblem. Keep every triangle inside the clip volume.', 'Both triangles appear with a draw count of six and no additional pipeline.'],
      ['Two color pipelines', 'Create two pipelines using fragment entry points with different constant colors. Switch the selected pipeline using a key, and release both at shutdown.', 'Switching colors selects an existing pipeline instead of creating one inside the frame loop.']
    ]
  },
  9: {
    title: 'Let Odin supply the corners',
    paragraphs: [
      'The triangle’s corners currently live inside WGSL. We will move that data into Odin, copy it into a GPU buffer, and tell the pipeline how to read each corner. A different color at each corner will make the data flow visible.',
      'The new problem is a byte-layout problem: Odin stores a record, WebGPU reads its fields, and WGSL receives the values. We will calculate one record’s size and offsets before changing the shader and buffer setup.'
    ],
    challenges: [
      ['A second mesh', 'Put two independently shaped triangles into one six-vertex buffer, with a different color scheme for each. Update the upload size, bound range, and draw count together.', 'Both triangles render without changing the 24-byte vertex contract.'],
      ['An animated color field', 'Keep positions fixed and update vertex colors from a CPU-side clock. Add CopyDst only if it is missing, and reuse the buffer allocation.', 'Colors animate without rebuilding the pipeline or changing triangle positions.']
    ]
  },
  10: {
    title: 'Turn the triangle into a rectangle',
    paragraphs: [
      'Our vertex buffer can supply positions and colors. A rectangle needs two triangles, and those triangles share two corners. An index buffer lets both triangles refer to the same stored corners.',
      'We will store four vertex records and six indices, then replace the ordinary draw with an indexed draw. Keep the vertex layout and color shader from chapter 9. Only the geometry and the way the draw selects it need to change.'
    ],
    challenges: [
      ['Build the diamond', 'Replace the rectangle’s corner positions with the diamond from chapter 3, or sketch one now. Reuse four vertices and six indices.', 'The diamond is completely filled and no extra center vertex is required.'],
      ['Two indexed quads', 'Store eight vertices and twelve indices for two rectangles. Add four to the second rectangle’s local indices so they reference its own vertices.', 'Changing only the second rectangle’s vertices leaves the first rectangle in place.']
    ]
  },
  11: {
    title: 'Choose a position in useful units',
    paragraphs: [
      'The indexed rectangle is visible, but its coordinates are fractions of the output area. We want to say that it starts at (120,100) and is 48 units wide by 64 units tall.',
      'We will define local corners from zero to one, then calculate world and normalized device coordinates on the CPU. For this chapter only, one world unit means one framebuffer pixel. A fresh copy of the local corners will be transformed each frame, so the calculation never transforms its own previous result.'
    ],
    challenges: [
      ['Anchor a marker at its center', 'Define a center position for a rectangular marker and derive its top-left position by subtracting half its size. Keep the GPU conversion unchanged.', 'Increasing the marker’s size leaves its center in the same world position.'],
      ['Add a translation camera', 'Subtract a camera position from each world corner before projecting. Move the camera using two keys while keeping the character’s world position fixed.', 'Moving the camera right moves the character left on screen by the corresponding amount.']
    ]
  },
  12: {
    title: 'Send the transform instead of rewriting the corners',
    paragraphs: [
      'Chapter 11 showed the full coordinate calculation on the CPU. The local square does not change when its position changes. We will keep those corners in the vertex buffer and send position, size, view size, camera, and tint separately.',
      'A uniform buffer holds these shared shader inputs. We will first lay out its bytes, then connect it to the shader, and finally move the existing arithmetic into WGSL. The picture should stay the same; the responsibility for transforming corners changes.'
    ],
    challenges: [
      ['A scrolling camera', 'Use the existing camera field to pan the view with separate keys. Leave character position unchanged and upload the camera through the same uniform buffer.', 'Panning affects projection while game coordinates retain their meaning.'],
      ['Two independent characters', 'Create a second uniform buffer and bind group with the same layout, then bind each before its draw. Give the characters different positions and tints.', 'Both characters keep independent transforms; writing one shared buffer twice before submission is not used as a substitute.']
    ]
  },
  13: {
    title: 'Keep the character’s shape while resizing',
    paragraphs: [
      'The rectangle now uses a shader transform, but its size is based on the framebuffer’s pixel dimensions. High-density screens and resizable windows require us to distinguish that image size from the window’s logical size.',
      'We will enable resizing, pass the logical size to the transform, and keep physical pixel dimensions in surface configuration. The renderer must also skip drawing while the window has no usable extent and resume when it does.'
    ],
    challenges: [
      ['An aspect-preserving preview', 'Choose a fixed logical canvas and fit it into the window using the smaller axis scale. Center the viewport and leave the cleared attachment visible around it.', 'A logical square stays square in both tall and wide windows.'],
      ['Two views of one scene', 'Render the character into two non-overlapping viewports using the appropriate view extent for each. Use scissors if geometry must stay inside each panel.', 'The panels show consistent character proportions and the attachment clear still covers the entire window.']
    ]
  },
  14: {
    title: 'Give the application something to remember',
    paragraphs: [
      'The renderer receives fixed position and color values. We now want keyboard input to affect those values while the application runs. Game state is the data that remains from one iteration to the next.',
      'Create src/game.odin for that state and its update procedure. First, held movement keys will change the character’s tint. This proves that input reaches the shader before we add the elapsed-time calculation needed for movement.'
    ],
    challenges: [
      ['A reset action', 'Use a nonrepeated key-down event to request resetting the character to its initial position. Apply the request in game update.', 'Holding the key does not repeatedly reset future movement, and rendering does not mutate game state.'],
      ['A selectable appearance', 'Add a small palette index to game state and cycle it with a discrete key press. Derive the tint from that index.', 'The selected appearance remains after release and survives a resize.']
    ]
  },
  15: {
    title: 'Move by distance per second',
    paragraphs: [
      'Holding a direction key changes tint, so the path from SDL input to the rendered character works. We will now use the same direction to change position.',
      'Moving a fixed amount per loop would make faster computers move farther. We will measure elapsed seconds, multiply by speed, and keep diagonal movement at the same speed as horizontal movement. Then we will stop the character at the view’s edges.'
    ],
    challenges: [
      ['Sprint without diagonal advantage', 'Add a held sprint input that changes speed before calculating displacement. Keep normalization and the seconds-based step.', 'Sprint multiplies cardinal and diagonal travel by the same factor.'],
      ['Acceleration and braking', 'Store velocity in game state and move it toward a target velocity at a rate measured in units/second². Integrate position using dt.', 'The character starts and stops gradually, and comparable uncapped elapsed times give similar travel at different update rates.']
    ]
  },
  16: {
    title: 'Give the moving rectangle a face',
    paragraphs: [
      'The character moves at a speed measured in seconds and stays inside the view. It is still a colored rectangle. We will use its local coordinates to select small eye and mouth regions in the fragment shader.',
      'We will also introduce alpha blending, the rule for combining the character’s color with the existing background. We will work through the color calculation before choosing blend factors in the pipeline.'
    ],
    challenges: [
      ['A blinking face', 'Add a time or blink parameter to the uniform contract and use it to shorten the eye rectangles briefly. Update both host and WGSL layouts with their assertions.', 'Blinking changes the face without moving vertices or rebuilding the pipeline each frame.'],
      ['A translucent marker', 'Add a separately positioned translucent quad behind or in front of the character. Use independent per-draw data as described in chapter 12.', 'Swapping draw order changes overlapping colors in the way source-over blending predicts.']
    ]
  },
  17: {
    title: 'Check what happens when a step fails',
    paragraphs: [
      'The geometric character is complete. Leave the source unchanged while we review the cleanup and error paths already written. A program must release its resources even if initialization or a frame stops halfway.',
      'We will trace a partial initialization and a failed frame, then build a debugging order from the facts each visible result proves. The purpose is to understand the existing ownership rules well enough to extend the renderer safely.'
    ],
    challenges: [
      ['A controlled failure switch', 'Add development-only return points after selected successful initialization steps. Use ordinary cleanup rather than passing invalid handles to the native API.', 'Every forced stop reports the stage and releases only the resources already acquired.'],
      ['A small diagnostic summary', 'Track initialization stage, last acquisition result, and successful frame count. Print the summary when the program exits after a graphics error.', 'A failure report tells you the last successful boundary without thousands of per-frame log lines.']
    ]
  },
  18: {
    title: 'Follow the whole foundation program',
    paragraphs: [
      'Your project now combines a window, a graphics connection, drawing resources, game state, movement, and a face shader. This chapter changes no files. We will follow one key press through the complete application.',
      'Keep track of the position as it becomes a CPU value, uploaded bytes, shader inputs, and finally a different image. The next part will use this same foundation to draw the room and player artwork.'
    ],
    challenges: [
      ['A reproducible replay', 'Represent a short sequence of direction/time pairs as CPU data and feed it through update in a diagnostic mode. Keep ordinary keyboard input as the default.', 'Repeated replays end at the same position within floating-point tolerance.'],
      ['A second controlled character', 'Add another game state and a different input mapping. Give each draw independent uniform storage or ranges.', 'Each character moves and changes appearance independently without moving input logic into the renderer.']
    ]
  },
  19: {
    title: 'Use pictures for the room and player',
    paragraphs: [
      'The moving geometric character has taught us buffers, shader inputs, coordinate conversion, and blending. We now need two pictures in one frame: a room behind a player. The renderer must keep their positions and image choices separate.',
      'This chapter has several connected steps. Start with why we need a list of sprites and separate packages. Then learn image coordinates and shader bindings, upload the image bytes, record the two rectangles, and fit the fixed room into the window. Each step below has its own code and explanation; assemble the complete files before running.'
    ],
    challenges: [
      ['A decoration layer', 'Draw an additional tinted or translucent decoration using an existing texture or the renderer’s white rectangle. Choose its place in painter’s order explicitly.', 'The decoration appears in front of or behind the player as intended and does not upload texture pixels every frame.'],
      ['An image-size diagnostic', 'Display or log source texel dimensions, chosen world size, and current viewport scale for an asset.', 'You can explain an image’s apparent size without treating its PNG dimensions as game coordinates.']
    ]
  },
  20: {
    title: 'Let the game choose its scene',
    paragraphs: [
      'The textured room works, but main still decides which images to draw and in what order. Those decisions describe the game. We will move them into game.Draw and have main call that procedure.',
      'This is a small refactoring: code changes location while the result stays the same. We will use it to review which code owns textures, which code updates position, and why the renderer preserves the order of Sprite calls.'
    ],
    challenges: [
      ['A visible status indicator', 'Use Rect calls in game.Draw to display a simple bar or input indicator. Keep its state in the game and draw it after the scene.', 'The indicator uses the existing white texture and changes without adding WebGPU calls to the game package.'],
      ['Measure batching', 'Expose a read-only diagnostic count of sprites and texture runs from the renderer. Compare adjacent equal textures with an alternating sequence.', 'Your counter agrees with the actual run structure and measuring does not reorder the scene.']
    ]
  },
  21: {
    title: 'Make the painted furniture solid',
    paragraphs: [
      'The game draws a room and a player, but the player can cross every piece of furniture. Images do not provide movement rules. We will describe solid regions as rectangles in the same world units as the player position.',
      'The player will have a small rectangle around the feet. A movement procedure will shorten a requested step before that rectangle crosses an obstacle. We will work through one contact numerically and then create tests from the complete code in this chapter.'
    ],
    challenges: [
      ['A useful doorway', 'Split the south-wall solid around the painted doorway and add a trigger beyond the opening. Initially reset the player to the spawn or change the room’s tint instead of loading another level.', 'The doorway permits passage while the remaining south wall still blocks movement, including large steps.'],
      ['An interactable chest', 'Add an interaction request and a non-solid range box near the chest. Change game state when the player presses the action key in range.', 'The chest remains solid, while interaction is possible nearby without requiring the feet to overlap its solid box.']
    ]
  },
  22: {
    title: 'Show the collision rules on screen',
    paragraphs: [
      'The collision procedure now stops the player at furniture and walls. It can still be hard to tell whether a painted edge matches its solid rectangle. We will draw those rectangles over the room when F1 is pressed.',
      'This needs an input event that happens once per press, a retained on/off flag, and four thin rectangles per outline. We will then run a manual acceptance pass that checks input, contact, resizing, and shutdown together.'
    ],
    challenges: [
      ['A movement diagnostic', 'Draw a short line or thin rectangle showing requested movement and another showing resolved movement. Keep this behind the diagnostic toggle.', 'A wall contact shows a nonzero request but zero or shortened resolved displacement.'],
      ['An automated acceptance route', 'Extend the deterministic test route to approach another furniture edge and assert the expected foot coordinate. Count successful presentations separately from attempts.', 'The route fails on an incorrect collider and ends normally on the intended geometry.']
    ]
  },
  23: {
    title: 'Choose a pose from the movement result',
    paragraphs: [
      'The character moves and collides correctly, but its picture never changes. A sprite sheet contains several poses in one image. We will select a smaller rectangle from that image for each pose.',
      'The game will remember facing direction and elapsed animation time. Requested direction chooses where the player faces; actual movement after collision determines whether it walks or stands still. Drawing will read that state without advancing the clock.'
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
  return `<section class="challenges"><h2>Challenges</h2><p class="challenge-intro">Optional extensions. The complete game in chapter 23 requires none of these. Work in a separate copy if you want to explore; ${number === 23 ? "the complete final files above remain your reference." : "the next chapter starts from the unmodified result described here."}</p><ol>${lesson.challenges.map(([title, task, check])=>`<li><h3>${title}</h3><p>${task}</p><p class="challenge-check"><strong>Check your result:</strong> ${check}</p></li>`).join('')}</ol></section>`;
}
