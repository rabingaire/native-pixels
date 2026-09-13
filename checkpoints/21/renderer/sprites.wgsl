struct View { size: vec2f, padding: vec2f }
@group(0) @binding(0) var<uniform> view: View;
@group(1) @binding(0) var sprite: texture_2d<f32>;
@group(1) @binding(1) var sprite_sampler: sampler;
struct Vertex_Output {
    @builtin(position) position: vec4f,
    @location(0) uv: vec2f,
    @location(1) tint: vec4f,
}
@vertex fn vs_main(@location(0) position: vec2f,
                  @location(1) uv: vec2f,
                  @location(2) tint: vec4f) -> Vertex_Output {
    var out: Vertex_Output;
    out.position = vec4f(position.x / view.size.x * 2.0 - 1.0,
                        1.0 - position.y / view.size.y * 2.0, 0.0, 1.0);
    out.uv = uv;
    out.tint = tint;
    return out;
}
@fragment fn fs_main(in: Vertex_Output) -> @location(0) vec4f {
    return textureSample(sprite, sprite_sampler, in.uv) * in.tint;
}
