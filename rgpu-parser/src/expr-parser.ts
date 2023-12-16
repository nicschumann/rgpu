import { RGPUParser } from "./parser";
import { TokenKind } from "./tokens";
import {
  RemainingData,
  SimplifiedSyntaxNode,
  SyntaxNode,
  Token,
  binary_op_types,
  binary_op_precedence,
  literal_types,
  unary_op_types,
  unary_op_precedence,
} from "./types";

export function serialize_nodes(syntax: SyntaxNode): string {
  const pre = syntax.leading_trivia.map((v) => v.text).join("");
  const post = syntax.trailing_trivia.map((v) => v.text).join("");

  if (typeof syntax.children === "undefined") {
    return `${pre}${syntax.text}${post}`;
  } else {
    const child_text = syntax.children.map(serialize_nodes).join("");
    return `${pre}${child_text}${post}`;
  }
}

export function simplify_cst(syntax: SyntaxNode): SimplifiedSyntaxNode {
  const pre = syntax.leading_trivia.map((v) => v.text).join("");
  const post = syntax.trailing_trivia.map((v) => v.text).join("");
  const is_error =
    syntax.kind === TokenKind.ERR_ERROR || syntax.kind === TokenKind.ERR_NONE;

  if (
    typeof syntax.children === "undefined" &&
    typeof syntax.text !== "undefined"
  ) {
    const node: SimplifiedSyntaxNode = {
      text: `${pre}${syntax.text}${post}`,
    };
    if (is_error) node.error = true;

    return node;
  } else {
    const node: SimplifiedSyntaxNode = {
      pre,
      children: syntax.children.map(simplify_cst),
      post,
    };
    if (is_error) node.error = true;

    return node;
  }
}

export class RGPUExprParser extends RGPUParser {
  private absorb_trailing_trivia(node: SyntaxNode): SyntaxNode {
    const { trivia: final_trivia } = this.skip_trivia(
      this.current_position + 1,
      true
    );

    node.trailing_trivia.push(...final_trivia);

    return node;
  }

  private precedence(): number {
    const next = this.next_token();
    if (!next || !binary_op_types.has(next.kind)) return 0;
    return binary_op_precedence[next.kind];
  }

  private finish_block(
    expr: SyntaxNode,
    kind: TokenKind,
    l_node: SyntaxNode,
    r_node: SyntaxNode
  ): SyntaxNode {
    if (typeof expr.children !== "undefined") {
      // node
      expr.kind = kind;
      expr.children.unshift(l_node);
      expr.children.push(r_node);

      return expr;
    } else {
      // token
      return {
        kind,
        children: [l_node, expr, r_node],
        leading_trivia: [],
        trailing_trivia: [],
      };
    }
  }

  private parse_prefix(token: Token): SyntaxNode {
    // we expected an expression, but didn't get one
    if (!token) {
      // missing token in the stream /
      // premature end of stream
      return {
        kind: TokenKind.ERR_ERROR,
        text: "",
        leading_trivia: [],
        trailing_trivia: [],
      };
    }

    // IDENTIFIERs && Literal Types
    if (
      token.kind === TokenKind.SYM_IDENTIFIER ||
      literal_types.has(token.kind)
    ) {
      return {
        kind: token.kind,
        text: token.text,
        leading_trivia: [],
        trailing_trivia: [],
      };
    }

    if (unary_op_types.has(token.kind)) {
      const operator: SyntaxNode = {
        kind: token.kind,
        text: token.text,
        leading_trivia: [],
        trailing_trivia: [],
      };
      const expr = this.expr(unary_op_precedence[token.kind]);
      return {
        kind: token.kind,
        children: [operator, expr],
        leading_trivia: [],
        trailing_trivia: [],
      };
    }

    // PARENS in Arithmetic Expressions
    if (token.kind === TokenKind.SYM_LPAREN) {
      const l_node: SyntaxNode = {
        kind: token.kind,
        text: token.text,
        leading_trivia: [],
        trailing_trivia: [],
      };

      const expr = this.expr();
      const { matched, node: r_node } = this.accept(
        TokenKind.SYM_RPAREN,
        false
      );
      const kind = matched ? expr.kind : TokenKind.ERR_ERROR;
      // handles the case where the paren is unmatched...
      return this.finish_block(expr, kind, l_node, r_node);
    }

    // Unrecognized token in expression
    // we need to put the token back
    this.retreat();

    return {
      kind: TokenKind.ERR_ERROR,
      text: "",
      leading_trivia: [],
      trailing_trivia: [],
    };
  }

  private parse_call_expression(
    left: SyntaxNode,
    token: Token,
    closing_token_kind: TokenKind,
    call_kind: TokenKind,
    arg_list_kind: TokenKind,
    error_kind: TokenKind
  ): SyntaxNode {
    let args: SyntaxNode = {
      kind: arg_list_kind,
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

        if (matched) {
          args.children.push(node);
        }

        /**
         * NOTE(Nic): Are trailing commas okay in function calls? Or only in template lists?
         * If not allowed in template lists, remove this check.
         */
        if (this.check(closing_token_kind)) {
          more_arguments = false;
        } else {
          more_arguments = matched;
        }
      }
    }

    const l_node: SyntaxNode = {
      kind: token.kind,
      text: token.text,
      leading_trivia: [],
      trailing_trivia: [],
    };
    const { matched, node: r_node } = this.accept(closing_token_kind, true);
    args = this.finish_block(
      args,
      matched ? args.kind : error_kind,
      l_node,
      r_node
    );

    return {
      kind: call_kind,
      children: [left, args],
      leading_trivia: [],
      trailing_trivia: [],
    };
  }

  private parse_infix(left: SyntaxNode, token: Token): SyntaxNode {
    // Handle Infix Arithmetic Expressions, Logical Expressions, Bitwise expressions
    // AND member access (as the highest precedence binary operator)
    if (binary_op_types.has(token.kind)) {
      const right = this.expr(binary_op_precedence[token.kind]);
      return {
        kind: token.kind,
        children: [
          left,
          {
            kind: token.kind,
            text: token.text,
            leading_trivia: [],
            trailing_trivia: [],
          },
          right,
        ],
        leading_trivia: [],
        trailing_trivia: [],
      };
    }

    // Handle Multi-argument Function Calls
    if (token.kind === TokenKind.SYM_LPAREN) {
      return this.parse_call_expression(
        left,
        token,
        TokenKind.SYM_RPAREN,
        TokenKind.AST_FUNCTION_CALL,
        TokenKind.AST_FUNCTION_ARGS,
        TokenKind.ERR_ERROR
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
        TokenKind.ERR_ERROR
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
        TokenKind.ERR_ERROR
      );
    }
  }

  template_ident() {
    let { matched, node: left } = this.accept(TokenKind.SYM_IDENTIFIER, true);
    if (!matched) return null;

    const template = this.template();
    if (template) {
      template.children.unshift(left);
      left = template;
    }

    return this.absorb_trailing_trivia(left);
  }

  template() {
    if (!this.check(TokenKind.SYM_TEMPLATE_LIST_START)) {
      return null;
    }

    let left: SyntaxNode = {
      kind: TokenKind.SYM_DISAMBIGUATE_TEMPLATE,
      text: "",
      leading_trivia: [],
      trailing_trivia: [],
    };

    const { current: template_start_token, trivia: leading_trivia } =
      this.advance();
    left = this.parse_infix(left, template_start_token);
    left.leading_trivia.push(...leading_trivia);
    left.children.shift(); // get rid of the disambiguate template node?

    return this.absorb_trailing_trivia(left);
  }

  lhs(): SyntaxNode {
    const lhs: SyntaxNode = {
      kind: TokenKind.AST_LHS_EXPRESSION,
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
      lhs.children.push({
        kind: TokenKind.ERR_ERROR,
        text: "",
        leading_trivia: [],
        trailing_trivia: [],
      });
    }

    const maybe_specifier = this.component_specifier();
    if (maybe_specifier) lhs.children.push(maybe_specifier);

    return this.absorb_trailing_trivia(lhs);
  }

  private component_specifier(): SyntaxNode {
    // [here](https://www.w3.org/TR/WGSL/#syntax-component_or_swizzle_specifier)
    if (!(this.check(TokenKind.SYM_LBRACKET) || this.check(TokenKind.SYM_DOT)))
      return null;

    // TODO(Nic): continue here
    // https://www.w3.org/TR/WGSL/#syntax-component_or_swizzle_specifier
    const spec_node: SyntaxNode = {
      kind: TokenKind.AST_LHS_COMPONENT_SPECIFIER,
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
  }

  expr(precedence: number = 0): SyntaxNode {
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
        this.next_token().kind === TokenKind.SYM_LPAREN ||
        // the next token is a bracket, indicating an array index
        this.next_token().kind === TokenKind.SYM_LBRACKET ||
        // the next token starts a template list
        this.next_token().kind === TokenKind.SYM_TEMPLATE_LIST_START)
    ) {
      let { current, trivia: trailing_trivia } = this.advance();
      left.trailing_trivia.push(...trailing_trivia);
      left = this.parse_infix(left, current);
    }

    return this.absorb_trailing_trivia(left);
  }

  parse(tokens: Token[]): SyntaxNode {
    this.reset(tokens);
    return this.expr();
  }
}
