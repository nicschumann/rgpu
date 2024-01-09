import { RGPUAllocator } from "./alloc";
import { RGPUShaderChecker } from "./check";
import {
  BufferHandle,
  BufferParameters,
  type IGPU,
  type RenderCallbackParameters,
  type RenderConfigOptions,
} from "./types";

export class RGPUState implements IGPU {
  private adapter: GPUAdapter;
  private device: GPUDevice;
  private context: GPUCanvasContext;
  private canvas: HTMLCanvasElement;
  private allocator: RGPUAllocator;
  private checker: RGPUShaderChecker;

  private alphaMode: GPUCanvasAlphaMode = "premultiplied";
  private format: GPUTextureFormat = navigator.gpu.getPreferredCanvasFormat();

  constructor(
    adapter: GPUAdapter,
    device: GPUDevice,
    context: GPUCanvasContext,
    canvas: HTMLCanvasElement
  ) {
    this.adapter = adapter;
    this.device = device;
    this.context = context;
    this.canvas = canvas;
    this.allocator = new RGPUAllocator(device);
    this.checker = new RGPUShaderChecker();

    this.context.configure({
      device: this.device,
      format: this.format,
      alphaMode: this.alphaMode,
    });
  }

  buffer(input: BufferParameters) {
    const result = this.allocator.alloc(input.usage, input.data);
    if (!result) console.log("failed to create buffer!");

    return result;
  }

  render({ vertex, fragment, attributes, uniforms = [] }: RenderConfigOptions) {
    const sig = this.checker.check_pipeline_stage(vertex);

    console.log(sig);
    console.log(uniforms);

    const bindGroupLayouts: GPUBindGroupLayout[] = uniforms.map((group) => {
      return this.device.createBindGroupLayout({
        entries: group.map((binding, i) => ({
          binding: i,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: {
            type: "uniform",
          },
        })),
      });
    });

    const pipelineLayout = this.device.createPipelineLayout({
      bindGroupLayouts,
    });

    const pipeline = this.device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: {
        module: this.device.createShaderModule({
          code: vertex,
        }),
        entryPoint: "main",
        buffers: [
          this.allocator.vertex_descriptor(attributes, {
            position: 0,
            color: 1,
          }),
        ],
      },
      fragment: {
        module: this.device.createShaderModule({
          code: fragment,
        }),
        entryPoint: "main",
        targets: [{ format: this.format }],
      },
      primitive: {
        topology: "triangle-list",
      },
    });

    const uniformBindGroups = uniforms.map((group, i) => {
      return this.device.createBindGroup({
        layout: bindGroupLayouts[i],
        entries: group.map((handle, binding) => ({
          binding,
          resource: {
            buffer: this.allocator.data(handle),
          },
        })),
      });
    });

    const passDescriptor: GPURenderPassDescriptor = {
      colorAttachments: [
        {
          view: (<unknown>null) as GPUTextureView, // assigned later
          clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
          loadOp: "clear" as GPULoadOp,
          storeOp: "store" as GPUStoreOp,
        },
      ],
    };

    return () => {
      const commandEncoder = this.device.createCommandEncoder();
      const textureView = this.context.getCurrentTexture().createView();

      // @ts-ignore
      passDescriptor.colorAttachments[0].view = textureView;

      const passEncoder = commandEncoder.beginRenderPass(passDescriptor);
      passEncoder.setPipeline(pipeline);
      uniforms.forEach((_, i) =>
        passEncoder.setBindGroup(i, uniformBindGroups[i])
      );
      passEncoder.setVertexBuffer(0, this.allocator.data(attributes));
      passEncoder.draw(this.allocator.size(attributes));
      passEncoder.end();

      this.device.queue.submit([commandEncoder.finish()]);
    };
  }

  frame(renderCallback: (parameters: RenderCallbackParameters) => void) {
    let loopShouldRun = true;
    const id = crypto.randomUUID();
    let t = performance.now();

    const frameCallback = () => {
      if (!loopShouldRun) return;
      const t_plus_1 = performance.now();
      const dt = t_plus_1 - t;

      renderCallback({ id, dt });

      t = t_plus_1;
      requestAnimationFrame(frameCallback);
    };

    requestAnimationFrame(frameCallback);

    return () => {
      loopShouldRun = false;
    };
  }
}
