# Functional WebGPU

> Stateless, declarative, and fast WebGPU

`webgpu` is a currently-experimental, but-someday-standard API for accessing graphics coprocessors on the web (although there are also [offline](https://github.com/hexops/dawn) [implementations](https://github.com/gfx-rs/wgpu)). It improves on it's predecessors, `webgl` and `webgl2` in several, major ways, including performance, general purpose compute pipelines (think CUDA), and a modern API design that's closer to SPIR-V than the aging OpenGL standard. Currently, browser support is limited and hidden behind experimental flags, but support will increase, as `webgl` (an API that's designed like it's 2004) continues to age.

This library, `rgpu`, is inspired by the excellent library [`regl`](https://github.com/regl-project/regl), which provides a simple, functional abstraction layer on top of the WebGL 1 state machine. `regl` is extremely well designed, but it explicitly does not support newer APIs, like [`webgl2`](https://caniuse.com/webgl2) (which is now fairly well supported) and [`webgpu`](https://caniuse.com/webgpu). This means a hit to performance (both of thse newer apis squeeze more flops out of the hardware) and expressivity (`webgl2` enables many more rendering primitives and texture/buffer types, and `webgpu` enables compute shaders, which makes general purpose parallel compute way easier, since you don't need to pretend all data is a texture). This is a respectable choice; we'll choose the opposite.

We assume that `webgpu` support will grow, and that `webgpu` will need a great, fast, simple, and typescript ready API, similiar to what `regl` did for `webgl`. `rgpu` wants to be that library.

## References

`regl` [documentation](http://regl.party/), [source](https://github.com/regl-project/regl).
