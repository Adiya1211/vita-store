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
        setSourceLabel(
          data.source === "coles" ? "Coles" :
          data.source === "cache" ? "Кэш" :
          "Open Food Facts"
        );
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

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // USB barcode scanner-ууд Enter товч дардаг
    if (e.key === "Enter") {
      e.preventDefault();
      lookupBarcode(barcode);
    }
  }

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOpen(false);
  }, []);

  const startCamera = useCallback(async () => {
    if (!("BarcodeDetector" in window)) {
      alert("Таны браузер камераар barcode уншихыг дэмждэггүй. Chrome ашиглана уу.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      setCameraOpen(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      // BarcodeDetector API (Chrome 83+, Edge, Android)
      const detector = new BarcodeDetector({
        formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39"],
      });
      detectorRef.current = detector;

      const detect = async () => {
        if (!videoRef.current || !detectorRef.current) return;
        try {
          const barcodes = await detectorRef.current.detect(videoRef.current);
          if (barcodes.length > 0) {
            const code = barcodes[0].rawValue;
            setBarcode(code);
            stopCamera();
            lookupBarcode(code);
            return;
          }
        } catch {
          // continue scanning
        }
        rafRef.current = requestAnimationFrame(detect);
      };

      videoRef.current?.addEventListener("playing", () => {
        rafRef.current = requestAnimationFrame(detect);
      });
    } catch {
      alert("Камерт нэвтрэх зөвшөөрөл байхгүй байна.");
    }
  }, [stopCamera]);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

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
            onChange={(e) => {
              setBarcode(e.target.value);
              setStatus("idle");
            }}
            onKeyDown={handleKeyDown}
            className="pr-8 font-mono"
          />
          {statusIcon && (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
              {statusIcon}
            </span>
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => lookupBarcode(barcode)}
          disabled={scanning || !barcode.trim()}
          className="shrink-0"
        >
          Хайх
        </Button>

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

      {statusText && (
        <p className={`text-xs flex items-center gap-1.5 ${
          status === "found" ? "text-green-600" :
          status === "notfound" ? "text-amber-600" :
          status === "error" ? "text-red-500" : "text-blue-500"
        }`}>
          {statusIcon}
          {statusText}
        </p>
      )}

      {cameraOpen && (
        <div className="relative rounded-lg overflow-hidden border bg-black aspect-video max-h-48">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            muted
            playsInline
          />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-24 border-2 border-white/70 rounded-lg relative">
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-green-400 rounded-tl" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-green-400 rounded-tr" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-green-400 rounded-bl" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-green-400 rounded-br" />
            </div>
          </div>
          <p className="absolute bottom-2 left-0 right-0 text-center text-white text-xs">
            Barcode-г хайрцаг дотор байрлуулна уу
          </p>
        </div>
      )}
    </div>
  );
}
