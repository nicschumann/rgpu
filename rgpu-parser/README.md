# RGPU Parser

`rgpu-parser` is a permissive parser for [WGSL](https://www.w3.org/TR/WGSL/), the shading language for webgpu. It is designed to be integrated with linters and semantic analysis tools, rather than compilers. It emphasizes parsing permissively, in the sense that it partially parses syntactically incorrect programs, so that linting rules can be applied to valid subtrees of the parse. This is because it is meant to be integrated into editors, where most input programs are "in progress", rather than compilers, where most input programs are "done".

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
