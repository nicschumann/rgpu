"use client";

// @ts-ignore
import vertex from "./tri.vert.wgsl";
// @ts-ignore
import fragment from "./tri.frag.wgsl";

import { useEffect, useRef, useState } from "react";
import { setup } from "rgpu";
import { BufferHandle, type IGPU } from "rgpu/src/types";
import { Mat4, mat4, vec3 } from "wgpu-matrix";

export default function Home() {
  // REF
  const baseCanvas = useRef<HTMLCanvasElement>(null);
  const [rgpu, setRGPU] = useState<IGPU | null>(null);
  const [buffer, setBuffer] = useState<BufferHandle | null>(null);
  const [transform, setTransform] = useState<BufferHandle | null>(null);
  const [matrix, setMatrix] = useState<Mat4 | null>(null);

  // SETUP
  useEffect(() => {
    if (!baseCanvas.current) return;
    console.log("setup");

    const dpr = window.devicePixelRatio;
    baseCanvas.current.width = window.innerWidth * dpr;
    baseCanvas.current.height = window.innerHeight * dpr;

    setup({ canvas: baseCanvas.current }).then((localRGPU) => {
      if (localRGPU) {
        setRGPU(localRGPU);
        const buf = localRGPU.buffer({
          usage: "vertex",
          data: {
            position: [
              [0.0, 0.5],
              [-0.5, -0.5],
              [0.5, -0.5],
            ],
            color: [
              [1, 1, 0, 1],
              [0, 0, 0, 1],
              [1, 0, 1, 1],
            ],
          },
        });

        const m = mat4.identity();
        mat4.translate(m, vec3.fromValues(0, 0, 0), m);
        mat4.scale(m, vec3.fromValues(0.5, 0.5, 0.5), m);

        console.log(m);

        const matrixUniform = localRGPU.buffer({
          usage: "uniform",
          data: {
            matrix: [m],
          },
        });

        setMatrix(m);

        if (buf) setBuffer(buf);
        if (matrixUniform) setTransform(matrixUniform);
      }
    });
  }, []);

  // LOOP
  useEffect(() => {
    if (!baseCanvas.current) return;
    if (!rgpu) return;
    if (!buffer) return;
    if (!transform) return;
    if (!matrix) return;
    console.log("beginLoop");

    let t = 0;

    const draw = rgpu.render({
      vertex,
      fragment,
      attributes: buffer,
      uniforms: [[transform]],
    });

    const stop = rgpu.frame(async ({ dt }) => {
      const tau = t * 0.001 * (2.0 * Math.PI);
      const f = 0.5;

      const scale = Math.sin(tau * f) * 0.22 + 0.5;

      mat4.identity(matrix);
      mat4.translate(matrix, vec3.fromValues(0, 0, 0.5), matrix); // adjust for clip space
      mat4.rotateX(matrix, (tau * 0.05) % (2 * Math.PI), matrix);
      setMatrix(matrix);

      transform.write({
        matrix: [matrix],
      });

      buffer.write({
        color: [
          [Math.sin(tau * f) * 0.5 + 0.5, 0, 0, 1],
          [0, Math.sin(tau * f + (2 / 3) * Math.PI) * 0.5 + 0.5, 0, 1],
          [0, 0, Math.sin(tau * f + (4 / 3) * Math.PI) * 0.5 + 0.5, 1],
        ],
      });

      draw();

      t += dt;
    });

    return stop;
  });

  return (
    <main className="">
      <canvas ref={baseCanvas} className="h-screen w-screen" />
    </main>
  );
}
