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
  SYM_DOUBLE_EQUAL, // ==
  SYM_BANG_EQUAL, // !=
  SYM_GREATER, // >
  SYM_GREATER_EQUAL, // >=
  SYM_GREATER_GREATER, // >>
  SYM_LESS, // <
  SYM_LESS_EQUAL, // <=
  SYM_LESS_LESS, // <<
  SYM_PERCENT, // %
  SYM_DASH, // -
  SYM_DASH_DASH, // -
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
  TEMPLATE_ARG_END, // > (disambiguated by template disambiguation)
  TEMPLATE_ARG_START, // < (disambiguated by template disambiguation)
  TEMPLATE_DISAMBIGUATE, // non-textual; tells parser to scan for templates

  // Tokens: Identifiers
  IDENTIFIER,
}

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

  // ... more

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
];
