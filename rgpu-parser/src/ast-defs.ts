import { TokenKind } from "./token-defs";
import { CharRange, Syntax } from "./types";

export type ASTNode =
  | ASTTranslationUnit
  | ASTEmptyDeclaration
  | ASTUnimplementedNode;

type ASTBaseNode = { syntax: Syntax; range: CharRange };

export type ASTTranslationUnit = {
  kind: TokenKind.AST_TRANSLATION_UNIT;
  declarations: ASTNode[];
} & ASTBaseNode;

export type ASTEmptyDeclaration = {
  kind: TokenKind.AST_EMPTY_DECLARATION;
} & ASTBaseNode;

export type ASTUnimplementedNode = {
  kind: TokenKind.NO_TOKEN;
} & ASTBaseNode;
