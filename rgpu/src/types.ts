type ID = ReturnType<Crypto["randomUUID"]>;

export interface RGPUConfigOptions {
  canvas: HTMLCanvasElement;
}

export type RenderConfigOptions = {
  vertex: string;
  fragment: string;
  buffer: BufferHandle;
};

export type RenderCallbackParameters = {
  dt: number;
  id: ID;
};

/**
 * Types for creating buffer resources.
 */
export type BufferUsage = "vertex";
export type BufferRawType = number[][];
export type BufferData = { [name: string]: number[][] };

export type BufferParameters =
  // | {
  //     usage: BufferUsage;
  //     raw: BufferRawType;
  //   }
  // | { usage: BufferUsage; length: number };
  { usage: BufferUsage; data: BufferData };

export interface BufferHandle {
  readonly id: ID;
  // map: () => Promise<void>;
  // unmap: () => Promise<void>;
  // state: () => "mapped" | "unmapped";
  // read: () => Promise<BufferData>;
  write: (data: BufferData) => Promise<boolean>;
}

/**
 * IGPU is the entire interface supplied to the user
 */
export interface IGPU {
  // resource creation
  buffer: (input: BufferParameters) => BufferHandle | false;

  // rendering
  render: (options: RenderConfigOptions) => () => void;

  // draw callback
  frame: (
    renderCallback: (parameters: RenderCallbackParameters) => void
  ) => () => void;
}
