"use client";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { NavLink } from "@/components/NavLink";
import {
  LayoutDashboard, Upload, FileText, Settings, Users,
  BarChart3, LogOut, ChevronLeft, ChevronRight, Zap, ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

const clientNav = [
  { title: "Dashboard", url: "/client/dashboard", icon: LayoutDashboard },
  { title: "Upload Invoice", url: "/client/upload", icon: Upload },
  { title: "My Invoices", url: "/client/invoices", icon: FileText },
  { title: "Settings", url: "/client/settings", icon: Settings },
];

const adminNav = [
  { title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard },
  { title: "All Invoices", url: "/admin/invoices", icon: FileText },
  { title: "Clients", url: "/admin/clients", icon: Users },
  { title: "Analytics", url: "/admin/analytics", icon: BarChart3 },
  { title: "Policies", url: "/admin/policies", icon: ShieldCheck },
  { title: "Settings", url: "/admin/settings", icon: Settings },
];

export const AppSidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useRouter();
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);

  const navItems = user?.role === "admin" ? adminNav : clientNav;

  const handleLogout = () => {
    logout();
    navigate.push("/login");
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border bg-sidebar transition-all duration-300",
        collapsed ? "w-16" : "w-60",
        isMobile && collapsed && "hidden"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 border-b border-border px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
          <Zap className="h-4 w-4 text-primary-foreground" />
        </div>
        {!collapsed && <span className="text-lg font-bold tracking-tight">InvoiceAI</span>}
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            end={item.url.endsWith("dashboard")}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              collapsed && "justify-center px-2"
            )}
            activeClassName="bg-sidebar-accent text-sidebar-primary"
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-3 space-y-2">
        {!collapsed && user && (
          <div className="mb-2 px-3">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive",
            collapsed && "justify-center px-2"
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className="w-full h-8"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
    </aside>
  );
};
