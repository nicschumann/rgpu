import { ErrorKind, TokenKind } from "../token-defs";
import { CharRange, Syntax, SyntaxNode, isSyntaxNode } from "../types";

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

type ErrorTable = { range: CharRange; desc: string }[];

type CheckResult = { symbols: SymbolTable; errors: ErrorTable };

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
  check(syntax: Syntax, table: SymbolTable = {}): CheckResult {
    switch (syntax.kind) {
      case TokenKind.AST_TRANSLATION_UNIT:
        return this.check_translation_unit(syntax, table);
      case TokenKind.AST_GLOBAL_VAR_DECLARATION:
        return this.check_global_var_declaration(syntax, table);
      default:
        return { symbols: {}, errors: [] };
      // throw new Error("Unimplemented");
    }
  }

  private check_translation_unit(
    syntax: Syntax,
    table: SymbolTable
  ): CheckResult {
    if (
      !isSyntaxNode(syntax) ||
      typeof syntax.start === "undefined" ||
      typeof syntax.end === "undefined"
    ) {
      return { errors: [], symbols: {} };
    }

    let errors: ErrorTable = [];

    // stuff higher up in the source is visible to stuff below it.
    syntax.children.forEach((child) => {
      const { symbols, errors: child_errors } = this.check(child, table);
      errors.push(...child_errors);
      table = merge_tables(symbols, table);
    });

    return { symbols: table, errors };
  }

  private check_global_var_declaration(
    syntax: Syntax,
    table: SymbolTable
  ): CheckResult {
    if (
      !isSyntaxNode(syntax) ||
      typeof syntax.start === "undefined" ||
      typeof syntax.end === "undefined"
    ) {
      return { symbols: table, errors: [] };
      // throw new Error("bad CST for translation_unit()");
    }

    // console.log(JSON.stringify(syntax, null, 4));
    let errors: ErrorTable = [];

    if (
      syntax.children[syntax.children.length - 1].error !==
      ErrorKind.ERR_NO_ERROR
    ) {
      const s = syntax.children[syntax.children.length - 1];
      errors.push({
        range: { start: s.start, end: s.end },
        desc: "declarations need to end in a semicolon.",
      });
    }

    if (syntax.children.length === 6) {
      console.log("is declaration and definition with attributes");
      // should be a var declaration with definition and leading attributes.

      let { errors: sub_errors } = handle_declaration(
        syntax.children[0] as SyntaxNode,
        syntax.children[1] as SyntaxNode,
        syntax.children[2] as SyntaxNode,
        syntax.children[4],
        table
      );

      errors.push(...sub_errors);
    } else if (syntax.children.length === 5) {
      let { errors: sub_errors } = handle_declaration(
        null,
        syntax.children[0] as SyntaxNode,
        syntax.children[1] as SyntaxNode,
        syntax.children[3],
        table
      );

      errors.push(...sub_errors);
    } else if (syntax.children.length === 4) {
      let { errors: sub_errors } = handle_declaration(
        syntax.children[0] as SyntaxNode,
        syntax.children[1] as SyntaxNode,
        syntax.children[2] as SyntaxNode,
        null,
        table
      );

      errors.push(...sub_errors);
    } else if (syntax.children.length === 3) {
      let { errors: sub_errors } = handle_declaration(
        null,
        syntax.children[0] as SyntaxNode,
        syntax.children[1] as SyntaxNode,
        null,
        table
      );

      errors.push(...sub_errors);
    }

    return { symbols: table, errors };
  }
}

function handle_declaration(
  attrs: SyntaxNode | null,
  keyword: SyntaxNode,
  declaration: SyntaxNode,
  definition: Syntax | null,
  symbols: SymbolTable
): CheckResult {
  const kind = keyword.children[0].kind;
  const errors: ErrorTable = [];

  switch (kind) {
    case TokenKind.KEYWORD_CONST:
    case TokenKind.KEYWORD_LET:
      if (attrs !== null) {
        errors.push({
          range: { start: attrs.start, end: attrs.end },
          desc: "attributes aren't used before 'let' and 'const'.",
        });
      }

      if (keyword.children.length > 1) {
        errors.push({
          range: {
            start: keyword.children[1].start,
            end: keyword.children[1].end,
          },
          desc: "'let' and 'const' don't use access specifiers.",
        });
      }

      if (definition === null) {
        errors.push({
          range: { start: declaration.end, end: declaration.end },
          desc: "'let' and 'const' declarations need definitions.",
        });
      } else if (definition.error !== ErrorKind.ERR_NO_ERROR) {
        errors.push({
          range: { start: definition.start, end: definition.end },
          desc: "'let' and 'const' declarations need definitions.",
        });
      }

      return { symbols, errors };
    case TokenKind.KEYWORD_OVERRIDE:
      return { symbols, errors };
    case TokenKind.KEYWORD_VAR:
      return { symbols, errors };
    default:
      return { symbols, errors };
  }
}
