"use client";

import { useEffect, useRef, useState } from "react";
import { setup } from "rgpu";

export default function Home() {
  const baseCanvas = useRef<HTMLCanvasElement>(null);
  const [renderContext, setRenderContext] = useState<boolean>(false);

  // SETUP
  useEffect(() => {
    if (!baseCanvas.current) return;

    const dpr = window.devicePixelRatio;
    baseCanvas.current.width = window.innerWidth * dpr;
    baseCanvas.current.height = window.innerHeight * dpr;

    setRenderContext(true);
  }, []);

  // LOOP
  useEffect(() => {
    if (!baseCanvas.current) return;
    if (!renderContext) return;

    setup({ canvas: baseCanvas.current });
  }, [renderContext]);

  return (
    <main className="">
      <canvas ref={baseCanvas} className="h-screen w-screen" />
    </main>
  );
}
