"use client";
import React from "react";
import { AppSidebar } from "@/components/AppSidebar";

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar />
      <div className="flex-1 ml-60 max-md:ml-16">
        {children}
      </div>
    </div>
  );
}
