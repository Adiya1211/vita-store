"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ShoppingCart, Banknote, CreditCard, Download, CheckCircle } from "lucide-react";
import * as XLSX from "xlsx";

interface Sale {
  id: string;
  quantity: number;
  sellingPrice: number;
  actualPrice: number;
  totalAmount: number;
  bonus: number | null;
  paymentType: "PAID" | "CREDIT";
  note: string | null;
  customerName: string | null;
  soldAt: string;
  product: { id: string; brand: string; name: string; dosage: string | null; barcode: string | null };
  soldBy: { id: string; name: string };
}

function SummaryCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string; color: string;
}) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-4 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={15} className="text-white" />
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-base font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function SalesTable({ sales, updatingId, onMarkPaid }: {
  sales: Sale[];
  updatingId: string | null;
  onMarkPaid: (id: string) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50/50">
            <TableHead className="text-xs font-semibold text-gray-500 uppercase">#</TableHead>
            <TableHead className="text-xs font-semibold text-gray-500 uppercase">Огноо</TableHead>
            <TableHead className="text-xs font-semibold text-gray-500 uppercase">Брэнд</TableHead>
            <TableHead className="text-xs font-semibold text-gray-500 uppercase">Нэр</TableHead>
            <TableHead className="text-xs font-semibold text-gray-500 uppercase">Бар код</TableHead>
            <TableHead className="text-xs font-semibold text-gray-500 uppercase">Тоо</TableHead>
            <TableHead className="text-xs font-semibold text-gray-500 uppercase">Зарах үнэ</TableHead>
            <TableHead className="text-xs font-semibold text-gray-500 uppercase">Зарагдсан үнэ</TableHead>
            <TableHead className="text-xs font-semibold text-gray-500 uppercase">Нийт</TableHead>
            <TableHead className="text-xs font-semibold text-gray-500 uppercase">Бонус</TableHead>
            <TableHead className="text-xs font-semibold text-gray-500 uppercase">Төлбөр</TableHead>
            <TableHead className="text-xs font-semibold text-gray-500 uppercase">Тэмдэглэл</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sales.map((sale, idx) => (
            <TableRow key={sale.id} className="hover:bg-gray-50/70 transition-colors">
              <TableCell className="font-mono text-xs text-gray-400">{idx + 1}</TableCell>
              <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                {new Date(sale.soldAt).toLocaleDateString("mn-MN")}
              </TableCell>
              <TableCell className="text-sm font-medium text-gray-800 whitespace-nowrap">
                {sale.product.brand}
              </TableCell>
              <TableCell className="text-sm text-gray-600">
                {sale.product.name}
                {sale.product.dosage && <span className="text-gray-400 text-xs ml-1">{sale.product.dosage}</span>}
              </TableCell>
              <TableCell className="font-mono text-xs text-gray-400 whitespace-nowrap">
                {sale.product.barcode ?? <span className="text-gray-200">—</span>}
              </TableCell>
              <TableCell className="text-sm">{sale.quantity}</TableCell>
              <TableCell className="text-sm font-mono text-gray-500">
                ₮{sale.sellingPrice.toLocaleString("mn-MN")}
              </TableCell>
              <TableCell className="text-sm font-mono text-gray-700">
                {sale.actualPrice !== sale.sellingPrice
                  ? <span className="text-amber-600 font-medium">₮{sale.actualPrice.toLocaleString("mn-MN")}</span>
                  : `₮${sale.actualPrice.toLocaleString("mn-MN")}`}
              </TableCell>
              <TableCell className="text-sm font-semibold text-green-700">
                ₮{sale.totalAmount.toLocaleString("mn-MN")}
              </TableCell>
              <TableCell className="text-sm">
                {sale.bonus
                  ? <span className="text-amber-600 font-medium">₮{sale.bonus.toLocaleString("mn-MN")}</span>
                  : <span className="text-gray-300">—</span>}
              </TableCell>
              <TableCell>
                {sale.paymentType === "PAID" ? (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                    Төлөгдсөн
                  </span>
                ) : (
                  <button
                    onClick={() => onMarkPaid(sale.id)}
                    disabled={updatingId === sale.id}
                    className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 hover:bg-green-100 hover:text-green-700 transition-colors disabled:opacity-50"
                    title="Төлөгдсөн болгох"
                  >
                    <CheckCircle size={11} />
                    {updatingId === sale.id ? "..." : "Зээл"}
                  </button>
                )}
              </TableCell>
              <TableCell className="text-sm text-gray-500">
                {sale.note || <span className="text-gray-300">—</span>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function SalesPage() {
  const { data: session } = useSession();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const isAdmin = session?.user?.role === "ADMIN";

  useEffect(() => {
    fetch("/api/sales")
      .then((r) => r.json())
      .then((d) => { setSales(Array.isArray(d) ? d : []); setLoading(false); });
  }, []);

  async function handleMarkPaid(id: string) {
    if (!confirm("Энэ борлуулалтын төлбөрийн статусыг 'Төлөгдсөн' болгох уу?")) return;
    setUpdatingId(id);
    const res = await fetch("/api/sales", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, paymentType: "PAID" }),
    });
    setUpdatingId(null);
    if (res.ok) {
      toast.success("Төлөгдсөн болгогдлоо");
      setSales((prev) => prev.map((s) => s.id === id ? { ...s, paymentType: "PAID" } : s));
    } else {
      toast.error("Алдаа гарлаа");
    }
  }

  function handleExport() {
    const rows = sales.map((s) => ({
      "Огноо": new Date(s.soldAt).toLocaleDateString("mn-MN"),
      "Брэнд": s.product.brand,
      "Бүтээгдэхүүн": s.product.name,
      "Тун": s.product.dosage ?? "",
      "Бар код": s.product.barcode ?? "",
      "Тоо": s.quantity,
      "Зарах үнэ": s.sellingPrice,
      "Бодит үнэ": s.actualPrice,
      "Нийт дүн": s.totalAmount,
      "Бонус": s.bonus ?? 0,
      "Төлбөр": s.paymentType === "PAID" ? "Төлсөн" : "Зээл",
      "Харилцагч": s.customerName ?? "",
      "Борлуулагч": s.soldBy.name,
      "Тэмдэглэл": s.note ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Борлуулалт");
    XLSX.writeFile(wb, `borluuralt-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  // Борлуулагч тус бүрээр бүлэглэх
  const grouped = sales.reduce<Record<string, { name: string; sales: Sale[] }>>((acc, sale) => {
    const { id, name } = sale.soldBy;
    if (!acc[id]) acc[id] = { name, sales: [] };
    acc[id].sales.push(sale);
    return acc;
  }, {});

  const totalRevenue = sales.reduce((s, sale) => s + sale.totalAmount, 0);
  const totalBonus = sales.reduce((s, sale) => s + (sale.bonus ?? 0), 0);
  const creditCount = sales.filter((s) => s.paymentType === "CREDIT").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Борлуулалт</h1>
          <p className="text-sm text-gray-400 mt-0.5">{sales.length} борлуулалт бүртгэгдсэн</p>
        </div>
        {isAdmin && sales.length > 0 && (
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 shadow-sm transition-colors"
          >
            <Download size={15} />
            Excel татах
          </button>
        )}
      </div>

      {/* Нийт summary — admin дээр л харагдана */}
      {isAdmin && sales.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <SummaryCard icon={ShoppingCart} label="Нийт орлого"   value={`₮${totalRevenue.toLocaleString("mn-MN")}`} color="bg-green-500" />
          <SummaryCard icon={Banknote}     label="Нийт бонус"    value={`₮${totalBonus.toLocaleString("mn-MN")}`}   color="bg-amber-400" />
          <SummaryCard icon={CreditCard}   label="Зээлийн тоо"   value={`${creditCount}ш`}                           color="bg-orange-400" />
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Уншиж байна...</div>
      ) : sales.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">Борлуулалт бүртгэгдээгүй байна</div>
      ) : isAdmin ? (
        /* Admin: борлуулагч тус бүрийн section */
        <div className="space-y-6">
          {Object.entries(grouped).map(([userId, { name, sales: userSales }]) => {
            const revenue = userSales.reduce((s, sale) => s + sale.totalAmount, 0);
            const bonus   = userSales.reduce((s, sale) => s + (sale.bonus ?? 0), 0);
            const credit  = userSales.filter((s) => s.paymentType === "CREDIT").length;
            return (
              <div key={userId} className="bg-white rounded-xl border shadow-sm overflow-hidden">
                {/* Staff header */}
                <div className="px-5 py-4 border-b bg-gray-50/50 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600">
                    {name.charAt(0)}
                  </div>
                  <span className="font-semibold text-gray-800">{name}</span>
                  <span className="text-xs text-gray-400 ml-1">{userSales.length} борлуулалт</span>
                </div>

                {/* Per-staff cards */}
                <div className="grid grid-cols-3 gap-4 p-4 border-b">
                  <SummaryCard icon={ShoppingCart} label="Орлого"    value={`₮${revenue.toLocaleString("mn-MN")}`} color="bg-green-500" />
                  <SummaryCard icon={Banknote}     label="Бонус"     value={`₮${bonus.toLocaleString("mn-MN")}`}   color="bg-amber-400" />
                  <SummaryCard icon={CreditCard}   label="Зээл"      value={`${credit}ш`}                           color={credit > 0 ? "bg-orange-400" : "bg-gray-300"} />
                </div>

                {/* Per-staff table */}
                <SalesTable sales={userSales} updatingId={updatingId} onMarkPaid={handleMarkPaid} />
              </div>
            );
          })}
        </div>
      ) : (
        /* Staff: өөрийн борлуулалт */
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <SummaryCard icon={ShoppingCart} label="Нийт орлого" value={`₮${totalRevenue.toLocaleString("mn-MN")}`} color="bg-green-500" />
            <SummaryCard icon={Banknote}     label="Нийт бонус"  value={`₮${totalBonus.toLocaleString("mn-MN")}`}   color="bg-amber-400" />
            <SummaryCard icon={CreditCard}   label="Зээлийн тоо" value={`${creditCount}ш`}                           color={creditCount > 0 ? "bg-orange-400" : "bg-gray-300"} />
          </div>
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <SalesTable sales={sales} updatingId={updatingId} onMarkPaid={handleMarkPaid} />
          </div>
        </div>
      )}
    </div>
  );
}
