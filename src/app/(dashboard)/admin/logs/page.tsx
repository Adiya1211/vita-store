"use client";

import { useEffect, useState } from "react";
import { ScrollText, Package, Pencil, Trash2, CheckCircle, Ship, Copy } from "lucide-react";

interface Log {
  id: string;
  action: string;
  description: string;
  userId: string;
  userName: string;
  productId: string | null;
  productName: string | null;
  createdAt: string;
}

const ACTION_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  CREATED:  { label: "Бүртгэсэн",    icon: Package,      color: "text-blue-600",   bg: "bg-blue-50" },
  UPDATED:  { label: "Засварласан",   icon: Pencil,       color: "text-amber-600",  bg: "bg-amber-50" },
  DELETED:  { label: "Устгасан",      icon: Trash2,       color: "text-red-600",    bg: "bg-red-50" },
  APPROVED: { label: "Зөвшөөрсөн",   icon: CheckCircle,  color: "text-teal-600",   bg: "bg-teal-50" },
  SHIPPED:  { label: "Илгээсэн",      icon: Ship,         color: "text-indigo-600", bg: "bg-indigo-50" },
  COPIED:   { label: "Хуулсан",       icon: Copy,         color: "text-purple-600", bg: "bg-purple-50" },
};

export default function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState("ALL");

  useEffect(() => {
    fetch("/api/logs")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => { setLogs(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = filterAction === "ALL" ? logs : logs.filter((l) => l.action === filterAction);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Үйл ажиллагааны лог</h1>
          <p className="text-sm text-gray-400 mt-0.5">Системд хийгдсэн бүх үйлдлийн бүртгэл</p>
        </div>
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="border rounded-lg px-3 h-9 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-gray-200"
        >
          <option value="ALL">Бүгд</option>
          {Object.entries(ACTION_CONFIG).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Уншиж байна...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <ScrollText size={40} className="mx-auto mb-3 opacity-30" />
          <p>Лог байхгүй байна</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-100">
            {filtered.map((log) => {
              const cfg = ACTION_CONFIG[log.action] ?? ACTION_CONFIG["UPDATED"];
              const Icon = cfg.icon;
              return (
                <div key={log.id} className="flex items-start gap-4 px-5 py-3.5 hover:bg-gray-50/70 transition-colors">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${cfg.bg}`}>
                    <Icon size={14} className={cfg.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                        {cfg.label}
                      </span>
                      <span className="text-sm text-gray-800">{log.description}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-400">{log.userName}</span>
                      <span className="text-xs text-gray-300">·</span>
                      <span className="text-xs text-gray-400">
                        {new Date(log.createdAt).toLocaleString("mn-MN")}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
