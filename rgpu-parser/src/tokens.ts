export enum TokenKind {
  // Whitespace
  BLANKSPACE = 0,
  LINEBREAK,

  // Trivia
  LINE_COMMENT,
  BLOCK_COMMENT,

  // Tokens
  // Tokens: Literals
  BOOL_LITERAL,

  DEC_INT_LITERAL,
  HEX_INT_LITERAL,
  DEC_FLOAT_LITERAL,
  HEX_FLOAT_LITERAL,

  // Tokens: Keywords
  KEYWORD_ALIAS,
  KEYWORD_BREAK,
  KEYWORD_CASE,
  KEYWORD_CONST,
  KEYWORD_CONST_ASSERT,
  KEYWORD_CONTINUE,
  KEYWORD_CONTINUING,
  KEYWORD_DEFAULT,
  KEYWORD_DIAGNOSTIC,
  KEYWORD_DISCARD,
  KEYWORD_ELSE,
  KEYWORD_ENABLE,
  KEYWORD_FN,
  KEYWORD_FOR,
  KEYWORD_IF,
  KEYWORD_LET,
  KEYWORD_LOOP,
  KEYWORD_OVERRIDE,
  KEYWORD_REQUIRES,
  KEYWORD_RETURN,
  KEYWORD_STRUCT,
  KEYWORD_SWITCH,
  KEYWORD_VAR,
  KEYWORD_WHILE,

  // Tokens: Syntactic
  SYM_AMP, // &
  SYM_AMP_AMP, // &&
  SYM_DASH_GREATER, // ->
  SYM_AT, // @
  SYM_SLASH, // /
  SYM_BANG, // !
  SYM_LBRACKET, // [
  SYM_RBRACKET, // ]
  SYM_LBRACE, // {
  SYM_RBRACE, // }
  SYM_COLON, // :
  SYM_COMMA, // ,
  SYM_EQUAL, // =
  SYM_EQUAL_EQUAL, // ==
  SYM_BANG_EQUAL, // !=
  SYM_GREATER, // >
  SYM_GREATER_EQUAL, // >=
  SYM_GREATER_GREATER, // >>
  SYM_LESS, // <
  SYM_LESS_EQUAL, // <=
  SYM_LESS_LESS, // <<
  SYM_PERCENT, // %
  SYM_DASH, // -
  SYM_DASH_DASH, // --
  SYM_DOT, // .
  SYM_PLUS, // +
  SYM_PLUS_PLUS, // ++
  SYM_BAR, // |
  SYM_BAR_BAR, // ||
  SYM_LPAREN, // (
  SYM_RPAREN, // )
  SYM_SEMICOLON, // ;
  SYM_STAR, // *
  SYM_TILDE, // ~
  SYM_UNDERSCORE, // _
  SYM_CARAT, // ^
  SYM_PLUS_EQUAL, // +=
  SYM_DASH_EQUAL, // -=
  SYM_STAR_EQUAL, // *=
  SYM_SLASH_EQUAL, // /=
  SYM_PERCENT_EQUAL, // %=
  SYM_AMP_EQUAL, // &=
  SYM_BAR_EQUAL, // |=
  SYM_CARAT_EQUAL, // ^=
  SYM_GREATER_GREATER_EQUAL, // >>=
  SYM_LESS_LESS_EQUAL, // <<=

  // Tokens: Template
  SYM_DISAMBIGUATE_TEMPLATE,
  SYM_TEMPLATE_LIST_START, // < (disambiguated by template disambiguation)
  SYM_TEMPLATE_LIST_END, // > (disambiguated by template disambiguation)

  // Tokens: Identifiers
  SYM_IDENTIFIER,

  // AST Tags for Expressions
  AST_FUNCTION_CALL,
  AST_FUNCTION_ARGS,

  AST_TEMPLATE_IDENTIFIER,
  AST_TEMPLATE_ARGS,

  AST_ARRAY_ACCESS,
  AST_ARRAY_INDEX,

  AST_LHS_EXPRESSION,
  AST_LHS_COMPONENT_SPECIFIER,

  // AST Tags for Statements
  AST_COMPOUND_STATEMENT,
  AST_STATEMENT,
  AST_ATTRIBUTE,

  AST_STRUCT_DECLRATAION,
  AST_STRUCT_MEMBER,
  AST_VAR_DECLARATION,
  AST_ALIAS_DECLARATION,
  AST_GLOBAL_VAR_DECLARATION,
  AST_TYPED_IDENTIFIER,
  AST_CONST_ASSERT,
  AST_FUNCTION_DECLARATION,
  AST_FUNCTION_PARAMETERS,
  AST_FUNCTION_PARAMETER,
  AST_FUNCTION_RETURN_TYPE,

  AST_RETURN_STATMENT,

  AST_CONDITIONAL_STATEMENT,
  AST_IF_BRANCH,
  AST_ELSE_IF_BRANCH,
  AST_ELSE_BRANCH,

  AST_SWITCH_STATEMENT,
  AST_SWITCH_CASE,
  AST_SWITCH_CASE_CONDITION,
  AST_SWITCH_DEFAULT,

  AST_FOR_STATEMENT,
  AST_FOR_HEADER,
  AST_FOR_INIT,
  AST_FOR_CONDITION,
  AST_FOR_INCREMENT,

  AST_WHITE_STATEMENT,

  AST_LOOP_STATEMENT,
  AST_CONTINUING_STATMENT,
  AST_BREAK_IF_STATEMENT,

  AST_BREAK_STATEMENT,

  AST_CONTINUE_STATEMENT,

  AST_DISCARD_STATEMENT,

  AST_DECLARATION_STATEMENT,

  AST_CONST_ASSERT_STATEMENT,

  AST_UPDATING_ASSIGNMENT_STATEMENT,
  AST_DISCARDING_ASSIGNMENT_STATEMENT,
  AST_FUNCTION_CALL_STATEMENT,

  AST_EMPTY_STATEMENT,

  // Tags for Errors
  ERR_ERROR,
  ERR_NONE,
}

export type UnaryOperatorTokenKind =
  | TokenKind.SYM_DASH // 10
  | TokenKind.SYM_BANG // 10
  | TokenKind.SYM_TILDE // 10
  | TokenKind.SYM_STAR // 10
  | TokenKind.SYM_AMP; // 10

export type BinaryOperatorTokenKind =
  | TokenKind.SYM_DOT
  | TokenKind.SYM_STAR // 9
  | TokenKind.SYM_SLASH // 9
  | TokenKind.SYM_PERCENT // 9
  | TokenKind.SYM_PLUS // 8
  | TokenKind.SYM_DASH // 8
  | TokenKind.SYM_LESS_LESS // 7
  | TokenKind.SYM_GREATER_GREATER // 7
  | TokenKind.SYM_LESS // 6
  | TokenKind.SYM_GREATER // 6
  | TokenKind.SYM_LESS_EQUAL // 6
  | TokenKind.SYM_GREATER_EQUAL // 6
  | TokenKind.SYM_EQUAL_EQUAL // 6
  | TokenKind.SYM_BANG_EQUAL // 6
  | TokenKind.SYM_AMP // 5
  | TokenKind.SYM_CARAT // 4
  | TokenKind.SYM_BAR // 3
  | TokenKind.SYM_AMP_AMP // 2
  | TokenKind.SYM_BAR_BAR; // 1

export type TokenData = {
  type: TokenKind;
  re: string;
};

export const tokenDefinitions: TokenData[] = [
  // Keywords
  {
    type: TokenKind.KEYWORD_ALIAS,
    re: "\\balias\\b",
  },
  {
    type: TokenKind.KEYWORD_BREAK,
    re: "\\bbreak\\b",
  },
  {
    type: TokenKind.KEYWORD_CASE,
    re: "\\bcase\\b",
  },
  {
    type: TokenKind.KEYWORD_CONST,
    re: "\\bconst\\b",
  },
  {
    type: TokenKind.KEYWORD_CONST_ASSERT,
    re: "\\bconst_assert\\b",
  },
  {
    type: TokenKind.KEYWORD_CONTINUE,
    re: "\\bcontinue\\b",
  },
  {
    type: TokenKind.KEYWORD_CONTINUING,
    re: "\\bcontinuing\\b",
  },
  {
    type: TokenKind.KEYWORD_DEFAULT,
    re: "\\bdefault\\b",
  },
  {
    type: TokenKind.KEYWORD_DIAGNOSTIC,
    re: "\\bdiagnostic\\b",
  },
  {
    type: TokenKind.KEYWORD_DISCARD,
    re: "\\bdiscard\\b",
  },
  {
    type: TokenKind.KEYWORD_ELSE,
    re: "\\belse\\b",
  },
  {
    type: TokenKind.KEYWORD_ENABLE,
    re: "\\benable\\b",
  },
  {
    type: TokenKind.KEYWORD_FN,
    re: "\\bfn\\b",
  },
  {
    type: TokenKind.KEYWORD_FOR,
    re: "\\bfor\\b",
  },
  {
    type: TokenKind.KEYWORD_IF,
    re: "\\bif\\b",
  },
  {
    type: TokenKind.KEYWORD_DEFAULT,
    re: "\\bdefault\\b",
  },
  {
    type: TokenKind.KEYWORD_LET,
    re: "\\blet\\b",
  },
  {
    type: TokenKind.KEYWORD_LOOP,
    re: "\\bloop\\b",
  },
  {
    type: TokenKind.KEYWORD_OVERRIDE,
    re: "\\boverride\\b",
  },
  {
    type: TokenKind.KEYWORD_REQUIRES,
    re: "\\brequires\\b",
  },
  {
    type: TokenKind.KEYWORD_RETURN,
    re: "\\breturn\\b",
  },
  {
    type: TokenKind.KEYWORD_STRUCT,
    re: "\\bstruct\\b",
  },
  {
    type: TokenKind.KEYWORD_SWITCH,
    re: "\\bswitch\\b",
  },
  {
    type: TokenKind.KEYWORD_VAR,
    re: "\\bvar\\b",
  },
  {
    type: TokenKind.KEYWORD_WHILE,
    re: "\\bwhile\\b",
  },

  // Literal
  {
    type: TokenKind.BOOL_LITERAL,
    re: "\\bfalse\\b",
  },
  {
    type: TokenKind.BOOL_LITERAL,
    re: "\\btrue\\b",
  },
  {
    type: TokenKind.DEC_FLOAT_LITERAL,
    re: "0[fh]",
  },
  {
    type: TokenKind.DEC_FLOAT_LITERAL,
    re: "[1-9][0-9]*[fh]",
  },
  {
    type: TokenKind.DEC_FLOAT_LITERAL,
    re: "[0-9]*\\.[0-9]+(?:[eE][+-]?[0-9]+)?[fh]?",
  },
  {
    type: TokenKind.DEC_FLOAT_LITERAL,
    re: "[0-9]+\\.[0-9]*(?:[eE][+-]?[0-9]+)?[fh]?",
  },
  {
    type: TokenKind.DEC_FLOAT_LITERAL,
    re: "[0-9]+[eE][+-]?[0-9]+[fh]?",
  },
  {
    type: TokenKind.HEX_FLOAT_LITERAL,
    re: "0[xX][0-9a-fA-F]*\\.[0-9a-fA-F]+(?:[pP][+-]?[0-9]+[fh]?)?",
  },
  {
    type: TokenKind.HEX_FLOAT_LITERAL,
    re: "0[xX][0-9a-fA-F]+\\.[0-9a-fA-F]*(?:[pP][+-]?[0-9]+[fh]?)?",
  },
  {
    type: TokenKind.HEX_FLOAT_LITERAL,
    re: "0[xX][0-9a-fA-F]+[pP][+-]?[0-9]+[fh]?",
  },
  {
    type: TokenKind.HEX_INT_LITERAL,
    re: "0[xX][0-9a-fA-F]+[iu]?",
  },
  {
    type: TokenKind.DEC_INT_LITERAL,
    re: "[1-9][0-9]*[iu]?",
  },
  {
    type: TokenKind.DEC_INT_LITERAL,
    re: "0[iu]?",
  },

  {
    type: TokenKind.SYM_IDENTIFIER,
    re: "(?:[_\\p{XID_Start}][\\p{XID_Continue}]+)",
  },
  {
    type: TokenKind.SYM_IDENTIFIER,
    re: "(?:[\\p{XID_Start}])",
  },

  // Comments
  {
    type: TokenKind.LINE_COMMENT,
    re: "//[^\\n]*",
  },
  {
    type: TokenKind.BLOCK_COMMENT,
    re: "/\\*[^*]*\\*+(?:[^/*][^*]*\\*+)*/",
  },

  // Whitespace
  {
    type: TokenKind.LINEBREAK,
    re: "[\\r\\n]+",
  },
  {
    type: TokenKind.BLANKSPACE,
    re: "[ \\t]+",
  },

  // Syntactic Tokens
  // Three Char
  {
    type: TokenKind.SYM_GREATER_GREATER_EQUAL,
    re: ">>=",
  },
  {
    type: TokenKind.SYM_LESS_LESS_EQUAL,
    re: "<<=",
  },
  // Two Char
  {
    type: TokenKind.SYM_AMP_AMP,
    re: "&&",
  },
  {
    type: TokenKind.SYM_DASH_GREATER,
    re: "->",
  },
  {
    type: TokenKind.SYM_EQUAL_EQUAL,
    re: "==",
  },
  {
    type: TokenKind.SYM_BANG_EQUAL,
    re: "!=",
  },
  {
    type: TokenKind.SYM_GREATER_EQUAL,
    re: ">=",
  },
  {
    type: TokenKind.SYM_LESS_EQUAL,
    re: "<=",
  },
  {
    type: TokenKind.SYM_GREATER_GREATER,
    re: ">>",
  },
  {
    type: TokenKind.SYM_LESS_LESS,
    re: "<<",
  },
  {
    type: TokenKind.SYM_DASH_DASH,
    re: "--",
  },
  {
    type: TokenKind.SYM_PLUS_PLUS,
    re: "\\+\\+",
  },
  {
    type: TokenKind.SYM_BAR_BAR,
    re: "\\|\\|",
  },
  {
    type: TokenKind.SYM_PLUS_EQUAL,
    re: "\\+=",
  },
  {
    type: TokenKind.SYM_DASH_EQUAL,
    re: "-=",
  },
  {
    type: TokenKind.SYM_STAR_EQUAL,
    re: "\\*=",
  },
  {
    type: TokenKind.SYM_SLASH_EQUAL,
    re: "\\/=",
  },
  {
    type: TokenKind.SYM_PERCENT_EQUAL,
    re: "%=",
  },
  {
    type: TokenKind.SYM_AMP_EQUAL,
    re: "&=",
  },
  {
    type: TokenKind.SYM_BAR_EQUAL,
    re: "\\|=",
  },
  {
    type: TokenKind.SYM_CARAT_EQUAL,
    re: "\\^=",
  },

  // single char tokens
  {
    type: TokenKind.SYM_AMP,
    re: "&",
  },
  {
    type: TokenKind.SYM_AT,
    re: "@",
  },
  {
    type: TokenKind.SYM_SLASH,
    re: "\\/",
  },
  {
    type: TokenKind.SYM_BANG,
    re: "!",
  },
  {
    type: TokenKind.SYM_LBRACKET,
    re: "\\[",
  },
  {
    type: TokenKind.SYM_RBRACKET,
    re: "\\]",
  },
  {
    type: TokenKind.SYM_LBRACE,
    re: "\\{",
  },
  {
    type: TokenKind.SYM_RBRACE,
    re: "\\}",
  },
  {
    type: TokenKind.SYM_LPAREN,
    re: "\\(",
  },
  {
    type: TokenKind.SYM_RPAREN,
    re: "\\)",
  },
  {
    type: TokenKind.SYM_RBRACE,
    re: "\\}",
  },
  {
    type: TokenKind.SYM_COLON,
    re: ":",
  },
  {
    type: TokenKind.SYM_COMMA,
    re: ",",
  },
  {
    type: TokenKind.SYM_EQUAL,
    re: "=",
  },
  {
    type: TokenKind.SYM_GREATER,
    re: ">",
  },
  {
    type: TokenKind.SYM_LESS,
    re: "<",
  },
  {
    type: TokenKind.SYM_PERCENT,
    re: "%",
  },
  {
    type: TokenKind.SYM_DASH,
    re: "-",
  },
  {
    type: TokenKind.SYM_DOT,
    re: "\\.",
  },
  {
    type: TokenKind.SYM_PLUS,
    re: "\\+",
  },
  {
    type: TokenKind.SYM_BAR,
    re: "\\|",
  },
  {
    type: TokenKind.SYM_SEMICOLON,
    re: ";",
  },
  {
    type: TokenKind.SYM_STAR,
    re: "\\*",
  },
  {
    type: TokenKind.SYM_TILDE,
    re: "~",
  },
  {
    type: TokenKind.SYM_UNDERSCORE,
    re: "_",
  },
  {
    type: TokenKind.SYM_CARAT,
    re: "\\^",
  },
];
