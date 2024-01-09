import { BufferData, BufferHandle, BufferUsage } from "./types";

/**
 * [useful reference](https://toji.dev/webgpu-best-practices/buffer-uploads.html)
 * [align reference](https://sotrh.github.io/learn-wgpu/showcase/alignment/#alignment-of-uniform-and-storage-buffers)
 */

type BufferLocation = { name: string; offset: number; size: number };

type BufferDescriptor = {
  element_size: number;
  element_count: number;
  locations: BufferLocation[];
};

type BufferAllocation = {
  dtype: "float32";
  btype: BufferUsage;
  cpudata: Float32Array;
  gpudata: GPUBuffer;
  descriptor: BufferDescriptor;
};

function map_usage_to_buffer_type(usage: BufferUsage): GPUFlagsConstant {
  switch (usage) {
    case "vertex":
      return GPUBufferUsage.VERTEX;
    case "index":
      return GPUBufferUsage.INDEX;
    case "storage":
      return GPUBufferUsage.STORAGE;
    case "uniform":
      return GPUBufferUsage.UNIFORM;
  }
}

function map_data_to_descriptor(data: BufferData): BufferDescriptor | false {
  let locations = [];
  let vertex_count: number | null = null;
  let vertex_size: number = 0;

  for (let name in data) {
    if (vertex_count == null) vertex_count = data[name].length;
    if (data[name].length !== vertex_count) return false;

    const data_array = data[name];
    let expected_data_size: number | null = null;
    for (let i = 0; i < data_array.length; i += 1) {
      if (expected_data_size == null) expected_data_size = data_array[i].length;
      if (data_array[i].length !== expected_data_size) return false;
    }

    if (expected_data_size == null) return false;

    locations.push({
      name,
      offset: vertex_size,
      size: 4 * expected_data_size,
    });

    vertex_size += 4 * expected_data_size;
  }

  if (vertex_count == null) return false;

  return {
    element_size: vertex_size,
    element_count: vertex_count,
    locations,
  };
}

// function descriptors_equal(a: BufferDescriptor, b: BufferDescriptor): boolean {
//   if (
//     a.vertex_count !== b.vertex_count ||
//     a.vertex_size !== b.vertex_size ||
//     a.locations.length !== b.locations.length
//   )
//     return false;

//   return a.locations.reduce((prev, loc_a) => {
//     const loc_b = b.locations[i];
//     const locations_match =
//       loc_a.name === loc_b.name &&
//       loc_a.offset === loc_b.offset &&
//       loc_a.size === loc_b.size;

//     return prev && locations_match;
//   }, true);
// }

function match_sub_descriptor(
  subdesc: BufferDescriptor,
  desc: BufferDescriptor
): boolean {
  if (subdesc.element_count !== desc.element_count) return false;

  for (var i = 0; i < subdesc.locations.length; i += 1) {
    let matched = false;

    for (var j = 0; j < desc.locations.length; j += 1) {
      const subloc = subdesc.locations[i];
      const loc = desc.locations[j];

      if (loc.name === subloc.name && loc.size === subloc.size) {
        matched = true;
        break;
      }
    }

    if (!matched) return false;
  }

  return true;
}

function get_data_from_buffer(
  desc: BufferDescriptor,
  buffer: Float32Array
): BufferData {
  let structured_data: BufferData = {};
  desc.locations.forEach(({ name }) => {
    structured_data[name] = [];
  });

  for (let i = 0; i < desc.element_count; i += 1) {
    for (var loc = 0; loc < desc.locations.length; loc += 1) {
      const location = desc.locations[loc];
      const start = (i * desc.element_size + desc.locations[loc].offset) / 4;
      const row = [];

      for (let j = 0; j < location.size / 4; j += 1)
        row.push(buffer[start + j]);

      structured_data[location.name].push(row);
    }
  }

  return structured_data;
}

function set_buffer_from_data(
  descriptor: BufferDescriptor,
  data: BufferData,
  buffer: Float32Array
): Float32Array {
  for (let i = 0; i < descriptor.element_count; i += 1) {
    for (let j = 0; j < descriptor.locations.length; j += 1) {
      const key = descriptor.locations[j].name;
      if (typeof data[key] === "undefined") continue;

      const b_index =
        (i * descriptor.element_size + descriptor.locations[j].offset) / 4;

      const b_data = data[key][i];

      buffer.set(b_data, b_index);
    }
  }

  return buffer;
}

export class RGPUAllocator {
  buffers: {
    [id: string]: BufferAllocation;
  } = {};
  device: GPUDevice;

  constructor(device: GPUDevice) {
    this.device = device;
  }

  alloc_internal(
    type:
      | GPUBufferUsage["VERTEX"]
      | GPUBufferUsage["INDEX"]
      | GPUBufferUsage["UNIFORM"]
      | GPUBufferUsage["STORAGE"],
    copy_permissions: GPUBufferUsage["COPY_DST"] | GPUBufferUsage["COPY_SRC"],
    buffer: Float32Array
  ): GPUBuffer {
    const gpubuffer = this.device.createBuffer({
      size: buffer.byteLength,
      usage: type | copy_permissions,
    });

    this.device.queue.writeBuffer(gpubuffer, 0, buffer, 0);

    return gpubuffer;
  }

  alloc_external(
    map_permissions: GPUBufferUsage["MAP_READ"] | GPUBufferUsage["MAP_WRITE"],
    copy_permissions: GPUBufferUsage["COPY_DST"] | GPUBufferUsage["COPY_SRC"],
    buffer: Float32Array
  ): GPUBuffer {
    const gpubuffer = this.device.createBuffer({
      size: buffer.byteLength,
      usage: map_permissions | copy_permissions,
    });

    this.device.queue.writeBuffer(gpubuffer, 0, buffer, 0);

    return gpubuffer;
  }

  alloc_mutual(type: "read" | "write") {}

  /**
   *
   * @param data <@link BufferData> describes a buffer layout
   */
  alloc(buffer_usage: BufferUsage, data: BufferData): BufferHandle | false {
    const descriptor = map_data_to_descriptor(data);
    const usage = map_usage_to_buffer_type(buffer_usage);
    if (!descriptor) return false;

    const cpudata = new Float32Array(
      (descriptor.element_count * descriptor.element_size) / 4
    );

    set_buffer_from_data(descriptor, data, cpudata);

    const gpudata = this.alloc_internal(
      usage,
      GPUBufferUsage.COPY_DST,
      cpudata
    );
    const id = crypto.randomUUID();

    this.buffers[id] = {
      dtype: "float32",
      btype: buffer_usage,
      cpudata,
      gpudata,
      descriptor,
    };

    return {
      id,
      write: async (data: BufferData) => {
        const subdescriptor = map_data_to_descriptor(data);
        if (!subdescriptor) return false; // invalid descriptor // structurally

        const buffer = this.buffers[id];
        const descriptor = buffer.descriptor;
        const descriptors_match = match_sub_descriptor(
          subdescriptor,
          descriptor
        );

        if (descriptors_match) {
          set_buffer_from_data(descriptor, data, buffer.cpudata);
          this.device.queue.writeBuffer(buffer.gpudata, 0, buffer.cpudata, 0);
        }

        return false; // descriptor does not match target buffer...
      },
    };
  }

  vertex_descriptor(
    handle: BufferHandle,
    locations: { [name: string]: number }
  ): GPUVertexBufferLayout {
    const data = this.buffers[handle.id];

    return {
      arrayStride: data.descriptor.element_size,
      attributes: data.descriptor.locations.map((loc) => {
        // NOTE(Nic): all sizes are 4 bytes for now.
        const format = `float32` + (loc.size === 4 ? "" : `x${loc.size / 4}`);

        return {
          shaderLocation: locations[loc.name],
          offset: loc.offset,
          format: format as GPUVertexFormat,
        };
      }),
    };
  }

  data(handle: BufferHandle): GPUBuffer {
    return this.buffers[handle.id].gpudata;
  }

  size(handle: BufferHandle): number {
    return this.buffers[handle.id].descriptor.element_count;
  }
}
