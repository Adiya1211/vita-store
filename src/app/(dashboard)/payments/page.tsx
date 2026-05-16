"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Banknote, Plus, Check, X, Clock } from "lucide-react";

interface Payment {
  id: string;
  amount: number;
  note: string | null;
  paidAt: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionNote: string | null;
  fromUser: { id: string; name: string };
}

interface Sale {
  totalAmount: number;
  paymentType: string;
}

function StatCard({
  label,
  value,
  color,
  sub,
}: {
  label: string;
  value: string;
  color: string;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-4 flex items-start gap-3">
      <div className={`w-2 self-stretch rounded-full ${color}`} />
      <div>
        <p className="text-xs text-gray-500 mb-0.5">{label}</p>
        <p className="text-xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function StatusBadge({ status, rejectionNote }: { status: Payment["status"]; rejectionNote: string | null }) {
  if (status === "APPROVED") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <Check size={10} /> Зөвшөөрсөн
      </span>
    );
  }
  if (status === "REJECTED") {
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700"
        title={rejectionNote ?? undefined}
      >
        <X size={10} /> Татгаалагдсан{rejectionNote ? `: ${rejectionNote}` : ""}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
      <Clock size={10} /> Хүлээгдэж байна
    </span>
  );
}

export default function StaffPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [paidAt, setPaidAt] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function fetchData() {
    const [paymentsRes, salesRes] = await Promise.all([
      fetch("/api/payments"),
      fetch("/api/sales"),
    ]);
    if (paymentsRes.ok) setPayments(await paymentsRes.json());
    if (salesRes.ok) setSales(await salesRes.json());
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, []);

  function openModal() {
    setAmount("");
    setNote("");
    setPaidAt(new Date().toISOString().split("T")[0]);
    setError("");
    setModalOpen(true);
  }

  async function handleSubmit() {
    setError("");
    if (!amount || Number(amount) <= 0) { setError("Дүн оруулна уу"); return; }

    setSaving(true);
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(amount), note: note || null, paidAt }),
    });
    setSaving(false);

    if (res.ok) {
      toast.success("Шилжүүлэлт бүртгэгдлээ. Админ зөвшөөрнө.");
      setModalOpen(false);
      fetchData();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Алдаа гарлаа");
      toast.error(d.error || "Алдаа гарлаа");
    }
  }

  // Compute balance figures
  const collected = sales
    .filter((s) => s.paymentType === "PAID")
    .reduce((sum, s) => sum + s.totalAmount, 0);

  const transferred = payments
    .filter((p) => p.status === "APPROVED")
    .reduce((sum, p) => sum + p.amount, 0);

  const pending = payments
    .filter((p) => p.status === "PENDING")
    .reduce((sum, p) => sum + p.amount, 0);

  const outstanding = collected - transferred;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Миний тооцоо</h1>
          <p className="text-sm text-gray-400 mt-0.5">Цуглуулсан болон шилжүүлсэн мөнгөний дэлгэрэнгүй</p>
        </div>
        <Button onClick={openModal} className="gap-1.5">
          <Plus size={15} />
          Шилжүүлэлт бүртгэх
        </Button>
      </div>

      {/* Balance cards */}
      <div className="grid grid-cols-2 gap-4">
        <StatCard
          label="Цуглуулсан орлого"
          value={loading ? "..." : `₮${collected.toLocaleString("mn-MN")}`}
          color="bg-blue-500"
          sub="PAID борлуулалтаас"
        />
        <StatCard
          label="Шилжүүлсэн (зөвшөөрсөн)"
          value={loading ? "..." : `₮${transferred.toLocaleString("mn-MN")}`}
          color="bg-green-500"
        />
        <StatCard
          label="Хүлээгдэж байна"
          value={loading ? "..." : `₮${pending.toLocaleString("mn-MN")}`}
          color="bg-amber-400"
          sub="Админ зөвшөөрөх хүлээж байна"
        />
        <StatCard
          label="Үлдэгдэл"
          value={loading ? "..." : `₮${outstanding.toLocaleString("mn-MN")}`}
          color={outstanding > 0 ? "bg-red-500" : "bg-green-500"}
          sub={outstanding > 0 ? "Шилжүүлэх шаардлагатай" : "Тооцоо дууссан"}
        />
      </div>

      {/* Payment history */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b bg-gray-50/50 flex items-center gap-2">
          <Banknote size={15} className="text-gray-500" />
          <span className="text-sm font-semibold text-gray-700">Шилжүүлэлтийн түүх</span>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/50">
              <TableHead className="text-xs font-semibold text-gray-500 uppercase">Огноо</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase">Дүн (₮)</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase">Тэмдэглэл</TableHead>
              <TableHead className="text-xs font-semibold text-gray-500 uppercase">Төлөв</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-gray-400">Уншиж байна...</TableCell>
              </TableRow>
            ) : payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-10 text-gray-400">
                  Шилжүүлэлт бүртгэгдээгүй байна
                </TableCell>
              </TableRow>
            ) : (
              payments.map((p) => (
                <TableRow key={p.id} className="hover:bg-gray-50/70 transition-colors">
                  <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                    {new Date(p.paidAt).toLocaleDateString("mn-MN")}
                  </TableCell>
                  <TableCell className="text-sm font-mono font-semibold text-green-700">
                    ₮{p.amount.toLocaleString("mn-MN")}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {p.note || <span className="text-gray-300">—</span>}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={p.status} rejectionNote={p.rejectionNote} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Submit payment modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote size={16} className="text-blue-500" />
              Шилжүүлэлт бүртгэх
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Таны шилжүүлэлт админд мэдэгдэгдэнэ. Зөвшөөрсний дараа тооцоонд орно.
            </p>

            {/* Дүн */}
            <div className="space-y-1">
              <Label>Дүн (₮) <span className="text-red-500">*</span></Label>
              <Input
                type="number"
                min={1}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
              />
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
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Цуцлах</Button>
            <Button onClick={handleSubmit} disabled={saving} className="gap-1.5">
              <Banknote size={14} />
              {saving ? "Бүртгэж байна..." : "Бүртгэх"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
