"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { UserX, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface Product {
  id: string;
  sequenceNumber: number;
  brand: string;
  name: string;
  dosage: string | null;
  quantity: number;
  costPrice: number;
  registeredAt: string;
}

interface User {
  id: string;
  name: string;
}

export default function AssignPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  async function load() {
    const [prods, userList] = await Promise.all([
      fetch("/api/products").then((r) => r.json()),
      fetch("/api/users").then((r) => r.json()),
    ]);
    // Зөвхөн хуваарилагдаагүй бараа
    setProducts(prods.filter((p: Product & { assignedUserId: string | null }) => !p.assignedUserId));
    setUsers(userList);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleAssign(productId: string) {
    const userId = assignments[productId];
    if (!userId) return;

    setSaving((prev) => ({ ...prev, [productId]: true }));

    // Тухайн барааг fetch хийж бүрэн мэдээлэл авах
    const product = await fetch(`/api/products/${productId}`).then((r) => r.json());

    const res = await fetch("/api/products", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...product, id: productId, assignedUserId: userId }),
    });

    setSaving((prev) => ({ ...prev, [productId]: false }));

    if (res.ok) {
      toast.success("Хуваарилагдлаа");
      load();
    } else {
      toast.error("Алдаа гарлаа");
    }
  }

  async function handleAssignAll() {
    const entries = Object.entries(assignments).filter(([, v]) => v);
    if (entries.length === 0) {
      toast.error("Борлуулагч сонгоогүй байна");
      return;
    }

    setSaving(Object.fromEntries(entries.map(([k]) => [k, true])));

    await Promise.all(
      entries.map(async ([productId, userId]) => {
        const product = await fetch(`/api/products/${productId}`).then((r) => r.json());
        return fetch("/api/products", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...product, id: productId, assignedUserId: userId }),
        });
      })
    );

    setSaving({});
    toast.success(`${entries.length} бараа хуваарилагдлаа`);
    load();
  }

  const assignedCount = Object.values(assignments).filter(Boolean).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Бараа хуваарилах</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {loading ? "..." : `${products.length} бараа хуваарилагдаагүй байна`}
          </p>
        </div>
        {assignedCount > 0 && (
          <Button onClick={handleAssignAll} className="gap-2">
            <Check size={15} />
            Бүгдийг хуваарилах ({assignedCount})
          </Button>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Уншиж байна...</p>
      ) : products.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <UserX size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">Бүх бараа хуваарилагдсан байна</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/50">
                <TableHead className="text-xs font-semibold text-gray-500 uppercase">#</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 uppercase">Огноо</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 uppercase">Бараа</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 uppercase">Тоо</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 uppercase">Өртөг</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 uppercase w-52">Борлуулагч</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p, idx) => (
                <TableRow key={p.id} className="hover:bg-gray-50/70 transition-colors">
                  <TableCell className="font-mono text-xs text-gray-400">{idx + 1}</TableCell>
                  <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                    {new Date(p.registeredAt).toLocaleDateString("mn-MN")}
                  </TableCell>
                  <TableCell className="text-sm">
                    <span className="font-medium">{p.brand}</span>{" "}
                    <span className="text-gray-600">{p.name}</span>
                    {p.dosage && <span className="text-gray-400 text-xs ml-1">{p.dosage}</span>}
                  </TableCell>
                  <TableCell className="text-sm">{p.quantity}</TableCell>
                  <TableCell className="text-sm font-mono text-gray-700">A${p.costPrice.toFixed(2)}</TableCell>
                  <TableCell>
                    <select
                      value={assignments[p.id] || ""}
                      onChange={(e) => setAssignments((prev) => ({ ...prev, [p.id]: e.target.value }))}
                      className="w-full border rounded-lg px-2.5 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      <option value="">— Сонгох —</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell>
                    <button
                      disabled={!assignments[p.id] || saving[p.id]}
                      onClick={() => handleAssign(p.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-medium transition-colors"
                    >
                      <Check size={12} />
                      {saving[p.id] ? "..." : "Хуваарилах"}
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
