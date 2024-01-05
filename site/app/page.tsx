"use client";

// @ts-ignore
import vertex from "./tri.vert.wgsl";
// @ts-ignore
import fragment from "./tri.frag.wgsl";

import { useEffect, useRef, useState } from "react";
import { setup } from "rgpu";
import { BufferHandle, type IGPU } from "rgpu/src/types";

export default function Home() {
  // REF
  const baseCanvas = useRef<HTMLCanvasElement>(null);
  const [rgpu, setRGPU] = useState<IGPU | null>(null);
  const [buffer, setBuffer] = useState<BufferHandle | null>(null);

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
              [0, 1, 0, 1],
              [0, 0, 1, 1],
            ],
          },
        });

        if (buf) setBuffer(buf);
      }
    });
  }, []);

  // LOOP
  useEffect(() => {
    if (!baseCanvas.current) return;
    if (!rgpu) return;
    if (!buffer) return;
    console.log("beginLoop");

    let read = false;
    let t = 0;

    const draw = rgpu.render({ vertex, fragment, buffer });
    const stop = rgpu.frame(async ({ dt, id }) => {
      const tau = t * 0.001 * (2.0 * Math.PI);
      const f = 0.5;

      buffer.write({
        color: [
          [Math.sin(tau * f) * 0.5 + 0.5, 0, 0, 1],
          [0, Math.sin(tau * f + (2 / 3) * Math.PI) * 0.5 + 0.5, 0, 1],
          [0, 0, Math.sin(tau * f + (4 / 3) * Math.PI) * 0.5 + 0.5, 1],
        ],
      });
      // if (!read) {
      //   read = true;
      //   const data = await buffer.read();
      //   console.log(data);
      // }
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
