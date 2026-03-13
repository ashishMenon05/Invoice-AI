"use client";
import { cn } from "@/lib/utils";

export const ConfidenceBar = ({ value, className }: { value: number; className?: string }) => {
  const color = value >= 85 ? "bg-status-approved" : value >= 70 ? "bg-status-review" : "bg-status-rejected";
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-2 w-20 rounded-full bg-muted overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-mono text-muted-foreground">{value}%</span>
    </div>
  );
};
