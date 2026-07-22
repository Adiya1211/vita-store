"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { ShoppingCart } from "lucide-react";

interface Product {
  id: string;
  name: string;
  brand: string;
  dosage: string | null;
  quantity: number;
  sellingPrice: number;
  _ids?: string[];
}

interface Props {
  product: Product | null;
  onClose: () => void;
  onDone: () => void;
}

export default function SaleModal({ product, onClose, onDone }: Props) {
  const [quantity, setQuantity] = useState("1");
  const [actualPrice, setActualPrice] = useState("");
  const [bonus, setBonus] = useState("");
  const [paymentType, setPaymentType] = useState<"PAID" | "CREDIT">("PAID");
  const [note, setNote] = useState("");
  const [soldAt, setSoldAt] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (product) {
      setQuantity("1");
      setActualPrice(String(product.sellingPrice));
      setBonus("");
      setPaymentType("PAID");
      setNote("");
      setSoldAt(new Date().toISOString().split("T")[0]);
      setError("");
    }
  }, [product]);

  if (!product) return null;

  const totalAmount = (Number(actualPrice) || 0) * (Number(quantity) || 0);

  async function handleSubmit() {
    setError("");
    if (Number(quantity) < 1) { setError("Тоо 1-ээс их байх ёстой"); return; }
    if (Number(quantity) > product!.quantity) {
      setError(`Үлдэгдэл: ${product!.quantity}ш`);
      return;
    }
    if (!actualPrice) { setError("Зарагдсан үнэ оруулна уу"); return; }

    setSaving(true);
    const res = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: product!.id,
        productIds: product!._ids && product!._ids.length ? product!._ids : [product!.id],
        quantity: Number(quantity),
        sellingPrice: product!.sellingPrice,
        actualPrice: Number(actualPrice),
        bonus: bonus ? Number(bonus) : null,
        paymentType,
        note: note || null,
        soldAt,
      }),
    });
    setSaving(false);

    if (res.ok) {
      toast.success("Борлуулалт бүртгэгдлээ");
      onDone();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Алдаа гарлаа");
      toast.error(d.error || "Алдаа гарлаа");
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart size={16} className="text-green-500" />
            Борлуулалт бүртгэх
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1 overflow-y-auto flex-1 -mx-1 px-1">
          {/* Бараа */}
          <div className="bg-gray-50 border rounded-lg px-3 py-2.5 space-y-0.5">
            <p className="font-medium text-sm">{product.brand} {product.name}</p>
            {product.dosage && <p className="text-xs text-gray-500">{product.dosage}</p>}
            <p className="text-xs text-gray-400">Үлдэгдэл: <b className="text-gray-700">{product.quantity}ш</b></p>
          </div>

          {/* Тоо ширхэг */}
          <div className="space-y-1">
            <Label>Тоо ширхэг <span className="text-red-500">*</span></Label>
            <Input
              type="number" min={1} max={product.quantity}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>

          {/* Зарах үнэ (системийн, read-only) */}
          <div className="space-y-1">
            <Label>Зарах үнэ</Label>
            <Input
              value={`₮${product.sellingPrice.toLocaleString("mn-MN")}`}
              readOnly
              className="bg-gray-50 text-gray-500"
            />
          </div>

          {/* Зарагдсан үнэ */}
          <div className="space-y-1">
            <Label>Зарагдсан үнэ <span className="text-red-500">*</span></Label>
            <Input
              type="number"
              value={actualPrice}
              onChange={(e) => setActualPrice(e.target.value)}
              placeholder="0"
            />
            {Number(actualPrice) !== product.sellingPrice && Number(actualPrice) > 0 && (
              <p className="text-xs text-amber-600">
                ⚠ Системийн үнэнээс {Number(actualPrice) > product.sellingPrice ? "өндөр" : "доогуур"} байна
              </p>
            )}
          </div>

          {/* Нийт дүн */}
          {totalAmount > 0 && (
            <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-2 flex justify-between items-center">
              <span className="text-sm text-gray-600">Нийт дүн</span>
              <span className="font-bold text-green-700">₮{totalAmount.toLocaleString("mn-MN")}</span>
            </div>
          )}

          {/* Бонус */}
          <div className="space-y-1">
            <Label>Бонус (₮)</Label>
            <Input
              type="number"
              value={bonus}
              onChange={(e) => setBonus(e.target.value)}
              placeholder="0"
            />
            <p className="text-xs text-gray-400">Зуучлагчид өгөх мөнгө</p>
          </div>

          {/* Төлбөрийн нөхцөл */}
          <div className="space-y-1">
            <Label>Төлбөрийн нөхцөл</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPaymentType("PAID")}
                className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  paymentType === "PAID"
                    ? "bg-green-600 text-white border-green-600"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                Төлөгдсөн
              </button>
              <button
                type="button"
                onClick={() => setPaymentType("CREDIT")}
                className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  paymentType === "CREDIT"
                    ? "bg-orange-500 text-white border-orange-500"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                Зээл
              </button>
            </div>
          </div>

          {/* Тэмдэглэл */}
          <div className="space-y-1">
            <Label>Тэмдэглэл</Label>
            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Нэмэлт тэмдэглэл..."
            />
          </div>

          {/* Огноо */}
          <div className="space-y-1">
            <Label>Огноо</Label>
            <Input
              type="date"
              value={soldAt}
              onChange={(e) => setSoldAt(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Цуцлах</Button>
          <Button onClick={handleSubmit} disabled={saving} className="gap-1.5">
            <ShoppingCart size={14} />
            {saving ? "Бүртгэж байна..." : "Бүртгэх"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
