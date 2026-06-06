"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Search, Pencil, Trash2, ArrowLeftRight, CheckCircle, Ship, Copy, ShoppingCart, RefreshCw, FileText, Download } from "lucide-react";
import BrochureCard from "@/components/BrochureCard";
import { useRouter } from "next/navigation";
import ImageGallery from "@/components/ImageGallery";
import { Input } from "@/components/ui/input";
import TransferModal from "@/components/TransferModal";
import ShipmentModal from "@/components/ShipmentModal";
import SaleModal from "@/components/SaleModal";
import { toast } from "sonner";

type ProductStatus = "PENDING" | "APPROVED";

const STATUS_CONFIG: Record<ProductStatus, { label: string; color: string }> = {
  PENDING:  { label: "Хүлээгдэж байна", color: "bg-orange-100 text-orange-700" },
  APPROVED: { label: "Зөвшөөрсөн",      color: "bg-teal-100 text-teal-700" },
};

interface Product {
  id: string;
  sequenceNumber: number;
  status: ProductStatus;
  registeredAt: string;
  store: string | null;
  brand: string;
  name: string;
  dosage: string | null;
  quantity: number;
  costPrice: number;
  discountedPrice: number | null;
  totalPrice: number;
  sellingPrice: number;
  barcode: string | null;
  imageUrl: string | null;
  colesUrl: string | null;
  extraData: { imageUrls?: string[] } | null;
  assignedTo: { id: string; name: string } | null;
  shipment: { id: string; name: string } | null;
}

interface FieldConfig {
  fieldKey: string;
  label: string;
  isVisible: boolean;
  visibleToStaff: boolean;
  sortOrder: number;
}

const COLUMN_FIELD_MAP: { fieldKey: string; label: string; render: (p: Product) => React.ReactNode }[] = [
  {
    fieldKey: "imageUrl",
    label: "Зураг",
    render: (p) => (
      <ImageGallery
        imageUrl={p.imageUrl}
        imageUrls={p.extraData?.imageUrls}
        productName={p.name}
      />
    ),
  },
  { fieldKey: "sequenceNumber", label: "#", render: () => null },
  { fieldKey: "registeredAt", label: "Огноо", render: (p) => new Date(p.registeredAt).toLocaleDateString("mn-MN") },
  { fieldKey: "store", label: "Дэлгүүр", render: (p) => p.store ?? "—" },
  { fieldKey: "brand", label: "Брэнд", render: (p) => <span className="font-medium">{p.brand}</span> },
  { fieldKey: "name", label: "Нэр", render: (p) => p.name },
  { fieldKey: "dosage", label: "Тун", render: (p) => <span className="text-gray-500">{p.dosage ?? "—"}</span> },
  { fieldKey: "quantity", label: "Тоо", render: (p) => p.quantity },
  { fieldKey: "costPrice", label: "Үндсэн үнэ", render: (p) => `A$${p.costPrice.toFixed(2)}` },
  { fieldKey: "discountedPrice", label: "Хямд. үнэ", render: (p) => p.discountedPrice ? `A$${p.discountedPrice.toFixed(2)}` : "—" },
  { fieldKey: "totalPrice", label: "Нийт үнэ", render: (p) => `A$${p.totalPrice.toFixed(2)}` },
  { fieldKey: "sellingPrice", label: "Зарах үнэ", render: (p) => `₮${p.sellingPrice.toLocaleString("mn-MN")}` },
  {
    fieldKey: "profit",
    label: "Ашиг",
    render: (p) => null, // exchangeRate шаардлагатай тул доор тусад нь render хийнэ
  },
  {
    fieldKey: "assignedUserId",
    label: "Борлуулагч",
    render: (p) => p.assignedTo ? <Badge variant="secondary">{p.assignedTo.name}</Badge> : "—",
  },
  { fieldKey: "barcode", label: "Бар код", render: (p) => <span className="font-mono text-gray-500">{p.barcode ?? "—"}</span> },
  {
    fieldKey: "shipment",
    label: "Ачаа",
    render: (p) => p.shipment
      ? <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">{p.shipment.name}</span>
      : <span className="text-gray-300">—</span>,
  },
  { fieldKey: "status", label: "Статус", render: () => null },
];

export default function ProductsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [fieldConfigs, setFieldConfigs] = useState<FieldConfig[]>([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | ProductStatus>("ALL");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [transferProduct, setTransferProduct] = useState<Product | null>(null);
  const [shipProduct, setShipProduct] = useState<Product | null>(null);
  const [saleProduct, setSaleProduct] = useState<Product | null>(null);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>("ALL");
  const [shipments, setShipments] = useState<{ id: string; name: string }[]>([]);
  const [selectedShipmentId, setSelectedShipmentId] = useState<string>("ALL");
  const [brochureProduct, setBrochureProduct] = useState<Product | null>(null);
  const [recalculating, setRecalculating] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 50;

  useEffect(() => {
    fetch("/api/exchange-rate").then(r => r.json()).then(d => setExchangeRate(d.rate));
  }, []);

  // Filter өөрчлөгдөхөд эхний хуудас руу буцах
  useEffect(() => { setCurrentPage(1); }, [search, activeTab, selectedUserId, selectedShipmentId]);

  async function handleRecalculate() {
    if (!confirm(`Бүх барааны зарах үнийг шинэ ханшаар (1 A$ = ₮${exchangeRate.toLocaleString("mn-MN")}) дахин тооцоолох уу?`)) return;
    setRecalculating(true);
    const res = await fetch("/api/products/recalculate", { method: "POST" });
    setRecalculating(false);
    if (res.ok) {
      const d = await res.json();
      toast.success(`${d.updated} барааны зарах үнэ шинэчлэгдлээ (1 A$ = ₮${d.rate.toLocaleString("mn-MN")})`);
      loadProducts();
    } else {
      toast.error("Алдаа гарлаа");
    }
  }

  async function loadProducts() {
    const [prods, fields, userList, shipmentList] = await Promise.all([
      fetch("/api/products").then((r) => r.json()),
      fetch("/api/fields").then((r) => r.json()),
      fetch("/api/users").then((r) => r.json()),
      fetch("/api/shipments").then((r) => r.json()),
    ]);
    setProducts(prods);
    setFieldConfigs(fields);
    setUsers(userList);
    setShipments(shipmentList);
    setLoading(false);
  }

  useEffect(() => {
    loadProducts();
  }, []);

  async function handleStatusChange(id: string, status: ProductStatus) {
    await fetch("/api/products/status", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    loadProducts();
  }

  async function handleApprove(id: string) {
    const res = await fetch("/api/products/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) toast.success("Зөвшөөрөгдлөө");
    else toast.error("Алдаа гарлаа");
    loadProducts();
  }

  function handleCopy(p: Product) {
    sessionStorage.setItem("copyProduct", JSON.stringify({
      store: p.store ?? "",
      brand: p.brand,
      name: p.name,
      dosage: p.dosage ?? "",
      quantity: String(p.quantity),
      costPrice: String(p.costPrice),
      discountedPrice: p.discountedPrice != null ? String(p.discountedPrice) : "",
      totalPrice: String(p.totalPrice),
      sellingPrice: String(p.sellingPrice),
      barcode: p.barcode ?? "",
      imageUrl: p.imageUrl ?? "",
      assignedUserId: p.assignedTo?.id ?? "",
      registeredAt: new Date().toISOString().split("T")[0],
    }));
    router.push("/products/new");
  }

  async function handleDelete(id: string) {
    if (!confirm("Энэ бүтээгдэхүүнийг устгах уу?")) return;
    setDeletingId(id);
    const res = await fetch(`/api/products?id=${id}`, { method: "DELETE" });
    setDeletingId(null);
    if (res.ok) toast.success("Устгагдлаа");
    else toast.error("Устгахад алдаа гарлаа");
    loadProducts();
  }

  const isAdmin = session?.user?.role === "ADMIN";
  const isStaff = session?.user?.role === "STAFF";

  // imageUrl, sequenceNumber — staff-д үргэлж харагдана
  const ALWAYS_VISIBLE_FOR_STAFF = ["imageUrl", "sequenceNumber"];

  const visibleColumns = COLUMN_FIELD_MAP.filter((col) => {
    const config = fieldConfigs.find((f) => f.fieldKey === col.fieldKey);
    if (!config) return true;
    if (!config.isVisible) return false;
    if (isStaff && !config.visibleToStaff && !ALWAYS_VISIBLE_FOR_STAFF.includes(col.fieldKey)) return false;
    return true;
  });

  const filtered = products.filter((p) => {
    const matchTab = activeTab === "ALL" || (p.status ?? "PENDING") === activeTab;
    const matchUser =
      selectedUserId === "ALL" ? true :
      selectedUserId === "NONE" ? p.assignedTo === null :
      p.assignedTo?.id === selectedUserId;
    const matchShipment =
      selectedShipmentId === "ALL" ? true :
      selectedShipmentId === "NONE" ? p.shipment === null :
      p.shipment?.id === selectedShipmentId;
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase()) ||
      (p.store ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (p.barcode ?? "").includes(search);
    return matchTab && matchUser && matchShipment && matchSearch;
  });

  // Бар кодоор бүлэглэх (бар код байхгүй бол brand+name+dosage)
  const groupKey = (p: Product) =>
    p.barcode ? p.barcode : `${p.brand}||${p.name}||${p.dosage ?? ""}`;

  const grouped = Object.values(
    filtered.reduce<Record<string, Product & { _ids: string[] }>>((acc, p) => {
      const key = groupKey(p);
      if (!acc[key]) {
        acc[key] = { ...p, _ids: [p.id] };
      } else {
        acc[key].quantity += p.quantity;
        acc[key].totalPrice += p.totalPrice;
        acc[key]._ids.push(p.id);
      }
      return acc;
    }, {})
  );

  const tabCounts = {
    ALL:      new Set(products.map(groupKey)).size,
    PENDING:  new Set(products.filter((p) => p.status === "PENDING").map(groupKey)).size,
    APPROVED: new Set(products.filter((p) => p.status === "APPROVED").map(groupKey)).size,
  };

  const totalPages = Math.ceil(grouped.length / PAGE_SIZE);
  const paged = grouped.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Бүтээгдэхүүн</h1>
          <p className="text-sm text-gray-400 mt-0.5">{grouped.length} бүтээгдэхүүн</p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <a href="/api/products/export" download>
              <Button variant="outline" className="gap-2 h-9 text-sm">
                <Download size={14} />
                Excel
              </Button>
            </a>
          )}
          {isAdmin && (
            <Button
              variant="outline"
              className="gap-2 h-9 text-sm"
              onClick={handleRecalculate}
              disabled={recalculating || exchangeRate === 0}
              title={`Одоогийн ханш: 1 A$ = ₮${exchangeRate.toLocaleString("mn-MN")}`}
            >
              <RefreshCw size={14} className={recalculating ? "animate-spin" : ""} />
              {recalculating ? "Тооцоолж байна..." : `Ханшаар шинэчлэх`}
              {exchangeRate > 0 && (
                <span className="text-xs text-gray-400 font-normal">₮{exchangeRate.toLocaleString("mn-MN")}</span>
              )}
            </Button>
          )}
          <Link href="/products/new">
            <Button className="gap-2 h-9">
              <Plus size={15} />
              Шинэ бүтээгдэхүүн
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Status tabs */}
        <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-0.5">
          {([["ALL", "Бүгд"], ["PENDING", "Хүлээгдэж байна"], ["APPROVED", "Зөвшөөрсөн"]] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                activeTab === key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {key === "PENDING" && <span className="w-1.5 h-1.5 rounded-full bg-orange-400 inline-block" />}
              {key === "APPROVED" && <span className="w-1.5 h-1.5 rounded-full bg-teal-500 inline-block" />}
              {label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-normal ${activeTab === key ? "bg-gray-100 text-gray-600" : "bg-gray-200 text-gray-500"}`}>
                {tabCounts[key]}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-52">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            className="pl-9 h-9 bg-white text-sm"
            placeholder="Нэр, брэнд, бар кодоор хайх..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* User filter */}
        {isAdmin && (
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="border rounded-lg px-3 h-9 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-gray-200"
          >
            <option value="ALL">Бүх борлуулагч</option>
            <option value="NONE">Хуваарилаагүй</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
        )}

        {/* Shipment filter */}
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
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-b bg-gray-50/50">
              {visibleColumns.map((col) => (
                <TableHead key={col.fieldKey} className="whitespace-nowrap text-xs font-semibold text-gray-500 uppercase tracking-wide py-3">
                  {col.label}
                </TableHead>
              ))}
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={visibleColumns.length + 1} className="text-center py-10 text-gray-400">
                  Уншиж байна...
                </TableCell>
              </TableRow>
            ) : grouped.length === 0 ? (
              <TableRow>
                <TableCell colSpan={visibleColumns.length + 1} className="text-center py-10 text-gray-400">
                  Бүтээгдэхүүн олдсонгүй
                </TableCell>
              </TableRow>
            ) : (
              paged.map((p, idx) => (
                <TableRow key={p.id} className="hover:bg-gray-50/70 transition-colors">
                  {visibleColumns.map((col) => (
                    <TableCell key={col.fieldKey} className="text-sm whitespace-nowrap py-3">
                      {col.fieldKey === "sequenceNumber"
                        ? <span className="font-mono text-sm text-gray-500">{(currentPage - 1) * PAGE_SIZE + idx + 1}</span>
                        : col.fieldKey === "status"
                        ? (
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${(STATUS_CONFIG[p.status] ?? STATUS_CONFIG["PENDING"]).color}`}>
                            {(STATUS_CONFIG[p.status] ?? STATUS_CONFIG["PENDING"]).label}
                          </span>
                        )
                        : col.fieldKey === "profit"
                        ? (() => {
                            const costAUD = p.discountedPrice ?? p.costPrice;
                            const profit = exchangeRate > 0
                              ? (p.sellingPrice - costAUD * exchangeRate) * p.quantity
                              : 0;
                            return <span className={profit >= 0 ? "text-green-600 font-medium" : "text-red-500"}>₮{profit.toLocaleString("mn-MN")}</span>;
                          })()
                        : col.render(p)}
                    </TableCell>
                  ))}
                  <TableCell className="py-3">
                    <div className="flex items-center gap-0.5">
                      {(p.status ?? "PENDING") === "APPROVED" &&
                        (p.assignedTo?.id === session?.user?.id || isAdmin) && (
                        <button
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 text-xs font-semibold transition-colors"
                          title="Зарах"
                          onClick={() => setSaleProduct(p)}
                        >
                          <ShoppingCart size={12} />
                          Зарах
                        </button>
                      )}
                      {(p.status ?? "PENDING") === "PENDING" &&
                        p.assignedTo?.id === session?.user?.id && (
                        <button
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-semibold transition-colors"
                          onClick={() => handleApprove(p.id)}
                        >
                          <CheckCircle size={12} />
                          Approve
                        </button>
                      )}
                      {(p.status ?? "PENDING") === "APPROVED" && (
                        <button
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-300 hover:text-blue-500 transition-colors"
                          title="Шилжүүлэх"
                          onClick={() => setTransferProduct(p)}
                        >
                          <ArrowLeftRight size={14} />
                        </button>
                      )}
                      {isAdmin && (p.status ?? "PENDING") === "APPROVED" && (
                        <button
                          className="p-1.5 rounded-lg hover:bg-indigo-50 text-gray-300 hover:text-indigo-500 transition-colors"
                          title="Монголруу илгээх"
                          onClick={() => setShipProduct(p)}
                        >
                          <Ship size={14} />
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          className="p-1.5 rounded-lg hover:bg-amber-50 text-gray-300 hover:text-amber-500 transition-colors"
                          title="Хуулах"
                          onClick={() => handleCopy(p)}
                        >
                          <Copy size={14} />
                        </button>
                      )}
                      <button
                        className="p-1.5 rounded-lg hover:bg-purple-50 text-gray-300 hover:text-purple-500 transition-colors"
                        title="Танилцуулга үүсгэх"
                        onClick={() => setBrochureProduct(p)}
                      >
                        <FileText size={14} />
                      </button>
                      <Link href={`/products/${p.id}/edit`}>
                        <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-300 hover:text-gray-600 transition-colors">
                          <Pencil size={14} />
                        </button>
                      </Link>
                      {isAdmin && (
                        <button
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors disabled:opacity-30"
                          disabled={deletingId === p.id}
                          onClick={() => handleDelete(p.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>{grouped.length} бүтээгдэхүүнээс {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, grouped.length)}-г харуулж байна</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-lg border text-xs font-medium disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >← Өмнөх</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
              .reduce<(number | "...")[]>((acc, p, i, arr) => {
                if (i > 0 && p - (arr[i-1] as number) > 1) acc.push("...");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) => p === "..." ? (
                <span key={`dots-${i}`} className="px-2 text-gray-300">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p as number)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${currentPage === p ? "bg-gray-900 text-white" : "border hover:bg-gray-50"}`}
                >{p}</button>
              ))
            }
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-lg border text-xs font-medium disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >Дараах →</button>
          </div>
        </div>
      )}

      {brochureProduct && (
        <BrochureCard
          product={brochureProduct}
          onClose={() => setBrochureProduct(null)}
        />
      )}
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
      <ShipmentModal
        product={shipProduct}
        users={users}
        onClose={() => setShipProduct(null)}
        onDone={() => { setShipProduct(null); loadProducts(); }}
      />
    </div>
  );
}
