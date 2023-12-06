import { RGPUState } from "./state";
import { type RGPUConfigOptions, type IGPUState } from "./types";

/**
 * @param options a set of configuration {@link RGPUConfigOptions} that sets up the WebGPU state
 * @returns a {@link IGPUState} state handle
 */
export async function setup({ canvas }: RGPUConfigOptions): Promise<IGPUState> {
  if (typeof navigator.gpu === "undefined") {
    // TODO(Nic): make this throw an error in a principled way.
    return null;
  }

  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();
  const context = canvas.getContext("webgpu");

  // TODO(Nic): check that everything returned properly.

  return new RGPUState(adapter, device, context, canvas);
}
