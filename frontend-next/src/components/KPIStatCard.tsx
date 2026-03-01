"use client";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface KPIStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; positive: boolean };
  className?: string;
}

export const KPIStatCard = ({ title, value, subtitle, icon: Icon, trend, className }: KPIStatCardProps) => (
  <Card className={cn("glass-card hover:border-primary/30 transition-colors", className)}>
    <CardContent className="p-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          {trend && (
            <p className={cn("text-xs font-medium", trend.positive ? "text-status-approved" : "text-status-rejected")}>
              {trend.positive ? "↑" : "↓"} {Math.abs(trend.value)}% from last week
            </p>
          )}
        </div>
        <div className="rounded-lg bg-primary/10 p-2.5">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
    </CardContent>
  </Card>
);
