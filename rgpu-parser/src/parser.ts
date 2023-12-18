import { TokenKind } from "./tokens";
import {
  AcceptData,
  AdvanceData,
  RemainingData,
  SyntaxNode,
  Token,
  TriviaData,
  trivia_types,
} from "./types";

export class RGPUParser {
  // token stream from lexer
  protected tokens: Token[] = [];
  protected current_position: number = -1; // always points to non-trivial token
  protected next_position: number = 0;

  protected skip_trivia(
    from: number,
    consuming: boolean,
    direction: -1 | 1 = 1
  ): TriviaData {
    const trivia: Token[] = [];
    let new_index = from;
    while (
      new_index > -1 &&
      new_index < this.tokens.length &&
      trivia_types.has(this.tokens[new_index].kind)
    ) {
      if (consuming && !this.tokens[new_index].seen) {
        trivia.push(this.tokens[new_index]);
        this.tokens[new_index].seen = true;
      }
      new_index += direction;
    }

    return {
      trivia,
      new_index,
    };
  }

  protected current_token(): Token | null {
    return this.tokens[this.current_position] || null;
  }

  protected next_token(): Token | null {
    return this.tokens[this.next_position] || null;
  }

  protected check(kind: TokenKind): boolean {
    const next = this.next_token();
    return next && next.kind === kind;
  }

  protected accept(
    kind: TokenKind,
    allows_trivia: boolean = false,
    error_kind: TokenKind = TokenKind.ERR_ERROR
  ): AcceptData {
    if (this.check(kind)) {
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
          kind: error_kind,
          text: "",
          leading_trivia: [],
          trailing_trivia: [],
        },
      };
    }
  }

  protected advance(): AdvanceData {
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

  protected advance_until(valid: Set<TokenKind>) {
    // For Error Recovery in the Token Stream
    // Advances the stream until the next token is in the valid set.

    const consumed: Token[] = [];

    while (this.next_token() && !valid.has(this.next_token().kind)) {
      let { trivia, current } = this.advance();
      consumed.push(...trivia);
      consumed.push(current);
    }

    return consumed;
  }

  protected retreat() {
    // updates current and next one step.
    // pushes the trivia between current and next onto the stack.
    this.next_position = this.current_position;

    const { new_index: current_index } = this.skip_trivia(
      this.next_position - 1,
      false,
      -1
    );

    this.current_position = current_index;
  }

  remaining(): RemainingData {
    const candidates = this.tokens.slice(this.current_position + 1);
    const remaining = { index: this.current_position + 1, tokens: [] };
    let idx = 0;

    while (idx < candidates.length && candidates[idx].seen) idx += 1;

    remaining.index += idx;
    remaining.tokens = candidates.slice(idx);

    return remaining;
  }

  reset(tokens: Token[]) {
    this.tokens = tokens;
    this.current_position = -1;
    this.next_position = 0;

    /**
     * NOTE(Nic): this is required so that we maintain the
     * invariant that the indices in current_position and next_position
     * always point at nontrivial tokens.
     */
    while (
      this.next_position < this.tokens.length &&
      trivia_types.has(this.tokens[this.next_position].kind)
    ) {
      this.next_position += 1;
    }
  }

  /**
   *
   * @param node
   * @returns
   */
  protected absorb_trailing_trivia(node: SyntaxNode): SyntaxNode {
    const { trivia: trailing_trivia } = this.skip_trivia(
      this.current_position + 1,
      true
    );
    node.trailing_trivia.push(...trailing_trivia);

    return node;
  }
}
