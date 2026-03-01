"use client";
import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { KPIStatCard } from "@/components/KPIStatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { apiClient } from "@/lib/api-client";
import { FileText, CheckCircle, TrendingUp, AlertTriangle, Clock, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend
} from "recharts";

const PIE_COLORS = [
  "hsl(142, 71%, 45%)",  // approved
  "hsl(217, 91%, 60%)",  // auto-approved
  "hsl(38, 92%, 50%)",   // under review
  "hsl(0, 84%, 60%)",    // rejected
];

const TOOLTIP_STYLE = {
  backgroundColor: "hsl(224, 24%, 10%)",
  border: "1px solid hsl(222, 14%, 18%)",
  borderRadius: "8px",
  color: "#fff",
  fontSize: "12px",
};
const ITEM_STYLE = { color: "#fff" };

const AdminDashboard = () => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [analyticsData, invoicesData] = await Promise.all([
          apiClient.getAnalytics(),
          apiClient.listInvoices("admin", 8), // Only fetch 8 most recent for the table
        ]);
        setAnalytics(analyticsData);
        // Sort most recent first
        const sorted = [...invoicesData].sort(
          (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setRecentInvoices(sorted.slice(0, 8));
      } catch (e) {
        console.error("Failed to load dashboard data:", e);
      } finally {
        setLoading(false);
      }
    };

    load();
    // Refresh KPIs every 30s
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  const s = analytics?.summary;

  return (
    <div>
      <Navbar title="Admin Dashboard" />
      <div className="p-6 space-y-6">

        {/* KPI Row */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <KPIStatCard
            title="Total Invoices"
            value={loading ? "…" : s?.total_invoices ?? 0}
            icon={FileText}
          />
          <KPIStatCard
            title="Processed Today"
            value={loading ? "…" : s?.invoices_processed_today ?? 0}
            icon={CheckCircle}
          />
          <KPIStatCard
            title="Auto-Approval Rate"
            value={loading ? "…" : `${s?.auto_approval_rate_percentage ?? 0}%`}
            icon={TrendingUp}
            trend={s ? { value: s.auto_approval_rate_percentage, positive: s.auto_approval_rate_percentage >= 50 } : undefined}
          />
          <KPIStatCard
            title="Fraud Flags"
            value={loading ? "…" : s?.total_fraud_flags ?? 0}
            icon={ShieldAlert}
          />
          <KPIStatCard
            title="Duplicates Found"
            value={loading ? "…" : s?.total_duplicates ?? 0}
            icon={AlertTriangle}
          />
          <KPIStatCard
            title="Avg Processing"
            value={loading ? "…" : s?.average_processing_time_seconds ? `${s.average_processing_time_seconds}s` : "N/A"}
            icon={Clock}
          />
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* 7-Day Volume Line Chart */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base">7-Day Processing Volume</CardTitle>
            </CardHeader>
            <CardContent>
              {analytics ? (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={analytics.daily_counts}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 14%, 18%)" />
                    <XAxis dataKey="date" stroke="hsl(215, 14%, 55%)" fontSize={11}
                      tickFormatter={(v) => v.slice(5)} />
                    <YAxis stroke="hsl(215, 14%, 55%)" fontSize={11} allowDecimals={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={ITEM_STYLE} />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Line type="monotone" dataKey="count" name="Invoices" stroke="hsl(217, 91%, 60%)"
                      strokeWidth={2} dot={{ r: 4, fill: "hsl(217, 91%, 60%)" }} />
                    <Line type="monotone" dataKey="fraud" name="Fraud Flags" stroke="hsl(0,84%,60%)"
                      strokeWidth={1.5} strokeDasharray="4 2" dot={{ r: 3, fill: "hsl(0,84%,60%)" }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-60 flex items-center justify-center text-muted-foreground text-sm animate-pulse">
                  Loading chart data...
                </div>
              )}
            </CardContent>
          </Card>

          {/* Approval Distribution Pie */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base">Approval Distribution</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              {analytics ? (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={analytics.approval_distribution}
                      cx="50%" cy="50%"
                      innerRadius={60} outerRadius={90}
                      dataKey="value" stroke="none"
                    >
                      {analytics.approval_distribution.map((_: any, i: number) => (
                        <Cell key={i} fill={PIE_COLORS[i]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={ITEM_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-60 flex items-center justify-center text-muted-foreground text-sm animate-pulse">
                  Loading chart data...
                </div>
              )}
            </CardContent>
            {analytics && (
              <div className="px-6 pb-4 flex flex-wrap gap-4">
                {analytics.approval_distribution.map((item: any, i: number) => (
                  <div key={item.name} className="flex items-center gap-2 text-xs">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                    <span className="text-muted-foreground">{item.name}</span>
                    <span className="font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Fraud Trend Bar Chart */}
        {analytics?.fraud_trend?.some((d: any) => d.fraud > 0) && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base">Fraud Signal Trend (7 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={analytics.fraud_trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 14%, 18%)" />
                  <XAxis dataKey="date" stroke="hsl(215, 14%, 55%)" fontSize={11}
                    tickFormatter={(v) => v.slice(5)} />
                  <YAxis stroke="hsl(215, 14%, 55%)" fontSize={11} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={ITEM_STYLE} />
                  <Bar dataKey="fraud" name="Fraud Flags" fill="hsl(0,84%,60%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Recent Activity Table */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Flags</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        {loading ? "Loading…" : "No invoices found."}
                      </TableCell>
                    </TableRow>
                  ) : recentInvoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.vendor_name || "Unknown"}</TableCell>
                      <TableCell className="font-mono text-sm">{inv.invoice_number || "N/A"}</TableCell>
                      <TableCell>${(inv.total_amount || 0).toLocaleString()}</TableCell>
                      <TableCell>
                        <span className={`font-mono text-xs ${(inv.confidence_score || 0) >= 0.95
                          ? "text-green-400" : "text-amber-400"}`}>
                          {inv.confidence_score ? `${Math.round(inv.confidence_score * 100)}%` : "—"}
                        </span>
                      </TableCell>
                      <TableCell><StatusBadge status={inv.status} /></TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {inv.fraud_flag && (
                            <span title="Fraud Flag" className="text-red-400 text-xs font-medium">🚨</span>
                          )}
                          {inv.duplicate_flag && (
                            <span title="Duplicate" className="text-amber-400 text-xs font-medium">⚠️</span>
                          )}
                          {!inv.fraud_flag && !inv.duplicate_flag && (
                            <span className="text-muted-foreground text-xs">—</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {new Date(inv.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default AdminDashboard;
