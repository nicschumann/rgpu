interface RGPUConfigOptions {
  canvas: HTMLCanvasElement;
  vertexSource: string;
  fragmentSource: string;
}
/**
 * ## Setup
 *
 * This function prepares the webgpu state, and sets the API up.
 *
 * @returns a gpu device state that's ready to serve requests, or null if no device can be acquired.
 */
export async function setup({
  canvas,
  vertexSource,
  fragmentSource,
}: RGPUConfigOptions): Promise<GPUDevice> {
  if (typeof navigator.gpu === "undefined") {
    // TODO(Nic): make this throw an error in a principled way.
    return null;
  }

  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();

  const format = navigator.gpu.getPreferredCanvasFormat();
  const alphaMode = "premultiplied";

  const context = canvas.getContext("webgpu");
  // TODO(Nic): factor this as a param
  // const dpr = window.devicePixelRatio;

  // canvas.width = window.innerWidth * dpr;
  // canvas.height = window.innerHeight * dpr;

  const frame = () => {
    context.configure({
      device,
      format,
      alphaMode,
    });

    const pipeline = device.createRenderPipeline({
      layout: "auto",
      vertex: {
        module: device.createShaderModule({
          code: vertexSource,
        }),
        entryPoint: "main",
      },
      fragment: {
        module: device.createShaderModule({
          code: fragmentSource,
        }),
        entryPoint: "main",
        targets: [{ format }],
      },
      primitive: {
        topology: "triangle-list",
      },
    });

    const commandEncoder = device.createCommandEncoder();
    const textureView = context.getCurrentTexture().createView();

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

    device.queue.submit([commandEncoder.finish()]);

    requestAnimationFrame(frame);
  };

  requestAnimationFrame(frame);

  return device;
}
