"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface User {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  brand: string;
  quantity: number;
  assignedTo: { id: string; name: string } | null;
  _ids?: string[];
}

interface Props {
  product: Product | null;
  users: User[];
  onClose: () => void;
  onDone: () => void;
}

export default function TransferModal({ product, users, onClose, onDone }: Props) {
  const [toUserId, setToUserId] = useState("none");
  const [quantity, setQuantity] = useState(product?.quantity ?? 1);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!product) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!product) return;
    setError("");

    if (quantity < 1 || quantity > product.quantity) {
      setError(`Тоо 1–${product.quantity} хооронд байх ёстой`);
      return;
    }

    setSaving(true);
    const res = await fetch("/api/products/transfer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: product.id,
        productIds: product._ids && product._ids.length ? product._ids : [product.id],
        toUserId,
        quantity,
        note,
      }),
    });

    setSaving(false);

    if (res.ok) {
      toast.success("Амжилттай шилжүүллээ");
      onDone();
    } else {
      const text = await res.text();
      let errMsg = "Алдаа гарлаа";
      try { errMsg = JSON.parse(text).error || errMsg; } catch {}
      setError(errMsg);
      toast.error(errMsg);
    }
  }

  const isPartial = quantity < product.quantity;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Борлуулагч руу шилжүүлэх</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          {/* Бүтээгдэхүүний мэдээлэл */}
          <div className="rounded-lg bg-gray-50 border px-3 py-2">
            <p className="font-medium text-sm">{product.brand} {product.name}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Нийт тоо: <b>{product.quantity}</b> ширхэг
              {product.assignedTo && (
                <> · Одоо: <b>{product.assignedTo.name}</b></>
              )}
            </p>
          </div>

          {/* Тоо ширхэг */}
          <div className="space-y-1">
            <Label>Шилжүүлэх тоо ширхэг</Label>
            <Input
              type="number"
              min={1}
              max={product.quantity}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              required
            />
            {isPartial && (
              <p className="text-xs text-amber-600">
                ⚠ Хэсэгчилсэн шилжүүлэг: {product.quantity - quantity} ширхэг эх бүртгэлд үлдэнэ
              </p>
            )}
          </div>

          {/* Хэнрүү */}
          <div className="space-y-1">
            <Label>Хэнрүү шилжүүлэх</Label>
            <Select value={toUserId} onValueChange={(v) => setToUserId(v ?? "none")}>
              <SelectTrigger>
                <SelectValue placeholder="Борлуулагч сонгох" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Хуваарилаагүй —</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Тайлбар */}
          <div className="space-y-1">
            <Label>Тайлбар <span className="text-gray-400 font-normal">(заавал биш)</span></Label>
            <Input
              placeholder="Жишээ: Даваа гарагт явуулна..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Цуцлах</Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Шилжүүлж байна..." : "Шилжүүлэх"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
