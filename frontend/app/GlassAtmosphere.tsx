"use client";

import { useEffect } from "react";

export default function GlassAtmosphere() {
  useEffect(() => {
    const root = document.documentElement;

    const updatePointer = (event: PointerEvent) => {
      root.style.setProperty("--pointer-x", `${event.clientX}px`);
      root.style.setProperty("--pointer-y", `${event.clientY}px`);
    };

    const resetPointer = () => {
      root.style.setProperty("--pointer-x", "50vw");
      root.style.setProperty("--pointer-y", "35vh");
    };

    resetPointer();
    window.addEventListener("pointermove", updatePointer, { passive: true });
    window.addEventListener("pointerleave", resetPointer);

    return () => {
      window.removeEventListener("pointermove", updatePointer);
      window.removeEventListener("pointerleave", resetPointer);
    };
  }, []);

  return null;
}