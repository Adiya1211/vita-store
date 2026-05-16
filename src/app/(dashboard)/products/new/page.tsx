"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Scan, Copy, RefreshCw } from "lucide-react";
import Link from "next/link";
import BarcodeScanner from "@/components/BarcodeScanner";
import DynamicSelect from "@/components/DynamicSelect";
import MultiImageInput from "@/components/MultiImageInput";

interface FieldConfig {
  id: string;
  fieldKey: string;
  label: string;
  fieldType: string;
  isVisible: boolean;
  isRequired: boolean;
  sortOrder: number;
  isCustom: boolean;
}

interface User {
  id: string;
  name: string;
}

interface LookupResult {
  found: boolean;
  barcode: string;
  name: string | null;
  brand: string | null;
  dosage: string | null;
  imageUrl: string | null;
  costPrice: number | null;
  colesUrl: string | null;
  source: string;
}

const BASE_FIELD_META: Record<string, { type: string; placeholder?: string }> = {
  registeredAt: { type: "date" },
  store: { type: "text", placeholder: "Жишээ: Coles" },
  brand: { type: "text", placeholder: "Брэндийн нэр" },
  name: { type: "text", placeholder: "Витаминын нэр" },
  dosage: { type: "text", placeholder: "500mg, 60 capsules..." },
  quantity: { type: "number", placeholder: "0" },
  costPrice: { type: "number", placeholder: "0.00" },
  discountedPrice: { type: "number", placeholder: "0.00" },
  totalPrice: { type: "number", placeholder: "0.00" },
  sellingPrice: { type: "number", placeholder: "0" },
  profit: { type: "number", placeholder: "" },
  assignedUserId: { type: "user_select" },
  barcode: { type: "text", placeholder: "Barcode" },
  imageUrl: { type: "text", placeholder: "https://..." },
};

// Зарах үнэ = (хямдарсан үнэ × 2 + 15) × ханш
// Ашиг    = зарах үнэ − хямдарсан үнэ × ханш
function recalculate(
  data: Record<string, string>,
  rate: number,
  trigger?: string
): Record<string, string> {
  const next = { ...data };
  const costPrice = Number(next.costPrice) || 0;
  const qty = Number(next.quantity) || 1;

  // costPrice оруулахад хямдарсан үнэ автомат = costPrice / 2 (хоосон байвал)
  if (trigger === "costPrice" && costPrice && !next.discountedPrice) {
    next.discountedPrice = (costPrice / 2).toFixed(2);
  }

  const discountedPrice = next.discountedPrice ? Number(next.discountedPrice) : null;

  // Нийт үнэ = costPrice × тоо ширхэг (A$)
  next.totalPrice = (costPrice * qty).toFixed(2);

  // Зарах үнэ автомат (sellingPrice өөрөө өөрчлөгдсөн бол дахин бодохгүй)
  if (trigger !== "sellingPrice" && rate > 0) {
    const dp = discountedPrice ?? (costPrice > 0 ? costPrice / 2 : 0);
    if (dp > 0) {
      next.sellingPrice = Math.round((dp * 2 + 15) * rate).toString();
    }
  }

  // Ашиг = зарах үнэ − хямдарсан үнэ × ханш (нэгж)
  const sp = Number(next.sellingPrice) || 0;
  const effectiveCostAUD = discountedPrice ?? costPrice;
  if (rate > 0 && effectiveCostAUD > 0) {
    next.profit = Math.round(sp - effectiveCostAUD * rate).toString();
  }

  return next;
}

export default function NewProductPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [fields, setFields] = useState<FieldConfig[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [form, setForm] = useState<Record<string, string>>({
    registeredAt: new Date().toISOString().split("T")[0],
    quantity: "1",
    store: "Coles",
  });
  const [exchangeRate, setExchangeRate] = useState<number>(0);
  const [rateDate, setRateDate] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [autoFilled, setAutoFilled] = useState<string[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isCopied, setIsCopied] = useState(false);
  const [formKey, setFormKey] = useState(0);

  // Ханш татах
  useEffect(() => {
    fetch("/api/exchange-rate")
      .then((r) => r.json())
      .then((d) => {
        setExchangeRate(d.rate);
        setRateDate(d.date);
      });
  }, []);

  // Ханш ирэхэд зарах үнэ, ашгийг дахин бодох
  useEffect(() => {
    if (exchangeRate > 0) {
      setForm((prev) => recalculate(prev, exchangeRate));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exchangeRate]);

  useEffect(() => {
    Promise.all([
      fetch("/api/fields").then((r) => r.json()),
      fetch("/api/users").then((r) => r.json()),
    ]).then(([fieldList, userList]) => {
      setFields(fieldList);
      setUsers(userList);

      const copied = sessionStorage.getItem("copyProduct");
      if (copied) {
        sessionStorage.removeItem("copyProduct");
        const data = JSON.parse(copied);
        setForm((prev) => ({ ...prev, ...data }));
        if (data.imageUrl) setImageUrls([data.imageUrl]);
        setIsCopied(true);
        setFormKey((k) => k + 1);
      } else if (session?.user?.id) {
        setForm((prev) => ({ ...prev, assignedUserId: prev.assignedUserId || session.user.id }));
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  // Талбарыг зөв дарааллаар гаргах — discountedPrice нь costPrice-аас өмнө
  const visibleFields = (() => {
    const sorted = fields
      .filter((f) => f.isVisible && f.fieldKey !== "barcode")
      .sort((a, b) => a.sortOrder - b.sortOrder);

    const dpIdx = sorted.findIndex((f) => f.fieldKey === "discountedPrice");
    const cpIdx = sorted.findIndex((f) => f.fieldKey === "costPrice");
    if (dpIdx !== -1 && cpIdx !== -1 && cpIdx < dpIdx) {
      [sorted[dpIdx], sorted[cpIdx]] = [sorted[cpIdx], sorted[dpIdx]];
    }
    return sorted;
  })();

  function resolveImageUrl(url: string): string {
    const match = url.match(/coles\.com\.au\/product\/[^?#]+-(\d+)/);
    if (match) {
      const id = match[1];
      return `https://cdn.productimages.coles.com.au/productimages/${id[0]}/${id}.jpg`;
    }
    return url;
  }

  function handleChange(key: string, value: string) {
    const resolved = key === "imageUrl" ? resolveImageUrl(value) : value;
    setForm((prev) => recalculate({ ...prev, [key]: resolved }, exchangeRate, key));
  }

  function handleBarcodeResult(scannedBarcode: string, data: LookupResult | null) {
    const filled: string[] = ["barcode"];
    setForm((prev) => {
      const next: Record<string, string> = { ...prev, barcode: scannedBarcode };

      if (data?.found) {
        if (data.name)  { next.name  = data.name;  filled.push("name");  }
        if (data.brand) { next.brand = data.brand; filled.push("brand"); }
        if (data.dosage){ next.dosage = data.dosage; filled.push("dosage"); }
        if (data.imageUrl) {
          next.imageUrl = data.imageUrl;
          filled.push("imageUrl");
          setImageUrls([data.imageUrl]);
        }
        if (data.colesUrl) { next.colesUrl = data.colesUrl; }
        if (data.costPrice !== null) {
          next.costPrice = data.costPrice.toFixed(2);
          filled.push("costPrice");
        }
        return recalculate(next, exchangeRate, "costPrice");
      }

      return next;
    });
    setAutoFilled(filled);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const extraData: Record<string, unknown> = {};
    visibleFields.forEach((f) => {
      if (f.isCustom && form[f.fieldKey]) {
        extraData[f.fieldKey] = form[f.fieldKey];
      }
    });
    if (imageUrls.length > 0) extraData.imageUrls = imageUrls;

    const assignedUserId =
      form.assignedUserId && form.assignedUserId !== "none"
        ? form.assignedUserId
        : null;

    const res = await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        assignedUserId,
        extraData: Object.keys(extraData).length ? extraData : null,
      }),
    });

    setSaving(false);

    if (res.ok) {
      toast.success("Бүтээгдэхүүн бүртгэгдлээ");
      router.push("/products");
    } else {
      setError("Хадгалахад алдаа гарлаа. Дахин оролдоно уу.");
      toast.error("Хадгалахад алдаа гарлаа");
    }
  }

  function renderField(f: FieldConfig) {
    const meta = BASE_FIELD_META[f.fieldKey];
    const type = meta?.type || f.fieldType.toLowerCase();
    const placeholder = meta?.placeholder || "";
    const value: string = form[f.fieldKey] ?? "";
    const wasAutoFilled = autoFilled.includes(f.fieldKey);

    if (f.fieldKey === "imageUrl") {
      return (
        <div key={f.id} className="col-span-2 space-y-1">
          <Label className="flex items-center gap-1.5">
            {f.label}
            {wasAutoFilled && <span className="text-xs text-blue-500 font-normal">(автоматаар)</span>}
          </Label>
          <MultiImageInput
            urls={imageUrls}
            onChange={(urls) => {
              setImageUrls(urls);
              setForm((prev) => ({ ...prev, imageUrl: urls[0] || "" }));
            }}
          />
        </div>
      );
    }

    if (f.fieldKey === "profit") {
      const profitVal = parseFloat(value) || 0;
      return (
        <div key={f.id} className="space-y-1">
          <Label>{f.label}</Label>
          <Input
            value={value ? `₮${Number(value).toLocaleString("mn-MN")}` : ""}
            readOnly
            className={`bg-gray-50 font-medium ${profitVal >= 0 ? "text-green-700" : "text-red-600"}`}
          />
        </div>
      );
    }

    // Зарах үнэ — автомат тооцоологддог ч засах боломжтой
    if (f.fieldKey === "sellingPrice") {
      return (
        <div key={f.id} className="space-y-1">
          <Label className="flex items-center gap-1.5">
            {f.label}
            {f.isRequired && <span className="text-red-500">*</span>}
            <span className="text-xs text-blue-400 font-normal">(автомат)</span>
          </Label>
          <Input
            type="number"
            placeholder={placeholder}
            value={value}
            onChange={(e) => handleChange(f.fieldKey, e.target.value)}
            step="any"
            className="border-blue-200 bg-blue-50/20"
          />
        </div>
      );
    }

    if (f.fieldKey === "brand" || f.fieldKey === "store") {
      return (
        <div key={f.id} className="space-y-1">
          <Label className="flex items-center gap-1.5">
            {f.label}
            {f.isRequired && <span className="text-red-500">*</span>}
            {wasAutoFilled && <span className="text-xs text-blue-500 font-normal">(автоматаар)</span>}
          </Label>
          <DynamicSelect
            category={f.fieldKey}
            value={value}
            onChange={(v) => handleChange(f.fieldKey, v)}
            placeholder={`${f.label} сонгох...`}
            required={f.isRequired}
          />
        </div>
      );
    }

    if (type === "user_select") {
      const selectedUser = users.find((u) => u.id === value);
      return (
        <div key={f.id} className="space-y-1">
          <Label>{f.label}</Label>
          <Select value={value || ""} onValueChange={(v) => handleChange(f.fieldKey, v ?? "")}>
            <SelectTrigger>
              <span className={selectedUser ? "text-sm" : "text-sm text-gray-400"}>
                {selectedUser ? selectedUser.name : "Борлуулагч сонгох"}
              </span>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">— Сонгоогүй —</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    return (
      <div key={f.id} className="space-y-1">
        <Label className="flex items-center gap-1.5">
          {f.label}
          {f.isRequired && <span className="text-red-500">*</span>}
          {wasAutoFilled && (
            <span className="text-xs text-blue-500 font-normal">(автоматаар)</span>
          )}
        </Label>
        <Input
          type={type === "number" ? "number" : type === "date" ? "date" : "text"}
          placeholder={placeholder}
          value={value}
          onChange={(e) => handleChange(f.fieldKey, e.target.value)}
          required={f.isRequired}
          step={type === "number" ? "any" : undefined}
          className={wasAutoFilled ? "border-blue-300 bg-blue-50/30" : undefined}
        />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/products">
          <Button variant="ghost" size="sm"><ArrowLeft size={16} /></Button>
        </Link>
        <h1 className="text-xl font-semibold">Бүтээгдэхүүн бүртгэх</h1>

        {/* Ханшийн мэдээлэл */}
        <div className="ml-auto flex items-center gap-1.5 text-xs text-gray-400 bg-gray-50 border rounded-lg px-3 py-1.5">
          <RefreshCw size={11} className={exchangeRate === 0 ? "animate-spin" : ""} />
          {exchangeRate > 0 ? (
            <span>1 A$ = <span className="font-semibold text-gray-700">₮{exchangeRate.toLocaleString("mn-MN")}</span>
              {rateDate && <span className="ml-1 text-gray-300">({rateDate})</span>}
            </span>
          ) : (
            <span>Ханш татаж байна...</span>
          )}
        </div>
      </div>

      {isCopied && (
        <div className="flex items-center gap-2.5 px-4 py-3 mb-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
          <Copy size={15} className="shrink-0" />
          Бараа хуулагдсан байна — талбаруудыг шалгаж засварлаад хадгална уу
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Barcode scanner хэсэг */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <Label className="flex items-center gap-1.5 mb-2">
              <Scan size={14} />
              Бар код
            </Label>
            <BarcodeScanner
              key={formKey}
              onResult={handleBarcodeResult}
              initialValue={form.barcode || ""}
            />
            <p className="text-xs text-gray-400 mt-2">
              USB scanner ашиглаж байгаа бол barcode дотор байрлуулаад уншуулна уу — автоматаар Enter дарна.
            </p>
          </CardContent>
        </Card>

        {/* Томьёоны тайлбар */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 text-xs text-blue-700 space-y-1">
          <p><span className="font-semibold">Зарах үнэ</span> = (Хямдарсан үнэ × 2 + A$15) × ₮{exchangeRate > 0 ? exchangeRate.toLocaleString("mn-MN") : "..."}</p>
          <p><span className="font-semibold">Ашиг</span> = Зарах үнэ − Хямдарсан үнэ × ₮{exchangeRate > 0 ? exchangeRate.toLocaleString("mn-MN") : "..."}</p>
        </div>

        {/* Бусад талбарууд */}
        <Card>
          <CardContent className="pt-5">
            <div className="grid grid-cols-2 gap-4">
              {visibleFields.map(renderField)}
            </div>

            {error && <p className="text-red-500 text-sm mt-4">{error}</p>}

            <div className="flex justify-end gap-3 mt-6">
              <Link href="/products">
                <Button variant="outline" type="button">Цуцлах</Button>
              </Link>
              <Button type="submit" disabled={saving}>
                {saving ? "Хадгалж байна..." : "Хадгалах"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
