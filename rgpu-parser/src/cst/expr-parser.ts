import { RGPUParser } from "./base-parser";
import { ErrorKind, TokenKind } from "../token-defs";
import {
  SimplifiedSyntax,
  Syntax,
  Token,
  binary_op_types,
  binary_op_precedence,
  literal_types,
  unary_op_types,
  unary_op_precedence,
  isSyntaxLeaf,
  isSyntaxNode,
  SyntaxNode,
} from "../types";
export class RGPUExprParser extends RGPUParser {
  private precedence(): number {
    const next = this.next_token();
    if (!next || !(next.kind in binary_op_precedence)) return 0;
    return binary_op_precedence[next.kind];
  }

  private finish_block(
    expr: Syntax,
    kind: TokenKind,
    l_node: Syntax,
    r_node: Syntax,
    error: ErrorKind = ErrorKind.ERR_NO_ERROR
  ): SyntaxNode {
    if (isSyntaxNode(expr)) {
      // node
      expr.kind = kind;
      expr.children.unshift(l_node);
      expr.children.push(r_node);

      return expr;
    } else {
      // token
      return {
        kind,
        error,
        children: [l_node, expr, r_node],
        leading_trivia: [],
        trailing_trivia: [],
      };
    }
  }

  private parse_prefix(token: Token): Syntax {
    // we expected an expression, but didn't get one
    if (!token) {
      // missing token in the stream /
      // premature end of stream
      return this.error(TokenKind.NO_TOKEN, ErrorKind.ERR_EOF);
    }

    // IDENTIFIERs && Literal Types
    if (
      token.kind === TokenKind.SYM_IDENTIFIER ||
      literal_types.has(token.kind)
    ) {
      return this.leaf(token);
    }

    if (unary_op_types.has(token.kind)) {
      const operator: Syntax = this.leaf(token);
      const expr = this.expr(unary_op_precedence[token.kind]);
      return this.node(token.kind, [operator, expr]);
    }

    // PARENS in Arithmetic Expressions
    if (token.kind === TokenKind.SYM_LPAREN) {
      const l_node = this.leaf(token);
      const expr = this.expr();
      const { matched, node: r_node } = this.accept(
        TokenKind.SYM_RPAREN,
        false
      );

      // handles the case where the paren is unmatched...
      return this.finish_block(
        expr,
        expr.kind,
        l_node,
        r_node,
        matched ? ErrorKind.ERR_NO_ERROR : ErrorKind.ERR_UNMATCHED_PAREN
      );
    }

    // Unrecognized token in expression
    // we need to put the token back
    this.retreat();

    return this.error(token.kind, ErrorKind.ERR_UNEXPECTED_TOKEN);
  }

  parse_call_expression(
    left: Syntax,
    token: Token,
    closing_token_kind: TokenKind,
    call_kind: TokenKind,
    arg_list_kind: TokenKind,
    error_kind: ErrorKind
  ): SyntaxNode {
    let args: SyntaxNode = {
      kind: arg_list_kind,
      error: ErrorKind.ERR_NO_ERROR,
      children: [],
      leading_trivia: [],
      trailing_trivia: [],
    };

    if (!this.check(closing_token_kind)) {
      let more_arguments = true;
      while (more_arguments) {
        let arg_expr = this.expr();
        args.children.push(arg_expr);

        // NOTE(Nic): a comma may have trailing trivia...
        let { matched, node } = this.accept(TokenKind.SYM_COMMA, true);
        more_arguments = matched;

        if (matched) args.children.push(node);

        /**
         * NOTE(Nic): Are trailing commas okay in function calls? Or only in template lists?
         * If not allowed in template lists, remove this check.
         */
        if (this.check(closing_token_kind)) more_arguments = false;
      }
    }

    const l_node = this.leaf(token);
    const { matched, node: r_node } = this.accept(closing_token_kind, true);
    args = this.finish_block(
      args,
      args.kind,
      l_node,
      r_node,
      matched ? ErrorKind.ERR_NO_ERROR : error_kind
    );

    return {
      kind: call_kind,
      error: ErrorKind.ERR_NO_ERROR,
      children: [left, args],
      leading_trivia: [],
      trailing_trivia: [],
    };
  }

  private parse_infix(left: Syntax, token: Token): SyntaxNode {
    // Handle Infix Arithmetic Expressions, Logical Expressions, Bitwise expressions
    // AND member access (as the highest precedence binary operator)
    if (binary_op_types.has(token.kind)) {
      const right = this.expr(binary_op_precedence[token.kind]);
      return this.node(token.kind, [left, this.leaf(token), right]);
    }

    // Handle Multi-argument Function Calls
    if (token.kind === TokenKind.SYM_LPAREN) {
      return this.parse_call_expression(
        left,
        token,
        TokenKind.SYM_RPAREN,
        TokenKind.AST_FUNCTION_CALL,
        TokenKind.AST_FUNCTION_ARGS,
        ErrorKind.ERR_UNMATCHED_PAREN
      );
    }

    // Handle Multi-argument Template List
    if (token.kind === TokenKind.SYM_TEMPLATE_LIST_START) {
      return this.parse_call_expression(
        left,
        token,
        TokenKind.SYM_TEMPLATE_LIST_END,
        TokenKind.AST_TEMPLATE_IDENTIFIER,
        TokenKind.AST_TEMPLATE_ARGS,
        ErrorKind.ERR_UNMATCHED_TEMPLATE_LIST
      );
    }

    // Handle Multi-argument Array Indexing
    if (token.kind === TokenKind.SYM_LBRACKET) {
      return this.parse_call_expression(
        left,
        token,
        TokenKind.SYM_RBRACKET,
        TokenKind.AST_ARRAY_ACCESS,
        TokenKind.AST_ARRAY_INDEX,
        ErrorKind.ERR_UNMATCHED_BRACKET
      );
    }

    return this.node(token.kind, [
      left,
      this.leaf(token),
      this.error(token.kind, ErrorKind.ERR_UNEXPECTED_TOKEN),
    ]);
  }

  template_ident(): Syntax | null {
    let { matched, node: left } = this.accept(TokenKind.SYM_IDENTIFIER, true);
    if (!matched) return null;

    const template = this.template();
    if (template) {
      left = this.node(TokenKind.AST_TEMPLATE_IDENTIFIER, [left, template]);
    }

    return this.absorb_trailing_trivia(left);
  }

  template(): SyntaxNode | null {
    if (!this.check(TokenKind.SYM_TEMPLATE_LIST_START)) {
      return null;
    }

    let left: Syntax = this.error(
      TokenKind.SYM_DISAMBIGUATE_TEMPLATE,
      ErrorKind.ERR_NO_ERROR
    );

    const { current: template_start_token, trivia: leading_trivia } =
      this.advance();
    left = this.parse_infix(left, template_start_token);
    left = left.children[1] as SyntaxNode;
    left.leading_trivia.push(...leading_trivia);
    // left.children.shift(); // get rid of the disambiguate template node?

    return this.absorb_trailing_trivia(left);
  }

  lhs(): Syntax {
    const lhs: Syntax = {
      kind: TokenKind.AST_LHS_EXPRESSION,
      error: ErrorKind.ERR_NO_ERROR,
      children: [],
      leading_trivia: [],
      trailing_trivia: [],
    };

    if (this.check(TokenKind.SYM_STAR)) {
      const { node } = this.accept(TokenKind.SYM_STAR, true);
      lhs.children.push(node, this.lhs());
      return this.absorb_trailing_trivia(lhs);
    }

    if (this.check(TokenKind.SYM_AMP)) {
      const { node } = this.accept(TokenKind.SYM_AMP, true);
      lhs.children.push(node, this.lhs());
      return this.absorb_trailing_trivia(lhs);
    }

    if (this.check(TokenKind.SYM_LPAREN)) {
      const { node: lparen_node } = this.accept(TokenKind.SYM_LPAREN, true);
      lhs.children.push(lparen_node, this.lhs());

      const { node: rparen_node } = this.accept(TokenKind.SYM_RPAREN, true);
      lhs.children.push(rparen_node);
      return this.absorb_trailing_trivia(lhs);
    }

    // Should this actually just parse an identifier?
    const ident = this.template_ident();
    if (ident) {
      lhs.children.push(ident);
    } else {
      lhs.children.push(
        this.error(TokenKind.SYM_IDENTIFIER, ErrorKind.ERR_MISSING_TOKEN)
      );
    }

    const maybe_specifier = this.component_specifier();
    if (maybe_specifier) lhs.children.push(maybe_specifier);

    return this.absorb_trailing_trivia(lhs);
  }

  private component_specifier(): Syntax | null {
    // [here](https://www.w3.org/TR/WGSL/#syntax-component_or_swizzle_specifier)
    if (!(this.check(TokenKind.SYM_LBRACKET) || this.check(TokenKind.SYM_DOT)))
      return null;

    // TODO(Nic): continue here
    // https://www.w3.org/TR/WGSL/#syntax-component_or_swizzle_specifier
    const spec_node: Syntax = {
      kind: TokenKind.AST_LHS_COMPONENT_SPECIFIER,
      error: ErrorKind.ERR_NO_ERROR,
      children: [],
      leading_trivia: [],
      trailing_trivia: [],
    };

    if (this.check(TokenKind.SYM_LBRACKET)) {
      const { node: lbracket_node } = this.accept(TokenKind.SYM_LBRACKET, true);
      spec_node.children.push(lbracket_node, this.expr());

      const { node: rbracket_node } = this.accept(TokenKind.SYM_RBRACKET, true);
      spec_node.children.push(rbracket_node);

      const maybe_specifier = this.component_specifier();
      if (maybe_specifier) spec_node.children.push(maybe_specifier);

      return this.absorb_trailing_trivia(spec_node);
    } else if (this.check(TokenKind.SYM_DOT)) {
      const { node: dot_node } = this.accept(TokenKind.SYM_DOT, true);
      spec_node.children.push(dot_node);

      const { node: ident_node } = this.accept(TokenKind.SYM_IDENTIFIER, true);
      spec_node.children.push(ident_node);

      const maybe_specifier = this.component_specifier();
      if (maybe_specifier) spec_node.children.push(maybe_specifier);

      return this.absorb_trailing_trivia(spec_node);
    }

    return null;
  }

  expr(precedence: number = 0): Syntax {
    let { current, trivia: leading_trivia } = this.advance();
    let left = this.parse_prefix(current);

    // attach trivia to the innermost node:
    left.leading_trivia.push(...leading_trivia);

    while (
      // current and next tokens exist
      this.next_token() &&
      // precedence dictates that we're still in the same expression
      (precedence < this.precedence() ||
        // the next token is a paren, indicating a function call
        // @ts-ignore
        this.next_token().kind === TokenKind.SYM_LPAREN ||
        // the next token is a bracket, indicating an array index
        // @ts-ignore
        this.next_token().kind === TokenKind.SYM_LBRACKET ||
        // the next token starts a template list
        // @ts-ignore
        this.next_token().kind === TokenKind.SYM_TEMPLATE_LIST_START)
    ) {
      let { current, trivia: trailing_trivia } = this.advance();
      left.trailing_trivia.push(...trailing_trivia);
      left = this.parse_infix(left, current);
    }

    return this.absorb_trailing_trivia(left);
  }

  parse(tokens: Token[]): Syntax {
    this.reset(tokens);
    return this.expr();
  }
}
