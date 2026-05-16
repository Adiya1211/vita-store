"use client";

import { Input } from "@/components/ui/input";

interface Props {
  urls: string[];
  onChange: (urls: string[]) => void;
}

function resolveImageUrl(url: string): string {
  const match = url.match(/coles\.com\.au\/product\/[^?#]+-(\d+)/);
  if (match) {
    const id = match[1];
    return `https://cdn.productimages.coles.com.au/productimages/${id[0]}/${id}.jpg`;
  }
  return url;
}

export default function MultiImageInput({ urls, onChange }: Props) {
  const value = urls[0] ?? "";

  function handleChange(raw: string) {
    const resolved = resolveImageUrl(raw.trim());
    onChange(resolved ? [resolved] : []);
  }

  return (
    <div className="space-y-2">
      {value && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt="preview"
          className="w-20 h-20 object-contain rounded-lg border bg-gray-50"
        />
      )}
      <Input
        placeholder="Coles хуудасны URL эсвэл зургийн URL тавина уу..."
        defaultValue={urls[0] ?? ""}
        onChange={(e) => handleChange(e.target.value)}
      />
      <p className="text-xs text-gray-400">
        Жишээ: https://www.coles.com.au/product/blackmores-bio-c-...-3788087
      </p>
    </div>
  );
}
