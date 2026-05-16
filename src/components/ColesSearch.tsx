"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Loader2, Search, ExternalLink } from "lucide-react";

interface SearchResult {
  id: string;
  name: string;
  brand: string | null;
  dosage: string | null;
  imageUrl: string | null;
  costPrice: number | null;
  colesUrl: string | null;
}

interface Props {
  onSelect: (result: SearchResult) => void;
}

export default function ColesSearch({ onSelect }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data: SearchResult[] = await res.json();
      setResults(data);
      setOpen(data.length > 0);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(val), 500);
  }

  function handleSelect(r: SearchResult) {
    onSelect(r);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  // Гадна дарахад хаах
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <Input
          placeholder="Coles-с нэр, брэндээр хайх... (жишээ: Blackmores Bio C 1000)"
          value={query}
          onChange={handleInput}
          className="pl-9 pr-8"
          onFocus={() => results.length > 0 && setOpen(true)}
        />
        {loading && (
          <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 animate-spin" />
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {results.map((r) => (
            <button
              key={r.id}
              type="button"
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left border-b last:border-b-0"
              onClick={() => handleSelect(r)}
            >
              {/* Зураг */}
              <div className="shrink-0 w-12 h-12 rounded border bg-gray-50 flex items-center justify-center overflow-hidden">
                {r.imageUrl ? (
                  <Image
                    src={r.imageUrl}
                    alt={r.name}
                    width={48}
                    height={48}
                    className="object-contain"
                    unoptimized
                  />
                ) : (
                  <span className="text-gray-300 text-xs">—</span>
                )}
              </div>

              {/* Мэдээлэл */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{r.name}</p>
                <p className="text-xs text-gray-500 truncate">
                  {[r.brand, r.dosage].filter(Boolean).join(" · ")}
                </p>
                {r.costPrice != null && (
                  <p className="text-xs text-blue-600 font-medium mt-0.5">A${r.costPrice.toFixed(2)}</p>
                )}
              </div>

              {/* Coles линк */}
              {r.colesUrl && (
                <a
                  href={r.colesUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0 text-gray-300 hover:text-blue-500 transition-colors"
                  title="Coles дээр харах"
                >
                  <ExternalLink size={14} />
                </a>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
