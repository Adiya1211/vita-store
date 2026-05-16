"use client";

import { useEffect, useState, useRef } from "react";
import { Check, ChevronDown, Plus, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Option {
  id: string;
  value: string;
}

interface Props {
  category: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}

export default function DynamicSelect({ category, value, onChange, placeholder = "Сонгох...", required }: Props) {
  const [options, setOptions] = useState<Option[]>([]);
  const [open, setOpen] = useState(false);
  const [addingNew, setAddingNew] = useState(false);
  const [newValue, setNewValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const newInputRef = useRef<HTMLInputElement>(null);

  async function loadOptions() {
    const res = await fetch(`/api/dropdown-options?category=${category}`);
    const data = await res.json();
    setOptions(data);
  }

  useEffect(() => {
    loadOptions();
  }, [category]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setAddingNew(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  useEffect(() => {
    if (addingNew && newInputRef.current) newInputRef.current.focus();
  }, [addingNew]);

  async function handleAddNew() {
    if (!newValue.trim()) return;
    setSaving(true);
    const res = await fetch("/api/dropdown-options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, value: newValue.trim() }),
    });
    if (res.ok) {
      const created = await res.json();
      setOptions((prev) => [...prev, created].sort((a, b) => a.value.localeCompare(b.value)));
      onChange(newValue.trim());
      setNewValue("");
      setAddingNew(false);
      setOpen(false);
      setSearch("");
    }
    setSaving(false);
  }

  function handleSelect(v: string) {
    onChange(v);
    setOpen(false);
    setSearch("");
    setAddingNew(false);
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange("");
  }

  const filtered = options.filter((o) =>
    o.value.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={cn(
          "flex items-center w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-left transition-colors",
          "hover:bg-accent hover:text-accent-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          !value && "text-muted-foreground"
        )}
      >
        <span className="flex-1 truncate">{value || placeholder}</span>
        <span className="flex items-center gap-1 ml-2 shrink-0">
          {value && (
            <span
              onClick={handleClear}
              className="rounded hover:bg-muted p-0.5 cursor-pointer"
            >
              <X size={12} />
            </span>
          )}
          <ChevronDown size={14} className={cn("transition-transform", open && "rotate-180")} />
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          {/* Search */}
          <div className="p-2 border-b">
            <input
              ref={inputRef}
              type="text"
              placeholder="Хайх..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-sm outline-none bg-transparent placeholder:text-muted-foreground"
            />
          </div>

          {/* Options list */}
          <div className="max-h-48 overflow-y-auto">
            {filtered.length === 0 && !addingNew && (
              <p className="text-xs text-muted-foreground text-center py-4">Олдсонгүй</p>
            )}
            {filtered.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => handleSelect(o.value)}
                className={cn(
                  "flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent text-left",
                  value === o.value && "bg-accent/50"
                )}
              >
                <Check size={13} className={cn("shrink-0", value === o.value ? "opacity-100 text-blue-600" : "opacity-0")} />
                {o.value}
              </button>
            ))}
          </div>

          {/* Add new */}
          <div className="border-t p-2">
            {addingNew ? (
              <div className="flex gap-1.5">
                <input
                  ref={newInputRef}
                  type="text"
                  placeholder="Шинэ утга..."
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); handleAddNew(); }
                    if (e.key === "Escape") { setAddingNew(false); setNewValue(""); }
                  }}
                  className="flex-1 text-sm border rounded px-2 py-1 outline-none focus:ring-1 focus:ring-ring"
                />
                <button
                  type="button"
                  onClick={handleAddNew}
                  disabled={saving || !newValue.trim()}
                  className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                >
                  {saving ? <Loader2 size={12} className="animate-spin" /> : "Нэмэх"}
                </button>
                <button
                  type="button"
                  onClick={() => { setAddingNew(false); setNewValue(""); }}
                  className="px-2 py-1 text-xs border rounded hover:bg-muted"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAddingNew(true)}
                className="flex items-center gap-1.5 w-full text-sm text-blue-600 hover:text-blue-700 py-0.5"
              >
                <Plus size={13} />
                Шинэ {category === "brand" ? "брэнд" : "дэлгүүр"} нэмэх
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
