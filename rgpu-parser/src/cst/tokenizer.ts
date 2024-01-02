// [notes](https://github.com/rust-lang/rust-analyzer/blob/master/docs/dev/syntax.md)

import { TokenKind, tokenDefinitions } from "../tokens";
import { CharPosition, TemplateList, Token } from "../types";

type UnclosedCandidate = {
  source_position: number; // position in the source text
  start_position: number; // position in token stream
  depth: number; // nesting depth at position
};

export function serialize_tokens(tokens: Token[]): string {
  return tokens.map((t) => t.text).join("");
}

export class RPGUTokenizer {
  tokens: Token[] = [];
  position: CharPosition = { row: 0, col: 0, offset: 0 };
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
    this.position = { row: 0, col: 0, offset: 0 };
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

          const start: CharPosition = { ...this.position };

          const token: Token = {
            kind,
            text: match[0],
            start,
            end: {
              offset: start.offset + match[0].length,
              col: start.col + match[0].length,
              row: start.row,
            },
          };

          return token;
        }
      }
    }

    return null;
  }

  consume_token(token: Token) {
    this.index += token.text.length;

    this.position = {
      offset: this.index,

      col:
        token.kind !== TokenKind.LINEBREAK
          ? this.position.col + token.text.length
          : 0,

      row:
        token.kind !== TokenKind.LINEBREAK
          ? this.position.row
          : this.position.row + 1,
    };

    this.tokens.push(token);
  }

  tokenize_source(source: string): Token[] {
    this.start(source);

    let token: Token;
    let pending: UnclosedCandidate[] = [];
    let depth: number = 0;

    while ((token = this.next_token()) !== null) {
      if (
        token.kind === TokenKind.SYM_IDENTIFIER ||
        token.kind === TokenKind.KEYWORD_VAR
      ) {
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
            start: { ...token.start },
            end: {
              row: token.end.row,
              col: token.start.col + 1,
              offset: token.start.offset + 1,
            },
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
        TokenKind.SYM_TEMPLATE_LIST_START;
      this.tokens[template_list.end_position].kind =
        TokenKind.SYM_TEMPLATE_LIST_END;
    }

    return this.tokens;
  }
}
