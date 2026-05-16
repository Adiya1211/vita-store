"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  List, Settings, LogOut, Users, Ship, LayoutGrid,
  BarChart2, ScrollText, ShoppingCart, Menu, X, Banknote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import NotificationBell from "@/components/NotificationBell";

interface Props {
  role: string;
  userName: string;
}

const navItems = [
  { href: "/dashboard",  label: "Dashboard",      icon: BarChart2,   adminOnly: false, staffOnly: false },
  { href: "/products",   label: "Бүтээгдэхүүн",   icon: List,        adminOnly: true,  staffOnly: false },
  { href: "/sales",      label: "Борлуулалт",      icon: ShoppingCart,adminOnly: false, staffOnly: false },
  { href: "/shipments",  label: "Ачаа",            icon: Ship,        adminOnly: false, staffOnly: false },
  { href: "/payments",   label: "Төлбөр",          icon: Banknote,    adminOnly: false, staffOnly: true  },
];

const adminItems = [
  { href: "/admin/users", label: "Борлуулагчид", icon: Users },
  { href: "/admin/payments", label: "Төлбөр", icon: Banknote },
  { href: "/admin/logs", label: "Үйл ажиллагааны лог", icon: ScrollText },
  { href: "/admin/fields", label: "Талбар тохируулга", icon: Settings },
];

function SidebarContent({
  role,
  userName,
  onClose,
}: {
  role: string;
  userName: string;
  onClose?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="w-60 bg-gray-950 flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <LayoutGrid size={16} className="text-white" />
          </div>
          <div>
            <div className="text-white font-bold text-sm leading-none">VitaStore</div>
            <div className="text-gray-500 text-xs mt-0.5">Бүртгэлийн систем</div>
          </div>
        </div>
        {/* Mobile close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors lg:hidden"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.filter(item => {
          if (item.staffOnly) return role === "STAFF";
          if (item.adminOnly) return role === "ADMIN";
          return true;
        }).map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={onClose}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
              pathname === href
                ? "bg-blue-600 text-white font-medium shadow-sm"
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            )}
          >
            <Icon size={15} />
            {label}
          </Link>
        ))}

        {role === "ADMIN" && (
          <>
            <div className="pt-5 pb-2 px-3">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Тохируулга</span>
            </div>
            {adminItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                  pathname === href
                    ? "bg-blue-600 text-white font-medium"
                    : "text-gray-400 hover:text-white hover:bg-gray-800"
                )}
              >
                <Icon size={15} />
                {label}
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* User */}
      <div className="px-3 py-3 border-t border-gray-800 space-y-1">
        <div className="flex items-center gap-3 px-3 py-2">
          <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-xs font-semibold text-gray-300">
            {userName.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white font-medium truncate">{userName}</p>
            <p className="text-xs text-gray-500">{role === "ADMIN" ? "Админ" : "Борлуулагч"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3">
          <span className="hidden lg:flex">
            <NotificationBell />
          </span>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-2 flex-1 py-2 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-all px-2"
          >
            <LogOut size={15} />
            Гарах
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SidebarClient({ role, userName }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Хуудас солигдоход drawer хаана
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Drawer нээлттэй үед scroll lock
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex shrink-0">
        <SidebarContent role={role} userName={userName} />
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 h-14 bg-gray-950 border-b border-gray-800">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-blue-500 rounded-lg flex items-center justify-center">
            <LayoutGrid size={14} className="text-white" />
          </div>
          <span className="text-white font-bold text-sm">VitaStore</span>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button
            onClick={() => setOpen(true)}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <Menu size={22} />
          </button>
        </div>
      </div>

      {/* Mobile drawer overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 flex"
          onClick={() => setOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Drawer */}
          <div
            className="relative z-50 flex flex-col animate-in slide-in-from-left duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <SidebarContent
              role={role}
              userName={userName}
              onClose={() => setOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
