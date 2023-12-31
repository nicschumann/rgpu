import { RGPUAllocator } from "./alloc";
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

    this.context.configure({
      device: this.device,
      format: this.format,
      alphaMode: this.alphaMode,
    });
  }

  buffer(input: BufferParameters) {
    const result = this.allocator.alloc(input.data, this.device);
    if (!result) console.log("failed to create buffer!");

    return result;
  }

  render({ vertex, fragment, buffer }: RenderConfigOptions) {
    const pipeline = this.device.createRenderPipeline({
      layout: "auto",
      vertex: {
        module: this.device.createShaderModule({
          code: vertex,
        }),
        entryPoint: "main",
        buffers: [
          this.allocator.vertex_descriptor(buffer, { position: 0, color: 1 }),
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

    return () => {
      const commandEncoder = this.device.createCommandEncoder();
      const textureView = this.context.getCurrentTexture().createView();

      const passDescriptor: GPURenderPassDescriptor = {
        colorAttachments: [
          {
            view: textureView,
            clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
            loadOp: "clear" as GPULoadOp,
            storeOp: "store" as GPUStoreOp,
          },
        ],
      };

      const passEncoder = commandEncoder.beginRenderPass(passDescriptor);
      passEncoder.setPipeline(pipeline);
      passEncoder.setVertexBuffer(0, this.allocator.data(buffer));
      passEncoder.draw(3);
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
