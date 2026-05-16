"use client";

import { useState, useEffect, useCallback } from "react";
import { X } from "lucide-react";

interface Props {
  imageUrl: string | null;
  imageUrls?: string[];
  productName: string;
}

function resolveImageUrl(url: string): string {
  const match = url.match(/coles\.com\.au\/product\/[^?#]+-(\d+)/);
  if (match) {
    const id = match[1];
    return `https://cdn.productimages.coles.com.au/productimages/${id[0]}/${id}.jpg`;
  }
  return url;
}

export default function ImageGallery({ imageUrl, productName }: Props) {
  const [open, setOpen] = useState(false);

  const resolved = imageUrl ? resolveImageUrl(imageUrl) : null;

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  if (!resolved) {
    return (
      <div className="w-10 h-10 rounded border bg-gray-50 flex items-center justify-center text-gray-300 text-xs">
        —
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-10 h-10 rounded border bg-gray-50 overflow-hidden hover:ring-2 hover:ring-blue-400 transition-all cursor-zoom-in"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={resolved} alt={productName} className="w-full h-full object-contain" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.75)" }}
          onClick={close}
        >
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={close}
              className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <X size={16} />
            </button>

            <div className="flex items-center justify-center bg-white p-6" style={{ height: 340 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resolved}
                alt={productName}
                className="max-w-full max-h-full object-contain"
              />
            </div>

            <div className="px-5 py-3 border-t">
              <p className="text-sm font-medium text-gray-800 truncate">{productName}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
