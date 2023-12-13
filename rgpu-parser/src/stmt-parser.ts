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

  private absorb_trailing_trivia(node: SyntaxNode): SyntaxNode {
    const { trivia: trailing_trivia } = this.skip_trivia(
      this.current_position + 1,
      true
    );
    node.trailing_trivia.push(...trailing_trivia);

    return node;
  }

  /**
   * NOTE(Nic): definitely refactor these expressions that
   * prepare the subparser state and then call a specific sub-parse
   * routine...
   */

  private expr(): SyntaxNode {
    const tokens = this.tokens.slice(this.current_position + 1);
    this.expr_parser.reset(tokens);
    const expr = this.expr_parser.expr();
    const { tokens: remaining_tokens } = this.expr_parser.remaining();
    this.reset(remaining_tokens);

    return expr;
  }

  private template_ident(): SyntaxNode {
    const tokens = this.tokens.slice(this.current_position + 1);
    this.expr_parser.reset(tokens);
    const expr = this.expr_parser.template_ident();
    const { tokens: remaining_tokens } = this.expr_parser.remaining();
    this.reset(remaining_tokens);

    return expr;
  }

  private template(): SyntaxNode {
    const tokens = this.tokens.slice(this.current_position + 1);
    this.expr_parser.reset(tokens);
    const expr = this.expr_parser.template();
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

  maybe_typed_ident(): SyntaxNode {
    let { matched, node: decl } = this.accept(TokenKind.SYM_IDENTIFIER, true);
    if (!matched) {
      return decl;
    }

    let { matched: colon_matched, node: colon_node } = this.accept(
      TokenKind.SYM_COLON,
      true
    );

    if (colon_matched) {
      decl = {
        kind: TokenKind.AST_TYPED_IDENTIFIER,
        children: [decl, colon_node],
        leading_trivia: [],
        trailing_trivia: [],
      };

      const template_ident = this.template_ident();

      if (template_ident) {
        decl.children.push(template_ident);
      } else {
        decl.children.push({
          kind: TokenKind.ERR_ERROR,
          text: "",
          leading_trivia: [],
          trailing_trivia: [],
        });
      }
    }

    return this.absorb_trailing_trivia(decl);
  }

  var_decl(): SyntaxNode {
    let { matched, node } = this.accept(TokenKind.KEYWORD_VAR, true);

    if (!matched) return null;

    const decl: SyntaxNode = {
      kind: TokenKind.AST_VAR_DECLARATION,
      children: [node],
      leading_trivia: [],
      trailing_trivia: [],
    };

    let var_template = this.template();
    if (var_template) decl.children.push(var_template);

    const ident = this.maybe_typed_ident();
    decl.children.push(ident);

    return this.absorb_trailing_trivia(decl);
  }

  attribute(): SyntaxNode {
    let { matched, node: at_node } = this.accept(TokenKind.SYM_AT, true);

    if (!matched) return null;

    let { current, trivia } = this.advance();

    let attr: SyntaxNode = {
      kind: TokenKind.AST_ATTRIBUTE,
      children: [
        at_node,
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

    if (
      current.kind === TokenKind.KEYWORD_CONST ||
      (current.kind === TokenKind.SYM_IDENTIFIER &&
        zero_arg_attribute_names.has(current.text))
    ) {
      return this.absorb_trailing_trivia(attr);
    }

    if (
      current.kind === TokenKind.SYM_IDENTIFIER &&
      single_arg_attribute_names.has(current.text)
    ) {
      attr = this.attribute_args(attr, 1);
      return this.absorb_trailing_trivia(attr);
    }

    if (
      current.kind === TokenKind.KEYWORD_DIAGNOSTIC ||
      (current.kind === TokenKind.SYM_IDENTIFIER &&
        double_arg_attribute_names.has(current.text))
    ) {
      attr = this.attribute_args(attr, 2);
      return this.absorb_trailing_trivia(attr);
    }

    if (
      current.kind === TokenKind.SYM_IDENTIFIER &&
      triple_arg_attribute_names.has(current.text)
    ) {
      attr = this.attribute_args(attr, 3);
      return this.absorb_trailing_trivia(attr);
    }

    // TODO(Nic): return a trivial error here...
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
    if (attr) compound_stmt.children.push(attr);

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

    return this.absorb_trailing_trivia(compound_stmt);
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

      return this.absorb_trailing_trivia(stmt);
    }

    // parse if statement
  }
}
