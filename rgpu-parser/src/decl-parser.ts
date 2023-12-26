import { RGPUAttrParser } from "./attr-parser";
import { RGPUExprParser } from "./expr-parser";
import { RGPUParser } from "./parser";
import { RGPUStmtParser } from "./stmt-parser";
import { TokenKind } from "./tokens";
import { SyntaxNode } from "./types";

export class RGPUDeclParser extends RGPUParser {
  private expr_parser: RGPUExprParser;
  private attr_parser: RGPUAttrParser;
  private stmt_parser: RGPUStmtParser;

  constructor(
    expr_parser?: RGPUExprParser,
    attr_parser?: RGPUAttrParser,
    stmt_parser?: RGPUStmtParser
  ) {
    super();
    this.expr_parser = expr_parser || new RGPUExprParser();
    this.attr_parser = attr_parser || new RGPUAttrParser(this.expr_parser);
    this.stmt_parser =
      stmt_parser || new RGPUStmtParser(this.expr_parser, this.attr_parser);
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

  private compound_stmt(): SyntaxNode {
    const tokens = this.tokens.slice(this.current_position + 1);
    this.stmt_parser.reset(tokens);
    const expr = this.stmt_parser.compound_stmt();
    const { tokens: remaining_tokens } = this.stmt_parser.remaining();
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
      decl = this.node(TokenKind.AST_TYPED_IDENTIFIER, [decl, colon_node]);

      const template_ident = this.template_ident();

      if (template_ident) decl.children.push(template_ident);
      else decl.children.push(this.leaf(TokenKind.ERR_ERROR));
    }

    return this.absorb_trailing_trivia(decl);
  }

  const_assert(decl?: SyntaxNode): SyntaxNode {
    // NOTE(Nic): [this](https://www.w3.org/TR/WGSL/#syntax-const_assert_statement)

    const { matched: ca_matched, node: ca_node } = this.accept(
      TokenKind.KEYWORD_CONST_ASSERT,
      true
    );
    if (!ca_matched) return null;

    if (typeof decl === "undefined") {
      decl = this.node(TokenKind.AST_CONST_ASSERT, [ca_node]);
    } else {
      decl.kind = TokenKind.AST_CONST_ASSERT;
      decl.children.push(ca_node);
    }

    const expr = this.expr();
    decl.children.push(expr);

    return this.absorb_trailing_trivia(decl);
  }

  struct_decl(decl?: SyntaxNode): SyntaxNode {
    // NOTE(Nic): [this](https://www.w3.org/TR/WGSL/#syntax-struct_decl)

    const { matched: struct_matched, node: struct_node } = this.accept(
      TokenKind.KEYWORD_STRUCT,
      true
    );
    if (!struct_matched) return null;

    if (typeof decl === "undefined") {
      decl = this.node(TokenKind.AST_STRUCT_DECLARATION, [struct_node]);
    } else {
      decl.kind = TokenKind.AST_STRUCT_DECLARATION;
      decl.children.push(struct_node);
    }

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
        let struct_member: SyntaxNode = this.node(TokenKind.AST_STRUCT_MEMBER);

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

  type_alias_decl(decl?: SyntaxNode): SyntaxNode {
    // NOTE(Nic): [this](https://www.w3.org/TR/WGSL/#syntax-type_alias_decl)

    const { matched: alias_matched, node: alias_node } = this.accept(
      TokenKind.KEYWORD_ALIAS,
      true
    );
    if (!alias_matched) return null;

    if (typeof decl === "undefined") {
      decl = this.node(TokenKind.AST_ALIAS_DECLARATION, [alias_node]);
    } else {
      decl.kind = TokenKind.AST_ALIAS_DECLARATION;
      decl.children.push(alias_node);
    }

    const { node: ident_node } = this.accept(TokenKind.SYM_IDENTIFIER, true);
    decl.children.push(ident_node);

    const { node: equals_node } = this.accept(TokenKind.SYM_EQUAL, true);
    decl.children.push(equals_node);

    const type = this.template_ident();
    if (type) decl.children.push(type);
    else decl.children.push(this.leaf(TokenKind.ERR_ERROR));

    return this.absorb_trailing_trivia(decl);
  }

  var_decl(): SyntaxNode {
    // NOTE(Nic): [this](https://www.w3.org/TR/WGSL/#syntax-variable_decl)
    let { matched, node } = this.accept(TokenKind.KEYWORD_VAR, true);

    if (!matched) return null;

    const decl: SyntaxNode = this.node(TokenKind.AST_VAR_DECLARATION, [node]);

    let var_template = this.template();
    if (var_template) decl.children.push(var_template);

    const ident = this.optionally_typed_ident();
    decl.children.push(ident);

    return this.absorb_trailing_trivia(decl);
  }

  global_var_decl(decl?: SyntaxNode): SyntaxNode {
    // NOTE(Nic): [this](https://www.w3.org/TR/WGSL/#syntax-global_variable_decl)'
    // NOTE(Nic): [this](https://www.w3.org/TR/WGSL/#syntax-global_value_decl)
    if (typeof decl === "undefined") {
      // if we are not passed a decl, we assume it needs attributes parsed.
      decl = this.node(TokenKind.AST_GLOBAL_VAR_DECLARATION);

      // handle global var declaration and override declaration
      decl = this.attributes(decl, [
        TokenKind.KEYWORD_VAR,
        TokenKind.KEYWORD_LET,
        TokenKind.KEYWORD_OVERRIDE,
        TokenKind.KEYWORD_CONST,
      ]);
    } else {
      // else we just label it and assume attributes are parsed.
      decl.kind = TokenKind.AST_GLOBAL_VAR_DECLARATION;
    }

    /**
     * NOTE(Nic): I am diverging from the spec here to make the parsing
     * a bit more robust. keyword_const does not accept attributes infront
     * of it, but I will parse them anyway, and then mark those nodes as errors
     * if they are present.
     */

    if (this.check(TokenKind.KEYWORD_VAR)) {
      const var_decl = this.var_decl();

      if (var_decl) {
        decl.children.push(...var_decl.children);
      } else {
        // two errors, one for the missing var,
        // one for the missing ident node
        decl.children.push(
          this.leaf(TokenKind.ERR_ERROR),
          this.leaf(TokenKind.ERR_ERROR)
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
      if (ident) decl.children.push(ident);
      else decl.children.push(this.leaf(TokenKind.ERR_ERROR));

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
      if (ident) decl.children.push(ident);
      else decl.children.push(this.leaf(TokenKind.ERR_ERROR));

      const { node: equal_node } = this.accept(TokenKind.SYM_EQUAL, true);
      decl.children.push(equal_node);

      const expr = this.expr();
      decl.children.push(expr);
    } else {
      // error case...
      decl.children.push(this.leaf(TokenKind.ERR_ERROR));
    }

    return this.absorb_trailing_trivia(decl);
  }

  private param(): SyntaxNode {
    let param: SyntaxNode = {
      kind: TokenKind.AST_FUNCTION_PARAMETER,
      children: [],
      leading_trivia: [],
      trailing_trivia: [],
    };

    param = this.attributes(param, [TokenKind.SYM_IDENTIFIER]);
    param.children.push(this.optionally_typed_ident());

    return param;
  }

  global_function_decl(decl?: SyntaxNode): SyntaxNode {
    if (typeof decl === "undefined") {
      decl = this.node(TokenKind.AST_FUNCTION_DECLARATION);

      // handle leading attributes on function decl
      decl = this.attributes(decl, [TokenKind.KEYWORD_FN]);
    } else {
      decl.kind = TokenKind.AST_FUNCTION_DECLARATION;
    }

    if (this.check(TokenKind.KEYWORD_FN)) {
      const { node: fn_node } = this.accept(TokenKind.KEYWORD_FN, true);
      decl.children.push(fn_node);

      const { node: ident_node } = this.accept(TokenKind.SYM_IDENTIFIER, true);
      decl.children.push(ident_node);

      const { node: lparen_node } = this.accept(TokenKind.SYM_LPAREN, true);
      decl.children.push(lparen_node);

      const params: SyntaxNode = this.node(TokenKind.AST_FUNCTION_PARAMETERS);

      let matched = true;
      while (matched && !this.check(TokenKind.SYM_RPAREN)) {
        // try to parse an expression with the subparser
        params.children.push(this.param());

        // now, accept either an R_PAREN, or a COMMA and an RPAREN
        let { matched: comma_matched, node: maybe_comma_node } = this.accept(
          TokenKind.SYM_COMMA,
          true
        );

        if (comma_matched) params.children.push(maybe_comma_node);

        matched = comma_matched;
      }

      const { node: rparen_node } = this.accept(TokenKind.SYM_RPAREN, true);
      decl.children.push(params, rparen_node);

      if (this.check(TokenKind.SYM_DASH_GREATER)) {
        // parse a return tupe
        const { node: arrow_node } = this.accept(
          TokenKind.SYM_DASH_GREATER,
          true
        );
        decl.children.push(arrow_node);

        let ret_type: SyntaxNode = this.node(
          TokenKind.AST_FUNCTION_RETURN_TYPE
        );

        ret_type = this.attributes(ret_type, [TokenKind.SYM_IDENTIFIER]);
        ret_type.children.push(this.template_ident());
        decl.children.push(ret_type);
      }

      decl.children.push(this.compound_stmt());

      return this.absorb_trailing_trivia(decl);
    }
  }

  global_decl(): SyntaxNode {
    let decl: SyntaxNode = {
      kind: TokenKind.AST_GLOBAL_DECLARATION,
      children: [],
      leading_trivia: [],
      trailing_trivia: [],
    };

    decl = this.attributes(decl, [
      TokenKind.SYM_SEMICOLON,
      TokenKind.KEYWORD_VAR,
      TokenKind.KEYWORD_CONST,
      // TokenKind.KEYWORD_LET,
      TokenKind.KEYWORD_OVERRIDE,
      TokenKind.KEYWORD_FN,
      TokenKind.KEYWORD_STRUCT,
      TokenKind.KEYWORD_ALIAS,
      TokenKind.KEYWORD_CONST_ASSERT,
    ]);

    if (this.check(TokenKind.SYM_SEMICOLON)) {
      const { node } = this.accept(TokenKind.SYM_SEMICOLON, true);
      decl.children.push(node);
      return this.absorb_trailing_trivia(decl);
    }

    if (
      this.check(TokenKind.KEYWORD_VAR) ||
      this.check(TokenKind.KEYWORD_CONST) ||
      this.check(TokenKind.KEYWORD_OVERRIDE)
    ) {
      decl = this.global_var_decl(decl);
      const { node } = this.accept(TokenKind.SYM_SEMICOLON, true);
      decl.children.push(node);
      return this.absorb_trailing_trivia(decl);
    }

    if (this.check(TokenKind.KEYWORD_STRUCT)) {
      decl = this.struct_decl(decl);
      return this.absorb_trailing_trivia(decl);
    }

    if (this.check(TokenKind.KEYWORD_ALIAS)) {
      decl = this.type_alias_decl(decl);
      const { node } = this.accept(TokenKind.SYM_SEMICOLON, true);
      decl.children.push(node);
      return this.absorb_trailing_trivia(decl);
    }

    if (this.check(TokenKind.KEYWORD_FN)) {
      decl = this.global_function_decl(decl);
      return this.absorb_trailing_trivia(decl);
    }

    if (this.check(TokenKind.KEYWORD_CONST_ASSERT)) {
      decl = this.const_assert(decl);
      const { node } = this.accept(TokenKind.SYM_SEMICOLON, true);
      decl.children.push(node);
      return this.absorb_trailing_trivia(decl);
    }

    // error.
    decl.kind = TokenKind.ERR_ERROR;
    return this.absorb_trailing_trivia(decl);
  }

  translation_unit(): SyntaxNode {
    // while there's still stuff to parse
    const decls: SyntaxNode[] = [];

    while (this.next_token()) {
      const decl = this.global_decl();

      if (decl.kind === TokenKind.ERR_ERROR) {
        // advance until we find a valid token for a decl.
        // NOTE(Nic): we should do something similar in the compound_statement parser
        const tokens = this.advance_until(
          new Set([
            TokenKind.SYM_SEMICOLON,
            TokenKind.KEYWORD_VAR,
            TokenKind.KEYWORD_CONST,
            TokenKind.KEYWORD_LET,
            TokenKind.KEYWORD_OVERRIDE,
            TokenKind.KEYWORD_FN,
            TokenKind.KEYWORD_STRUCT,
            TokenKind.KEYWORD_ALIAS,
            TokenKind.KEYWORD_CONST_ASSERT,
            TokenKind.SYM_AT,
          ])
        );

        decl.children.push({
          kind: TokenKind.ERR_ERROR,
          children: tokens.map((t) => ({
            kind: t.kind,
            text: t.text,
            leading_trivia: [],
            trailing_trivia: [],
          })),
          leading_trivia: [],
          trailing_trivia: [],
        });
      }

      decls.push(decl);
    }

    return {
      kind: TokenKind.AST_TRANSLATION_UNIT,
      children: decls,
      leading_trivia: [],
      trailing_trivia: [],
    };
  }
}
