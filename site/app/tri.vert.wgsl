struct ShaderInput {
  @builtin(vertex_index) vertex_index: u32,
  @location(0) position: vec2<f32>,
  @location(1) color: vec4<f32>
}

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) color: vec4<f32>
}

struct Uniforms {
  matrix: mat4x4<f32>
}

@binding(0) @group(0) var<uniform> uniforms: Uniforms;

@vertex
fn main(
  input: ShaderInput
) -> VertexOutput {

  var out: VertexOutput;
  let pos = vec4<f32>(input.position, 0.0, 1.0);
  out.position = uniforms.matrix * pos;
  out.color = input.color;

  return out;

}