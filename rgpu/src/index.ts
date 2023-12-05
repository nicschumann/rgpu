/**
 * ## Setup
 *
 * This function prepares the webgpu state, and sets the API up.
 *
 * @returns a gpu device state that's ready to serve requests, or null if no device can be acquired.
 */
export async function setup(): Promise<GPUDevice> {
  if (typeof navigator.gpu === "undefined") {
    return null;
  }

  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();

  return device;
}
