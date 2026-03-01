"use client";
import { useAuth } from "@/contexts/AuthContext";
import { Search, Bell, LogOut, Settings, CheckCircle, AlertTriangle, Clock, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";

type Notif = {
  id: string;
  invoice_id: string;
  vendor: string;
  status: string;
  created_at: string;
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  approved: <CheckCircle className="h-4 w-4 text-status-approved" />,
  auto_approved: <CheckCircle className="h-4 w-4 text-status-approved" />,
  rejected: <AlertTriangle className="h-4 w-4 text-status-rejected" />,
  processing_failed: <AlertTriangle className="h-4 w-4 text-destructive" />,
  processing: <Clock className="h-4 w-4 text-status-processing" />,
  under_review: <Clock className="h-4 w-4 text-status-review" />,
};

const STATUS_MSG: Record<string, string> = {
  approved: "approved ✓",
  auto_approved: "auto-approved ✓",
  rejected: "rejected",
  processing_failed: "failed — retry recommended",
  processing: "is being processed…",
  under_review: "is under review",
};

export const Navbar = ({ title }: { title: string }) => {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const fetchNotifs = useCallback(async () => {
    try {
      const data: Notif[] = await apiClient.getNotifications();
      setNotifs(data);
      setUnread(data.length);
    } catch { }
  }, []);

  useEffect(() => {
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 15000); // poll every 15s
    return () => clearInterval(interval);
  }, [fetchNotifs]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false);
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.charAt(0).toUpperCase() || "U";

  const handleLogout = () => { logout(); router.push("/login"); setOpen(false); };
  const settingsPath = user?.role === "admin" ? "/admin/settings" : "/client/settings";

  const clearAll = async () => {
    await apiClient.clearNotifications();
    setNotifs([]);
    setUnread(0);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 backdrop-blur-sm px-6">
      <h1 className="text-lg font-semibold">{title}</h1>
      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search..." className="w-64 pl-9 h-9 bg-muted/50 border-border/50" />
        </div>

        {/* Bell + Notification Dropdown */}
        <div className="relative" ref={bellRef}>
          <Button
            variant="ghost" size="icon" className="relative"
            onClick={() => { setBellOpen(o => !o); if (!bellOpen) setUnread(0); }}
          >
            <Bell className="h-4 w-4" />
            {unread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 h-4 w-4 rounded-full bg-primary text-[9px] font-bold text-primary-foreground flex items-center justify-center">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Button>

          {bellOpen && (
            <div className="absolute right-0 top-10 z-50 w-80 rounded-xl border border-border bg-background shadow-xl shadow-black/20 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <p className="text-sm font-semibold">Notifications</p>
                {notifs.length > 0 && (
                  <button onClick={clearAll} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    Clear all
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifs.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">All caught up! 🎉</p>
                ) : notifs.map(n => (
                  <div
                    key={n.id}
                    className="flex items-start gap-3 px-4 py-3 border-b border-border/50 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => { router.push(`/client/invoices/${n.invoice_id}`); setBellOpen(false); }}
                  >
                    <div className="mt-0.5 shrink-0">{STATUS_ICON[n.status] ?? <Clock className="h-4 w-4" />}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{n.vendor || "Invoice"}</p>
                      <p className="text-xs text-muted-foreground">Your invoice {STATUS_MSG[n.status] ?? n.status}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                        {new Date(n.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Avatar + Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setOpen(o => !o)}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground hover:ring-2 hover:ring-primary/30 transition-all focus:outline-none overflow-hidden"
            aria-label="Open profile menu"
          >
            {user?.avatar ? (
              <img src={user.avatar} alt={user?.name} className="h-8 w-8 rounded-full object-cover" referrerPolicy="no-referrer" />
            ) : initials}
          </button>

          {open && (
            <div className="absolute right-0 top-10 z-50 w-56 rounded-xl border border-border bg-background shadow-xl shadow-black/20 overflow-hidden">
              <div className="p-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground shrink-0 overflow-hidden">
                    {user?.avatar ? (
                      <img src={user.avatar} alt={user?.name} className="h-9 w-9 rounded-full object-cover" referrerPolicy="no-referrer" />
                    ) : initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{user?.name || "User"}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                  </div>
                </div>
              </div>
              <div className="p-1.5 space-y-0.5">
                <button
                  onClick={() => { router.push(settingsPath); setOpen(false); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors text-left"
                >
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  Profile & Settings
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors text-left"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
