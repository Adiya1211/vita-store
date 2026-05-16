"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Trash2, Package, ChevronDown, ChevronUp, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

interface Product {
  id: string;
  sequenceNumber: number;
  brand: string;
  name: string;
  dosage: string | null;
  quantity: number;
  sellingPrice: number;
  assignedTo: { id: string; name: string } | null;
}

interface Shipment {
  id: string;
  name: string;
  sentAt: string;
  note: string | null;
  shippingFee: number | null;
  createdAt: string;
  products: Product[];
}

interface EditState {
  note: string;
  shippingFee: string;
}

export default function ShipmentsPage() {
  const { data: session } = useSession();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [editState, setEditState] = useState<EditState>({ note: "", shippingFee: "" });
  const [saving, setSaving] = useState(false);

  const isAdmin = session?.user?.role === "ADMIN";

  async function load() {
    const s = await fetch("/api/shipments").then(r => r.json());
    setShipments(s);
    setLoading(false);
    if (s.length > 0) setExpanded({ [s[0].id]: true });
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: string) {
    if (!confirm("Энэ ачааг устгах уу?")) return;
    await fetch(`/api/shipments/${id}`, { method: "DELETE" });
    toast.success("Устгагдлаа");
    load();
  }

  async function handleRemoveProduct(shipmentId: string, productId: string) {
    await fetch(`/api/shipments/${shipmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ removeProductIds: [productId] }),
    });
    load();
  }

  function startEdit(s: Shipment) {
    setEditing(s.id);
    setEditState({
      note: s.note ?? "",
      shippingFee: s.shippingFee != null ? String(s.shippingFee) : "",
    });
  }

  async function saveEdit(id: string) {
    setSaving(true);
    const res = await fetch(`/api/shipments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        note: editState.note || null,
        shippingFee: editState.shippingFee !== "" ? editState.shippingFee : null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success("Хадгалагдлаа");
      setEditing(null);
      load();
    } else {
      toast.error("Алдаа гарлаа");
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Монголруу явуулсан ачаа</h1>
        <p className="text-sm text-gray-400 mt-0.5">{shipments.length} ачаа · Бүтээгдэхүүн жагсаалтаас 🚢 товчоор нэмнэ</p>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Уншиж байна...</p>
      ) : shipments.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Package size={40} className="mx-auto mb-3 opacity-30" />
          <p>Одоогоор ачаа бүртгэгдээгүй байна</p>
        </div>
      ) : (
        <div className="space-y-4">
          {shipments.map((s) => {
            const isOpen = expanded[s.id];
            const isEditingThis = editing === s.id;
            const totalQty = s.products.reduce((a, p) => a + p.quantity, 0);
            const totalPrice = s.products.reduce((a, p) => a + p.sellingPrice * p.quantity, 0);

            return (
              <div key={s.id} className="bg-white border rounded-xl overflow-hidden shadow-sm">
                {/* Header */}
                <div
                  className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpanded(prev => ({ ...prev, [s.id]: !prev[s.id] }))}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center">
                      <Package size={16} className="text-indigo-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{s.name}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(s.sentAt).toLocaleDateString("mn-MN")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right text-sm hidden sm:block">
                      <span className="text-gray-500">{s.products.length} төрөл · {totalQty} ширхэг</span>
                      <span className="ml-3 font-medium text-green-700">₮{totalPrice.toLocaleString("mn-MN")}</span>
                    </div>
                    {isAdmin && (
                      <button
                        className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                    {isOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </div>
                </div>

                {/* Expanded content */}
                {isOpen && (
                  <div className="border-t">
                    {/* Нэмэлт мэдээлэл хэсэг */}
                    <div className="px-5 py-4 bg-gray-50 border-b">
                      {isEditingThis ? (
                        /* Edit mode */
                        <div className="flex flex-wrap items-end gap-4">
                          <div className="space-y-1 flex-1 min-w-40">
                            <label className="text-xs font-medium text-gray-500">Ачааны төлбөр (A$)</label>
                            <Input
                              type="number"
                              placeholder="0"
                              value={editState.shippingFee}
                              onChange={(e) => setEditState(prev => ({ ...prev, shippingFee: e.target.value }))}
                              className="h-8 text-sm bg-white"
                              step="any"
                            />
                          </div>
                          <div className="space-y-1 flex-[2] min-w-52">
                            <label className="text-xs font-medium text-gray-500">Тэмдэглэл</label>
                            <Input
                              type="text"
                              placeholder="Тэмдэглэл бичих..."
                              value={editState.note}
                              onChange={(e) => setEditState(prev => ({ ...prev, note: e.target.value }))}
                              className="h-8 text-sm bg-white"
                            />
                          </div>
                          <div className="flex gap-2 pb-0.5">
                            <button
                              onClick={() => saveEdit(s.id)}
                              disabled={saving}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
                            >
                              <Check size={12} />
                              Хадгалах
                            </button>
                            <button
                              onClick={() => setEditing(null)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border hover:bg-gray-100 text-gray-600 text-xs font-medium transition-colors"
                            >
                              <X size={12} />
                              Цуцлах
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* View mode */
                        <div className="flex items-center justify-between">
                          <div className="flex flex-wrap gap-6">
                            <div>
                              <p className="text-xs text-gray-400 mb-0.5">Ачааны төлбөр</p>
                              <p className="text-sm font-semibold text-gray-800">
                                {s.shippingFee != null
                                  ? `A$${s.shippingFee.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                  : <span className="text-gray-300 font-normal">Бөглөгдөөгүй</span>}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-400 mb-0.5">Тэмдэглэл</p>
                              <p className="text-sm text-gray-700">
                                {s.note || <span className="text-gray-300">Бөглөгдөөгүй</span>}
                              </p>
                            </div>
                          </div>
                          {isAdmin && (
                            <button
                              onClick={() => startEdit(s)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border hover:bg-white text-gray-500 hover:text-gray-700 text-xs font-medium transition-colors"
                            >
                              <Pencil size={12} />
                              Засах
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Бүтээгдэхүүний хүснэгт */}
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10">#</TableHead>
                            <TableHead>Бүтээгдэхүүн</TableHead>
                            <TableHead>Тун</TableHead>
                            <TableHead>Тоо</TableHead>
                            <TableHead>Зарах үнэ</TableHead>
                            <TableHead>Нийт</TableHead>
                            <TableHead>Борлуулагч</TableHead>
                            {isAdmin && <TableHead className="w-10"></TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {s.products.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center text-gray-400 py-6">
                                Бүтээгдэхүүн байхгүй
                              </TableCell>
                            </TableRow>
                          ) : (
                            s.products.map((p, idx) => (
                              <TableRow key={p.id}>
                                <TableCell className="text-gray-400 text-xs font-mono">{idx + 1}</TableCell>
                                <TableCell className="font-medium text-sm">{p.brand} {p.name}</TableCell>
                                <TableCell className="text-gray-500 text-sm">{p.dosage ?? "—"}</TableCell>
                                <TableCell className="text-sm">{p.quantity}</TableCell>
                                <TableCell className="text-sm">₮{p.sellingPrice.toLocaleString("mn-MN")}</TableCell>
                                <TableCell className="text-sm font-medium">
                                  ₮{(p.sellingPrice * p.quantity).toLocaleString("mn-MN")}
                                </TableCell>
                                <TableCell>
                                  {p.assignedTo
                                    ? <Badge variant="secondary">{p.assignedTo.name}</Badge>
                                    : <span className="text-gray-400 text-xs">—</span>}
                                </TableCell>
                                {isAdmin && (
                                  <TableCell>
                                    <button
                                      className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors"
                                      title="Жагсаалтаас хасах"
                                      onClick={() => handleRemoveProduct(s.id, p.id)}
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </TableCell>
                                )}
                              </TableRow>
                            ))
                          )}
                          {s.products.length > 0 && (
                            <TableRow className="bg-gray-50 font-semibold">
                              <TableCell colSpan={3} className="text-right text-sm text-gray-500">Нийт:</TableCell>
                              <TableCell className="text-sm">{totalQty}</TableCell>
                              <TableCell></TableCell>
                              <TableCell className="text-sm text-green-700">₮{totalPrice.toLocaleString("mn-MN")}</TableCell>
                              <TableCell colSpan={isAdmin ? 2 : 1}></TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
