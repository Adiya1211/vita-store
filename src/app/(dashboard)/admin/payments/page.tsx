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
import { Banknote, Plus, Check, X, Clock, TrendingUp, CreditCard } from "lucide-react";

interface SummaryRow {
  userId: string;
  name: string;
  collected: number;
  transferred: number;
  pending: number;
  outstanding: number;
  lastPaymentAt: string | null;
}

interface Payment {
  id: string;
  amount: number;
  note: string | null;
  paidAt: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionNote: string | null;
  fromUser: { id: string; name: string };
}

function MetricCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-4 flex flex-col gap-1">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-base font-bold ${color}`}>{value}</p>
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
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700" title={rejectionNote ?? undefined}>
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

function PaymentsTable({
  payments,
  rejectingId,
  rejectNote,
  actionLoading,
  onApprove,
  onToggleReject,
  onRejectNoteChange,
  onConfirmReject,
  onCancelReject,
}: {
  payments: Payment[];
  rejectingId: string | null;
  rejectNote: string;
  actionLoading: string | null;
  onApprove: (id: string) => void;
  onToggleReject: (id: string) => void;
  onRejectNoteChange: (note: string) => void;
  onConfirmReject: (id: string) => void;
  onCancelReject: () => void;
}) {
  if (payments.length === 0) {
    return (
      <div className="px-5 py-8 text-center text-sm text-gray-400">
        Шилжүүлэлт бүртгэгдээгүй байна
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50/50">
            <TableHead className="text-xs font-semibold text-gray-500 uppercase">#</TableHead>
            <TableHead className="text-xs font-semibold text-gray-500 uppercase">Огноо</TableHead>
            <TableHead className="text-xs font-semibold text-gray-500 uppercase">Дүн (₮)</TableHead>
            <TableHead className="text-xs font-semibold text-gray-500 uppercase">Тэмдэглэл</TableHead>
            <TableHead className="text-xs font-semibold text-gray-500 uppercase">Төлөв</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((p, idx) => (
            <>
              <TableRow key={p.id} className="hover:bg-gray-50/70 transition-colors">
                <TableCell className="font-mono text-xs text-gray-400">{idx + 1}</TableCell>
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
                  {p.status === "PENDING" ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onApprove(p.id)}
                        disabled={actionLoading === p.id}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green-500 hover:bg-green-600 text-white text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        <Check size={12} /> Зөвшөөрөх
                      </button>
                      <button
                        onClick={() => onToggleReject(p.id)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-medium transition-colors"
                      >
                        <X size={12} /> Татгаалах
                      </button>
                    </div>
                  ) : (
                    <StatusBadge status={p.status} rejectionNote={p.rejectionNote} />
                  )}
                </TableCell>
              </TableRow>
              {rejectingId === p.id && (
                <TableRow key={`${p.id}-reject`} className="bg-red-50">
                  <TableCell colSpan={5} className="py-2 px-5">
                    <div className="flex items-center gap-2">
                      <Input
                        value={rejectNote}
                        onChange={(e) => onRejectNoteChange(e.target.value)}
                        placeholder="Татгаалсан шалтгаан (заавал биш)..."
                        className="h-8 text-sm flex-1 bg-white"
                        autoFocus
                      />
                      <button
                        onClick={() => onConfirmReject(p.id)}
                        disabled={actionLoading === p.id}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        <X size={12} /> Баталгаажуулах
                      </button>
                      <button
                        onClick={onCancelReject}
                        className="px-2 py-1.5 rounded-lg border hover:bg-white text-gray-500 text-xs transition-colors"
                      >
                        Цуцлах
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function AdminPaymentsPage() {
  const [summary, setSummary] = useState<SummaryRow[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [paidAt, setPaidAt] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Reject inline state
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  async function fetchData() {
    const [summaryRes, paymentsRes] = await Promise.all([
      fetch("/api/payments/summary"),
      fetch("/api/payments"),
    ]);
    if (summaryRes.ok) setSummary(await summaryRes.json());
    if (paymentsRes.ok) setPayments(await paymentsRes.json());
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
  }, []);

  function openModal(userId?: string) {
    setSelectedUserId(userId || "");
    setAmount("");
    setNote("");
    setPaidAt(new Date().toISOString().split("T")[0]);
    setError("");
    setModalOpen(true);
  }

  async function handleSubmit() {
    setError("");
    if (!selectedUserId) { setError("Борлуулагч сонгоно уу"); return; }
    if (!amount || Number(amount) <= 0) { setError("Дүн оруулна уу"); return; }

    setSaving(true);
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromUserId: selectedUserId, amount: Number(amount), note: note || null, paidAt }),
    });
    setSaving(false);

    if (res.ok) {
      toast.success("Шилжүүлэлт бүртгэгдлээ");
      setModalOpen(false);
      fetchData();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Алдаа гарлаа");
      toast.error(d.error || "Алдаа гарлаа");
    }
  }

  async function handleAction(paymentId: string, action: "approve" | "reject") {
    setActionLoading(paymentId);
    const res = await fetch(`/api/payments/${paymentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action,
        rejectionNote: action === "reject" ? rejectNote : undefined,
      }),
    });
    setActionLoading(null);

    if (res.ok) {
      toast.success(action === "approve" ? "Зөвшөөрлөө" : "Татгаалагдлаа");
      setRejectingId(null);
      setRejectNote("");
      fetchData();
    } else {
      toast.error("Алдаа гарлаа");
    }
  }

  function toggleReject(id: string) {
    if (rejectingId === id) {
      setRejectingId(null);
      setRejectNote("");
    } else {
      setRejectingId(id);
      setRejectNote("");
    }
  }

  // Group payments by userId
  const paymentsByUser = payments.reduce<Record<string, Payment[]>>((acc, p) => {
    const uid = p.fromUser.id;
    if (!acc[uid]) acc[uid] = [];
    acc[uid].push(p);
    return acc;
  }, {});

  const totalCollected   = summary.reduce((s, r) => s + r.collected, 0);
  const totalTransferred = summary.reduce((s, r) => s + r.transferred, 0);
  const totalPending     = summary.reduce((s, r) => s + r.pending, 0);
  const totalOutstanding = summary.reduce((s, r) => s + r.outstanding, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Төлбөр</h1>
          <p className="text-sm text-gray-400 mt-0.5">Борлуулагч бүрийн цуглуулсан болон шилжүүлсэн мөнгийг хянах</p>
        </div>
        <Button onClick={() => openModal()} className="gap-1.5">
          <Plus size={15} />
          Шилжүүлэлт бүртгэх
        </Button>
      </div>

      {/* Overall summary cards */}
      {!loading && summary.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Нийт цуглуулсан"    value={`₮${totalCollected.toLocaleString("mn-MN")}`}   color="text-gray-900" />
          <MetricCard label="Нийт шилжүүлсэн"    value={`₮${totalTransferred.toLocaleString("mn-MN")}`} color="text-green-600" />
          <MetricCard label="Хүлээгдэж байна"     value={`₮${totalPending.toLocaleString("mn-MN")}`}    color={totalPending > 0 ? "text-amber-500" : "text-gray-300"} />
          <MetricCard label="Нийт үлдэгдэл"       value={`₮${totalOutstanding.toLocaleString("mn-MN")}`} color={totalOutstanding > 0 ? "text-red-600" : "text-green-600"} />
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Уншиж байна...</div>
      ) : summary.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">Мэдээлэл байхгүй байна</div>
      ) : (
        <div className="space-y-6">
          {summary.map((row) => {
            const userPayments = paymentsByUser[row.userId] ?? [];
            return (
              <div key={row.userId} className="bg-white rounded-xl border shadow-sm overflow-hidden">
                {/* Staff header */}
                <div className="px-5 py-4 border-b bg-gray-50/50 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600">
                    {row.name.charAt(0)}
                  </div>
                  <span className="font-semibold text-gray-800">{row.name}</span>
                  <span className="text-xs text-gray-400 ml-1">{userPayments.length} шилжүүлэлт</span>
                  {row.outstanding > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">
                      Үлдэгдэлтэй
                    </span>
                  )}
                  {row.pending > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 font-medium">
                      ₮{row.pending.toLocaleString("mn-MN")} хүлээгдэж байна
                    </span>
                  )}
                  <div className="ml-auto">
                    <Button size="sm" variant="outline" onClick={() => openModal(row.userId)} className="text-xs h-7 px-2.5">
                      Бүртгэх
                    </Button>
                  </div>
                </div>

                {/* 4 metric cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4 border-b">
                  <MetricCard label="Цуглуулсан"       value={`₮${row.collected.toLocaleString("mn-MN")}`}   color="text-gray-900" />
                  <MetricCard label="Шилжүүлсэн"       value={`₮${row.transferred.toLocaleString("mn-MN")}`} color="text-green-600" />
                  <MetricCard label="Хүлээгдэж байна"  value={`₮${row.pending.toLocaleString("mn-MN")}`}    color={row.pending > 0 ? "text-amber-500" : "text-gray-300"} />
                  <MetricCard label="Үлдэгдэл"         value={`₮${row.outstanding.toLocaleString("mn-MN")}`} color={row.outstanding > 0 ? "text-red-600" : "text-green-600"} />
                </div>

                {/* Per-staff payment table */}
                <PaymentsTable
                  payments={userPayments}
                  rejectingId={rejectingId}
                  rejectNote={rejectNote}
                  actionLoading={actionLoading}
                  onApprove={(id) => handleAction(id, "approve")}
                  onToggleReject={toggleReject}
                  onRejectNoteChange={setRejectNote}
                  onConfirmReject={(id) => handleAction(id, "reject")}
                  onCancelReject={() => { setRejectingId(null); setRejectNote(""); }}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Banknote size={16} className="text-blue-500" />
              Шилжүүлэлт бүртгэх
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Борлуулагч */}
            <div className="space-y-1">
              <Label>Борлуулагч <span className="text-red-500">*</span></Label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">-- Сонгоно уу --</option>
                {summary.map((row) => (
                  <option key={row.userId} value={row.userId}>
                    {row.name} (үлдэгдэл: ₮{row.outstanding.toLocaleString("mn-MN")})
                  </option>
                ))}
              </select>
            </div>

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
