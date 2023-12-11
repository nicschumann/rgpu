import { TokenKind } from "./tokens";
import { Node, Token, isNode, isToken } from "./types";

type SyntaxNode = {
  kind: TokenKind;
  text?: string;
  children?: SyntaxNode[];
  leading_trivia: Token[];
  trailing_trivia: Token[];
};

type SimplifiedSyntaxNode = {
  text?: string;
  pre?: string;
  post?: string;
  children?: SimplifiedSyntaxNode[];
};

type AdvanceData = {
  current: Token;
  trivia: Token[];
  next: Token;
};

type TriviaData = {
  trivia: Token[];
  new_index: number;
};

type AcceptData = {
  matched: boolean;
  node: SyntaxNode;
};

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

  if (
    typeof syntax.children === "undefined" &&
    typeof syntax.text !== "undefined"
  ) {
    return { text: `${pre}${syntax.text}${post}` };
  } else {
    return {
      pre,
      children: syntax.children.map(simplify_cst),
      post,
    };
  }
}

export class RGPUExprParser {
  // token stream from lexer
  private tokens: Token[] = [];
  private current_position: number = -1; // always points to non-trivial token
  private next_position: number = 0;

  // trivia to skip or collect
  private trivia_types: Set<TokenKind> = new Set([
    TokenKind.BLANKSPACE,
    TokenKind.BLOCK_COMMENT,
    TokenKind.LINEBREAK,
    TokenKind.LINE_COMMENT,
  ]);

  private literal_types: Set<TokenKind> = new Set([
    TokenKind.BOOL_LITERAL,
    TokenKind.DEC_INT_LITERAL,
    TokenKind.HEX_INT_LITERAL,
    TokenKind.DEC_FLOAT_LITERAL,
    TokenKind.HEX_FLOAT_LITERAL,
  ]);

  private unary_op_types: Set<TokenKind> = new Set([
    TokenKind.SYM_DASH,
    TokenKind.SYM_BANG,
    TokenKind.SYM_TILDE,
    TokenKind.SYM_STAR,
    TokenKind.SYM_AMP,
  ]);

  // walks forward from an index, and returns a new index pointing to a non-trivial token
  // or -1 if we reached the end of the stream
  private skip_trivia(from: number, consuming: boolean): TriviaData {
    const trivia: Token[] = [];
    let new_index = from;
    while (
      new_index < this.tokens.length &&
      this.trivia_types.has(this.tokens[new_index].kind)
    ) {
      if (consuming && !this.tokens[new_index].seen) {
        trivia.push(this.tokens[new_index]);
        this.tokens[new_index].seen = true;
      }
      new_index += 1;
    }

    return {
      trivia,
      new_index,
    };
  }

  private reset(tokens: Token[]) {
    this.tokens = tokens;
    this.current_position = -1;
    this.next_position = 0;
  }

  private current_token(): Token | null {
    return this.tokens[this.current_position] || null;
  }

  private next_token(): Token | null {
    return this.tokens[this.next_position] || null;
  }

  private check(kind: TokenKind): boolean {
    const next = this.next_token();
    return next && next.kind === kind;
  }

  private precedence(): number {
    if (!this.next_token()) return 0;

    return this.next_token().precedence;
  }

  private accept(kind: TokenKind, allows_trivia: boolean = false): AcceptData {
    if (this.check(kind)) {
      // We should be good to ignore trivia in this section. it should always be empty,
      // since we should have consumed it in the previous `expr` call.
      let { current, trivia } = this.advance();
      if (!allows_trivia && trivia.length > 0) {
        // leave this in as an assertion.
        throw new Error(
          `some trivia was not consumed before the .accept call: ${trivia}`
        );
      }

      return {
        matched: true,
        node: {
          kind: current.kind,
          text: current.text,
          leading_trivia: trivia,
          trailing_trivia: [],
        },
      };
    } else {
      return {
        matched: false,
        node: {
          kind: TokenKind.ERROR,
          text: "",
          leading_trivia: [],
          trailing_trivia: [],
        },
      };
    }
  }

  private advance(): AdvanceData {
    // updates current and next one step.
    // pushes the trivia between current and next onto the stack.
    const { new_index: current_index, trivia } = this.skip_trivia(
      this.current_position + 1,
      true
    );
    const { new_index: next_index } = this.skip_trivia(
      current_index + 1,
      false
    );

    this.current_position = current_index;
    this.next_position = next_index;

    return {
      current: this.tokens[current_index] || null,
      next: this.tokens[next_index] || null,
      trivia,
    };
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
    // IDENTIFIERs && Literal Types
    if (
      token.kind === TokenKind.IDENTIFIER ||
      this.literal_types.has(token.kind)
    ) {
      return {
        kind: token.kind,
        text: token.text,
        leading_trivia: [],
        trailing_trivia: [],
      };
    }

    if (this.unary_op_types.has(token.kind)) {
      const operator: SyntaxNode = {
        kind: token.kind,
        text: token.text,
        leading_trivia: [],
        trailing_trivia: [],
      };
      const expr = this.expr(token.precedence + 1);
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
      const kind = matched ? expr.kind : TokenKind.ERROR;
      // handles the case where the paren is unmatched...
      return this.finish_block(expr, kind, l_node, r_node);
    }
  }

  private parse_infix(left: SyntaxNode, token: Token): SyntaxNode {
    // Handle Infix Arithmetic Expressions
    if (
      token.kind === TokenKind.SYM_PLUS ||
      token.kind === TokenKind.SYM_DASH ||
      token.kind === TokenKind.SYM_STAR ||
      token.kind === TokenKind.SYM_SLASH
    ) {
      const right = this.expr(token.precedence);
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
      let args: SyntaxNode = {
        kind: TokenKind.AST_FUNCTION_ARGS,
        children: [],
        leading_trivia: [],
        trailing_trivia: [],
      };

      if (!this.check(TokenKind.SYM_RPAREN)) {
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
          if (this.check(TokenKind.SYM_RPAREN)) {
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
      const { matched, node: r_node } = this.accept(TokenKind.SYM_RPAREN, true);
      args = this.finish_block(
        args,
        matched ? args.kind : TokenKind.ERROR,
        l_node,
        r_node
      );

      return {
        kind: TokenKind.AST_FUNCTION_CALL,
        children: [left, args],
        leading_trivia: [],
        trailing_trivia: [],
      };
    }
  }

  private expr(precedence: number = 0) {
    let { current, trivia: leading_trivia } = this.advance();
    let left = this.parse_prefix(current);

    // attach to the innermost node:
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
        // this current token is an identifier, and the next token starts a template list
        (this.current_token().kind === TokenKind.IDENTIFIER &&
          this.next_token().kind === TokenKind.TEMPLATE_LIST_START))
    ) {
      let { current, trivia: trailing_trivia } = this.advance();
      left.trailing_trivia.push(...trailing_trivia);
      left = this.parse_infix(left, current);
    }

    // attach to the outermost node:
    // left.leading_trivia.push(...leading_trivia);

    // TODO(Nic): need to get any trailing trivia on the expr here...
    const { trivia: trailing_trivia } = this.skip_trivia(
      this.current_position + 1,
      true
    );
    left.trailing_trivia.push(...trailing_trivia);

    return left;
  }

  parse(tokens: Token[]) {
    this.reset(tokens);
    return this.expr();
  }
}
