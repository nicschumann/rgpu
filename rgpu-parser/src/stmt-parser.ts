import { RGPUExprParser } from "./expr-parser";
import { RGPUParser } from "./parser";
import { TokenKind } from "./tokens";
import { SyntaxNode, Token } from "./types";

const zero_arg_attribute_names: Set<string> = new Set([
  "const",
  "invariant",
  "must_use",
  "vertex",
  "fragment",
  "compute",
]);

const single_arg_attribute_names: Set<string> = new Set([
  "align",
  "binding",
  "builtin",
  "group",
  "id",
  "location",
  "size",
]);

const double_arg_attribute_names: Set<string> = new Set(["interpolate"]);

const triple_arg_attribute_names: Set<string> = new Set(["workgroup_size"]);

export class RGPUStmtParser extends RGPUParser {
  private expr_parser: RGPUExprParser;

  constructor(expr_parser: RGPUExprParser) {
    super();
    this.expr_parser = expr_parser;
  }

  private absorb_trailing_trivia(node: SyntaxNode): SyntaxNode {
    const { trivia: trailing_trivia } = this.skip_trivia(
      this.current_position + 1,
      true
    );
    node.trailing_trivia.push(...trailing_trivia);

    return node;
  }

  /**
   * NOTE(Nic): definitely refactor these expressions that
   * prepare the subparser state and then call a specific sub-parse
   * routine...
   */

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

  private attribute_args(
    attr: SyntaxNode,
    max_num_params: 1 | 2 | 3
  ): SyntaxNode {
    // try to match a paren...
    let { node: maybe_lparen_node } = this.accept(TokenKind.SYM_LPAREN, true);
    attr.children.push(maybe_lparen_node);

    let params_parsed = 0;
    let matched = true;

    while (
      matched &&
      params_parsed < max_num_params &&
      !this.check(TokenKind.SYM_RPAREN)
    ) {
      // try to parse an expression with the subparser
      const expr = this.expr();
      attr.children.push(expr);

      // now, accept either an R_PAREN, or a COMMA and an RPAREN
      let { matched: comma_matched, node: maybe_comma_node } = this.accept(
        TokenKind.SYM_COMMA,
        true
      );

      if (comma_matched) attr.children.push(maybe_comma_node);

      params_parsed += 1;
      matched = comma_matched;
    }

    let { node: maybe_rparen_node } = this.accept(TokenKind.SYM_RPAREN, true);
    attr.children.push(maybe_rparen_node);

    return attr;
  }

  maybe_typed_ident(): SyntaxNode {
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

  var_stmt(): SyntaxNode {
    // NOTE(Nic): [this](https://www.w3.org/TR/WGSL/#syntax-variable_or_value_statement)
    if (
      this.check(TokenKind.KEYWORD_CONST) ||
      this.check(TokenKind.KEYWORD_LET)
    ) {
      const { current, trivia } = this.advance();
      const decl: SyntaxNode = {
        kind: current.kind,
        children: [
          {
            kind: current.kind,
            text: current.text,
            leading_trivia: trivia,
            trailing_trivia: [],
          },
        ],
        leading_trivia: [],
        trailing_trivia: [],
      };

      const ident = this.maybe_typed_ident();
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

      const { matched, node } = this.accept(TokenKind.SYM_EQUAL, true);

      if (matched) {
        decl.children.push(node);
        const expr = this.expr();
        decl.children.push(expr);
      }

      return this.absorb_trailing_trivia(decl);

      // we need to parse a const or a let declaration
    } else {
      const decl = this.var_decl();
      if (!decl) return null;

      const { matched, node } = this.accept(TokenKind.SYM_EQUAL, true);

      if (matched) {
        decl.children.push(node);
        const expr = this.expr();
        decl.children.push(expr);
      }

      return this.absorb_trailing_trivia(decl);
    }
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
      TokenKind.KEYWORD_OVERRIDE,
      TokenKind.KEYWORD_CONST,
    ]);

    if (this.check(TokenKind.KEYWORD_VAR)) {
      const var_decl = this.var_decl();
      if (var_decl) {
        decl.children.push(var_decl);
      } else {
        decl.children.push({
          kind: TokenKind.ERR_ERROR,
          text: "",
          leading_trivia: [],
          trailing_trivia: [],
        });
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

      const ident = this.maybe_typed_ident();
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
    } else if (this.check(TokenKind.KEYWORD_CONST)) {
      if (decl.children.length) {
        // we parsed some attributes, but const should not have attributes.
        // mark them as errors.
        decl.children.forEach((child) => (child.kind = TokenKind.ERR_ERROR));
      }

      const { node } = this.accept(TokenKind.KEYWORD_CONST, true);
      decl.children.push(node);

      const ident = this.maybe_typed_ident();
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

    const ident = this.maybe_typed_ident();
    decl.children.push(ident);

    return this.absorb_trailing_trivia(decl);
  }

  attribute(): SyntaxNode {
    let { matched, node: at_node } = this.accept(TokenKind.SYM_AT, true);

    if (!matched) return null;

    let { current, trivia } = this.advance();

    let attr: SyntaxNode = {
      kind: TokenKind.AST_ATTRIBUTE,
      children: [
        at_node,
        {
          kind: current.kind,
          text: current.text,
          leading_trivia: trivia,
          trailing_trivia: [],
        },
      ],
      leading_trivia: [],
      trailing_trivia: [],
    };

    if (
      current.kind === TokenKind.KEYWORD_CONST ||
      (current.kind === TokenKind.SYM_IDENTIFIER &&
        zero_arg_attribute_names.has(current.text))
    ) {
      return this.absorb_trailing_trivia(attr);
    }

    if (
      current.kind === TokenKind.SYM_IDENTIFIER &&
      single_arg_attribute_names.has(current.text)
    ) {
      attr = this.attribute_args(attr, 1);
      return this.absorb_trailing_trivia(attr);
    }

    if (
      current.kind === TokenKind.KEYWORD_DIAGNOSTIC ||
      (current.kind === TokenKind.SYM_IDENTIFIER &&
        double_arg_attribute_names.has(current.text))
    ) {
      attr = this.attribute_args(attr, 2);
      return this.absorb_trailing_trivia(attr);
    }

    if (
      current.kind === TokenKind.SYM_IDENTIFIER &&
      triple_arg_attribute_names.has(current.text)
    ) {
      attr = this.attribute_args(attr, 3);
      return this.absorb_trailing_trivia(attr);
    }

    // if we got here, we didn't match a valid attribute term
    // return an error.
    attr.kind = TokenKind.ERR_ERROR;
    attr.children[1].kind = TokenKind.ERR_ERROR;
    return this.absorb_trailing_trivia(attr);
  }

  private attributes(
    decl: SyntaxNode,
    terminals: TokenKind[] = []
  ): SyntaxNode {
    let attribute: SyntaxNode = null;
    const terminal_set = new Set([TokenKind.SYM_AT, ...terminals]);

    while ((attribute = this.attribute()) !== null) {
      if (attribute.kind === TokenKind.ERR_ERROR) {
        const consumed = this.advance_until(terminal_set);

        attribute.children.push({
          kind: TokenKind.ERR_ERROR,
          text: "",
          leading_trivia: consumed,
          trailing_trivia: [],
        });
      }
      // parse 0 or more attributes
      decl.children.push(attribute);
    }

    return decl;
  }

  compound_stmt(): SyntaxNode {
    const compound_stmt: SyntaxNode = {
      kind: TokenKind.AST_COMPOUND_STATEMENT,
      children: [],
      leading_trivia: [],
      trailing_trivia: [],
    };

    // Handle Maybe Parsing an attribute...
    const attr = this.attribute();
    if (attr) compound_stmt.children.push(attr);

    var { current, trivia } = this.advance();

    /**
     * This should be the main loop
     */
    /**
     * NOTE(Nic):  this needs to be refactored into a loop that
     * tries to parse as many statements as possible
     */
    if (current && current.kind === TokenKind.SYM_LBRACE) {
      const stmt = this.single_stmt();
      const { node } = this.accept(TokenKind.SYM_RBRACE, true);

      compound_stmt.children.push(
        {
          kind: current.kind,
          text: current.text,
          leading_trivia: trivia,
          trailing_trivia: [],
        },
        stmt,
        node
      );
    } else {
      // TODO(Nic): record an error, and return...
    }

    return this.absorb_trailing_trivia(compound_stmt);
  }

  single_stmt(): SyntaxNode {
    const { current, trivia } = this.advance();

    const stmt: SyntaxNode = {
      kind: TokenKind.AST_COMPOUND_STATEMENT,
      children: [],
      leading_trivia: [],
      trailing_trivia: [],
    };

    // parse return statement
    if (current.kind === TokenKind.KEYWORD_RETURN) {
      const expr = this.expr();

      stmt.children.push({
        kind: current.kind,
        text: current.text,
        leading_trivia: trivia,
        trailing_trivia: [],
      });
      stmt.children.push(expr);

      let { node } = this.accept(TokenKind.SYM_SEMICOLON, true);
      stmt.children.push(node);

      return this.absorb_trailing_trivia(stmt);
    }

    // parse if statement
  }
}
