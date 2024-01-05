struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) color: vec4<f32>
}

@vertex
fn main(
  @builtin(vertex_index) VertexIndex: u32,
  @location(0) position: vec2<f32>,
  @location(1) color: vec4<f32>
) -> VertexOutput {

  var out: VertexOutput;
  out.position = vec4<f32>(position, 0.0, 1.0);
  out.color = color;

  return out;

}