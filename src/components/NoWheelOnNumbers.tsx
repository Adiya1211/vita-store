"use client";

import { useEffect } from "react";

export default function NoWheelOnNumbers() {
  useEffect(() => {
    function handler(e: WheelEvent) {
      if ((e.target as HTMLElement).matches('input[type="number"]')) {
        e.preventDefault();
      }
    }
    document.addEventListener("wheel", handler, { passive: false });
    return () => document.removeEventListener("wheel", handler);
  }, []);

  return null;
}
