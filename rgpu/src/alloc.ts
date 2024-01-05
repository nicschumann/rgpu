import { BufferData, BufferHandle } from "./types";

/**
 * [useful reference](https://toji.dev/webgpu-best-practices/buffer-uploads.html)
 */

type BufferLocation = { name: string; offset: number; size: number };

type BufferDescriptor = {
  vertex_size: number;
  vertex_count: number;
  locations: BufferLocation[];
};

type BufferTypes = "vertex";

type AllocatedBuffer = {
  vertex: {
    readonly id: string;
  };
};

function map_buffer_data_to_descriptor(
  data: BufferData
): BufferDescriptor | false {
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
    vertex_size,
    vertex_count,
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
  if (subdesc.vertex_count !== desc.vertex_count) return false;

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

function get_buffer_data_from_buffer(
  desc: BufferDescriptor,
  buffer: Float32Array
): BufferData {
  let structured_data: BufferData = {};
  desc.locations.forEach(({ name }) => {
    structured_data[name] = [];
  });

  for (let i = 0; i < desc.vertex_count; i += 1) {
    for (var loc = 0; loc < desc.locations.length; loc += 1) {
      const location = desc.locations[loc];
      const start = (i * desc.vertex_size + desc.locations[loc].offset) / 4;
      const row = [];

      console.log(location);

      for (let j = 0; j < location.size / 4; j += 1)
        row.push(buffer[start + j]);

      structured_data[location.name].push(row);
    }
  }

  return structured_data;
}

function set_buffer_from_buffer_data(
  descriptor: BufferDescriptor,
  data: BufferData,
  buffer: Float32Array
): Float32Array {
  for (let i = 0; i < descriptor.vertex_count; i += 1) {
    for (let j = 0; j < descriptor.locations.length; j += 1) {
      const key = descriptor.locations[j].name;
      if (typeof data[key] === "undefined") continue;

      const b_index =
        (i * descriptor.vertex_size + descriptor.locations[j].offset) / 4;

      const b_data = data[key][i];

      buffer.set(b_data, b_index);
    }
  }

  return buffer;
}

export class RGPUAllocator {
  buffers: {
    [id: string]: {
      cpudata: Float32Array;
      gpudata: GPUBuffer;
      descriptor: BufferDescriptor;
    };
  } = {};
  device: GPUDevice;

  constructor(device: GPUDevice) {
    this.device = device;
  }

  alloc_internal(
    type: "vertex" | "index" | "storage" | "uniform",
    buffer: Float32Array,
    device: GPUDevice
  ) {}

  alloc_mutual(type: "read" | "write", data: BufferData | null) {}

  /**
   *
   * @param data <@link BufferData> describes a buffer layout
   */
  alloc(
    data: BufferData,
    device: GPUDevice,
    unmapAfterCreation: boolean = true
  ): BufferHandle | false {
    const descriptor = map_buffer_data_to_descriptor(data);
    if (!descriptor) return false;

    const cpubuffer = new Float32Array(
      (descriptor.vertex_count * descriptor.vertex_size) / 4
    );

    set_buffer_from_buffer_data(descriptor, data, cpubuffer);

    const gpubuffer = device.createBuffer({
      size: cpubuffer.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });

    this.device.queue.writeBuffer(gpubuffer, 0, cpubuffer, 0);

    // new Float32Array(gpubuffer.getMappedRange()).set(cpubuffer);
    // if (unmapAfterCreation) gpubuffer.unmap();

    const id = crypto.randomUUID();

    this.buffers[id] = {
      cpudata: cpubuffer,
      gpudata: gpubuffer,
      descriptor,
    };

    return {
      id,
      write: async (data: BufferData) => {
        const subdescriptor = map_buffer_data_to_descriptor(data);
        if (!subdescriptor) return false; // invalid descriptor // structurally

        const buffer = this.buffers[id];
        const descriptor = buffer.descriptor;
        const descriptors_match = match_sub_descriptor(
          subdescriptor,
          descriptor
        );

        if (descriptors_match) {
          set_buffer_from_buffer_data(descriptor, data, buffer.cpudata);
          this.device.queue.writeBuffer(buffer.gpudata, 0, buffer.cpudata, 0);
        }

        return false; // descriptor does not match target buffer...
      },

      // read: async () => {
      //   const allocation = this.buffers[id];
      //   if (allocation.gpudata.mapState === "unmapped")
      //     await allocation.gpudata.mapAsync(GPUMapMode.WRITE);

      //   allocation.cpudata = new Float32Array(
      //     allocation.gpudata.getMappedRange()
      //   );

      //   const data = get_buffer_data_from_buffer(
      //     allocation.descriptor,
      //     allocation.cpudata
      //   );

      //   allocation.gpudata.unmap();

      //   return data;
      // },
    };
  }

  vertex_descriptor(
    handle: BufferHandle,
    locations: { [name: string]: number }
  ): {
    arrayStride: number;
    attributes: {
      shaderLocation: number;
      offset: number;
      format: GPUVertexFormat;
    }[];
  } {
    const data = this.buffers[handle.id];

    return {
      arrayStride: data.descriptor.vertex_size,
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
}
