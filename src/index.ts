export default async function setup() {
  if (typeof navigator.gpu === "undefined") {
    return null;
  }

  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();

  return device;
}
