"use client";

import { useEffect, useRef, useState } from "react";
import { X, Download, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BrochureData {
  benefits: string[];
  usage: string;
  description: string;
}

interface Product {
  brand: string;
  name: string;
  dosage: string | null;
  imageUrl: string | null;
  sellingPrice: number;
  quantity: number;
}

interface Props {
  product: Product;
  onClose: () => void;
  canRegenerate?: boolean;
}

// Монгол бүтээгдэхүүний нэрийг том үсгээр
function toMongolianTitle(brand: string, name: string): string {
  return `${brand} ${name}`.toUpperCase();
}

export default function BrochureCard({ product, onClose, canRegenerate = true }: Props) {
  const [brochure, setBrochure] = useState<BrochureData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadBrochure();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadBrochure() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        brand: product.brand,
        name: product.name,
        dosage: product.dosage ?? "",
      });
      const res = await fetch(`/api/products/brochure?${params}`);
      const text = await res.text();
      if (!text) throw new Error("Сервер хоосон хариу буцааллаа");
      const data = JSON.parse(text);

      if (data.notFound) {
        await generateBrochure(false);
      } else if (data.error) {
        setError(data.error);
        setLoading(false);
      } else {
        setBrochure(data);
        setLoading(false);
      }
    } catch (e) {
      setError(String(e));
      setLoading(false);
    }
  }

  async function generateBrochure(regenerate: boolean) {
    setGenerating(true);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/products/brochure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: product.brand,
          name: product.name,
          dosage: product.dosage,
          regenerate,
        }),
      });
      const text = await res.text();
      if (!text) throw new Error("Сервер хоосон хариу буцааллаа");
      const data = JSON.parse(text);
      if (data.error) throw new Error(data.error);
      setBrochure(data);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
      setGenerating(false);
    }
  }

  async function handleDownload() {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#f5f0e8",
      });
      const link = document.createElement("a");
      link.download = `${product.brand}-${product.name}-taniltsulga.png`.replace(/\s+/g, "-");
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto">
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <span className="font-semibold text-gray-800">Витамины танилцуулга</span>
          <div className="flex items-center gap-2">
            {canRegenerate && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => generateBrochure(true)}
                disabled={generating || loading}
                className="gap-1.5 text-xs h-8"
              >
                <RefreshCw size={13} className={generating ? "animate-spin" : ""} />
                Дахин үүсгэх
              </Button>
            )}
            <Button size="sm" onClick={handleDownload} disabled={loading || downloading} className="gap-1.5 text-xs h-8">
              <Download size={13} />
              {downloading ? "Татаж байна..." : "PNG татах"}
            </Button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <X size={18} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Card preview */}
        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
              <Loader2 size={32} className="animate-spin text-amber-500" />
              <p className="text-sm">{generating ? "Claude AI танилцуулга үүсгэж байна..." : "Уншиж байна..."}</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <p className="text-sm text-red-500 text-center max-w-sm">{error}</p>
              <Button variant="outline" size="sm" onClick={() => generateBrochure(false)}>
                Дахин оролдох
              </Button>
            </div>
          ) : brochure ? (
            /* ─── Карт — яг зургийн загвараар ─── */
            <div
              ref={cardRef}
              className="relative rounded-xl overflow-hidden select-none"
              style={{ background: "linear-gradient(135deg, #f5f0e8 0%, #ede8d5 100%)", minHeight: 460 }}
            >
              <div className="flex h-full">
                {/* Зүүн хэсэг — текст */}
                <div className="flex-1 p-8 flex flex-col justify-between">
                  {/* Брэнд нэр */}
                  <div>
                    <p
                      className="text-base font-black tracking-widest mb-1"
                      style={{ color: "#2d2d2d", fontFamily: "Arial Black, sans-serif" }}
                    >
                      {product.brand.toUpperCase()}
                    </p>

                    {/* Бүтээгдэхүүний нэр */}
                    <h1
                      className="text-3xl font-black leading-tight mb-5"
                      style={{ color: "#c17f3a", fontFamily: "Arial Black, sans-serif" }}
                    >
                      {product.name.toUpperCase()}
                      {product.dosage && (
                        <span className="block text-lg font-bold text-gray-500 mt-1">
                          {product.dosage}
                        </span>
                      )}
                    </h1>

                    {/* Ашиг тусууд */}
                    <div
                      className="rounded-xl p-4 mb-4"
                      style={{ background: "rgba(193, 127, 58, 0.15)" }}
                    >
                      <ul className="space-y-2">
                        {(brochure.benefits as string[]).map((b, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-800 leading-snug">
                            <span className="text-amber-600 font-bold mt-0.5">✓</span>
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Хэрэглэх заавар */}
                    <div>
                      <p className="text-sm font-bold text-gray-800 mb-1">Хэрэглэх заавар:</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{brochure.usage}</p>
                    </div>
                  </div>

                  {/* Үнэ */}
                  <div className="mt-5">
                    <p
                      className="text-2xl font-black"
                      style={{ color: "#c17f3a", fontFamily: "Arial Black, sans-serif" }}
                    >
                      {product.quantity} ширхэг
                    </p>
                    <p
                      className="text-2xl font-black"
                      style={{ color: "#c17f3a", fontFamily: "Arial Black, sans-serif" }}
                    >
                      {product.sellingPrice.toLocaleString("mn-MN")}₮
                    </p>
                  </div>
                </div>

                {/* Баруун хэсэг — зураг */}
                <div className="w-52 flex items-center justify-center p-4 shrink-0">
                  {product.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="object-contain w-full h-full max-h-80 drop-shadow-xl"
                      crossOrigin="anonymous"
                    />
                  ) : (
                    <div className="w-full h-64 rounded-2xl bg-white/50 flex items-center justify-center text-gray-300 text-sm">
                      Зураг байхгүй
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
