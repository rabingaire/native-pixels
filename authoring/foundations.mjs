import {p, section as s, code, table} from './html.mjs';

export const firstProgram = s('Read a small Odin program',
  p('A program is a set of instructions saved as text. Odin is the language we will use to write those instructions. A compiler translates the text into an executable: a file your operating system can run. Before adding any window code, read this small example. It is a syntax example, not an extra file to keep in the game.')
  + code(`package character
import "core:fmt"

main :: proc() {
    fmt.println("Hello, Native Pixels")
}`, 'odin', 'Syntax example · read only; the project file follows below')
  + p('A package groups the Odin files in one directory. The first line names this package <code>character</code>. An import makes another package available; <code>core:fmt</code> supplies text-formatting procedures. A procedure is a named group of instructions. Odin starts this program by calling the procedure named <code>main</code>.')
  + p('In <code>main :: proc()</code>, <code>::</code> declares a name whose value will not be reassigned, and <code>proc()</code> defines a procedure with no inputs. Its instructions go between braces. <code>fmt.println(...)</code> calls a procedure from the imported package. The text between quotation marks is a string. Parentheses contain the input to the call; <code>println</code> writes it to the terminal and ends the line.')
  + p('The CPU, or central processing unit, runs these instructions. Later we will also write small programs for the GPU, or graphics processing unit, to calculate where shapes appear and what colors they have. For now, all our program does is print text.'));

export const controlFlow = s('Keep values and make decisions',
  p('The first program ran each instruction once and exited. A window needs the program to remember whether it should keep running. That remembered value is a variable. Read this small example before replacing the application file:')
  + code(`running := true
count: int = 0
for running {
    count += 1
    if count == 3 {
        running = false
    }
}`, 'odin', 'Syntax example inside a procedure; do not add this loop to main')
  + p('<code>running := true</code> creates a variable and lets Odin infer its type. The type is <code>bool</code>, which has two values: <code>true</code> and <code>false</code>. <code>count: int = 0</code> names the type explicitly; <code>int</code> stores whole numbers. <code>=</code> changes an existing variable, while <code>==</code> compares two values. <code>count += 1</code> adds one to the current count.')
  + p('<code>for running</code> repeats its block while <code>running</code> is true. On the third iteration, the <code>if</code> condition succeeds and changes it to false. The next loop check stops repetition. <code>break</code> exits a loop immediately. <code>return</code> leaves the current procedure; leaving <code>main</code> ends our program.')
  + p('The window code also uses <code>!</code> for “not”: <code>if !sdl.Init(...)</code> enters the error branch when initialization returns false. <code>fmt.eprintln</code> writes an error message to the terminal. A name declared without a value, such as <code>event: sdl.Event</code>, starts with its type’s zero value.')
  + p('SDL fills an event variable for us. To let a procedure write into an existing variable, we pass its address with <code>&amp;event</code>. An address tells the procedure where that variable is stored. A value holding an address is called a pointer. We will use pointers whenever a helper needs to change the original data.')
  + p('<code>defer</code> schedules a call for when its current scope exits. A scope is the region inside a pair of braces. In main, we defer SDL cleanup only after SDL starts successfully. Later defers run first, so destroying the window happens before shutting SDL down. An early return still runs the defers already registered. <code>&amp;&amp;</code> means both conditions must hold; <code>||</code> means at least one must hold.')
  + p('An enumeration, usually called an enum, is a type with named choices. SDL events have choices such as <code>.QUIT</code>. The leading dot lets Odin find the enum type from the surrounding code. A <code>switch</code> chooses a <code>case</code> based on a value. <code>#partial switch</code> lets us handle the event kinds we need and ignore the others.')
  + p('Window flags are a set of named options. <code>{}</code> is an empty set, <code>{.METAL}</code> contains one option, and <code>flags += {.METAL}</code> adds it. <code>when ODIN_OS == .Darwin</code> includes that code only when compiling for macOS. This choice happens during compilation; ordinary <code>if</code> runs when the program executes.'));

export const records = s('Group related values in a struct',
  p('We now need to keep more than one graphics handle. A struct groups related values under one name. Each named value inside it is a field. The complete example below shows how a helper changes a field through a pointer. Read it on its own; do not paste it into your game or replace your existing main. The game changes follow after this explanation.')
  + code(`package counter_example

Counter :: struct { value: int }

increment :: proc(counter: ^Counter) {
    counter.value += 1
}

main :: proc() {
    counter := Counter{value = 2}
    increment(&counter) // counter.value is now 3
}`, 'odin', 'Complete standalone syntax example · read only; do not add to the game')
  + p('The <code>Counter</code> declaration and <code>increment</code> procedure are outside <code>main</code>, after the package line. Between main’s opening and closing braces, the first line creates <code>counter</code>; the very next line calls <code>increment</code>. This example ends there and prints nothing.')
  + p('<code>Counter{value = 2}</code> creates a struct value with a named field. <code>^Counter</code> is the type “pointer to Counter.” The call passes <code>&amp;counter</code>, so the procedure changes the original counter. Odin lets us access fields through the pointer using <code>counter.value</code>. <code>counter^</code> means the entire value at the address.')
  + p('A procedure can return a result: <code>proc(...) -&gt; bool</code> returns true or false. Our initialization helpers return false when they cannot finish. An empty struct value <code>{}</code> resets all fields to their zero values. Pointer and native-handle fields then contain <code>nil</code>, meaning no object. This lets cleanup distinguish objects that were created from objects that are still absent.')
  + p('Some platform fields use <code>u32</code> or <code>u64</code>: unsigned whole numbers stored in 32 or 64 bits. A conversion such as <code>u64(window_id)</code> makes the expected type explicit. Use the type required by the API field; the same numeric value can occupy different amounts of memory in different types.')
  + p('A handle is a value returned by a library that identifies one of its objects. We pass the handle back to that library instead of accessing the object’s internal memory. A descriptor is a struct containing options for creating an object. An owner is the part of our application responsible for keeping and releasing a handle. The descriptor, the handle, and the owner have different jobs.'));

export const callbackPrimer = s('Let a library call one of our procedures',
  p('So far our code has called SDL and read a return value. The adapter request uses a different form: we give WebGPU a procedure to call with its result. That procedure is a callback. The complete example below demonstrates the idea without graphics types. Read it on its own; do not paste it into your game or replace your existing main. The WebGPU changes follow after this explanation.')
  + code(`package callback_example
import "core:fmt"

report :: proc(value: int) {
    fmt.println("Result:", value)
}

calculate :: proc(done: proc(value: int)) {
    done(7)
}

main :: proc() {
    calculate(report)
}`, 'odin', 'Complete standalone syntax example · read only; do not add to the game')
  + p('The <code>report</code> and <code>calculate</code> procedures are outside <code>main</code>, after the import. The call <code>calculate(report)</code> is the only statement between main’s braces. Execution starts at that call, enters <code>calculate</code>, and then <code>done(7)</code> calls <code>report(7)</code>, which prints <code>Result: 7</code>.')
  + p('The call passes <code>report</code> without parentheses: it passes the procedure itself. <code>calculate</code> calls that procedure with 7. WebGPU also passes a status and a handle to our callback. We supply a pointer to our <code>GPU</code> struct as <em>user data</em>, so the callback knows where to store the handle.')
  + p('A callback may run before the requesting call returns, or later. That timing determines how long its user data must stay valid. The pinned wgpu-native adapter and device requests call their callbacks before returning. Our request code checks that this happened. This is a property of the selected library version, not a rule for callbacks in general.')
  + p('The native library calls procedures using C’s calling convention: the rules for passing arguments and results at the machine-code boundary. We write <code>proc "c"</code> to match it. A <code>rawptr</code> carries an address without an Odin pointee type. <code>cast(^GPU)userdata1</code> restores the type we originally passed. This cast is valid because we supplied a pointer to that same GPU value.')
  + p('Odin normally supplies a hidden <code>context</code> value to procedures for services such as memory allocation. A C caller does not supply it. Each native callback sets <code>context = runtime.default_context()</code> before using the formatting package.')
  + p('Error callbacks need one more precaution. A thread is a sequence of CPU work that may run alongside another thread. The native library may report an error from another thread while our main loop reads the error flag. An atomic load or store accesses that shared flag with defined coordination between threads. Both reads and writes use atomic operations; the flag lives for the whole process so a late callback cannot access an expired local variable.'));

export const arrayPrimer = s('Read arrays, slices, and native lists',
  p('Surface capabilities include a list of formats. Before reading it, distinguish an array, which stores elements, from a slice, which describes a range of existing elements:')
  + code(`values := [3]int{10, 20, 30}
middle := values[1]       // 20: indices start at zero
first_two := values[:2]  // a view of elements 0 and 1
for value in first_two {
    fmt.println(value)
}`, 'odin', 'Syntax example inside a procedure')
  + p('<code>[3]int</code> is an array of three integers. <code>[]int</code> is a slice of integers. A slice keeps an address and a length; creating one does not copy the elements. <code>len(first_two)</code> is 2. The upper bound in <code>[:2]</code> is excluded. <code>raw_data(first_two)</code> gives the address of the first element when a native call needs it separately from the length.')
  + p('Native interfaces often return that address and length as two fields. Here <code>caps.formats</code> points to format values and <code>caps.formatCount</code> tells us how many exist. <code>caps.formats[:caps.formatCount]</code> makes a slice so an Odin loop can read them. The native library allocated the list, so its matching free procedure must release it. Neither the pointer nor a slice remains usable after that release.')
  + p('The refresh procedure also imports <code>core:c</code>. Its <code>c.int</code> type matches the integer fields SDL writes through output pointers. <code>u32</code> is an unsigned 32-bit integer. A conversion such as <code>u32(width)</code> makes the destination type explicit; first check that width is positive so a negative error value cannot become a large unsigned size.')
  + p('Some binding helpers return two values. <code>caps, status := wgpu.SurfaceGetCapabilities(...)</code> receives both the data and the result status. <code>_</code> discards a returned value deliberately. The status must be checked before using data from a call that can fail.'));

export const wgslPrimer = s('Read the shader language',
  p('WGSL is the language for the small programs our GPU executes. Its spelling differs from Odin, but the same ideas apply: values, procedures, inputs, and returned results. Read these spellings before the complete shader:')
  + table(['WGSL spelling', 'Meaning here'], [
    ['<code>fn vs_main(...) -&gt; vec4f</code>', 'A function that returns four floating-point numbers. WGSL calls a procedure a function.'],
    ['<code>f32</code>, <code>u32</code>', 'A 32-bit floating-point value, or a nonnegative 32-bit integer.'],
    ['<code>vec2f(x, y)</code>, <code>vec4f(x, y, z, w)</code>', 'Two or four f32 components grouped as a vector.'],
    ['<code>array&lt;vec2f, 3&gt;</code>', 'Three two-component vectors, indexed from zero.'],
    ['<code>let positions = ...;</code>', 'Give a local value a name; this value cannot be reassigned.'],
    ['<code>@vertex</code>, <code>@fragment</code>', 'Mark functions that the graphics pipeline can run at those stages.'],
    ['<code>return value;</code>', 'Return a result. WGSL statements end with a semicolon.'],
  ])
  + p('The vertex shader returns a clip position <code>(x, y, z, w)</code>. WebGPU keeps points where x and y lie between −w and +w, and z lies between 0 and w. It then divides x, y, and z by w to obtain normalized device coordinates, or NDC. We choose z = 0 and w = 1, so the division leaves x and y unchanged.')
  + p('For this first triangle, x = −1 is the left edge, x = +1 the right edge, y = +1 the top, and y = −1 the bottom. The center is (0,0). These are coordinates relative to the output region, not pixel numbers. Three corners inside these bounds give us a visible triangle.'));

export const vertexPrimer = s('Count the bytes in one corner',
  p('An <code>f32</code> stores a floating-point number in 32 bits, or four bytes. Floating-point numbers represent fractions with limited precision, which lets us place a corner between whole-number coordinates. An array <code>[2]f32</code> holds x and y in eight bytes. Odin also lets us read those components as <code>.x</code> and <code>.y</code>.')
  + p('Our new Vertex struct stores two position numbers and four color numbers. RGB gives red, green, and blue; the fourth value, alpha, is 1 for the opaque colors in this chapter. Six f32 values require 24 bytes. <code>size_of(Vertex)</code> asks for the actual size, and <code>offset_of(Vertex, color)</code> asks where the color field starts.')
  + p('<code>#assert</code> checks a condition while compiling. We use it to stop the build if the struct layout differs from the byte layout we tell WebGPU to read. This agreement between Odin memory and the graphics interface is a small example of an application binary interface, or ABI. Matching names is not enough; the bytes must agree.'));

export const packagesPrimer = s('Give two pictures independent drawing data',
  p('Our old renderer draws one rectangle using one position uniform. The room needs two rectangles in the same frame: a background covering the world and a smaller player on top. Writing that one uniform twice before submitting would leave both draws reading the final contents. We need separate position data for each rectangle.')
  + p('We will store four positioned vertices per picture in one CPU array, then upload the used part once. A picture drawn on a rectangle is called a sprite. <code>Sprite</code> will append its corners and record which image to use. <code>Begin_Frame</code> starts an empty list; <code>End_Frame</code> turns the list into the GPU commands we already understand. These procedures solve the two-picture problem before the game gains more objects.')
  + p('The renderer now needs a file for image loading as well as the existing surface, device, and drawing files. Give those files their own <code>renderer</code> directory and package. The game gets a <code>game</code> directory. A relative import such as <code>import renderer "../renderer"</code> means “find that directory beside this one.” <code>renderer.State</code> then names the State type in that package.')
  + p('Files in the same directory share package declarations, but each file declares its own imports. The application’s <code>src</code> directory will contain only main.odin. We keep the old GPU and platform procedures inside the renderer package; their behavior does not change. The file table below gives every move and replacement.')
  + p('A texture ID is an integer identifying one image owned by this renderer. We use <code>Texture_ID :: distinct u32</code> to give IDs their own type. Zero means loading failed; successful IDs start at one. Keeping the native texture and its cleanup inside the renderer means game code can choose an image without managing GPU handles.'));
