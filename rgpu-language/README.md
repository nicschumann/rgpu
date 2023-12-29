# rgpu-language

This is a vscode language extension that will provide syntax highlighting, semantic highlighting, code completion, and inline error discovery for [WGSL](https://www.w3.org/TR/WGSL/), the WebGPU shading language. It's foundation will be `rgpu-parser` a WGSL parsing library I have written to provide error tolerant parsing suitable for IDEs, rather than compilation.

## Features

- [ ] **Autocompletion**. We should provide autocompletion for both standard library functions as well as identifiers and functions that are in scope. For this, we need to build up a datastructure that shows what text
- [ ] **Error Discovery**. We should provide context dependent highlighting for syntax errors and semantic errors (as many as possible...). For this, we will need some kind of fast type-checking algorithm that we can run on ASTs.

## Assumptions

- WGSL programs are, on average, short (hundreds of lines), and will parse quickly.
