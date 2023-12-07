// [notes](https://github.com/rust-lang/rust-analyzer/blob/master/docs/dev/syntax.md)

import { TokenKind, tokenDefinitions } from "./tokens";

enum SyntaxKind {}

type Token = {
  kind: TokenKind;
  text: string;
};

type Node = {
  kind: SyntaxKind;
  text_len: number;
  children: Node | Token;
};

type UnclosedCandidate = {
  position: number; // position in the source text
  depth: number; // nesting depth at position
};

type TemplateList = {
  start_position: number; // position of the '<' code point that starts the template list
  end_position: number; // position of the '<' code point that starts the template list
};

export class RPGUTokenizer {
  tokens: Token[] = [];
  source: string | null = null;
  pattern: RegExp | null = null;
  index: number = 0;

  start(source: string) {
    this.tokens = [];
    this.source = source;
    this.index = 0;
    this.pattern = new RegExp(
      tokenDefinitions.map((a) => `(${a.re})`).join("|"),
      "yu"
    );
  }

  next(): Token | null {
    if (this.source === null || this.pattern === null) {
      return null;
    }

    this.pattern.lastIndex = this.index;

    const match = this.pattern.exec(this.source);

    if (match) {
      for (let i = 1; i < match.length; i += 1) {
        if (typeof match[i] !== "undefined") {
          const kind = tokenDefinitions[i - 1].type;
          const token = { kind, text: match[0] };

          this.index = match.index + match[0].length;
          this.tokens.push(token);

          return token;
        }
      }
    }

    return null;
  }

  tokenize(source: string) {
    this.start(source);

    while (this.next() !== null) {
      continue;
    }

    return this.tokens;
  }
}

export class RGPUParser {}
