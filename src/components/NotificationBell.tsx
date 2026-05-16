"use client";

import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";

interface Notification {
  id: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    const res = await fetch("/api/notifications");
    if (res.ok) {
      const data = await res.json();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000); // 30 секунд тутамд шинэчлэх
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleOpen() {
    setOpen((v) => !v);
    if (!open && unreadCount > 0) {
      await fetch("/api/notifications", { method: "PUT" });
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleOpen}
        className="relative flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-all"
      >
        <Bell size={15} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute bottom-10 left-0 w-80 bg-white rounded-xl shadow-xl border z-50 overflow-hidden">
          <div className="px-4 py-3 border-b">
            <p className="font-semibold text-sm text-gray-800">Мэдэгдэл</p>
          </div>
          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              Мэдэгдэл байхгүй
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`px-4 py-3 ${n.isRead ? "bg-white" : "bg-blue-50"}`}
                >
                  <p className="text-sm font-medium text-gray-800">{n.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(n.createdAt).toLocaleString("mn-MN")}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
