import { BufferData, BufferHandle } from "./types";

type BufferLocation = { name: string; offset: number; size: number };

type BufferDescriptor = {
  vertex_size: number;
  vertex_count: number;
  locations: BufferLocation[];
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
  /**
   *
   * @param data <@link BufferData> describes a buffer layout
   */
  alloc(
    data: BufferData,
    device: GPUDevice,
    unmapAfterCreation: boolean = true
  ) /**: BufferHandle | false */ {
    const descriptor = map_buffer_data_to_descriptor(data);
    if (!descriptor) return false;

    const cpubuffer = new Float32Array(
      (descriptor.vertex_count * descriptor.vertex_size) / 4
    );

    set_buffer_from_buffer_data(descriptor, data, cpubuffer);

    const gpubuffer = device.createBuffer({
      size: cpubuffer.byteLength,
      usage: GPUBufferUsage.MAP_WRITE,
      mappedAtCreation: true,
    });

    new Float32Array(gpubuffer.getMappedRange()).set(cpubuffer);
    if (unmapAfterCreation) gpubuffer.unmap();

    const id = crypto.randomUUID();

    this.buffers[id] = {
      cpudata: cpubuffer,
      gpudata: gpubuffer,
      descriptor,
    };

    return {
      id,
      read: async () => {
        const allocation = this.buffers[id];
        if (allocation.gpudata.mapState === "unmapped")
          await allocation.gpudata.mapAsync(GPUMapMode.WRITE);

        allocation.cpudata = new Float32Array(
          allocation.gpudata.getMappedRange()
        );

        const data = get_buffer_data_from_buffer(
          allocation.descriptor,
          allocation.cpudata
        );

        allocation.gpudata.unmap();

        return data;
      },
    };
  }
}
