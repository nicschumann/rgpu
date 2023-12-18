import { RGPUAttrParser } from "./attr-parser";
import { RGPUExprParser } from "./expr-parser";
import { RGPUParser } from "./parser";
import { TokenKind } from "./tokens";
import { SyntaxNode } from "./types";

export class RGPUDeclParser extends RGPUParser {
  private expr_parser: RGPUExprParser;
  private attr_parser: RGPUAttrParser;

  constructor(expr_parser: RGPUExprParser, attr_parser: RGPUAttrParser) {
    super();
    this.expr_parser = expr_parser;
    this.attr_parser = attr_parser;
  }

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

  private attributes(
    decl: SyntaxNode,
    terminals: TokenKind[] = []
  ): SyntaxNode {
    const tokens = this.tokens.slice(this.current_position + 1);
    this.attr_parser.reset(tokens);
    const expr = this.attr_parser.attributes(decl, terminals);
    const { tokens: remaining_tokens } = this.attr_parser.remaining();
    this.reset(remaining_tokens);

    return expr;
  }

  optionally_typed_ident(): SyntaxNode {
    // [here](https://www.w3.org/TR/WGSL/#syntax-optionally_typed_ident)

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

  const_assert(): SyntaxNode {
    // NOTE(Nic): [this](https://www.w3.org/TR/WGSL/#syntax-const_assert_statement)

    const { matched: ca_matched, node: ca_node } = this.accept(
      TokenKind.KEYWORD_CONST_ASSERT,
      true
    );
    if (!ca_matched) return null;

    const decl: SyntaxNode = {
      kind: TokenKind.AST_CONST_ASSERT,
      children: [ca_node],
      leading_trivia: [],
      trailing_trivia: [],
    };

    const expr = this.expr();
    decl.children.push(expr);

    return this.absorb_trailing_trivia(decl);
  }

  struct_decl(): SyntaxNode {
    // NOTE(Nic): [this](https://www.w3.org/TR/WGSL/#syntax-struct_decl)

    const { matched: struct_matched, node: struct_node } = this.accept(
      TokenKind.KEYWORD_STRUCT,
      true
    );
    if (!struct_matched) return null;

    const decl: SyntaxNode = {
      kind: TokenKind.AST_STRUCT_DECLRATAION,
      children: [struct_node],
      leading_trivia: [],
      trailing_trivia: [],
    };

    const { node: ident_node } = this.accept(TokenKind.SYM_IDENTIFIER, true);
    decl.children.push(ident_node);

    const { matched: lparen_matched, node: lparen_node } = this.accept(
      TokenKind.SYM_LBRACE,
      true
    );
    decl.children.push(lparen_node);

    if (lparen_matched) {
      while (
        this.check(TokenKind.SYM_AT) ||
        this.check(TokenKind.SYM_IDENTIFIER) ||
        this.check(TokenKind.SYM_COMMA)
      ) {
        // try and parse a member identifier...
        let struct_member: SyntaxNode = {
          kind: TokenKind.AST_STRUCT_MEMBER,
          children: [],
          leading_trivia: [],
          trailing_trivia: [],
        };

        struct_member = this.attributes(struct_member, [
          TokenKind.SYM_IDENTIFIER,
        ]);

        const typed_ident = this.optionally_typed_ident();
        struct_member.children.push(typed_ident);
        decl.children.push(struct_member);

        const { matched: comma_matched, node: comma_node } = this.accept(
          TokenKind.SYM_COMMA,
          true
        );

        if (!comma_matched && this.check(TokenKind.SYM_RBRACE)) break;
        decl.children.push(comma_node);
      }
    }

    const { node: rparen_node } = this.accept(TokenKind.SYM_RBRACE, true);
    decl.children.push(rparen_node);

    return this.absorb_trailing_trivia(decl);
  }

  type_alias_decl(): SyntaxNode {
    // NOTE(Nic): [this](https://www.w3.org/TR/WGSL/#syntax-type_alias_decl)

    const { matched: alias_matched, node: alias_node } = this.accept(
      TokenKind.KEYWORD_ALIAS,
      true
    );
    if (!alias_matched) return null;

    const decl: SyntaxNode = {
      kind: TokenKind.AST_ALIAS_DECLARATION,
      children: [alias_node],
      leading_trivia: [],
      trailing_trivia: [],
    };

    const { node: ident_node } = this.accept(TokenKind.SYM_IDENTIFIER, true);
    decl.children.push(ident_node);

    const { node: equals_node } = this.accept(TokenKind.SYM_EQUAL, true);
    decl.children.push(equals_node);

    const type = this.template_ident();
    if (type) decl.children.push(type);
    else
      decl.children.push({
        kind: TokenKind.ERR_ERROR,
        text: "",
        leading_trivia: [],
        trailing_trivia: [],
      });

    return this.absorb_trailing_trivia(decl);
  }

  var_decl(): SyntaxNode {
    // NOTE(Nic): [this](https://www.w3.org/TR/WGSL/#syntax-variable_decl)
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

    const ident = this.optionally_typed_ident();
    decl.children.push(ident);

    return this.absorb_trailing_trivia(decl);
  }

  global_var_decl(): SyntaxNode {
    // NOTE(Nic): [this](https://www.w3.org/TR/WGSL/#syntax-global_variable_decl)'
    // NOTE(Nic): [this](https://www.w3.org/TR/WGSL/#syntax-global_value_decl)

    let decl: SyntaxNode = {
      kind: TokenKind.AST_GLOBAL_VAR_DECLARATION,
      children: [],
      leading_trivia: [],
      trailing_trivia: [],
    };

    /**
     * NOTE(Nic): I am diverging from the spec here to make the parsing
     * a bit more robust. keyword_const does not accept attributes infront
     * of it, but I will parse them anyway, and then mark those nodes as errors
     * if they are present.
     */

    // handle global var declaration and override declaration
    decl = this.attributes(decl, [
      TokenKind.KEYWORD_VAR,
      TokenKind.KEYWORD_LET,
      TokenKind.KEYWORD_OVERRIDE,
      TokenKind.KEYWORD_CONST,
    ]);

    if (this.check(TokenKind.KEYWORD_VAR)) {
      const var_decl = this.var_decl();

      if (var_decl) {
        decl.children.push(...var_decl.children);
      } else {
        // two errors, one for the missing var,
        // one for the missing ident node
        decl.children.push(
          {
            kind: TokenKind.ERR_ERROR,
            text: "",
            leading_trivia: [],
            trailing_trivia: [],
          },
          {
            kind: TokenKind.ERR_ERROR,
            text: "",
            leading_trivia: [],
            trailing_trivia: [],
          }
        );
      }

      const { matched, node } = this.accept(TokenKind.SYM_EQUAL, true);

      if (matched) {
        decl.children.push(node);
        const expr = this.expr();
        decl.children.push(expr);
      }
    } else if (this.check(TokenKind.KEYWORD_OVERRIDE)) {
      const { node } = this.accept(TokenKind.KEYWORD_OVERRIDE, true);
      decl.children.push(node);

      const ident = this.optionally_typed_ident();
      if (ident) {
        decl.children.push(ident);
      } else {
        decl.children.push({
          kind: TokenKind.ERR_ERROR,
          text: "",
          leading_trivia: [],
          trailing_trivia: [],
        });
      }

      const { matched, node: equal_node } = this.accept(
        TokenKind.SYM_EQUAL,
        true
      );

      if (matched) {
        decl.children.push(equal_node);
        const expr = this.expr();
        decl.children.push(expr);
      }

      return this.absorb_trailing_trivia(decl);
    } else if (
      this.check(TokenKind.KEYWORD_CONST) ||
      this.check(TokenKind.KEYWORD_LET)
    ) {
      if (decl.children.length) {
        // we parsed some attributes, but const should not have attributes.
        // mark them as errors.
        decl.children.forEach((child) => (child.kind = TokenKind.ERR_ERROR));
      }

      if (this.check(TokenKind.KEYWORD_CONST)) {
        const { node } = this.accept(TokenKind.KEYWORD_CONST, true);
        decl.children.push(node);
      } else {
        const { node } = this.accept(TokenKind.KEYWORD_LET, true);
        decl.children.push(node);
      }

      const ident = this.optionally_typed_ident();
      if (ident) {
        decl.children.push(ident);
      } else {
        decl.children.push({
          kind: TokenKind.ERR_ERROR,
          text: "",
          leading_trivia: [],
          trailing_trivia: [],
        });
      }

      const { node: equal_node } = this.accept(TokenKind.SYM_EQUAL, true);
      decl.children.push(equal_node);

      const expr = this.expr();
      decl.children.push(expr);
    } else {
      // error case...
      decl.children.push({
        kind: TokenKind.ERR_ERROR,
        text: "",
        leading_trivia: [],
        trailing_trivia: [],
      });
    }

    return this.absorb_trailing_trivia(decl);
  }
}
