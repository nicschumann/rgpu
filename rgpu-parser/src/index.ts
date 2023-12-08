// [notes](https://github.com/rust-lang/rust-analyzer/blob/master/docs/dev/syntax.md)

import { TokenKind, tokenDefinitions } from "./tokens";

enum SyntaxKind {}

type Token = {
  kind: TokenKind;
  text: string;
  precedence: number;
};

type Node = {
  kind: TokenKind;
  children: (Node | Token)[];
};

const isNode = (value: any): value is Node => {
  return typeof value.children !== "undefined";
};

const isToken = (value: any): value is Node => {
  return typeof value.text === "string";
};

type UnclosedCandidate = {
  source_position: number; // position in the source text
  start_position: number; // position in token stream
  depth: number; // nesting depth at position
};

type TemplateList = {
  start_position: number; // position of the '<' token that starts the template list
  end_position: number; // position of the '>' token point that ends the template list
};

export class RPGUTokenizer {
  tokens: Token[] = [];
  template_lists: TemplateList[] = [];
  source: string | null = null;
  pattern: RegExp | null = null;
  index: number = 0;

  /**
   * Resets this tokenizer's state, and feeds it a new source string to tokenize.
   *
   * @param source the source text to tokenize
   */
  start(source: string) {
    this.tokens = [];
    this.template_lists = [];
    this.source = source;
    this.index = 0;
    this.pattern = new RegExp(
      tokenDefinitions.map((a) => `(${a.re})`).join("|"),
      "yu"
    );
  }

  /**
   * Tries to parse the next token, maintaining the lexer's position in the source string.
   *
   * @returns The next {@link Token} pulled from the source string.
   */
  next_token(): Token | null {
    if (this.source === null || this.pattern === null) {
      return null;
    }

    this.pattern.lastIndex = this.index;

    const match = this.pattern.exec(this.source);

    if (match) {
      for (let i = 1; i < match.length; i += 1) {
        if (typeof match[i] !== "undefined") {
          const def = tokenDefinitions[i - 1];
          const kind = def.type;
          const token = {
            kind,
            text: match[0],
            precedence: def.right_precedence || 0,
          };

          return token;
        }
      }
    }

    return null;
  }

  consume_token(token: Token) {
    this.index += token.text.length;
    this.tokens.push(token);
  }

  tokenize_source(source: string): Token[] {
    this.start(source);

    let token: Token;
    let pending: UnclosedCandidate[] = [];
    let depth: number = 0;

    while ((token = this.next_token()) !== null) {
      if (token.kind === TokenKind.IDENTIFIER) {
        this.consume_token(token);
        // We need to check for template lists:
        // [as here](https://www.w3.org/TR/WGSL/#template-lists-sec)

        // 1. Advance past Whitespace / Comments
        while ((token = this.next_token()) !== null) {
          if (
            token.kind === TokenKind.BLANKSPACE ||
            token.kind === TokenKind.LINEBREAK ||
            token.kind === TokenKind.BLOCK_COMMENT ||
            token.kind === TokenKind.LINE_COMMENT
          ) {
            this.consume_token(token);
          } else {
            break;
          }
        }

        if (token === null) {
          break;
        }

        // 2. Case < : opens a template
        if (token.kind === TokenKind.SYM_LESS) {
          pending.push({
            source_position: this.index,
            start_position: this.tokens.length,
            depth,
          });
          this.consume_token(token);
        }
      }

      // Case > : maybe closes a template...
      else if (
        token.kind === TokenKind.SYM_GREATER ||
        token.kind === TokenKind.SYM_GREATER_GREATER ||
        token.kind === TokenKind.SYM_GREATER_EQUAL ||
        token.kind === TokenKind.SYM_GREATER_GREATER_EQUAL
      ) {
        if (pending.length > 0 && pending[pending.length - 1].depth === depth) {
          let candidate = pending.pop();
          this.template_lists.push({
            start_position: candidate.start_position,
            end_position: this.tokens.length,
          });
          this.consume_token({
            kind: TokenKind.SYM_GREATER,
            text: ">",
            precedence: 0,
          });
        } else {
          this.consume_token(token);
        }
      }

      // increases nesting depth...
      else if (
        token.kind === TokenKind.SYM_LPAREN ||
        token.kind === TokenKind.SYM_LBRACKET
      ) {
        depth += 1;
        this.consume_token(token);
      }

      // decreases nesting depth
      else if (
        token.kind === TokenKind.SYM_RPAREN ||
        token.kind === TokenKind.SYM_RBRACKET
      ) {
        while (
          pending.length > 0 &&
          pending[pending.length - 1].depth >= depth
        ) {
          pending.pop();
        }

        depth = Math.max(0, depth - 1);
        this.consume_token(token);
      }

      // reset depth
      else if (
        token.kind === TokenKind.SYM_EQUAL ||
        token.kind === TokenKind.SYM_SEMICOLON ||
        token.kind === TokenKind.SYM_LBRACE ||
        token.kind === TokenKind.SYM_COLON
      ) {
        depth = 0;
        pending = [];
        this.consume_token(token);
      }

      // reset depth
      else if (
        token.kind === TokenKind.SYM_AMP_AMP ||
        token.kind === TokenKind.SYM_BAR_BAR
      ) {
        while (
          pending.length > 0 &&
          pending[pending.length - 1].depth >= depth
        ) {
          pending.pop();
        }

        this.consume_token(token);
      }

      // just eat the token
      else {
        this.consume_token(token);
      }
    }

    for (let i = 0; i < this.template_lists.length; i += 1) {
      let template_list = this.template_lists[i];
      this.tokens[template_list.start_position].kind =
        TokenKind.TEMPLATE_LIST_START;
      this.tokens[template_list.end_position].kind =
        TokenKind.TEMPLATE_LIST_END;
    }

    return this.tokens;
  }
}

export class RGPUExprParser {
  private tokens: Token[] = [];
  private position: number = 0;
  private current: Token | null;

  private check(kind: TokenKind): boolean {
    return this.current !== null && this.current.kind === kind;
  }

  private precedence(): number {
    if (this.current === null) {
      return 0;
    }

    return this.current.precedence;
  }

  private next() {
    // this should skip past trivia (for now)
    // or push them onto a stack that we can keep
    // for adding into the CST.
    const token = this.current;

    this.position += 1;

    if (this.position < this.tokens.length) {
      this.current = this.tokens[this.position];
    } else {
      this.current = null;
    }

    return token;
  }

  private expect(kind: TokenKind): [boolean, Token] {
    if (this.check(kind)) {
      const token = this.next();
      return [true, token];
    } else {
      return [false, { kind: TokenKind.ERROR, text: "", precedence: 0 }];
    }
  }

  private parse_prefix(token: Token): Node | Token {
    // aka "nud"

    // id
    if (token.kind === TokenKind.IDENTIFIER) {
      return token;
    }

    // parens
    if (token.kind === TokenKind.SYM_LPAREN) {
      const expr = this.expr();
      const [matched, r_token] = this.expect(TokenKind.SYM_RPAREN);
      const kind = matched ? expr.kind : TokenKind.ERROR;
      // handles the case where the paren is unmatched...
      return this.close_paren_block(expr, kind, token, r_token);
    }
  }

  private close_paren_block(
    expr: Token | Node,
    kind: TokenKind,
    l_token: Token,
    r_token: Token
  ): Node {
    if (isNode(expr)) {
      expr.kind = kind;
      expr.children.unshift(l_token);
      expr.children.push(r_token);
      return expr;
    } else if (isToken(expr)) {
      return {
        kind,
        children: [l_token, expr, r_token],
      };
    }
  }

  private parse_infix(left: Token | Node, token: Token): Token | Node {
    // aka "led"

    // binops
    if (
      token.kind === TokenKind.SYM_PLUS ||
      token.kind === TokenKind.SYM_DASH ||
      token.kind === TokenKind.SYM_STAR ||
      token.kind === TokenKind.SYM_SLASH
    ) {
      const right = this.expr(token.precedence);
      return { kind: token.kind, children: [left, token, right] };
    }

    // function call
    if (token.kind === TokenKind.SYM_LPAREN) {
      let args: Node = { kind: TokenKind.AST_FUNCTION_ARGS, children: [] };

      if (!this.check(TokenKind.SYM_RPAREN)) {
        let more_arguments = true;
        // build the argument list here...
        while (more_arguments) {
          let arg_expr = this.expr();
          args.children.push(arg_expr);

          let [matches, token] = this.expect(TokenKind.SYM_COMMA);
          if (matches) {
            args.children.push(token);
          } else {
            more_arguments = false;
          }
        }
      }

      const [matches, r_token] = this.expect(TokenKind.SYM_RPAREN);
      console.log(matches);
      args = this.close_paren_block(
        args,
        matches ? args.kind : TokenKind.ERROR,
        token,
        r_token
      );
      return {
        kind: TokenKind.AST_FUNCTION_CALL,
        children: [left, args],
      };
    }
  }

  private expr(precendence: number = 0): Token | Node {
    const token = this.next();

    let left = this.parse_prefix(token);

    while (
      this.current &&
      (precendence < this.precedence() || // in an expression
        this.current.kind === TokenKind.SYM_LPAREN) // at a function call?
    ) {
      const token = this.next();
      left = this.parse_infix(left, token);
    }

    return left;
  }

  parse(tokens: Token[]) {
    this.tokens = tokens;
    this.position = 0;
    this.current = this.tokens[this.position];

    return this.expr();
  }
}
