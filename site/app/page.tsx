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
              [1, 2, 3],
              [4, 5, 6],
              [7, 8, 9],
            ],
            uv: [
              [0, 1],
              [0, 1],
              [0, 1],
            ],
            color: [
              [100, 200],
              [100, 200],
              [100, 200],
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

    const draw = rgpu.render({ vertex, fragment });
    const stop = rgpu.frame(async ({ dt, id }) => {
      if (!read) {
        read = true;
        const data = await buffer.read();
        console.log(data);
      }
      draw();
    });

    return stop;
  });

  return (
    <main className="">
      <canvas ref={baseCanvas} className="h-screen w-screen" />
    </main>
  );
}
