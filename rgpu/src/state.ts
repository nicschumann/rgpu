import {
  type IGPUState,
  type RenderCallbackParameters,
  type RenderConfigOptions,
} from "./types";

export class RGPUState implements IGPUState {
  private adapter: GPUAdapter;
  private device: GPUDevice;
  private context: GPUCanvasContext;
  private canvas: HTMLCanvasElement;

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

    this.context.configure({
      device: this.device,
      format: this.format,
      alphaMode: this.alphaMode,
    });
  }

  render({ vertex, fragment }: RenderConfigOptions) {
    const pipeline = this.device.createRenderPipeline({
      layout: "auto",
      vertex: {
        module: this.device.createShaderModule({
          code: vertex,
        }),
        entryPoint: "main",
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
