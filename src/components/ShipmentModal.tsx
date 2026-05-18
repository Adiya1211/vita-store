"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Ship, Plus } from "lucide-react";

interface Shipment {
  id: string;
  name: string;
  sentAt: string;
  products: { id: string; assignedTo: { id: string; name: string } | null }[];
}

interface Product {
  id: string;
  name: string;
  brand: string;
  dosage: string | null;
  quantity: number;
}

interface User {
  id: string;
  name: string;
}

interface Props {
  product: Product | null;
  users: User[];
  onClose: () => void;
  onDone: () => void;
}

export default function ShipmentModal({ product, users, onClose, onDone }: Props) {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [mode, setMode] = useState<"select" | "create">("select");
  const [sendQty, setSendQty] = useState(1);
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);
  const [toUserId, setToUserId] = useState("");
  const [newName, setNewName] = useState("");
  const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (product) {
      fetch("/api/shipments").then(r => r.json()).then(setShipments);
      setMode("select");
      setSendQty(product.quantity);
      setSelectedShipmentId(null);
      setToUserId("");
      setError("");
      setNewName("");
    }
  }, [product]);

  if (!product) return null;

  async function submit(shipmentId: string | null, shipmentName?: string, shipmentDate?: string) {
    if (sendQty < 1 || sendQty > product!.quantity) {
      setError(`1–${product!.quantity} хооронд байх ёстой`);
      return;
    }
    if (!shipmentId && !toUserId) {
      setError("Хүлээн авах борлуулагч сонгоно уу");
      return;
    }
    setSaving(true);
    setError("");

    const res = await fetch("/api/shipments/add-product", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: product!.id,
        quantity: sendQty,
        toUserId: toUserId || null,
        shipmentId,
        shipmentName,
        shipmentDate,
      }),
    });

    setSaving(false);
    if (res.ok) {
      toast.success("Монголруу илгээгдлээ");
      onDone();
    } else {
      const d = await res.json().catch(() => ({}));
      const msg = d.error || "Алдаа гарлаа";
      setError(msg);
      toast.error(msg);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ship size={16} className="text-blue-500" />
            Монголруу илгээх
          </DialogTitle>
        </DialogHeader>

        <div className="py-1 space-y-4">
          {/* Бүтээгдэхүүний мэдээлэл */}
          <div className="rounded-lg bg-gray-50 border px-3 py-2 text-sm space-y-0.5">
            <p className="font-medium">{product.brand} {product.name}</p>
            {product.dosage && <p className="text-gray-500 text-xs">{product.dosage}</p>}
            <p className="text-xs text-gray-500">
              Админд хуваарьлагдсан тоо: <b className="text-gray-800">{product.quantity} ширхэг</b>
            </p>
          </div>

          {/* Явуулах тоо */}
          <div className="space-y-1">
            <Label>Монголруу явуулах тоо</Label>
            <Input
              type="number"
              min={1}
              max={product.quantity}
              value={sendQty}
              onChange={e => setSendQty(Number(e.target.value))}
            />
            {sendQty > 0 && sendQty < product.quantity && (
              <p className="text-xs text-amber-600">
                ⚠ {product.quantity - sendQty} ширхэг үлдэнэ
              </p>
            )}
          </div>

          {/* Ачаа сонгох / үүсгэх */}
          {mode === "select" ? (
            <div className="space-y-2">
              <Label>Аль ачаанд нэмэх вэ?</Label>
              {shipments.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-2">Байгаа ачаа байхгүй</p>
              ) : (
                <div className="border rounded-lg divide-y max-h-44 overflow-y-auto">
                  {shipments.map(s => {
                    const alreadyIn = s.products.some(p => p.id === product.id);
                    const isSelected = selectedShipmentId === s.id;
                    return (
                      <button
                        key={s.id}
                        disabled={alreadyIn}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedShipmentId(null);
                            setToUserId("");
                          } else {
                            setSelectedShipmentId(s.id);
                            // Ачааны байгаа бүтээгдэхүүнүүдийн борлуулагчийг автоматаар дүүргэх
                            const seller = s.products.find(p => p.assignedTo)?.assignedTo;
                            if (seller) setToUserId(seller.id);
                          }
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed ${
                          isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                        }`}
                      >
                        <div>
                          <p className="text-sm font-medium">{s.name}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(s.sentAt).toLocaleDateString("mn-MN")} · {s.products.length} бараа
                          </p>
                        </div>
                        {alreadyIn
                          ? <span className="text-xs text-green-600">✓ Нэмэгдсэн</span>
                          : isSelected && <span className="text-xs text-blue-600">✓</span>
                        }
                      </button>
                    );
                  })}
                </div>
              )}
              {/* Сонгосон ачааны борлуулагч */}
              {selectedShipmentId && (
                <div className="space-y-1 pt-1">
                  <Label>Борлуулагч</Label>
                  <select
                    value={toUserId}
                    onChange={e => setToUserId(e.target.value)}
                    className="w-full border rounded-md px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-gray-300"
                  >
                    <option value="">— Сонгох —</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <button
                onClick={() => setMode("create")}
                className="w-full flex items-center justify-center gap-2 border border-dashed rounded-lg py-2 text-sm text-gray-500 hover:text-gray-700 hover:border-gray-400 transition-colors"
              >
                <Plus size={14} />
                Шинэ ачаа үүсгэж нэмэх
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label>Ачааны нэр <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="Жишээ: 1-р ачаа, 2025 Зун..."
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <Label>Явуулсан огноо</Label>
                <Input
                  type="date"
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Хүлээн авах борлуулагч <span className="text-red-500">*</span></Label>
                <select
                  value={toUserId}
                  onChange={e => setToUserId(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  <option value="">— Сонгох —</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => setMode("select")}
                className="text-sm text-gray-400 hover:text-gray-600"
              >
                ← Байгаа ачаанаас сонгох
              </button>
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Цуцлах</Button>
          <Button
            disabled={saving || (mode === "select" && !selectedShipmentId) || (mode === "create" && !newName)}
            onClick={() => {
              if (mode === "select") submit(selectedShipmentId);
              else submit(null, newName, newDate);
            }}
          >
            {saving ? "Илгээж байна..." : "Илгээх"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
