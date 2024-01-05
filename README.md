# rgpu

> 🙃 Stateless, declarative, and fast WebGPU

This is a monorepo that houses relevant resources associated with the development of `rgpu`, which provides a range of tools for developing webgpu applications.

- `rgpu`. The core library provides a webgpu state and resource management api. It is very closely modelled on `regl`, a functional library for WebGL 1.0.
- `site`. A next.js application showcasing examples and usage of the `rgpu` library.
- `rgpu-parser`. A parser and analyzer for [`WGSL`](https://www.w3.org/TR/WGSL/), the webgpu shading language. This error-tolerant, permissive parser is intended for integration into IDEs and editors, rather than in parsers.
- `rgpu-language`. A language extension plugin for VSCode that uses `rgpu-parser` to provide syntax highlighting, typechecking, and error detection for `.wgsl` files.
