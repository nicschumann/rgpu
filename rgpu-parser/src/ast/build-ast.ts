import { ASTNode, ASTTranslationUnit } from "../ast-defs";
import { TokenKind } from "../token-defs";
import { CharRange, Syntax, isSyntaxNode } from "../types";

// function build_translation_unit(syntax: Syntax): ASTTranslationUnit {
//   // Assert invariants. The CST builder should never, ever
//   // violate these, even for horribly malformed inputs, so
//   // we should throw if we hit these conditions.
//   if (
//     !isSyntaxNode(syntax) ||
//     typeof syntax.start === "undefined" ||
//     typeof syntax.end === "undefined"
//   ) {
//     throw new Error("bad CST for translation_unit()");
//   }

//   const { start, end, children } = syntax;

//   return {
//     kind: TokenKind.AST_TRANSLATION_UNIT,
//     range: { start, end },
//     declarations: children.map(compute_ast),
//     syntax,
//   };
// }

// function build_global_declaration(syntax: Syntax): ASTNode {
//   if (
//     !isSyntaxNode(syntax) ||
//     typeof syntax.start === "undefined" ||
//     typeof syntax.end === "undefined"
//   ) {
//     throw new Error("bad CST for build_global_declaration()");
//   }

//   const { start, end, children } = syntax;

//   if (children.length === 1) {
//     // empty declaration
//     return {
//       kind: TokenKind.AST_EMPTY_DECLARATION,
//       range: { start, end },
//       syntax,
//     };
//   } else if (children.length === 2) {
//     const ast_node = compute_ast(children[1]);
//     ast_node.range.end = end;
//     ast_node.syntax = syntax;

//     return ast_node;
//   } else {
//     // error
//     throw new Error(
//       "incorrect children count for CST in build_global_declaration()"
//     );
//   }
// }
type VarID = string;

type TypeName = { name: string; template: TypeName[] };

type SymbolTableEntry = { type: TypeName; range: CharRange };

type SymbolTable = { [name: VarID]: SymbolTableEntry[] };

function merge_tables(a: SymbolTable, b: SymbolTable): SymbolTable {
  Object.keys(a).forEach((key) => {
    if (typeof b[key] !== "undefined") {
      b[key].push(...a[key]);
    } else {
      b[key] = a[key];
    }
  });

  return b;
}

export class RGPUTypechecker {
  check(syntax: Syntax, table: SymbolTable = {}): SymbolTable {
    switch (syntax.kind) {
      case TokenKind.AST_TRANSLATION_UNIT:
        return this.check_translation_unit(syntax, table);
      case TokenKind.AST_GLOBAL_VAR_DECLARATION:
        return this.check_global_var_declaration(syntax, table);
      default:
        throw new Error("Unimplemented");
    }
  }

  private check_translation_unit(
    syntax: Syntax,
    table: SymbolTable
  ): SymbolTable {
    if (
      !isSyntaxNode(syntax) ||
      typeof syntax.start === "undefined" ||
      typeof syntax.end === "undefined"
    ) {
      throw new Error("bad CST for translation_unit()");
    }

    // stuff higher up in the source is visible to stuff below it.
    syntax.children.forEach((child) => {
      const table_prime = this.check(child, table);
      table = merge_tables(table_prime, table);
    });

    return table;
  }

  private check_global_var_declaration(
    syntax: Syntax,
    table: SymbolTable
  ): SymbolTable {
    if (
      !isSyntaxNode(syntax) ||
      typeof syntax.start === "undefined" ||
      typeof syntax.end === "undefined"
    ) {
      throw new Error("bad CST for translation_unit()");
    }

    // console.log(JSON.stringify(syntax, null, 4));

    if (syntax.children.length === 6) {
      // should be a var declaration with definition and leading attributes.
      const attributes = syntax.children[0];
      const keyword = syntax.children[1];
      const name = syntax.children[2];
      const definition = syntax.children[4];

      if (attributes.kind === TokenKind.AST_ATTRIBUTE_LIST) {
        console.log(JSON.stringify(keyword, null, 4));
      }
    } else if (syntax.children.length === 4) {
      console.log("is declaration only.");
    }

    return table;
  }
}
