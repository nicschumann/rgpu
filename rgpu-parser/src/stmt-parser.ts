import { RGPUExprParser } from "./expr-parser";
import { RGPUParser } from "./parser";
import { TokenKind } from "./tokens";
import { SyntaxNode, Token } from "./types";

const zero_arg_attribute_names: Set<string> = new Set([
  "const",
  "invariant",
  "must_use",
  "vertex",
  "fragment",
  "compute",
]);

const single_arg_attribute_names: Set<string> = new Set([
  "align",
  "binding",
  "builtin",
  "group",
  "id",
  "location",
  "size",
]);

const double_arg_attribute_names: Set<string> = new Set(["interpolate"]);

const triple_arg_attribute_names: Set<string> = new Set(["workgroup_size"]);

export class RGPUStmtParser extends RGPUParser {
  private expr_parser: RGPUExprParser;

  constructor(expr_parser: RGPUExprParser) {
    super();
    this.expr_parser = expr_parser;
  }

  private expr(): SyntaxNode {
    const tokens = this.tokens.slice(this.current_position + 1);
    const expr = this.expr_parser.parse(tokens);
    const { tokens: remaining_tokens } = this.expr_parser.remaining();
    this.reset(remaining_tokens);

    return expr;
  }

  private attribute_args(
    attr: SyntaxNode,
    max_num_params: 1 | 2 | 3
  ): SyntaxNode {
    // try to match a paren...
    let { node: maybe_lparen_node } = this.accept(TokenKind.SYM_LPAREN, true);
    attr.children.push(maybe_lparen_node);

    let params_parsed = 0;
    let matched = true;

    while (
      matched &&
      params_parsed < max_num_params &&
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

  private attribute(): SyntaxNode {
    const { current, trivia } = this.advance();

    let attr: SyntaxNode = {
      kind: TokenKind.AST_ATTRIBUTE,
      children: [
        {
          kind: current.kind,
          text: current.text,
          leading_trivia: trivia,
          trailing_trivia: [],
        },
      ],
      leading_trivia: [],
      trailing_trivia: [],
    };

    // Parse the simplest, 0 parameter attribute keywords
    if (
      current.kind === TokenKind.KEYWORD_CONST ||
      (current.kind === TokenKind.SYM_IDENTIFIER &&
        zero_arg_attribute_names.has(current.text))
    ) {
      return attr;
    }

    if (
      current.kind === TokenKind.SYM_IDENTIFIER &&
      single_arg_attribute_names.has(current.text)
    ) {
      return this.attribute_args(attr, 1);
    }

    if (
      current.kind === TokenKind.KEYWORD_DIAGNOSTIC ||
      (current.kind === TokenKind.SYM_IDENTIFIER &&
        double_arg_attribute_names.has(current.text))
    ) {
      return this.attribute_args(attr, 2);
    }

    if (
      current.kind === TokenKind.SYM_IDENTIFIER &&
      triple_arg_attribute_names.has(current.text)
    ) {
      return this.attribute_args(attr, 3);
    }
  }

  private stmt(): SyntaxNode {
    const { current, trivia } = this.advance();

    const stmt: SyntaxNode = {
      kind: TokenKind.AST_STATEMENT,
      children: [],
      leading_trivia: [],
      trailing_trivia: [],
    };

    // needs to be in a while loop, but ignore for now...

    if (current.kind === TokenKind.SYM_AT) {
      // this is an attribute, run the attribute parser
      const attr = this.attribute();
      attr.children.unshift({
        kind: current.kind,
        text: current.text,
        leading_trivia: [],
        trailing_trivia: [],
      });
      attr.leading_trivia.push(...trivia);
      stmt.children.push(attr);
    }

    const { trivia: trailing_trivia } = this.skip_trivia(
      this.current_position + 1,
      true
    );
    stmt.trailing_trivia.push(...trailing_trivia);

    return stmt;
  }

  parse(tokens: Token[]): SyntaxNode {
    this.reset(tokens);
    return this.stmt();
  }
}
