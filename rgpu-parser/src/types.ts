import { TokenKind } from "./tokens";

export enum SyntaxKind {}

export type Token = {
  kind: TokenKind;
  text: string;
  precedence: number;
  seen?: boolean;
};

export type Node = {
  kind: TokenKind;
  children: (Node | Token)[];
};

export const isNode = (value: any): value is Node => {
  return typeof value.children !== "undefined";
};

export const isToken = (value: any): value is Node => {
  return typeof value.text === "string";
};

export type TemplateList = {
  start_position: number; // position of the '<' token that starts the template list
  end_position: number; // position of the '>' token point that ends the template list
};
