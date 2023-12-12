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
    this.expr_parser.reset(tokens);
    const expr = this.expr_parser.expr();
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

  attribute(): SyntaxNode {
    /**
     * TODO(Nic): maybe we should pull identifying the at-sign
     * into the body of the attribute. if there's no at-sign,
     * it returns null, and doesn't effect the token stream.
     */
    let { current: at_sign, trivia: at_trivia } = this.advance();

    if (at_sign.kind !== TokenKind.SYM_AT) return null;

    let { current, trivia } = this.advance();

    let attr: SyntaxNode = {
      kind: TokenKind.AST_ATTRIBUTE,
      children: [
        {
          kind: at_sign.kind,
          text: at_sign.text,
          leading_trivia: [],
          trailing_trivia: [],
        },
        {
          kind: current.kind,
          text: current.text,
          leading_trivia: trivia,
          trailing_trivia: [],
        },
      ],
      leading_trivia: at_trivia,
      trailing_trivia: [],
    };

    // Parse the simplest, 0 parameter attribute keywords
    if (
      current.kind === TokenKind.KEYWORD_CONST ||
      (current.kind === TokenKind.SYM_IDENTIFIER &&
        zero_arg_attribute_names.has(current.text))
    ) {
      const { trivia: trailing_trivia } = this.skip_trivia(
        this.current_position + 1,
        true
      );
      attr.trailing_trivia.push(...trailing_trivia);
      return attr;
    }

    if (
      current.kind === TokenKind.SYM_IDENTIFIER &&
      single_arg_attribute_names.has(current.text)
    ) {
      attr = this.attribute_args(attr, 1);
      const { trivia: trailing_trivia } = this.skip_trivia(
        this.current_position + 1,
        true
      );
      attr.trailing_trivia.push(...trailing_trivia);
      return attr;
    }

    if (
      current.kind === TokenKind.KEYWORD_DIAGNOSTIC ||
      (current.kind === TokenKind.SYM_IDENTIFIER &&
        double_arg_attribute_names.has(current.text))
    ) {
      attr = this.attribute_args(attr, 2);
      const { trivia: trailing_trivia } = this.skip_trivia(
        this.current_position + 1,
        true
      );
      attr.trailing_trivia.push(...trailing_trivia);
      return attr;
    }

    if (
      current.kind === TokenKind.SYM_IDENTIFIER &&
      triple_arg_attribute_names.has(current.text)
    ) {
      attr = this.attribute_args(attr, 3);
      const { trivia: trailing_trivia } = this.skip_trivia(
        this.current_position + 1,
        true
      );
      attr.trailing_trivia.push(...trailing_trivia);
      return attr;
    }
  }

  compound_stmt(): SyntaxNode {
    const compound_stmt: SyntaxNode = {
      kind: TokenKind.AST_COMPOUND_STATEMENT,
      children: [],
      leading_trivia: [],
      trailing_trivia: [],
    };

    // Handle Maybe Parsing an attribute...
    const attr = this.attribute();
    if (attr) {
      compound_stmt.children.push(attr);
    }

    var { current, trivia } = this.advance();

    /**
     * This should be the main loop
     */
    /**
     * NOTE(Nic):  this needs to be refactored into a loop that
     * tries to parse as many statements as possible
     */
    if (current && current.kind === TokenKind.SYM_LBRACE) {
      const stmt = this.single_stmt();
      const { node } = this.accept(TokenKind.SYM_RBRACE, true);

      compound_stmt.children.push(
        {
          kind: current.kind,
          text: current.text,
          leading_trivia: trivia,
          trailing_trivia: [],
        },
        stmt,
        node
      );
    } else {
      // TODO(Nic): record an error, and return...
    }

    const { trivia: trailing_trivia } = this.skip_trivia(
      this.current_position + 1,
      true
    );
    compound_stmt.trailing_trivia.push(...trailing_trivia);

    return compound_stmt;
  }

  single_stmt(): SyntaxNode {
    const { current, trivia } = this.advance();

    const stmt: SyntaxNode = {
      kind: TokenKind.AST_COMPOUND_STATEMENT,
      children: [],
      leading_trivia: [],
      trailing_trivia: [],
    };

    // parse return statement
    if (current.kind === TokenKind.KEYWORD_RETURN) {
      const expr = this.expr();

      stmt.children.push({
        kind: current.kind,
        text: current.text,
        leading_trivia: trivia,
        trailing_trivia: [],
      });
      stmt.children.push(expr);

      let { node } = this.accept(TokenKind.SYM_SEMICOLON, true);
      stmt.children.push(node);

      return stmt;
    }

    // parse if statement
  }
}
