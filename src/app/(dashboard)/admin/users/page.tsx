"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, UserCheck, UserX, ChevronRight } from "lucide-react";
import Link from "next/link";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "STAFF" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadUsers() {
    const data = await fetch("/api/users").then((r) => r.json());
    setUsers(data);
  }

  useEffect(() => { loadUsers(); }, []);

  async function handleAdd() {
    setSaving(true);
    setError("");
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      setOpen(false);
      setForm({ name: "", email: "", password: "", role: "STAFF" });
      loadUsers();
    } else {
      const data = await res.json();
      setError(data.error || "Алдаа гарлаа");
    }
  }

  async function toggleActive(user: User) {
    await fetch("/api/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id, isActive: !user.isActive }),
    });
    loadUsers();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold">Борлуулагч удирдах</h1>
          <p className="text-sm text-gray-500 mt-0.5">Системийн хэрэглэгчид</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus size={16} className="mr-1" />
          Борлуулагч нэмэх
        </Button>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Нэр</TableHead>
              <TableHead>Имэйл</TableHead>
              <TableHead>Эрх</TableHead>
              <TableHead>Төлөв</TableHead>
              <TableHead>Бүртгэсэн</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id} className={!u.isActive ? "opacity-50" : ""}>
                <TableCell className="font-medium">
                  <Link href={`/admin/users/${u.id}`} className="hover:text-blue-600 flex items-center gap-1 group">
                    {u.name}
                    <ChevronRight size={14} className="text-gray-300 group-hover:text-blue-400 transition-colors" />
                  </Link>
                </TableCell>
                <TableCell className="text-sm text-gray-500">{u.email}</TableCell>
                <TableCell>
                  {u.role === "ADMIN" ? (
                    <Badge variant="default">Админ</Badge>
                  ) : (
                    <Badge variant="secondary">Борлуулагч</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {u.isActive ? (
                    <Badge variant="outline" className="text-green-600 border-green-300">Идэвхтэй</Badge>
                  ) : (
                    <Badge variant="outline" className="text-red-500 border-red-300">Хаасан</Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm text-gray-400">
                  {new Date(u.createdAt).toLocaleDateString("mn-MN")}
                </TableCell>
                <TableCell>
                  <button
                    onClick={() => toggleActive(u)}
                    title={u.isActive ? "Хаах" : "Идэвхжүүлэх"}
                    className="text-gray-400 hover:text-gray-700 transition-colors"
                  >
                    {u.isActive ? <UserX size={16} /> : <UserCheck size={16} />}
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Шинэ борлуулагч нэмэх</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Нэр</Label>
              <Input
                placeholder="Бүтэн нэр"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Имэйл</Label>
              <Input
                type="email"
                placeholder="email@example.com"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Нууц үг</Label>
              <Input
                type="password"
                placeholder="Дор хаяж 6 тэмдэгт"
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>Эрх</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm((p) => ({ ...p, role: v ?? "STAFF" }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="STAFF">Борлуулагч</SelectItem>
                  <SelectItem value="ADMIN">Админ</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpen(false); setError(""); }}>
              Цуцлах
            </Button>
            <Button
              onClick={handleAdd}
              disabled={saving || !form.name || !form.email || !form.password}
            >
              {saving ? "Хадгалж байна..." : "Нэмэх"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
