import { RGPUAttrParser } from "./attr-parser";
import { RGPUExprParser } from "./expr-parser";
import { RGPUParser } from "./parser";
import { TokenKind } from "./tokens";
import {
  Syntax,
  SyntaxNode,
  assignment_op_types,
  assignment_or_expr_tokens,
  local_declaration_tokens,
} from "./types";

export class RGPUStmtParser extends RGPUParser {
  private expr_parser: RGPUExprParser;
  private attr_parser: RGPUAttrParser;

  constructor(expr_parser: RGPUExprParser, attr_parser: RGPUAttrParser) {
    super();
    this.expr_parser = expr_parser;
    this.attr_parser = attr_parser;
  }

  /**
   * NOTE(Nic): definitely refactor these expressions that
   * prepare the subparser state and then call a specific sub-parse
   * routine...
   */

  private expr(): Syntax {
    const tokens = this.tokens.slice(this.current_position + 1);
    this.expr_parser.reset(tokens);
    const expr = this.expr_parser.expr();
    const { tokens: remaining_tokens } = this.expr_parser.remaining();
    this.reset(remaining_tokens);

    return expr;
  }

  private template_ident(): Syntax {
    const tokens = this.tokens.slice(this.current_position + 1);
    this.expr_parser.reset(tokens);
    const expr = this.expr_parser.template_ident();
    const { tokens: remaining_tokens } = this.expr_parser.remaining();
    this.reset(remaining_tokens);

    return expr;
  }

  private template(): Syntax {
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

  optionally_typed_ident(): Syntax {
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

  var_stmt(): Syntax {
    // NOTE(Nic): [this](https://www.w3.org/TR/WGSL/#syntax-variable_or_value_statement)
    if (
      this.check(TokenKind.KEYWORD_CONST) ||
      this.check(TokenKind.KEYWORD_LET)
    ) {
      const { current, trivia } = this.advance();
      const decl = this.node(
        current.kind === TokenKind.KEYWORD_CONST
          ? TokenKind.AST_CONST_DECLARATION_STATEMENT
          : TokenKind.AST_LET_DECLARATION_STATEMENT,
        [this.leaf(current.kind, current.text, trivia)]
      );

      const ident = this.optionally_typed_ident();
      if (ident) decl.children.push(ident);
      else decl.children.push(this.leaf(TokenKind.ERR_ERROR));

      const { matched, node } = this.accept(TokenKind.SYM_EQUAL, true);
      if (matched) decl.children.push(node, this.expr());

      return this.absorb_trailing_trivia(decl);
    } else if (this.check(TokenKind.KEYWORD_VAR)) {
      const { node } = this.accept(TokenKind.KEYWORD_VAR, true);

      const decl: Syntax = this.node(TokenKind.AST_VAR_DECLARATION_STATEMENT, [
        node,
      ]);

      let var_template = this.template();
      if (var_template) decl.children.push(var_template);

      const ident = this.optionally_typed_ident();
      decl.children.push(ident);

      const { matched, node: equal_node } = this.accept(
        TokenKind.SYM_EQUAL,
        true
      );
      if (matched) decl.children.push(equal_node, this.expr());

      return this.absorb_trailing_trivia(decl);
    }

    return null; // rule didn't match
  }

  const_assert(): Syntax {
    // NOTE(Nic): [this](https://www.w3.org/TR/WGSL/#syntax-const_assert_statement)

    const { matched: ca_matched, node: ca_node } = this.accept(
      TokenKind.KEYWORD_CONST_ASSERT,
      true
    );
    if (!ca_matched) return null;

    const decl: Syntax = {
      kind: TokenKind.AST_CONST_ASSERT,
      children: [ca_node],
      leading_trivia: [],
      trailing_trivia: [],
    };

    const expr = this.expr();
    decl.children.push(expr);

    return this.absorb_trailing_trivia(decl);
  }

  private assignment_or_expr(stmt: SyntaxNode): SyntaxNode {
    if (
      this.check(TokenKind.SYM_STAR) ||
      this.check(TokenKind.SYM_AMP) ||
      this.check(TokenKind.SYM_LPAREN) ||
      this.check(TokenKind.SYM_UNDERSCORE) ||
      this.check(TokenKind.SYM_IDENTIFIER)
    ) {
      // variable updating assignment
      if (this.check(TokenKind.SYM_UNDERSCORE)) {
        stmt.kind = TokenKind.AST_DISCARDING_ASSIGNMENT_STATEMENT;
        const { node: underscore_node } = this.accept(
          TokenKind.SYM_UNDERSCORE,
          true
        );
        stmt.children.push(underscore_node);
      } else {
        stmt.children.push(this.expr());
      }

      if (
        this.next_token() &&
        assignment_op_types.has(this.next_token().kind)
      ) {
        // this is an assignment
        stmt.kind = TokenKind.AST_UPDATING_ASSIGNMENT_STATEMENT;
        const { current, trivia } = this.advance();
        stmt.children.push(
          {
            kind: current.kind,
            text: current.text,
            leading_trivia: trivia,
            trailing_trivia: [],
          },
          this.expr()
        );
      } else if (
        this.check(TokenKind.SYM_DASH_DASH) ||
        this.check(TokenKind.SYM_PLUS_PLUS)
      ) {
        stmt.kind = TokenKind.AST_UPDATING_ASSIGNMENT_STATEMENT;

        const { current, trivia } = this.advance();
        stmt.children.push({
          kind: current.kind,
          text: current.text,
          leading_trivia: trivia,
          trailing_trivia: [],
        });
      } else {
        stmt.kind = TokenKind.AST_FUNCTION_CALL_STATEMENT;
      }

      return this.absorb_trailing_trivia(stmt);
    }

    return null; // rule didn't match
  }

  single_stmt(): Syntax {
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

    if (this.check(TokenKind.SYM_SEMICOLON)) {
      // empty statement
      stmt.kind = TokenKind.AST_EMPTY_STATEMENT;
      const { node: semicolon_node } = this.accept(
        TokenKind.SYM_SEMICOLON,
        true
      );
      stmt.children.push(semicolon_node);

      return this.absorb_trailing_trivia(stmt);
    }

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
      const if_branch: Syntax = {
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
          const else_if_branch: Syntax = {
            kind: TokenKind.AST_ELSE_IF_BRANCH,
            children: [else_node, if_node, this.expr(), this.compound_stmt()],
            leading_trivia: [],
            trailing_trivia: [],
          };
          stmt.children.push(else_if_branch);
        } else {
          // handle a pure else condition
          const else_branch: Syntax = {
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

          let case_statement: Syntax = {
            kind: TokenKind.AST_SWITCH_DEFAULT,
            children: [case_node],
            leading_trivia: [],
            trailing_trivia: [],
          };

          let case_condition: Syntax = {
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

          let default_stmt: Syntax = {
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

      stmt.children.push(this.compound_stmt());

      return this.absorb_trailing_trivia(stmt);
    }

    if (this.check(TokenKind.KEYWORD_WHILE)) {
      // [here](https://www.w3.org/TR/WGSL/#syntax-while_statement)
      stmt.kind = TokenKind.AST_WHITE_STATEMENT;

      const { node: while_node } = this.accept(TokenKind.KEYWORD_WHILE, true);
      stmt.children.push(while_node);

      stmt.children.push(this.expr());
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
      // also break statement

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
      // [here](https://www.w3.org/TR/WGSL/#syntax-continue_statement)

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
      stmt.children.push(this.var_stmt());

      const { node: sc_node } = this.accept(TokenKind.SYM_SEMICOLON, true);
      stmt.children.push(sc_node);

      return this.absorb_trailing_trivia(stmt);
    }

    if (this.check(TokenKind.KEYWORD_CONST_ASSERT)) {
      // [here](https://www.w3.org/TR/WGSL/#syntax-const_assert_statement)

      stmt.kind = TokenKind.AST_CONST_ASSERT_STATEMENT;
      // NOTE(Nic): there are certain cases where global var decl is not what we want,
      // but in our case, more permissive is good.
      stmt.children.push(this.const_assert());

      const { node: sc_node } = this.accept(TokenKind.SYM_SEMICOLON, true);
      stmt.children.push(sc_node);

      return this.absorb_trailing_trivia(stmt);
    }

    if (this.check(TokenKind.KEYWORD_FOR)) {
      // [here](https://www.w3.org/TR/WGSL/#syntax-for_statement)
      stmt.kind = TokenKind.AST_FOR_STATEMENT;

      const { node: for_node } = this.accept(TokenKind.KEYWORD_FOR, true);
      stmt.children.push(for_node);

      const { node: lparen_node } = this.accept(TokenKind.SYM_LPAREN, true);
      stmt.children.push(lparen_node);

      let for_header: Syntax = {
        kind: TokenKind.AST_FOR_HEADER,
        children: [],
        leading_trivia: [],
        trailing_trivia: [],
      };

      // for INIT
      if (!this.check(TokenKind.SYM_SEMICOLON)) {
        if (
          this.next_token() &&
          assignment_or_expr_tokens.has(this.next_token().kind)
        ) {
          const assign = this.assignment_or_expr({
            kind: TokenKind.AST_STATEMENT,
            children: [],
            leading_trivia: [],
            trailing_trivia: [],
          });
          for_header.children.push(assign);
        } else if (
          this.next_token() &&
          local_declaration_tokens.has(this.next_token().kind)
        ) {
          // try and parse a local declaration.
          for_header.children.push(this.var_stmt());
        }
      }

      const { node: s1_node } = this.accept(TokenKind.SYM_SEMICOLON, true);
      for_header.children.push(s1_node);

      // for CONDITION
      if (!this.check(TokenKind.SYM_SEMICOLON)) {
        for_header.children.push(this.expr());
      }

      const { node: s2_node } = this.accept(TokenKind.SYM_SEMICOLON, true);
      for_header.children.push(s2_node);

      // for UPDATE
      if (!this.check(TokenKind.SYM_RPAREN)) {
        if (
          this.next_token() &&
          assignment_or_expr_tokens.has(this.next_token().kind)
        ) {
          const assign = this.assignment_or_expr({
            kind: TokenKind.AST_STATEMENT,
            children: [],
            leading_trivia: [],
            trailing_trivia: [],
          });
          for_header.children.push(assign);
        }
      }

      stmt.children.push(for_header);

      const { node: rparen_node } = this.accept(TokenKind.SYM_RPAREN, true);
      stmt.children.push(rparen_node);
      stmt.children.push(this.compound_stmt());

      return this.absorb_trailing_trivia(stmt);
    }

    if (
      this.check(TokenKind.SYM_STAR) ||
      this.check(TokenKind.SYM_AMP) ||
      this.check(TokenKind.SYM_LPAREN) ||
      this.check(TokenKind.SYM_UNDERSCORE) ||
      this.check(TokenKind.SYM_IDENTIFIER)
    ) {
      // variable updating assignment
      stmt = this.assignment_or_expr(stmt);

      const { node: semicolon_node } = this.accept(
        TokenKind.SYM_SEMICOLON,
        true
      );

      stmt.children.push(semicolon_node);

      return this.absorb_trailing_trivia(stmt);
    }

    stmt.kind = TokenKind.ERR_ERROR;
    return this.absorb_trailing_trivia(stmt);
  }

  compound_stmt(): SyntaxNode {
    let compound_stmt: Syntax = {
      kind: TokenKind.AST_COMPOUND_STATEMENT,
      children: [],
      leading_trivia: [],
      trailing_trivia: [],
    };

    // Try and parse attributes
    compound_stmt = this.attributes(compound_stmt, [TokenKind.SYM_LBRACE]);

    // accept an lbrace
    const { matched, node: lbrace_node } = this.accept(
      TokenKind.SYM_LBRACE,
      true
    );
    compound_stmt.children.push(lbrace_node);

    // parse 0 or more single statements
    if (matched) {
      while (this.next_token() && !this.check(TokenKind.SYM_RBRACE)) {
        let stmt = this.single_stmt();
        compound_stmt.children.push(stmt);

        // NOTE(Nic): This tries to close a compound statement
        // as soon as possible after an error... but we may not want this.
        if (stmt.kind === TokenKind.ERR_ERROR) break;
      }
    }

    // accept an rbrace
    const { node: rbrace_node } = this.accept(TokenKind.SYM_RBRACE, true);
    compound_stmt.children.push(rbrace_node);

    return this.absorb_trailing_trivia(compound_stmt);
  }
}
