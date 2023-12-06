"use client";

// @ts-ignore
import vertex from "./tri.vert.wgsl";
// @ts-ignore
import fragment from "./tri.frag.wgsl";

import { useEffect, useRef } from "react";
import { setup } from "rgpu";

export default function Home() {
  // REF
  const baseCanvas = useRef<HTMLCanvasElement>(null);

  // SETUP
  useEffect(() => {
    if (!baseCanvas.current) return;

    const dpr = window.devicePixelRatio;
    baseCanvas.current.width = window.innerWidth * dpr;
    baseCanvas.current.height = window.innerHeight * dpr;
  }, []);

  // LOOP
  useEffect(() => {
    if (!baseCanvas.current) return;

    setup({
      canvas: baseCanvas.current,
      vertexSource: vertex,
      fragmentSource: fragment,
    });
  });

  return (
    <main className="">
      <canvas ref={baseCanvas} className="h-screen w-screen" />
    </main>
  );
}
