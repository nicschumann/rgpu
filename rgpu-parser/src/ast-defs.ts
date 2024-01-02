import { TokenKind } from "./token-defs";
import { CharRange } from "./types";

export type ASTNode = ASTTranslationUnit;

export type ASTTranslationUnit = {
  kind: TokenKind.AST_TRANSLATION_UNIT;
  range: CharRange;
  declarations: ASTNode[];
};
