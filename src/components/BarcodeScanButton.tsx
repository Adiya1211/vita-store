"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Camera, X } from "lucide-react";

export default function BarcodeScanButton({ onResult }: { onResult: (code: string) => void }) {
  const [open, setOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const zxingRef = useRef<any>(null);
  const detectorRef = useRef<any>(null);

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (zxingRef.current) { try { zxingRef.current.reset(); } catch {} zxingRef.current = null; }
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    detectorRef.current = null;
    setOpen(false);
  }, []);

  useEffect(() => { return () => stop(); }, [stop]);

  useEffect(() => {
    if (!open || !videoRef.current || !streamRef.current) return;
    const video = videoRef.current;
    video.srcObject = streamRef.current;
    video.play().catch(() => {});

    if (detectorRef.current) {
      const detector = detectorRef.current;
      const detect = async () => {
        try {
          const barcodes = await detector.detect(video);
          if (barcodes.length > 0) { onResult(barcodes[0].rawValue); stop(); return; }
        } catch {}
        rafRef.current = requestAnimationFrame(detect);
      };
      video.addEventListener("playing", () => { rafRef.current = requestAnimationFrame(detect); }, { once: true });
    } else if (zxingRef.current) {
      zxingRef.current.decodeFromVideoElement(video, (result: any) => {
        if (result) { onResult(result.getText()); stop(); }
      }).catch(() => {});
    }
  }, [open, stop, onResult]);

  async function start() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if ("BarcodeDetector" in window) {
        detectorRef.current = new (window as any).BarcodeDetector({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "qr_code"],
        });
      } else {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        zxingRef.current = new BrowserMultiFormatReader();
      }
      setOpen(true);
    } catch {
      alert("Камерт нэвтрэх зөвшөөрөл байхгүй байна.");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={open ? stop : start}
        className={`shrink-0 h-9 w-9 flex items-center justify-center rounded-lg border bg-white transition-colors ${open ? "border-indigo-400 text-indigo-500" : "text-gray-400 hover:text-gray-600 hover:border-gray-300"}`}
        title="Камераар бар код уншуулах"
      >
        {open ? <X size={15} /> : <Camera size={15} />}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 rounded-xl overflow-hidden border bg-black shadow-xl" style={{ width: 320, aspectRatio: "16/9" }}>
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline autoPlay />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-24 border-2 border-white/60 rounded-lg relative">
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-green-400 rounded-tl" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-green-400 rounded-tr" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-green-400 rounded-bl" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-green-400 rounded-br" />
            </div>
          </div>
          <p className="absolute bottom-2 left-0 right-0 text-center text-white text-xs drop-shadow">
            Бар кодыг хайрцаг дотор байрлуулна уу
          </p>
        </div>
      )}
    </>
  );
}
