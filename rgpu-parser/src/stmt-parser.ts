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

        const typed_ident = this.maybe_typed_ident();
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
    let compound_stmt: SyntaxNode = {
      kind: TokenKind.AST_COMPOUND_STATEMENT,
      children: [],
      leading_trivia: [],
      trailing_trivia: [],
    };

    // Try and parse attributes
    compound_stmt = this.attributes(compound_stmt, [TokenKind.SYM_RBRACE]);

    // accept an lbrace
    const { matched, node: lbrace_node } = this.accept(
      TokenKind.SYM_LBRACE,
      true
    );
    compound_stmt.children.push(lbrace_node);

    // parse 0 or more single statements
    if (matched) {
      let stmt = this.single_stmt();
      while (stmt) {
        compound_stmt.children.push(stmt);
        stmt = this.single_stmt();
      }
    }

    // accept an rbrace
    const { node: rbrace_node } = this.accept(TokenKind.SYM_RBRACE, true);
    compound_stmt.children.push(rbrace_node);

    return this.absorb_trailing_trivia(compound_stmt);
  }

  single_stmt(): SyntaxNode {
    let stmt: SyntaxNode = {
      kind: TokenKind.AST_STATEMENT,
      children: [],
      leading_trivia: [],
      trailing_trivia: [],
    };

    // parse leading attributes EVERYWHERE, and mark them as errors at the AST level,
    // rather than the CST level, if they don't belong with a specific statement type
    stmt = this.attributes(stmt, [
      TokenKind.KEYWORD_RETURN,
      TokenKind.KEYWORD_IF,
      TokenKind.KEYWORD_SWITCH,
      TokenKind.KEYWORD_LOOP,
      TokenKind.KEYWORD_FOR,
      TokenKind.KEYWORD_WHILE,
      TokenKind.KEYWORD_VAR,
      TokenKind.KEYWORD_CONST,
      TokenKind.KEYWORD_LET,
      TokenKind.KEYWORD_BREAK,
      TokenKind.KEYWORD_CONTINUE,
      TokenKind.SYM_LPAREN,
      TokenKind.SYM_LBRACE,
      TokenKind.SYM_AMP,
      TokenKind.SYM_STAR,
      TokenKind.KEYWORD_DISCARD,
      TokenKind.KEYWORD_CONST_ASSERT,
      TokenKind.SYM_IDENTIFIER, // for function calls.
    ]);

    // parse return statement
    if (this.check(TokenKind.KEYWORD_RETURN)) {
      stmt.kind = TokenKind.AST_RETURN_STATMENT;

      const { node: ret_node } = this.accept(TokenKind.KEYWORD_RETURN, true);
      stmt.children.push(ret_node);

      const expr = this.expr();
      stmt.children.push(expr);

      const { node: semicolon_node } = this.accept(
        TokenKind.SYM_SEMICOLON,
        true
      );
      stmt.children.push(semicolon_node);

      return this.absorb_trailing_trivia(stmt);
    }

    // parse if statement
    if (this.check(TokenKind.KEYWORD_IF)) {
      // [this](https://www.w3.org/TR/WGSL/#syntax-if_statement)
      stmt.kind = TokenKind.AST_CONDITIONAL_STATEMENT;

      const { node: if_node } = this.accept(TokenKind.KEYWORD_IF, true);
      const if_branch: SyntaxNode = {
        kind: TokenKind.AST_IF_BRANCH,
        children: [if_node, this.expr(), this.compound_stmt()],
        leading_trivia: [],
        trailing_trivia: [],
      };

      stmt.children.push(if_branch);

      while (this.check(TokenKind.KEYWORD_ELSE)) {
        const { node: else_node } = this.accept(TokenKind.KEYWORD_ELSE, true);
        const { matched: if_matched, node: if_node } = this.accept(
          TokenKind.KEYWORD_IF,
          true
        );

        if (if_matched) {
          // handle an else if condition...
          const else_if_branch: SyntaxNode = {
            kind: TokenKind.AST_ELSE_IF_BRANCH,
            children: [else_node, if_node, this.expr(), this.compound_stmt()],
            leading_trivia: [],
            trailing_trivia: [],
          };
          stmt.children.push(else_if_branch);
        } else {
          // handle a pure else condition
          const else_branch: SyntaxNode = {
            kind: TokenKind.AST_ELSE_BRANCH,
            children: [else_node, this.compound_stmt()],
            leading_trivia: [],
            trailing_trivia: [],
          };

          stmt.children.push(else_branch);
        }
      }

      return this.absorb_trailing_trivia(stmt);
    }

    if (this.check(TokenKind.KEYWORD_SWITCH)) {
      // [this](https://www.w3.org/TR/WGSL/#syntax-switch_statement)

      stmt.kind = TokenKind.AST_SWITCH_STATEMENT;

      const { node: switch_node } = this.accept(TokenKind.KEYWORD_SWITCH, true);

      stmt.children.push(switch_node, this.expr());
      stmt = this.attributes(stmt, [TokenKind.SYM_LBRACE]);

      const { node: lbrace_node } = this.accept(TokenKind.SYM_LBRACE, true);
      stmt.children.push(lbrace_node);

      while (
        this.check(TokenKind.KEYWORD_CASE) ||
        this.check(TokenKind.KEYWORD_DEFAULT)
      ) {
        if (this.check(TokenKind.KEYWORD_CASE)) {
          const { node: case_node } = this.accept(TokenKind.KEYWORD_CASE, true);

          let case_statement: SyntaxNode = {
            kind: TokenKind.AST_SWITCH_DEFAULT,
            children: [case_node],
            leading_trivia: [],
            trailing_trivia: [],
          };

          let case_condition: SyntaxNode = {
            kind: TokenKind.AST_SWITCH_CASE_CONDITION,
            children: [],
            leading_trivia: [],
            trailing_trivia: [],
          };

          // maybe parse first clause
          let { matched: def_matched, node: def_node } = this.accept(
            TokenKind.KEYWORD_DEFAULT,
            true
          );
          if (def_matched) case_condition.children.push(def_node);
          else case_condition.children.push(this.expr());

          while (this.check(TokenKind.SYM_COMMA)) {
            let { node: com_node } = this.accept(TokenKind.SYM_COMMA, true);
            case_condition.children.push(com_node);

            if (
              this.check(TokenKind.SYM_COLON) ||
              this.check(TokenKind.SYM_AT) ||
              this.check(TokenKind.SYM_LBRACE)
            )
              break;

            const { matched: def_matched, node: def_node } = this.accept(
              TokenKind.KEYWORD_DEFAULT,
              true
            );
            if (def_matched) case_condition.children.push(def_node);
            else case_condition.children.push(this.expr());
          }

          case_statement.children.push(case_condition);

          const { matched: colon_matched, node: colon_node } = this.accept(
            TokenKind.SYM_COLON,
            true
          );
          if (colon_matched) case_statement.children.push(colon_node);

          case_statement.children.push(this.compound_stmt());
          stmt.children.push(case_statement);
        } else {
          // must be default.
          const { node: def_node } = this.accept(
            TokenKind.KEYWORD_DEFAULT,
            true
          );
          const { matched: colon_matched, node: colon_node } = this.accept(
            TokenKind.SYM_COLON,
            true
          );

          let default_stmt: SyntaxNode = {
            kind: TokenKind.AST_SWITCH_DEFAULT,
            children: [def_node],
            leading_trivia: [],
            trailing_trivia: [],
          };

          if (colon_matched) default_stmt.children.push(colon_node);

          default_stmt.children.push(this.compound_stmt());
          stmt.children.push(default_stmt);
        }
      }

      const { node: rbrace_node } = this.accept(TokenKind.SYM_RBRACE, true);
      stmt.children.push(rbrace_node);

      return this.absorb_trailing_trivia(stmt);
    }

    if (this.check(TokenKind.KEYWORD_LOOP)) {
      // [here](https://www.w3.org/TR/WGSL/#syntax-loop_statement)
      stmt.kind = TokenKind.AST_LOOP_STATEMENT;

      const { node: loop_node } = this.accept(TokenKind.KEYWORD_LOOP, true);
      stmt.children.push(loop_node);

      stmt = this.attributes(stmt, [TokenKind.SYM_RBRACE]);
      stmt.children.push(this.compound_stmt());

      return this.absorb_trailing_trivia(stmt);
    }

    if (this.check(TokenKind.KEYWORD_CONTINUING)) {
      // [here](https://www.w3.org/TR/WGSL/#syntax-continuing_statement)
      stmt.kind = TokenKind.AST_CONTINUING_STATMENT;
      const { node: cont_node } = this.accept(
        TokenKind.KEYWORD_CONTINUING,
        true
      );
      stmt.children.push(cont_node);
      stmt.children.push(this.compound_stmt());

      return this.absorb_trailing_trivia(stmt);
    }

    if (this.check(TokenKind.KEYWORD_CONTINUING)) {
      // [here](https://www.w3.org/TR/WGSL/#syntax-continuing_statement)
      stmt.kind = TokenKind.AST_CONTINUING_STATMENT;
      const { node: ct_node } = this.accept(TokenKind.KEYWORD_CONTINUING, true);
      stmt.children.push(ct_node);
      stmt.children.push(this.compound_stmt());

      return this.absorb_trailing_trivia(stmt);
    }

    if (this.check(TokenKind.KEYWORD_BREAK)) {
      // [this](https://www.w3.org/TR/WGSL/#syntax-break_if_statement)
      // also beak statement

      const { node: brk_node } = this.accept(TokenKind.KEYWORD_BREAK, true);
      stmt.children.push(brk_node);

      const { matched: if_matched, node: if_node } = this.accept(
        TokenKind.KEYWORD_IF,
        true
      );
      if (if_matched) {
        // break if stmt
        stmt.children.push(if_node);
        stmt.kind = TokenKind.AST_BREAK_IF_STATEMENT;
        stmt.children.push(this.expr());
      } else {
        // break stmt
        stmt.kind = TokenKind.AST_BREAK_STATEMENT;
      }

      const { node: sc_node } = this.accept(TokenKind.SYM_SEMICOLON, true);
      stmt.children.push(sc_node);

      return this.absorb_trailing_trivia(stmt);
    }

    if (this.check(TokenKind.KEYWORD_CONTINUE)) {
      // [this](https://www.w3.org/TR/WGSL/#syntax-break_if_statement)
      // also beak statement
      stmt.kind = TokenKind.AST_CONTINUE_STATEMENT;

      const { node: cont_node } = this.accept(TokenKind.KEYWORD_CONTINUE, true);
      stmt.children.push(cont_node);

      const { node: sc_node } = this.accept(TokenKind.SYM_SEMICOLON, true);
      stmt.children.push(sc_node);

      return this.absorb_trailing_trivia(stmt);
    }

    if (this.check(TokenKind.KEYWORD_DISCARD)) {
      // [this](https://www.w3.org/TR/WGSL/#syntax-statement) notated inline...

      stmt.kind = TokenKind.AST_DISCARD_STATEMENT;

      const { node: cont_node } = this.accept(TokenKind.KEYWORD_DISCARD, true);
      stmt.children.push(cont_node);

      const { node: sc_node } = this.accept(TokenKind.SYM_SEMICOLON, true);
      stmt.children.push(sc_node);

      return this.absorb_trailing_trivia(stmt);
    }

    if (
      this.check(TokenKind.KEYWORD_VAR) ||
      this.check(TokenKind.KEYWORD_CONST) ||
      this.check(TokenKind.KEYWORD_LET)
    ) {
      // [this](https://www.w3.org/TR/WGSL/#syntax-variable_or_value_statement)

      stmt.kind = TokenKind.AST_DECLARATION_STATEMENT;
      // NOTE(Nic): there are certain cases where global var decl is not what we want,
      // but in our case, more permissive is good.
      stmt.children.push(this.global_var_decl());

      const { node: sc_node } = this.accept(TokenKind.SYM_SEMICOLON, true);
      stmt.children.push(sc_node);

      return this.absorb_trailing_trivia(stmt);
    }

    return null;
  }
}
