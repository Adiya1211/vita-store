"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Package, Clock, CheckCircle, DollarSign, TrendingUp, Ship, Users, UserX,
  ShoppingCart, Banknote, Search, CheckCircle2,
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import ImageGallery from "@/components/ImageGallery";
import SaleModal from "@/components/SaleModal";
import TransferModal from "@/components/TransferModal";
import BrochureCard from "@/components/BrochureCard";
import { ArrowLeftRight, FileText, X } from "lucide-react";
import BarcodeScanButton from "@/components/BarcodeScanButton";

/* ─── Types ─────────────────────────────────────────────── */
interface UserStat {
  id: string; name: string; total: number; pending: number; approved: number;
  totalValue: number; totalProfit: number; salesCount: number; salesRevenue: number; salesBonus: number;
}
interface ShipmentInfo { id: string; name: string; sentAt: string; }
interface DashboardData {
  totalProducts: number; totalQuantity: number; pendingCount: number; approvedCount: number; unassigned: number;
  totalValue: number; totalProfit: number; totalSalesCount: number; totalRevenue: number;
  totalBonus: number; creditCount: number; creditAmount: number; userStats: UserStat[]; shipments: ShipmentInfo[]; shipmentsCount: number;
  dailySales: { date: string; amount: number }[];
  audToMnt: number;
  pendingQuantity: number; approvedQuantity: number;
  statsTotalQty: number; statsTotalPending: number; statsTotalApproved: number;
  statsTotalValue: number; statsTotalProfit: number; statsTotalSales: number; statsTotalRevenue: number;
}
interface Product {
  id: string; sequenceNumber: number; status: "PENDING" | "APPROVED";
  brand: string; name: string; dosage: string | null; quantity: number;
  barcode: string | null; imageUrl: string | null;
  sellingPrice: number; shipment: { id: string; name: string } | null;
  assignedTo: { id: string; name: string } | null;
  _ids?: string[];
}

/* ─── StatCard ───────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, sub, color, breakdown }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string;
  breakdown?: { name: string; count: number }[];
}) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={18} className="text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        {breakdown && breakdown.length > 0 && (
          <div className="mt-2 space-y-1">
            {breakdown.map(b => (
              <div key={b.name} className="flex items-center justify-between gap-2">
                <span className="text-xs text-gray-500 truncate">{b.name}</span>
                <span className="text-xs font-semibold text-gray-700 shrink-0">{b.count}ш</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Main ───────────────────────────────────────────────── */
export default function DashboardPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  /* dashboard stats */
  const [data, setData] = useState<DashboardData | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  /* staff product list */
  const [products, setProducts] = useState<Product[]>([]);
  const [shipments, setShipments] = useState<{ id: string; name: string }[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | "PENDING" | "APPROVED">("ALL");
  const [selectedShipmentId, setSelectedShipmentId] = useState("ALL");
  const [saleProduct, setSaleProduct] = useState<Product | null>(null);
  const [transferProduct, setTransferProduct] = useState<Product | null>(null);
  const [brochureProduct, setBrochureProduct] = useState<Product | null>(null);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [selectedBrand, setSelectedBrand] = useState("ALL");

  useEffect(() => {
    fetch("/api/dashboard")
      .then(r => r.json())
      .then(d => { setData(d); setStatsLoading(false); });
  }, []);

  async function loadProducts() {
    if (isAdmin) { setProductsLoading(false); return; }
    const [prods, ships, userList] = await Promise.all([
      fetch("/api/products").then(r => r.json()),
      fetch("/api/shipments").then(r => r.json()),
      fetch("/api/users").then(r => r.json()),
    ]);
    setProducts(Array.isArray(prods) ? prods : []);
    setShipments(Array.isArray(ships) ? ships : []);
    setUsers(Array.isArray(userList) ? userList : []);
    setProductsLoading(false);
  }

  useEffect(() => {
    if (session) loadProducts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  async function handleApprove(ids: string[]) {
    const res = await fetch("/api/products/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    if (res.ok) { toast.success("Зөвшөөрөгдлөө"); loadProducts(); }
    else toast.error("Алдаа гарлаа");
  }

  if (statsLoading) {
    return <div className="flex items-center justify-center h-64"><p className="text-gray-400 text-sm">Уншиж байна...</p></div>;
  }
  if (!data) return null;

  const approvedPct = data.totalProducts > 0 ? Math.round((data.approvedCount / data.totalProducts) * 100) : 0;

  const brands = ["ALL", ...Array.from(new Set(products.map(p => p.brand))).sort()];

  /* Staff product filters */
  const filtered = products.filter(p => {
    const matchTab = activeTab === "ALL" || p.status === activeTab;
    const matchShip = selectedShipmentId === "ALL" ? true
      : selectedShipmentId === "NONE" ? !p.shipment
      : p.shipment?.id === selectedShipmentId;
    const matchBrand = selectedBrand === "ALL" || p.brand === selectedBrand;
    const matchSearch = search === "" ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase()) ||
      (p.barcode ?? "").includes(search);
    return matchTab && matchShip && matchBrand && matchSearch;
  });

  // Ижил бар кодтой барааг бүлэглэх (бар код хоосон бол бүлэглэхгүй, төлөв өөр бол тусад нь)
  const groupKey = (p: Product) => (p.barcode ? `bc:${p.barcode}:${p.status}` : `id:${p.id}`);
  const grouped = Object.values(
    filtered.reduce<Record<string, Product & { _ids: string[] }>>((acc, p) => {
      const key = groupKey(p);
      if (!acc[key]) {
        acc[key] = { ...p, _ids: [p.id] };
      } else {
        acc[key].quantity += p.quantity;
        acc[key]._ids.push(p.id);
      }
      return acc;
    }, {})
  );
  // 0 үлдэгдэлтэйг нуух
  const groupedInStock = grouped.filter((g) => g.quantity > 0);

  const inStockAll = products.filter(p => p.quantity > 0);
  const tabCounts = {
    ALL: new Set(inStockAll.map(groupKey)).size,
    PENDING: new Set(inStockAll.filter(p => p.status === "PENDING").map(groupKey)).size,
    APPROVED: new Set(inStockAll.filter(p => p.status === "APPROVED").map(groupKey)).size,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {isAdmin ? "Бүх борлуулагчийн нэгдсэн мэдээлэл" : "Таны бараануудын мэдээлэл"}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Package} label="Нийт бараа"
          value={isAdmin ? data.totalProducts : `${data.totalQuantity}ш`}
          sub={isAdmin ? `${data.totalQuantity}ш · ${approvedPct}% зөвшөөрөгдсөн` : `${data.totalProducts} төрлийн бараа`}
          color="bg-blue-500"
          breakdown={isAdmin ? data.userStats.map(u => ({ name: u.name, count: u.total })) : undefined} />
        <StatCard icon={Clock} label="Хүлээгдэж байна"
          value={data.pendingCount}
          sub={`${data.pendingQuantity}ш`}
          color="bg-orange-400"
          breakdown={isAdmin ? data.userStats.filter(u => u.pending > 0).map(u => ({ name: u.name, count: u.pending })) : undefined} />
        <StatCard icon={CheckCircle} label="Зөвшөөрөгдсөн"
          value={data.approvedCount}
          sub={`${data.approvedQuantity}ш`}
          color="bg-teal-500"
          breakdown={isAdmin ? data.userStats.filter(u => u.approved > 0).map(u => ({ name: u.name, count: u.approved })) : undefined} />
        <StatCard icon={Ship} label="Ачааны тоо" value={data.shipmentsCount} sub="Нийт илгээлт" color="bg-indigo-500" />
      </div>

      {isAdmin ? (
        <div className="grid grid-cols-2 gap-4">
          <StatCard icon={DollarSign} label="Нийт өртөг"
            value={`A$${data.totalValue.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            sub="Бүх барааны нийлбэр үнэ" color="bg-violet-500" />
          <StatCard icon={TrendingUp} label="Нийт хүлээгдэх ашиг"
            value={`₮${data.totalProfit.toLocaleString("mn-MN")}`}
            sub="Зарах үнэ − авсан үнэ" color={data.totalProfit >= 0 ? "bg-green-500" : "bg-red-500"} />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <StatCard icon={ShoppingCart} label="Нийт борлуулалт"
            value={`${data.totalSalesCount}ш`}
            sub={`Нийт орлого ₮${data.totalRevenue.toLocaleString("mn-MN")}`}
            color="bg-green-500" />
          <StatCard icon={Banknote} label="Зээлийн борлуулалт"
            value={`${data.creditCount}ш`}
            sub={data.creditCount > 0 ? `₮${data.creditAmount.toLocaleString("mn-MN")} төлөгдөөгүй` : "Зээл байхгүй"}
            color={data.creditCount > 0 ? "bg-orange-400" : "bg-green-500"} />
        </div>
      )}

      {/* Admin: sales summary */}
      {isAdmin && data.totalSalesCount > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={ShoppingCart} label="Нийт борлуулалт" value={`${data.totalSalesCount}ш`} sub={`${data.creditCount} зээлтэй`} color="bg-green-500" />
          <StatCard icon={Banknote} label="Нийт орлого" value={`₮${data.totalRevenue.toLocaleString("mn-MN")}`} sub="Борлуулалтын нийт дүн" color="bg-emerald-500" />
          <StatCard icon={TrendingUp} label="Нийт бонус" value={`₮${data.totalBonus.toLocaleString("mn-MN")}`} sub="Зуучлагчдад өгсөн" color="bg-amber-400" />
          <StatCard icon={ShoppingCart} label="Зээлийн борлуулалт" value={data.creditCount} sub={`₮${data.creditAmount.toLocaleString("mn-MN")} төлөгдөөгүй`} color="bg-orange-400" />
        </div>
      )}

      {/* Admin: per-user stats */}
      {isAdmin && (
        <>
          {/* Charts */}
          {data.dailySales && data.dailySales.some(d => d.amount > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Борлуулалтын трэнд */}
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <h2 className="font-semibold text-gray-800 mb-4 text-sm">Борлуулалтын трэнд (30 хоног)</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={data.dailySales} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: "#9ca3af" }}
                      tickFormatter={(v) => {
                        const d = new Date(v);
                        return `${d.getMonth() + 1}/${d.getDate()}`;
                      }}
                      interval={4}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#9ca3af" }}
                      tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}м` : v >= 1000 ? `${(v/1000).toFixed(0)}к` : v}
                      width={45}
                    />
                    <Tooltip
                      formatter={(v) => [`₮${Number(v).toLocaleString("mn-MN")}`, "Орлого"]}
                      labelFormatter={(l) => new Date(l).toLocaleDateString("mn-MN")}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                    <Line type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Борлуулагч тус бүрийн орлого */}
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <h2 className="font-semibold text-gray-800 mb-4 text-sm">Борлуулагч тус бүрийн орлого</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={data.userStats.filter(u => u.salesRevenue > 0)}
                    margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9ca3af" }} />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#9ca3af" }}
                      tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}м` : v >= 1000 ? `${(v/1000).toFixed(0)}к` : v}
                      width={45}
                    />
                    <Tooltip
                      formatter={(v) => [`₮${Number(v).toLocaleString("mn-MN")}`, "Орлого"]}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                    <Bar dataKey="salesRevenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {data.unassigned > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 flex items-center gap-3">
              <UserX size={18} className="text-amber-500 shrink-0" />
              <p className="text-sm text-amber-700">
                <span className="font-semibold">{data.unassigned} бараа</span> хуваарилагдаагүй байна
              </p>
            </div>
          )}

          {data.userStats.length > 0 && (
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b flex items-center gap-2">
                <Users size={16} className="text-gray-500" />
                <h2 className="font-semibold text-gray-800">Борлуулагч тус бүрийн статистик</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      {["Нэр","Нийт (ш)","Хүлээгдэж байна","Зөвшөөрсөн","Өртөг (A$)","Ашиг (₮)","Зарсан","Орлого (₮)"].map((h, i) => (
                        <th key={h} className={`px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide ${i === 0 ? "text-left" : "text-right"}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.userStats.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-600">{u.name.charAt(0)}</div>
                            <span className="font-medium text-gray-800">{u.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-gray-700">{u.total}</td>
                        <td className="px-5 py-3.5 text-right">
                          {u.pending > 0 ? <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">{u.pending}</span> : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {u.approved > 0 ? <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">{u.approved}</span> : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-gray-700">{u.totalValue.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="px-5 py-3.5 text-right font-mono">
                          <span className={u.totalProfit >= 0 ? "text-green-600 font-medium" : "text-red-500"}>{u.totalProfit.toLocaleString("mn-MN")}</span>
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-gray-700">
                          {u.salesCount > 0 ? <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">{u.salesCount}</span> : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono text-green-600 font-medium">
                          {u.salesRevenue > 0 ? u.salesRevenue.toLocaleString("mn-MN") : <span className="text-gray-300">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 border-t-2 border-gray-200">
                      <td className="px-5 py-3 font-semibold text-gray-700">Нийт</td>
                      <td className="px-5 py-3 text-right font-semibold font-mono text-gray-700">{data.statsTotalQty}</td>
                      <td className="px-5 py-3 text-right font-semibold font-mono text-orange-600">{data.statsTotalPending}</td>
                      <td className="px-5 py-3 text-right font-semibold font-mono text-teal-600">{data.statsTotalApproved}</td>
                      <td className="px-5 py-3 text-right font-semibold font-mono text-gray-700">{data.statsTotalValue.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="px-5 py-3 text-right font-semibold font-mono"><span className={data.statsTotalProfit >= 0 ? "text-green-600" : "text-red-500"}>{data.statsTotalProfit.toLocaleString("mn-MN")}</span></td>
                      <td className="px-5 py-3 text-right font-semibold font-mono text-green-700">{data.statsTotalSales}</td>
                      <td className="px-5 py-3 text-right font-semibold font-mono text-green-700">{data.statsTotalRevenue.toLocaleString("mn-MN")}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

        </>
      )}

      {/* Staff: product list */}
      {!isAdmin && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Миний бараанууд</h2>
            <span className="text-sm text-gray-400">{groupedInStock.length} бараа</span>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            {/* Status tabs */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-0.5">
              {(["ALL", "PENDING", "APPROVED"] as const).map((key) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-1.5 ${
                    activeTab === key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {key === "PENDING" && <span className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block" />}
                  {key === "APPROVED" && <span className="w-1.5 h-1.5 rounded-full bg-teal-500 inline-block" />}
                  {key === "ALL" ? "Бүгд" : key === "PENDING" ? "Хүлээгдэж байна" : "Зөвшөөрсөн"}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === key ? "bg-gray-100 text-gray-600" : "bg-gray-200 text-gray-500"}`}>
                    {tabCounts[key]}
                  </span>
                </button>
              ))}
            </div>

            {/* Search + camera */}
            <div className="relative flex-1 min-w-44 flex gap-1 items-center">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  className={`pl-8 h-9 bg-white text-sm ${search ? "pr-8" : ""}`}
                  placeholder="Нэр, брэнд, бар кодоор хайх..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <BarcodeScanButton onResult={(code) => setSearch(code)} />
            </div>

            {/* Brand filter */}
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="border rounded-lg px-3 h-9 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-gray-200"
            >
              <option value="ALL">Бүх брэнд</option>
              {brands.filter(b => b !== "ALL").map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>

            {/* Shipment filter */}
            {shipments.length > 0 && (
              <select
                value={selectedShipmentId}
                onChange={(e) => setSelectedShipmentId(e.target.value)}
                className="border rounded-lg px-3 h-9 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-gray-200"
              >
                <option value="ALL">Бүх ачаа</option>
                <option value="NONE">Ачаагүй</option>
                {shipments.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Product table */}
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/50 border-b">
                    {["#", "Зураг", "Брэнд", "Нэр", "Бар код", "Тоо", "Зарах үнэ", "Ачаа", "Статус", ""].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {productsLoading ? (
                    <tr><td colSpan={10} className="text-center py-10 text-gray-400">Уншиж байна...</td></tr>
                  ) : groupedInStock.length === 0 ? (
                    <tr><td colSpan={10} className="text-center py-10 text-gray-400">Бараа байхгүй</td></tr>
                  ) : (
                    groupedInStock.map((p, idx) => (
                      <tr key={p.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="px-4 py-3 font-mono text-sm text-gray-400 whitespace-nowrap">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <ImageGallery imageUrl={p.imageUrl} productName={p.name} />
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">{p.brand}</td>
                        <td className="px-4 py-3 text-gray-600">
                          {p.name}
                          {p.dosage && <span className="text-gray-400 text-xs ml-1">{p.dosage}</span>}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-400 whitespace-nowrap">
                          {p.barcode ?? <span className="text-gray-200">—</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-700 font-mono">{p.quantity}</td>
                        <td className="px-4 py-3 text-gray-700 font-mono">₮{p.sellingPrice.toLocaleString("mn-MN")}</td>
                        <td className="px-4 py-3">
                          {p.shipment
                            ? <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">{p.shipment.name}</span>
                            : <span className="text-gray-300 text-xs">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {p.status === "APPROVED"
                            ? <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">Зөвшөөрсөн</span>
                            : <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">Хүлээгдэж байна</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {p.status === "APPROVED" && (
                              <button
                                onClick={() => setSaleProduct(p)}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 text-xs font-semibold transition-colors"
                              >
                                <ShoppingCart size={12} />
                                Зарах
                              </button>
                            )}
                            {p.status === "PENDING" && p.assignedTo?.id === session?.user?.id && (
                              <button
                                onClick={() => handleApprove(p._ids ?? [p.id])}
                                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-semibold transition-colors"
                              >
                                <CheckCircle2 size={12} />
                                Approve
                              </button>
                            )}
                            <button
                              onClick={() => setBrochureProduct(p)}
                              className="p-1.5 rounded-lg hover:bg-amber-50 text-gray-300 hover:text-amber-500 transition-colors"
                              title="Танилцуулга"
                            >
                              <FileText size={14} />
                            </button>
                            <button
                              onClick={() => setTransferProduct(p)}
                              className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-300 hover:text-blue-500 transition-colors"
                              title="Шилжүүлэх"
                            >
                              <ArrowLeftRight size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Brochure modal */}
      {brochureProduct && (
        <BrochureCard
          product={brochureProduct}
          canRegenerate={false}
          onClose={() => setBrochureProduct(null)}
        />
      )}

      {/* Sale modal */}
      <SaleModal
        product={saleProduct}
        onClose={() => setSaleProduct(null)}
        onDone={() => { setSaleProduct(null); loadProducts(); }}
      />
      <TransferModal
        product={transferProduct}
        users={users}
        onClose={() => setTransferProduct(null)}
        onDone={() => { setTransferProduct(null); loadProducts(); }}
      />
    </div>
  );
}
