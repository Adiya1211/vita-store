"use client";

import { useState } from "react";
import { RefreshCw, Pencil, Check, X } from "lucide-react";

interface Props {
  rate: number;
  date: string | null;
  source?: string;
  isAdmin?: boolean;
  onRateChange?: (newRate: number) => void;
}

export default function ExchangeRateBadge({ rate, date, source, isAdmin, onRateChange }: Props) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const val = Number(input);
    if (!val || val <= 0) return;
    setSaving(true);
    await fetch("/api/exchange-rate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rate: val }),
    });
    setSaving(false);
    setEditing(false);
    onRateChange?.(val);
  }

  async function handleReset() {
    setSaving(true);
    await fetch("/api/exchange-rate", { method: "DELETE" });
    const d = await fetch("/api/exchange-rate").then(r => r.json());
    setSaving(false);
    setEditing(false);
    onRateChange?.(d.rate);
  }

  if (editing) {
    return (
      <div className="ml-auto flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1">
        <span className="text-xs text-blue-600">1 A$ = ₮</span>
        <input
          type="number"
          className="w-20 text-xs font-semibold bg-transparent outline-none text-blue-700"
          placeholder={String(rate)}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
          autoFocus
        />
        <button onClick={handleSave} disabled={saving} className="text-blue-600 hover:text-blue-800">
          <Check size={13} />
        </button>
        <button onClick={() => setEditing(false)} className="text-gray-400 hover:text-gray-600">
          <X size={13} />
        </button>
        {source === "manual" && (
          <button onClick={handleReset} disabled={saving} className="text-xs text-gray-400 hover:text-red-500 ml-1" title="Автомат ханш руу буцах">
            auto
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="ml-auto flex items-center gap-1.5 text-xs text-gray-400 bg-gray-50 border rounded-lg px-3 py-1.5">
      <RefreshCw size={11} className={rate === 0 ? "animate-spin" : ""} />
      {rate > 0 ? (
        <>
          <span>
            1 A$ = <span className="font-semibold text-gray-700">₮{rate.toLocaleString("mn-MN")}</span>
            {date && <span className="ml-1 text-gray-300">({date})</span>}
            {source === "manual" && <span className="ml-1 text-blue-400">(гараар)</span>}
          </span>
          {isAdmin && (
            <button
              onClick={() => { setInput(String(rate)); setEditing(true); }}
              className="ml-1 text-gray-300 hover:text-gray-500 transition-colors"
              title="Ханш засах"
            >
              <Pencil size={11} />
            </button>
          )}
        </>
      ) : (
        <span>Ханш татаж байна...</span>
      )}
    </div>
  );
}
