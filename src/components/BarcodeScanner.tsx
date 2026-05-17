"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Camera, X, Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface LookupResult {
  found: boolean;
  barcode: string;
  name: string | null;
  brand: string | null;
  dosage: string | null;
  imageUrl: string | null;
  costPrice: number | null;
  colesUrl: string | null;
  source: string;
}

interface Props {
  onResult: (barcode: string, data: LookupResult | null) => void;
  initialValue?: string;
}

export default function BarcodeScanner({ onResult, initialValue = "" }: Props) {
  const [barcode, setBarcode] = useState(initialValue);
  const [scanning, setScanning] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "found" | "notfound" | "error">("idle");
  const [sourceLabel, setSourceLabel] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<BarcodeDetector | null>(null);
  const rafRef = useRef<number>(0);
  const zxingRef = useRef<any>(null);
  const lookupRef = useRef<(code: string) => void>(() => {});

  async function lookupBarcode(code: string) {
    if (!code.trim()) return;
    setScanning(true);
    setStatus("loading");
    setSourceLabel("");
    try {
      const res = await fetch(`/api/lookup?barcode=${encodeURIComponent(code.trim())}`);
      const data: LookupResult = await res.json();
      if (data.found) {
        setStatus("found");
        setSourceLabel(data.source === "coles" ? "Coles" : data.source === "cache" ? "Кэш" : "Open Food Facts");
        onResult(code.trim(), data);
      } else {
        setStatus("notfound");
        onResult(code.trim(), null);
      }
    } catch {
      setStatus("error");
      onResult(code.trim(), null);
    } finally {
      setScanning(false);
    }
  }

  useEffect(() => { lookupRef.current = lookupBarcode; });

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") { e.preventDefault(); lookupBarcode(barcode); }
  }

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    // ZXing stop
    if (zxingRef.current) {
      try { zxingRef.current.reset(); } catch { }
      zxingRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    detectorRef.current = null;
    setCameraOpen(false);
  }, []);

  // Native BarcodeDetector setup (Android Chrome)
  useEffect(() => {
    if (!cameraOpen || !videoRef.current || !streamRef.current) return;
    if (detectorRef.current === null) return; // ZXing mode — skip
    if (!("BarcodeDetector" in window)) return;

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
          lookupRef.current(code);
          return;
        }
      } catch { }
      rafRef.current = requestAnimationFrame(detect);
    };

    const onPlaying = () => { rafRef.current = requestAnimationFrame(detect); };
    video.addEventListener("playing", onPlaying);
    return () => video.removeEventListener("playing", onPlaying);
  }, [cameraOpen, stopCamera]);

  // ZXing setup (iOS болон бусад)
  useEffect(() => {
    if (!cameraOpen || !videoRef.current || !streamRef.current) return;
    if (zxingRef.current === null) return; // native mode — skip

    const video = videoRef.current;
    const reader = zxingRef.current;
    video.srcObject = streamRef.current;
    video.play().catch(() => {});

    reader.decodeFromVideoElement(video, (result: any, err: any) => {
      if (result) {
        const code = result.getText();
        setBarcode(code);
        stopCamera();
        lookupRef.current(code);
      }
    }).catch(() => {});

    return () => { try { reader.reset(); } catch { } };
  }, [cameraOpen, stopCamera]);

  const startCamera = useCallback(async () => {
    const useNative = "BarcodeDetector" in window;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;

      if (useNative) {
        // Android Chrome — native BarcodeDetector
        detectorRef.current = new BarcodeDetector({
          formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39", "qr_code"],
        });
        zxingRef.current = null;
      } else {
        // iOS болон бусад — ZXing
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

  const statusIcon = {
    loading: <Loader2 size={14} className="animate-spin text-blue-500" />,
    found: <CheckCircle size={14} className="text-green-500" />,
    notfound: <AlertCircle size={14} className="text-amber-500" />,
    error: <AlertCircle size={14} className="text-red-500" />,
    idle: null,
  }[status];

  const statusText = {
    loading: "Хайж байна...",
    found: `Олдлоо (${sourceLabel})`,
    notfound: "Мэдээлэл олдсонгүй — гараар бөглөнө үү",
    error: "Алдаа гарлаа",
    idle: "",
  }[status];

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type="text"
            placeholder="Barcode уншуулах эсвэл гараар бичнэ үү..."
            value={barcode}
            onChange={(e) => { setBarcode(e.target.value); setStatus("idle"); }}
            onKeyDown={handleKeyDown}
            className="pr-8 font-mono"
          />
          {statusIcon && (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2">{statusIcon}</span>
          )}
        </div>
        <Button type="button" variant="outline" onClick={() => lookupBarcode(barcode)} disabled={scanning || !barcode.trim()} className="shrink-0">
          Хайх
        </Button>
        <Button type="button" variant="outline" onClick={cameraOpen ? stopCamera : startCamera} className="shrink-0" title="Камераар уншуулах">
          {cameraOpen ? <X size={16} /> : <Camera size={16} />}
        </Button>
      </div>

      {statusText && (
        <p className={`text-xs flex items-center gap-1.5 ${
          status === "found" ? "text-green-600" : status === "notfound" ? "text-amber-600" :
          status === "error" ? "text-red-500" : "text-blue-500"
        }`}>
          {statusIcon}{statusText}
        </p>
      )}

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
