# RGPU Parser

`rgpu-parser` is a permissive/tolerant parser and IDE frontend for [WGSL](https://www.w3.org/TR/WGSL/), the shading language for webgpu. It is designed to be integrated with linters and semantic analysis tools, rather than compilers. It emphasizes parsing permissively, in the sense that it partially parses syntactically incorrect programs, so that linting rules can be applied to valid subtrees of the parse. This is because it is meant to be integrated into editors, where most input programs are "in progress", rather than compilers, where most input programs are "done".

## Features

- [x] **Tokenization**. This parser provides a fast and spec-compliant tokenizer that scans source into sequences of parsable tokens.
- [x] **Tolerant Parsing**. This parser proves a tolerant parse tree for all inputs. It tries to parse as much of the input string as possible, even if that input is partial or has syntax errors.
- [x] **Trivia Capture**. The parser collects all trivia and builds it into the syntax tree. All white space and comments are attached to their nearest node in the parse tree. In other words, parsing is nondestructive.

## TODO

- [ ] Implement line and character position tracking during CST creation.
- [ ] Implement more verbose error types during CST creation (separate from AST_TYPES).

## References

Two references are especially helpful as references for this implementation:

- [Concrete Syntax Trees](https://github.com/rust-lang/rust-analyzer/blob/master/docs/dev/syntax.md) as used in Rust Analyzer. Discusses techniques for quickly parsing rust source in a way that's suitable for language extensions and editor plugins.
- [Tolerant Parsing](https://github.com/microsoft/tolerant-php-parser/blob/main/docs/HowItWorks.md) for php, a Microsoft reimplementation for php in a vscode language server.

## Statement Types

- [x] `';'`
- [x] return_statement `';'`
- [x] if_statement
- [x] switch_statement
- [x] loop_statement
- [x] for_statement
- [x] while_statement
- [x] func_call_statement `';'`
- [x] variable_or_value_statement `';'`
- [x] break_statement `';'`
- [x] continue_statement `';'`
- [x] `'discard'` `';'`
- [x] variable_updating_statement `';'`
- [x] compound_statement
- [x] const_assert_statement `';'
