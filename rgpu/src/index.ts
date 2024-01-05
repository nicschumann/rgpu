import { RGPUState } from "./state";
import { type RGPUConfigOptions, type IGPU } from "./types";

/**
 * @param options a set of configuration {@link RGPUConfigOptions} that sets up the WebGPU state
 * @returns a {@link IGPU} state handle
 */
export async function setup({
  canvas,
}: RGPUConfigOptions): Promise<IGPU | null> {
  if (typeof navigator.gpu === "undefined") {
    // TODO(Nic): make this throw an error in a principled way.
    return null;
  }

  const adapter = await navigator.gpu.requestAdapter();

  if (adapter === null) return null;

  const device = await adapter.requestDevice();
  const context = canvas.getContext("webgpu");

  if (context === null) return null;

  // TODO(Nic): check that everything returned properly.

  return new RGPUState(adapter, device, context, canvas);
}
