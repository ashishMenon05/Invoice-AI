"use client";
import React from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, useSidebar } from "@/contexts/SidebarContext";

function LayoutInner({ children }: { children: React.ReactNode }) {
  const { isOpen, close } = useSidebar();

  return (
    <div className="flex min-h-screen w-full bg-background overflow-x-hidden">
      {/* Dark overlay when sidebar open on mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}
      <AppSidebar />
      {/* Content: no left margin on mobile, md:ml-60 on desktop */}
      <div className="flex-1 min-w-0 md:ml-60 overflow-x-hidden">
        {children}
      </div>
    </div>
  );
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <LayoutInner>{children}</LayoutInner>
    </SidebarProvider>
  );
}
