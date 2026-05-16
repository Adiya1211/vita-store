"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShoppingCart } from "lucide-react";
import Link from "next/link";

interface Product {
  id: string;
  brand: string;
  name: string;
  dosage: string | null;
  quantity: number;
  sellingPrice: number;
  barcode: string | null;
}

export default function NewSalePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [sellingPrice, setSellingPrice] = useState("");
  const [bonus, setBonus] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [soldAt, setSoldAt] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    fetch("/api/products")
      .then((r) => r.json())
      .then((data) => {
        // Зөвхөн APPROVED бараа + тоо > 0
        setProducts(data.filter((p: Product & { status: string }) =>
          p.status === "APPROVED" && p.quantity > 0
        ));
        setLoading(false);
      });
  }, []);

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  function handleProductChange(id: string) {
    setSelectedProductId(id);
    const p = products.find((p) => p.id === id);
    if (p) {
      setSellingPrice(String(p.sellingPrice));
      setQuantity("1");
    }
  }

  const totalAmount = (Number(sellingPrice) || 0) * (Number(quantity) || 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!selectedProductId) { setError("Бараа сонгоно уу"); return; }
    if (Number(quantity) < 1) { setError("Тоо 1-ээс их байх ёстой"); return; }
    if (selectedProduct && Number(quantity) > selectedProduct.quantity) {
      setError(`Тоо барааны үлдэгдэл (${selectedProduct.quantity})-ээс их байна`);
      return;
    }

    setSaving(true);
    const res = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: selectedProductId,
        quantity: Number(quantity),
        sellingPrice: Number(sellingPrice),
        bonus: bonus ? Number(bonus) : null,
        customerName: customerName || null,
        soldAt,
      }),
    });

    setSaving(false);
    if (res.ok) {
      toast.success("Борлуулалт бүртгэгдлээ");
      router.push("/sales");
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Алдаа гарлаа");
      toast.error(d.error || "Алдаа гарлаа");
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/sales">
          <Button variant="ghost" size="sm"><ArrowLeft size={16} /></Button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold">Борлуулалт бүртгэх</h1>
          <p className="text-sm text-gray-400 mt-0.5">{session?.user?.name}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardContent className="pt-5 space-y-4">

            {/* Бараа сонгох */}
            <div className="space-y-1">
              <Label>Бараа <span className="text-red-500">*</span></Label>
              {loading ? (
                <p className="text-sm text-gray-400">Уншиж байна...</p>
              ) : products.length === 0 ? (
                <p className="text-sm text-amber-600">Зарах бараа байхгүй байна</p>
              ) : (
                <select
                  value={selectedProductId}
                  onChange={(e) => handleProductChange(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-gray-200"
                  required
                >
                  <option value="">— Бараа сонгох —</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.brand} {p.name}{p.dosage ? ` (${p.dosage})` : ""} — үлдэгдэл: {p.quantity}ш
                    </option>
                  ))}
                </select>
              )}
              {selectedProduct && (
                <p className="text-xs text-gray-400">
                  Системийн үнэ: ₮{selectedProduct.sellingPrice.toLocaleString("mn-MN")} · Үлдэгдэл: {selectedProduct.quantity}ш
                </p>
              )}
            </div>

            {/* Тоо */}
            <div className="space-y-1">
              <Label>Зарсан тоо <span className="text-red-500">*</span></Label>
              <Input
                type="number"
                min={1}
                max={selectedProduct?.quantity}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>

            {/* Зарсан үнэ */}
            <div className="space-y-1">
              <Label>Зарсан үнэ (₮) <span className="text-red-500">*</span></Label>
              <Input
                type="number"
                placeholder="0"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                required
              />
            </div>

            {/* Нийт дүн */}
            {totalAmount > 0 && (
              <div className="bg-gray-50 rounded-lg px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-gray-500">Нийт дүн</span>
                <span className="text-lg font-bold text-gray-900">₮{totalAmount.toLocaleString("mn-MN")}</span>
              </div>
            )}

            {/* Бонус */}
            <div className="space-y-1">
              <Label>Бонус (₮)</Label>
              <Input
                type="number"
                placeholder="0"
                value={bonus}
                onChange={(e) => setBonus(e.target.value)}
              />
              <p className="text-xs text-gray-400">Зуучлагчид өгөх мөнгө</p>
            </div>

            {/* Худалдан авагчийн нэр */}
            <div className="space-y-1">
              <Label>Худалдан авагчийн нэр</Label>
              <Input
                type="text"
                placeholder="Нэр бичих..."
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>

            {/* Огноо */}
            <div className="space-y-1">
              <Label>Зарсан огноо</Label>
              <Input
                type="date"
                value={soldAt}
                onChange={(e) => setSoldAt(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex justify-end gap-3 pt-2">
              <Link href="/sales">
                <Button variant="outline" type="button">Цуцлах</Button>
              </Link>
              <Button type="submit" disabled={saving || !selectedProductId} className="gap-2">
                <ShoppingCart size={15} />
                {saving ? "Бүртгэж байна..." : "Бүртгэх"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
