export interface RGPUConfigOptions {
  canvas: HTMLCanvasElement;
}

export type RenderConfigOptions = {
  vertex: string;
  fragment: string;
};

export type RenderCallbackParameters = {
  dt: number;
  id: ReturnType<Crypto["randomUUID"]>;
};

export interface IGPUState {
  render: (options: RenderConfigOptions) => () => void;
  frame: (
    renderCallback: (parameters: RenderCallbackParameters) => void
  ) => () => void;
}
