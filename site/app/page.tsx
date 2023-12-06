"use client";

// @ts-ignore
import vertex from "./tri.vert.wgsl";
// @ts-ignore
import fragment from "./tri.frag.wgsl";

import { useEffect, useRef, useState } from "react";
import { setup } from "rgpu";
import { type IGPUState } from "rgpu/src/types";
import { randomUUID } from "crypto";

export default function Home() {
  // REF
  const baseCanvas = useRef<HTMLCanvasElement>(null);
  const [rgpu, setRGPU] = useState<IGPUState | null>(null);

  // SETUP
  useEffect(() => {
    if (!baseCanvas.current) return;
    console.log("setup");

    const dpr = window.devicePixelRatio;
    baseCanvas.current.width = window.innerWidth * dpr;
    baseCanvas.current.height = window.innerHeight * dpr;

    setup({ canvas: baseCanvas.current }).then((localRGPU) => {
      setRGPU(localRGPU);
    });
  }, []);

  // LOOP
  useEffect(() => {
    if (!baseCanvas.current) return;
    if (!rgpu) return;
    console.log("beginLoop");

    const draw = rgpu.render({ vertex, fragment });
    const stop = rgpu.frame(({ dt, id }) => {
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
