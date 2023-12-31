import { RGPUExprParser } from "./expr-parser";
import { RGPUParser } from "./base-parser";
import { ErrorKind, TokenKind } from "../token-defs";
import { Syntax, SyntaxNode } from "../types";

// const zero_arg_attribute_names: Set<string> = new Set([
//   "const",
//   "invariant",
//   "must_use",
//   "vertex",
//   "fragment",
//   "compute",
// ]);

// const single_arg_attribute_names: Set<string> = new Set([
//   "align",
//   "binding",
//   "builtin",
//   "group",
//   "id",
//   "location",
//   "size",
// ]);

// const double_arg_attribute_names: Set<string> = new Set(["interpolate"]);

// const triple_arg_attribute_names: Set<string> = new Set(["workgroup_size"]);

export class RGPUAttrParser extends RGPUParser {
  private expr_parser: RGPUExprParser;

  constructor(expr_parser: RGPUExprParser) {
    super();
    this.expr_parser = expr_parser;
  }

  private expr(): Syntax {
    const tokens = this.tokens.slice(this.current_position + 1);
    this.expr_parser.reset(tokens);
    const expr = this.expr_parser.expr();
    const { tokens: remaining_tokens } = this.expr_parser.remaining();
    this.reset(remaining_tokens);

    return expr;
  }

  private attribute_args(
    attr: SyntaxNode,
    max_num_params: -1 | 1 | 2 | 3
  ): SyntaxNode {
    // try to match a paren...
    let { node: maybe_lparen_node } = this.accept(TokenKind.SYM_LPAREN, true);
    attr.children.push(maybe_lparen_node);

    let params_parsed = 0;
    let matched = true;

    while (
      matched &&
      (params_parsed < max_num_params || max_num_params == -1) &&
      !this.check(TokenKind.SYM_RPAREN)
    ) {
      // try to parse an expression with the subparser
      const expr = this.expr();
      attr.children.push(expr);

      // now, accept either an R_PAREN, or a COMMA and an RPAREN
      let { matched: comma_matched, node: maybe_comma_node } = this.accept(
        TokenKind.SYM_COMMA,
        true
      );

      if (comma_matched) attr.children.push(maybe_comma_node);

      params_parsed += 1;
      matched = comma_matched;
    }

    let { node: maybe_rparen_node } = this.accept(TokenKind.SYM_RPAREN, true);
    attr.children.push(maybe_rparen_node);

    return attr;
  }

  attributes(decl: SyntaxNode, terminals: TokenKind[] = []): SyntaxNode {
    let attributes: SyntaxNode = this.node(TokenKind.AST_ATTRIBUTE_LIST);
    let attribute: SyntaxNode | null = null;
    const terminal_set = new Set([TokenKind.SYM_AT, ...terminals]);

    while ((attribute = this.attribute()) !== null) {
      if (attribute.error !== ErrorKind.ERR_NO_ERROR) {
        const consumed = this.advance_until(terminal_set);

        /**
         * NOTE(Nic): there's a situation where we fail to parse an
         * attribute, and we're stuck in the middle of an unclosed paren,
         * where this method can fail properly recover. This is especially true
         * when the terminal set contains SYM_IDENTIFIER, or another symbol, that
         * may be part of an attribute expression...
         */
        attribute.children.push(
          this.error(
            TokenKind.AST_ATTRIBUTE,
            ErrorKind.ERR_BAD_ATTRIBUTE,
            consumed
          )
        );
      }
      // parse 0 or more attributes
      attributes.children.push(attribute);
    }

    if (attributes.children.length > 0) {
      decl.children.push(attributes);
    }

    return decl;
  }

  attribute(): SyntaxNode | null {
    let { matched, node: at_node } = this.accept(TokenKind.SYM_AT, true);

    if (!matched) return null;

    let attr = this.node(TokenKind.AST_ATTRIBUTE, [at_node]);

    /**
     * NOTE(Nic): this is a much more permissive version of a
     * attribute parsing, where we just allow any number of parameters for
     * any attribute of any name, rather than respecting the keywords
     * defined in the spec. In a later pass, we validate that these
     * attributes are actually correct and meaningful.
     */
    if (
      this.check(TokenKind.KEYWORD_CONST) ||
      this.check(TokenKind.KEYWORD_DIAGNOSTIC) ||
      this.check(TokenKind.SYM_IDENTIFIER)
    ) {
      const { current, trivia } = this.advance();
      attr.children.push(this.leaf(current, trivia));
      // we could mark the nodes as errors here, if they don't conform to the spec.
      if (this.check(TokenKind.SYM_LPAREN)) {
        attr = this.attribute_args(attr, -1);
      }

      return this.absorb_trailing_trivia(attr);
    }

    // if we got here, we didn't match a valid attribute term
    // return an error.
    attr.error = ErrorKind.ERR_BAD_ATTRIBUTE;
    if (attr.children.length > 1)
      attr.children[1].error = ErrorKind.ERR_UNEXPECTED_TOKEN;

    return attr;
  }
}
