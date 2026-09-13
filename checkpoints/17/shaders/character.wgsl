struct Uniforms {
    position: vec2f,
    size: vec2f,
    view_size: vec2f,
    camera: vec2f,
    tint: vec4f,
}
@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct Vertex_Out {
    @builtin(position) clip_position: vec4f,
    @location(0) color: vec4f,
    @location(1) local_position: vec2f,
}

@vertex
fn vs_main(@location(0) position: vec2f, @location(1) color: vec4f) -> Vertex_Out {
    var out: Vertex_Out;
    let pixel = uniforms.position + position * uniforms.size - uniforms.camera;
    let ndc = vec2f(2.0 * pixel.x / uniforms.view_size.x - 1.0,
                   1.0 - 2.0 * pixel.y / uniforms.view_size.y);
    out.clip_position = vec4f(ndc, 0.0, 1.0);
    out.color = color * uniforms.tint;
    out.local_position = position;
    return out;
}

@fragment
fn fs_main(in: Vertex_Out) -> @location(0) vec4f {
    let p = in.local_position;
    let left_eye = p.x > 0.22 && p.x < 0.36 && p.y > 0.25 && p.y < 0.39;
    let right_eye = p.x > 0.64 && p.x < 0.78 && p.y > 0.25 && p.y < 0.39;
    let mouth = p.x > 0.35 && p.x < 0.65 && p.y > 0.62 && p.y < 0.69;
    if left_eye || right_eye || mouth {
        return vec4f(0.012, 0.025, 0.040, in.color.a);
    }
    return in.color;
}
