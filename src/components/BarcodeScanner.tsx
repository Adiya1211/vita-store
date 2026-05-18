"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Camera, X } from "lucide-react";

interface Props {
  onResult: (barcode: string) => void;
  initialValue?: string;
}

export default function BarcodeScanner({ onResult, initialValue = "" }: Props) {
  const [barcode, setBarcode] = useState(initialValue);
  const [cameraOpen, setCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<BarcodeDetector | null>(null);
  const rafRef = useRef<number>(0);
  const zxingRef = useRef<any>(null);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (barcode.trim()) onResult(barcode.trim());
    }
  }

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (zxingRef.current) {
      try { zxingRef.current.reset(); } catch { }
      zxingRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    detectorRef.current = null;
    setCameraOpen(false);
  }, []);

  // Native BarcodeDetector (Android Chrome)
  useEffect(() => {
    if (!cameraOpen || !videoRef.current || !streamRef.current || !detectorRef.current) return;
    const video = videoRef.current;
    const detector = detectorRef.current;
    video.srcObject = streamRef.current;
    video.play().catch(() => {});

    const detect = async () => {
      if (!videoRef.current || !detectorRef.current) return;
      try {
        const barcodes = await detector.detect(video);
        if (barcodes.length > 0) {
          const code = barcodes[0].rawValue;
          setBarcode(code);
          stopCamera();
          onResult(code);
          return;
        }
      } catch { }
      rafRef.current = requestAnimationFrame(detect);
    };

    const onPlaying = () => { rafRef.current = requestAnimationFrame(detect); };
    video.addEventListener("playing", onPlaying);
    return () => video.removeEventListener("playing", onPlaying);
  }, [cameraOpen, stopCamera, onResult]);

  // ZXing (iOS болон бусад)
  useEffect(() => {
    if (!cameraOpen || !videoRef.current || !streamRef.current || !zxingRef.current) return;
    const video = videoRef.current;
    const reader = zxingRef.current;
    video.srcObject = streamRef.current;
    video.play().catch(() => {});

    reader.decodeFromVideoElement(video, (result: any) => {
      if (result) {
        const code = result.getText();
        setBarcode(code);
        stopCamera();
        onResult(code);
      }
    }).catch(() => {});

    return () => { try { reader.reset(); } catch { } };
  }, [cameraOpen, stopCamera, onResult]);

  const startCamera = useCallback(async () => {
    const useNative = "BarcodeDetector" in window;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (useNative) {
        detectorRef.current = new BarcodeDetector({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "qr_code"],
        });
        zxingRef.current = null;
      } else {
        detectorRef.current = null;
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        zxingRef.current = new BrowserMultiFormatReader();
      }
      setCameraOpen(true);
    } catch {
      alert("Камерт нэвтрэх зөвшөөрөл байхгүй байна.");
    }
  }, []);

  useEffect(() => { return () => stopCamera(); }, [stopCamera]);

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Barcode уншуулах эсвэл гараар бичнэ үү..."
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          onKeyDown={handleKeyDown}
          className="font-mono"
        />
        <Button
          type="button"
          variant="outline"
          onClick={cameraOpen ? stopCamera : startCamera}
          className="shrink-0"
          title="Камераар уншуулах"
        >
          {cameraOpen ? <X size={16} /> : <Camera size={16} />}
        </Button>
      </div>

      {cameraOpen && (
        <div className="relative rounded-lg overflow-hidden border bg-black aspect-video max-h-64">
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline autoPlay />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-56 h-28 border-2 border-white/70 rounded-lg relative">
              <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-green-400 rounded-tl" />
              <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-green-400 rounded-tr" />
              <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-green-400 rounded-bl" />
              <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-green-400 rounded-br" />
            </div>
          </div>
          <p className="absolute bottom-2 left-0 right-0 text-center text-white text-xs drop-shadow">
            Barcode-г хайрцаг дотор байрлуулна уу
          </p>
        </div>
      )}
    </div>
  );
}
