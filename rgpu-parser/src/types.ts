import {
  BinaryOperatorTokenKind,
  TokenKind,
  UnaryOperatorTokenKind,
} from "./tokens";

export enum SyntaxKind {}

export type Token = {
  kind: TokenKind;
  text: string;
  seen?: boolean;
};

export type TemplateList = {
  start_position: number; // position of the '<' token that starts the template list
  end_position: number; // position of the '>' token point that ends the template list
};

export const isNode = (value: any): value is Node => {
  return typeof value.children !== "undefined";
};

export const isToken = (value: any): value is Node => {
  return typeof value.text === "string";
};

export type SyntaxNode = {
  kind: TokenKind;
  text?: string;
  children?: SyntaxNode[];
  leading_trivia: Token[];
  trailing_trivia: Token[];
};

export type SimplifiedSyntaxNode = {
  text?: string;
  pre?: string;
  post?: string;
  children?: SimplifiedSyntaxNode[];
};

export type AdvanceData = {
  current: Token;
  trivia: Token[];
  next: Token;
};

export type TriviaData = {
  trivia: Token[];
  new_index: number;
};

export type AcceptData = {
  matched: boolean;
  node: SyntaxNode;
};

export type RemainingData = {
  index: number;
  tokens: Token[];
};

export const unary_op_precedence: {
  [key in UnaryOperatorTokenKind]: number;
} = {
  [TokenKind.SYM_DASH]: 10,
  [TokenKind.SYM_BANG]: 10,
  [TokenKind.SYM_TILDE]: 10,
  [TokenKind.SYM_STAR]: 10,
  [TokenKind.SYM_AMP]: 10,
};

export const binary_op_precedence: {
  [key in BinaryOperatorTokenKind]: number;
} = {
  [TokenKind.SYM_DOT]: 11,
  [TokenKind.SYM_STAR]: 9,
  [TokenKind.SYM_SLASH]: 9,
  [TokenKind.SYM_PERCENT]: 9,
  [TokenKind.SYM_DASH]: 8,
  [TokenKind.SYM_PLUS]: 8,
  [TokenKind.SYM_LESS_LESS]: 7,
  [TokenKind.SYM_GREATER_GREATER]: 7,
  [TokenKind.SYM_LESS]: 6,
  [TokenKind.SYM_GREATER]: 6,
  [TokenKind.SYM_LESS_EQUAL]: 6,
  [TokenKind.SYM_GREATER_EQUAL]: 6,
  [TokenKind.SYM_EQUAL_EQUAL]: 6,
  [TokenKind.SYM_BANG_EQUAL]: 6,
  [TokenKind.SYM_AMP]: 5,
  [TokenKind.SYM_CARAT]: 4,
  [TokenKind.SYM_BAR]: 3,
  [TokenKind.SYM_AMP_AMP]: 2,
  [TokenKind.SYM_BAR_BAR]: 1,
};

// trivia to skip or collect
export const trivia_types: Set<TokenKind> = new Set([
  TokenKind.BLANKSPACE,
  TokenKind.BLOCK_COMMENT,
  TokenKind.LINEBREAK,
  TokenKind.LINE_COMMENT,
]);

export const literal_types: Set<TokenKind> = new Set([
  TokenKind.BOOL_LITERAL,
  TokenKind.DEC_INT_LITERAL,
  TokenKind.HEX_INT_LITERAL,
  TokenKind.DEC_FLOAT_LITERAL,
  TokenKind.HEX_FLOAT_LITERAL,
]);

export const unary_op_types: Set<TokenKind> = new Set([
  TokenKind.SYM_DASH,
  TokenKind.SYM_BANG,
  TokenKind.SYM_TILDE,
  TokenKind.SYM_STAR,
  TokenKind.SYM_AMP,
]);

export const binary_op_types: Set<TokenKind> = new Set([
  TokenKind.SYM_DOT,
  TokenKind.SYM_STAR,
  TokenKind.SYM_SLASH,
  TokenKind.SYM_PERCENT,
  TokenKind.SYM_DASH,
  TokenKind.SYM_PLUS,
  TokenKind.SYM_LESS_LESS,
  TokenKind.SYM_GREATER_GREATER,
  TokenKind.SYM_LESS,
  TokenKind.SYM_GREATER,
  TokenKind.SYM_LESS_EQUAL,
  TokenKind.SYM_GREATER_EQUAL,
  TokenKind.SYM_EQUAL_EQUAL,
  TokenKind.SYM_BANG_EQUAL,
  TokenKind.SYM_AMP,
  TokenKind.SYM_CARAT,
  TokenKind.SYM_BAR,
  TokenKind.SYM_AMP_AMP,
  TokenKind.SYM_BAR_BAR,
]);
