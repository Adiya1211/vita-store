"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ArrowLeft, Package, Clock, CheckCircle, Ship, DollarSign, TrendingUp, ShoppingCart } from "lucide-react";

interface Product {
  id: string;
  sequenceNumber: number;
  brand: string;
  name: string;
  dosage: string | null;
  quantity: number;
  costPrice: number;
  discountedPrice: number | null;
  sellingPrice: number;
  totalPrice: number;
  status: string;
  registeredAt: string;
  shipment: { id: string; name: string } | null;
}

interface Sale {
  id: string;
  quantity: number;
  actualPrice: number;
  totalAmount: number;
  bonus: number | null;
  paymentType: "PAID" | "CREDIT";
  note: string | null;
  soldAt: string;
  product: { id: string; brand: string; name: string; dosage: string | null };
}

interface Stats {
  total: number;
  pendingCount: number;
  approvedCount: number;
  shippedCount: number;
  totalValue: number;
  totalProfit: number;
  salesCount: number;
  salesRevenue: number;
  salesBonus: number;
  creditCount: number;
}

interface UserDetail {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING:  { label: "Хүлээгдэж байна", color: "bg-orange-100 text-orange-700" },
  APPROVED: { label: "Зөвшөөрсөн",      color: "bg-teal-100 text-teal-700" },
};

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-4 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={16} className="text-white" />
      </div>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-lg font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<{ user: UserDetail; products: Product[]; sales: Sale[]; stats: Stats } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/users/${params.id}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); });
  }, [params.id]);

  if (loading) return <div className="text-sm text-gray-400 py-10 text-center">Уншиж байна...</div>;
  if (!data) return null;

  const { user, products, sales, stats } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/users">
          <Button variant="ghost" size="sm"><ArrowLeft size={16} /></Button>
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
            {user.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{user.name}</h1>
            <p className="text-sm text-gray-400">{user.email}</p>
          </div>
          <Badge variant={user.isActive ? "outline" : "secondary"} className={user.isActive ? "text-green-600 border-green-300" : "text-gray-400"}>
            {user.isActive ? "Идэвхтэй" : "Хаасан"}
          </Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard icon={Package}      label="Нийт бараа"          value={stats.total}        color="bg-blue-500" />
        <StatCard icon={Clock}        label="Хүлээгдэж байна"      value={stats.pendingCount}  color="bg-orange-400" />
        <StatCard icon={CheckCircle}  label="Зөвшөөрсөн"           value={stats.approvedCount} color="bg-teal-500" />
        <StatCard icon={Ship}         label="Ачаагаар явсан"        value={stats.shippedCount}  color="bg-indigo-500" />
        <StatCard icon={DollarSign}   label="Нийт өртөг"
          value={`A$${stats.totalValue.toLocaleString("en-AU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          color="bg-violet-500"
        />
        <StatCard icon={TrendingUp}   label="Хүлээгдэх ашиг"
          value={`₮${stats.totalProfit.toLocaleString("mn-MN")}`}
          color={stats.totalProfit >= 0 ? "bg-green-500" : "bg-red-500"}
        />
        <StatCard icon={ShoppingCart} label="Нийт борлуулалт"
          value={`${stats.salesCount}ш`}
          color="bg-green-500"
        />
        <StatCard icon={TrendingUp}   label="Борлуулалтын орлого"
          value={`₮${stats.salesRevenue.toLocaleString("mn-MN")}`}
          color="bg-emerald-500"
        />
        <StatCard icon={DollarSign}   label="Нийт бонус"
          value={`₮${stats.salesBonus.toLocaleString("mn-MN")}`}
          color="bg-amber-400"
        />
      </div>

      {/* Sales table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b flex items-center gap-2">
          <ShoppingCart size={16} className="text-gray-500" />
          <h2 className="font-semibold text-gray-800">Борлуулалтын түүх</h2>
          {stats.creditCount > 0 && (
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">
              {stats.creditCount} зээлтэй
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/50">
                <TableHead className="text-xs font-semibold text-gray-500 uppercase">#</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 uppercase">Огноо</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 uppercase">Бараа</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 uppercase">Тоо</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 uppercase">Зарагдсан үнэ</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 uppercase">Нийт</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 uppercase">Бонус</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 uppercase">Төлбөр</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 uppercase">Тэмдэглэл</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-gray-400">
                    Борлуулалт байхгүй
                  </TableCell>
                </TableRow>
              ) : (
                sales.map((sale, idx) => (
                  <TableRow key={sale.id} className="hover:bg-gray-50/70 transition-colors">
                    <TableCell className="font-mono text-xs text-gray-400">{idx + 1}</TableCell>
                    <TableCell className="text-sm text-gray-500 whitespace-nowrap">
                      {new Date(sale.soldAt).toLocaleDateString("mn-MN")}
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className="font-medium">{sale.product.brand}</span>{" "}
                      <span className="text-gray-600">{sale.product.name}</span>
                      {sale.product.dosage && <span className="text-gray-400 text-xs ml-1">{sale.product.dosage}</span>}
                    </TableCell>
                    <TableCell className="text-sm">{sale.quantity}</TableCell>
                    <TableCell className="text-sm font-mono text-gray-700">
                      ₮{sale.actualPrice.toLocaleString("mn-MN")}
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
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">Төлөгдсөн</span>
                      ) : (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">Зээл</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {sale.note || <span className="text-gray-300">—</span>}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Products table */}
      <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold text-gray-800">Бараануудын жагсаалт</h2>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/50">
                <TableHead className="text-xs font-semibold text-gray-500 uppercase">#</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 uppercase">Огноо</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 uppercase">Бараа</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 uppercase">Тоо</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 uppercase">Өртөг</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 uppercase">Ашиг</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 uppercase">Статус</TableHead>
                <TableHead className="text-xs font-semibold text-gray-500 uppercase">Ачаа</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-gray-400">
                    Бараа байхгүй
                  </TableCell>
                </TableRow>
              ) : (
                products.map((p, idx) => {
                  const effectiveCost = p.discountedPrice ?? p.costPrice;
                  const profit = (p.sellingPrice - effectiveCost) * p.quantity;
                  const statusCfg = STATUS_CONFIG[p.status] ?? STATUS_CONFIG["PENDING"];
                  return (
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
                      <TableCell className="text-sm font-mono text-gray-700">
                        A${p.totalPrice.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-sm font-mono">
                        <span className={profit >= 0 ? "text-green-600 font-medium" : "text-red-500"}>
                          ₮{profit.toLocaleString("mn-MN")}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusCfg.color}`}>
                          {statusCfg.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        {p.shipment
                          ? <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">{p.shipment.name}</span>
                          : <span className="text-gray-300 text-xs">—</span>}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
