/**
 * [reference](https://www.w3.org/TR/WGSL/#memory-layouts)
 */

import { isSyntaxLeaf } from "rgpu-parser/src/types";
import {
  AbstractStructDef,
  AbstractSymbolTable,
  ConcreteLayout,
  ConcreteStorageType,
  TypeDef,
} from "./check";

// prettier-ignore
const base_type_data : {[id: string]: {align: number, size: number, length: number}} = {
  "i32": { align: 4, size: 4, length: 1 },
  "f32": { align: 4, size: 4, length: 1 },
  "u32": { align: 4, size: 4, length: 1 },
  "f16": { align: 2, size: 2,length: 1 },
};

// prettier-ignore
const composite_data_types : {[id: string]: {align_multiple: number, size_multiple: number}} = {
  "vec2": { align_multiple: 2, size_multiple: 2 },
  "vec3": { align_multiple: 4, size_multiple: 3 },
  "vec4": { align_multiple: 4, size_multiple: 4 },

  "mat2x2": { align_multiple: 2, size_multiple: 4 },
  "mat3x2": { align_multiple: 2, size_multiple: 6 },
  "mat4x2": { align_multiple: 2, size_multiple: 8 },

  "mat2x3": { align_multiple: 4, size_multiple: 8 },
  "mat3x3": { align_multiple: 4, size_multiple: 12 },
  "mat4x3": { align_multiple: 4, size_multiple: 16 },

  "mat2x4": { align_multiple: 4, size_multiple: 8 },
  "mat3x4": { align_multiple: 4, size_multiple: 12 },
  "mat4x4": { align_multiple: 4, size_multiple: 16 },
};

// https://www.w3.org/TR/WGSL/#roundup
function round_up(k: number, n: number): number {
  return Math.ceil(n / k) * k;
}

function evaluate_length(num: TypeDef): number {
  return parseInt(num.name);
}

function layout_of_struct(
  storage: ConcreteStorageType,
  name: string,
  struct: AbstractStructDef,
  table: AbstractSymbolTable
): ConcreteLayout {
  const members: ConcreteLayout[] = [];

  struct.members.forEach((member, i) => {
    const size_data = layout_of(storage, member.dtype, table);

    size_data.align == member.align || size_data.align;

    const offset = round_up(
      size_data.align,
      (members[i - 1]?.offset || 0) + (members[i - 1]?.size || 0)
    );

    const concrete_member = {
      name: member.name,
      offset,

      ...size_data,
    };

    if (typeof member.location !== "undefined")
      concrete_member.location = member.location;

    members.push(concrete_member);
  });

  const align = members.reduce((a, b) => Math.max(a, b.align), 0);
  const just_past =
    (members[members.length - 1]?.offset || 0) +
    (members[members.length - 1]?.size || 0);
  const size = round_up(align, just_past);

  return {
    type: storage,
    length: 1,
    align,
    size,
    members,
    name,
  };
}

export function layout_of(
  storage: ConcreteStorageType,
  type: TypeDef,
  table: AbstractSymbolTable
): ConcreteLayout {
  if (type.params.length === 0) {
    // either a base type or a struct
    // TODO(Nic): (or alias... ad a check to the alias table later)

    if (typeof table.structs[type.name] !== "undefined") {
      const struct_def = table.structs[type.name];
      return layout_of_struct(storage, type.name, struct_def, table);
    } else if (typeof base_type_data[type.name] !== "undefined") {
      const base_data: ConcreteLayout = base_type_data[
        type.name
      ] as ConcreteLayout;
      base_data.type = storage;

      return base_data;
    }

    return {
      type: storage,
      length: 0,
      size: -1,
      align: -1,
      name: type.name,
    };
  } else if (type.params.length === 1) {
    if (type.name === "array") {
      const base_type = layout_of(storage, type.params[0], table);

      return {
        type: storage,
        length: -1,
        align: base_type.align,
        size: round_up(base_type.align, base_type.size),
      };
    } else if (typeof composite_data_types[type.name] !== "undefined") {
      const base_type = layout_of(storage, type.params[0], table);
      const { align_multiple, size_multiple } = composite_data_types[type.name];
      return {
        type: storage,
        length: 1,
        align: base_type.align * align_multiple,
        size: base_type.size * size_multiple,
      };
    }

    return {
      type: storage,
      length: 0,
      size: -1,
      align: -1,
      name: type.name,
    };
  } else if (type.params.length === 2) {
    if (type.name === "array" && type.params[1].params) {
      const base_type = layout_of(storage, type.params[0], table);
      const length = evaluate_length(type.params[1]);

      return {
        type: storage,
        length,
        align: base_type.align,
        size: length * round_up(base_type.align, base_type.size),
      };
    }

    return {
      type: storage,
      length: 0,
      size: -1,
      align: -1,
      name: type.name,
    };
  }

  return {
    type: storage,
    length: 0,
    size: -1,
    align: -1,
    name: type.name,
  };
}
