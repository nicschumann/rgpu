import { RGPUDeclParser, RPGUTokenizer } from "rgpu-parser";
import { TokenKind } from "rgpu-parser/src/token-defs";
import {
  Syntax,
  SyntaxNode,
  isSyntaxLeaf,
  isSyntaxNode,
} from "rgpu-parser/src/types";
import { layout_of } from "./align";

type StorageType = "uniform" | "storage" | "read-only-storage";
type EntrypointType = "vertex" | "fragment" | "compute";

export type TypeDef = {
  name: string;
  params: TypeDef[];
};

/**
 * PASS ONE Datatypes: These are used when traversing the CST
 * to build up an abstract set of program requirements.
 *
 * In PASS TWO, we will map all abstract definitions into concrete
 * offsets and alignments, which can be used to check the size
 * of passed buffers and ensure that incoming buffers are correct
 * for the shader.
 */
type AbstractBinding = {
  group_id: number;
  bind_id: number;
  name: string; // identifier name,
  stype: StorageType;
  dtype: TypeDef; // name of the datatype
};

type AbstractDefinition = {
  align?: number;
  location?: number;
  name: string; // name of the location
  dtype: TypeDef; // name of the datatype
};

export type AbstractStructDef = {
  locations: number[]; // indices of members with specified location.
  members: AbstractDefinition[]; // ordered list of members as defined in source.
};

export type AbstractTypeAlias = {
  name: string;
  defn: string;
};

type AbstractReturnType = {
  location?: number;
  dtype: TypeDef;
};

type AbstractEntrypoint = {
  name: string;
  type: EntrypointType;
  parameters: AbstractStructDef;
  return_type: AbstractReturnType;
};

export type AbstractSymbolTable = {
  structs: { [identifier: string]: AbstractStructDef };
};

type AbstractShaderSignature = {
  entries: AbstractEntrypoint[];
  groups: AbstractBinding[];
  symbols: AbstractSymbolTable;
};

/**
 * PASS TWO Datatypes. These translate the Abstract Definitions
 * recovered in the first pass into layout constraints for our buffers, which we
 * can check. All numbers are in bytes.
 */

export type ConcreteStorageType = StorageType | "vertex";

export type ConcreteLayout = {
  align: number;
  size: number;
  length: number;
  type: ConcreteStorageType;
  offset?: number;
  // debug
  name?: string;
  location?: number;
  members?: ConcreteLayout[];
};

interface ConcreteLocation extends ConcreteLayout {
  location: number;
}

type ConcreteEntrypoint = {
  name: string;
  type: EntrypointType;
  inputs: ConcreteLocation[];
  outputs: ConcreteLocation[];
};

type ConcreteGroup = {
  bindings: ConcreteLayout[];
};

type ShaderSignature = {
  groups: ConcreteGroup[];
  entries: ConcreteEntrypoint[];
};

function canonicalize_type(cst: Syntax): TypeDef {
  if (isSyntaxLeaf(cst)) {
    return {
      name: cst.text,
      params: [],
    };
  } else if (
    cst.children.length === 2 &&
    isSyntaxLeaf(cst.children[0]) &&
    isSyntaxNode(cst.children[1])
  ) {
    return {
      name: cst.children[0].text,
      params: cst.children[1].children
        .filter((node) => {
          return (
            isSyntaxNode(node) ||
            (node.text !== "<" && node.text !== "," && node.text !== ">")
          );
        })
        .map(canonicalize_type),
    };
  }

  console.log("error in canonicalize_type");
  console.log(cst);

  // error
  return {
    name: "",
    params: [],
  };
}

function retrieve_type_data(
  params: SyntaxNode
): { name: string; type: TypeDef } | false {
  if (
    params.children.length === 3 &&
    params.kind === TokenKind.AST_TYPED_IDENTIFIER &&
    isSyntaxLeaf(params.children[0])
  ) {
    return {
      name: params.children[0].text,
      type: canonicalize_type(params.children[2]),
    };
  }

  return false;
}

function retrieve_binding_and_group(
  attr_list: SyntaxNode
): { binding: number; group: number } | false {
  let found = 0;
  let res = { binding: -1, group: -1 };
  attr_list.children.forEach((attr) => {
    if (isSyntaxNode(attr) && attr.children.length === 5) {
      const name = attr.children[1];
      const val = attr.children[3];

      if (
        isSyntaxLeaf(name) &&
        isSyntaxLeaf(val) &&
        val.kind === TokenKind.DEC_INT_LITERAL
      ) {
        if (name.text === "binding") {
          found += 1;
          res.binding = parseInt(val.text);
        } else if (name.text === "group") {
          found += 1;
          res.group = parseInt(val.text);
        }
      }
    }
  });

  return found === 2 ? res : false;
}

function retrieve_storage_type(var_node: SyntaxNode): StorageType | false {
  if (var_node.children.length === 2 && isSyntaxNode(var_node.children[1])) {
    const storage_spec = var_node.children[1];
    if (
      storage_spec.children.length === 3 &&
      isSyntaxLeaf(storage_spec.children[1])
    ) {
      const stype = storage_spec.children[1].text;

      if (stype === "uniform") return "uniform";
      else if (stype === "storage") return "read-only-storage";
      else return false;
    } else if (
      storage_spec.children.length === 5 &&
      isSyntaxLeaf(storage_spec.children[1]) &&
      isSyntaxLeaf(storage_spec.children[3])
    ) {
      const stype = storage_spec.children[1].text;
      const modifier = storage_spec.children[1].text;

      if (stype === "storage" && modifier === "read")
        return "read-only-storage";
      else if (stype === "storage" && modifier === "read_write")
        return "storage";
      else return false;
    }
  }

  return false;
}

function retrieve_var_definitions(
  var_def: SyntaxNode
): AbstractBinding | false {
  if (
    var_def.children.length === 4 &&
    isSyntaxNode(var_def.children[0]) &&
    // isSyntaxNode(var_def.children[1]) &&
    isSyntaxNode(var_def.children[2])
  ) {
    const binding_and_group = retrieve_binding_and_group(var_def.children[0]);
    const type_data = retrieve_type_data(var_def.children[2]);
    let storage: StorageType | false = "storage";

    if (isSyntaxNode(var_def.children[1])) {
      storage = retrieve_storage_type(var_def.children[1]);
    }

    if (binding_and_group && type_data && storage) {
      return {
        group_id: binding_and_group.group,
        bind_id: binding_and_group.binding,
        name: type_data.name,
        dtype: type_data.type,
        stype: storage,
      };
    }
  }

  return false;
}

function retrieve_location_and_align(
  attrs: SyntaxNode[]
): { align?: number; location?: number } | false {
  const binding: { align?: number; location?: number } | false = {};

  attrs.forEach((attr) => {
    if (attr.children.length === 5) {
      const name = attr.children[1];
      const val = attr.children[3];

      if (isSyntaxLeaf(name) && isSyntaxLeaf(val)) {
        if (name.text === "location") {
          binding.location = parseInt(val.text);
        } else if (name.text === "align") {
          binding.align = parseInt(val.text);
        }
      }
    }
  });

  return typeof binding.location !== "undefined" ||
    typeof binding.align !== "undefined"
    ? binding
    : false;
}

function retrieve_struct_definitions(params: SyntaxNode[]): AbstractStructDef {
  const struct_def: AbstractStructDef = {
    locations: [],
    members: [],
  };

  params.forEach((param, i) => {
    if (
      param.children.length === 2 &&
      isSyntaxNode(param.children[0]) &&
      isSyntaxNode(param.children[1])
    ) {
      const type_data = retrieve_type_data(param.children[1]);

      if (type_data) {
        // we have a member with an attribute
        // all attrs in the list should be SyntaxNodes
        const attrs = param.children[0].children.filter(isSyntaxNode);
        const location_or_align = retrieve_location_and_align(attrs);
        const member: AbstractDefinition = {
          name: type_data.name,
          dtype: type_data.type,
        };

        if (location_or_align) {
          if (typeof location_or_align.location !== "undefined") {
            member.location = location_or_align.location;
            struct_def.locations.push(i);
          }

          if (typeof location_or_align.align !== "undefined") {
            member.align = location_or_align.align;
          }
        }

        struct_def.members.push(member);
      }
    } else if (param.children.length === 1 && isSyntaxNode(param.children[0])) {
      const type_data = retrieve_type_data(param.children[0]);
      if (type_data) {
        struct_def.members.push({
          name: type_data.name,
          dtype: type_data.type,
        });
      }
    }
  });

  return struct_def;
}

function retrieve_fn_type(attrs: SyntaxNode[]): EntrypointType | false {
  let type: EntrypointType | false = false;

  attrs.forEach((attr) => {
    if (attr.children.length === 2) {
      const name = attr.children[1];

      if (isSyntaxLeaf(name)) {
        if (name.text === "vertex") {
          type = "vertex";
        } else if (name.text === "fragment") {
          type = "fragment";
        } else if (name.text === "compute") {
          type = "compute";
        }
      }
    }
  });

  return type;
}

function retrieve_fn_return(cst: SyntaxNode): AbstractReturnType | false {
  if (cst.children.length === 1) {
    return { dtype: canonicalize_type(cst.children[0]) };
  } else if (cst.children.length === 2 && isSyntaxNode(cst.children[0])) {
    const location = retrieve_location_and_align(
      cst.children[0].children.filter(isSyntaxNode)
    );

    if (location) {
      return {
        location: location.location,
        dtype: canonicalize_type(cst.children[1]),
      };
    }
  }

  return false;
}

function retrieve_fn_definition(cst: SyntaxNode): AbstractEntrypoint | false {
  if (cst.children.length === 9) {
    const attr_list = cst.children[0];
    const name = cst.children[2];
    const arg_list = cst.children[4];
    const ret = cst.children[7];

    if (
      isSyntaxLeaf(name) &&
      isSyntaxNode(attr_list) &&
      isSyntaxNode(arg_list) &&
      isSyntaxNode(ret)
    ) {
      const type = retrieve_fn_type(attr_list.children.filter(isSyntaxNode));
      if (type) {
        const parameters = retrieve_struct_definitions(
          arg_list.children.filter(isSyntaxNode)
        );
        const return_type = retrieve_fn_return(ret);

        if (parameters && return_type) {
          return {
            name: name.text,
            type,
            parameters,
            return_type,
          };
        }
      }
    }

    // we have to have an vertex, fragment, or compute annotation, or we ignore.
  }

  return false;
}

function build_shader_requirements(
  cst: Syntax,
  signature: AbstractShaderSignature = {
    entries: [],
    groups: [],
    symbols: { structs: {} },
  }
): AbstractShaderSignature {
  if (isSyntaxNode(cst)) {
    if (cst.kind === TokenKind.AST_GLOBAL_VAR_DECLARATION) {
      // may contain bind group data
      // console.log("var decl!");
      const abstract_decl = retrieve_var_definitions(cst);
      if (abstract_decl) signature.groups.push(abstract_decl);
      return signature;
    } else if (cst.kind === TokenKind.AST_FUNCTION_DECLARATION) {
      // may contain location input data
      const abstract_fn = retrieve_fn_definition(cst);
      if (abstract_fn) signature.entries.push(abstract_fn);

      return signature;
    } else if (cst.kind === TokenKind.AST_STRUCT_DECLARATION) {
      // may contain location output data
      // console.log("struct decl <members>!");
      const members = cst.children.filter(isSyntaxNode);
      const abstract_locations = retrieve_struct_definitions(members);
      const name = cst.children[1];

      if (isSyntaxLeaf(name))
        signature.symbols.structs[name.text] = abstract_locations;

      return signature;
    } else {
      // descend...
      cst.children.forEach((c) => build_shader_requirements(c, signature));
      return signature;
    }
  }

  return signature;
}

function resolve_entry_locations(
  members: ConcreteLayout[],
  symbols: AbstractSymbolTable,
  layouts: ConcreteLocation[]
): ConcreteLocation[] {
  members.forEach((layout) => {
    if (typeof layout.location !== "undefined") {
      layouts.push(layout as ConcreteLocation);
    }
    if (typeof layout.members !== "undefined") {
      resolve_entry_locations(layout.members, symbols, layouts);
    }
  });

  return layouts;
}

function resolve_shader_requirements(
  signature: AbstractShaderSignature
): ShaderSignature | false {
  // step 1: resolve groups alignments
  const groups: ConcreteGroup[] = [];

  signature.groups.forEach((binding) => {
    const { group_id, bind_id, dtype } = binding;
    const layout = layout_of(binding.stype, dtype, signature.symbols);

    if (typeof groups[group_id] !== "undefined") {
      groups[group_id].bindings.splice(bind_id, 0, layout);
    } else {
      groups.splice(group_id, 0, { bindings: [layout] });
    }
  });

  // step 2: resolve layout bindings
  const entries: ConcreteEntrypoint[] = [];
  signature.entries.forEach((entry) => {
    const concrete_entry: ConcreteEntrypoint = {
      name: entry.name,
      type: entry.type,
      inputs: [],
      outputs: [],
    };

    entry.parameters.members.forEach((parameter) => {
      const layout = layout_of("vertex", parameter.dtype, signature.symbols);
      const inputs = resolve_entry_locations([layout], signature.symbols, []);
      concrete_entry.inputs.push(...inputs);
    });

    // order locations, and adjust their offsets for the vertex buffer input context.
    concrete_entry.inputs.sort((a, b) => a.location - b.location);
    concrete_entry.inputs.forEach((location, i) => {
      const prev = concrete_entry.inputs[i - 1];
      location.offset = (prev?.offset || 0) + (prev?.size || 0);
    });

    entries.push(concrete_entry);
  });

  return {
    groups,
    entries,
  };
}

export class RGPUShaderChecker {
  parser: RGPUDeclParser;
  tokenizer: RPGUTokenizer;

  constructor() {
    this.tokenizer = new RPGUTokenizer();
    this.parser = new RGPUDeclParser();
  }

  check_pipeline_stage(src: string): ShaderSignature | false {
    // get the input requirements for this shader stage.
    const s = performance.now();
    const tokens = this.tokenizer.tokenize_source(src);
    this.parser.reset(tokens);
    const cst = this.parser.translation_unit();
    const abstract_requirements = build_shader_requirements(cst);
    const requirements = resolve_shader_requirements(abstract_requirements);
    const e = performance.now();

    // console.log(`parse time: ${e - s}ms`);

    return requirements;
  }
}
