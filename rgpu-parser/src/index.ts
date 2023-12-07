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
  discovered_template_lists: TemplateList[] = [];
  pending: UnclosedCandidate[] = [];
  tokens: Token[] = [];
  nesting_depth: number = 0;

  tokenize(input: string) {
    let tokens: Token[] = [];
    let match: RegExpExecArray | null;

    const pattern = new RegExp(
      tokenDefinitions.map((a) => `(${a.re})`).join("|"),
      "y"
    );

    let index = 0;

    while ((match = pattern.exec(input))) {
      for (let i = 1; i < match.length; i += 1) {
        if (typeof match[i] !== "undefined") {
          const kind = tokenDefinitions[i - 1].type;
          const token = { kind, text: match[0] };

          tokens.push(token);
          break;
        }
      }
      index = match.index + match[0].length;
      pattern.lastIndex = index;
    }

    return tokens;
  }
}

export class RGPUParser {}
