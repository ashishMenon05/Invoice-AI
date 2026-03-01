"use client";
import { InvoiceStatus } from "@/types";
import { cn } from "@/lib/utils";

const config: Record<string, { label: string; className: string }> = {
  approved: { label: "Approved", className: "bg-status-approved/15 text-status-approved border-status-approved/30" },
  auto_approved: { label: "Auto Approved", className: "bg-status-approved/15 text-status-approved border-status-approved/30" },
  under_review: { label: "Under Review", className: "bg-status-review/15 text-status-review border-status-review/30" },
  review: { label: "Under Review", className: "bg-status-review/15 text-status-review border-status-review/30" },
  rejected: { label: "Rejected", className: "bg-status-rejected/15 text-status-rejected border-status-rejected/30" },
  processing: { label: "Processing", className: "bg-status-processing/15 text-status-processing border-status-processing/30" },
  processing_failed: { label: "AI Failed — Retry", className: "bg-destructive/15 text-destructive border-destructive/30" },
  admin_pass_needed: { label: "Admin Pass Needed", className: "bg-amber-500/15 text-amber-500 border-amber-500/30" },
};

export const StatusBadge = ({ status }: { status: string }) => {
  const safeStatus = status?.toLowerCase() || "processing";
  const { label, className } = config[safeStatus] || { label: status, className: "bg-muted text-muted-foreground border-border" };

  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium", className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
};
