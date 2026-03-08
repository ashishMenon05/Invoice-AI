"use client";
import { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { KPIStatCard } from "@/components/KPIStatCard";
import { apiClient } from "@/lib/api-client";
import { TrendingUp, Clock, ShieldAlert, Copy, CheckCircle, Loader2, DollarSign, Users, FileText, Database } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area
} from "recharts";

const TOOLTIP_STYLE = { backgroundColor: "hsl(224, 24%, 10%)", border: "1px solid hsl(222, 14%, 18%)", borderRadius: "8px", fontSize: "12px", color: "#fff" };
const ITEM_STYLE = { color: "#fff" };
const PIE_COLORS = ["hsl(142,71%,45%)", "hsl(217,91%,60%)", "hsl(38,92%,50%)", "hsl(0,84%,60%)"];

const AdminAnalytics = () => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([apiClient.get("/admin/analytics"), apiClient.get("/admin/clients")])
      .then(([a, c]) => { setAnalytics(a); setClients(c); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const s = analytics?.summary;

  const topClients = [...clients]
    .sort((a, b) => b.total_invoices - a.total_invoices)
    .slice(0, 5)
    .map(c => ({ name: c.org_name, invoices: c.total_invoices }));

  if (loading) return (
    <div><Navbar title="Analytics" />
      <div className="h-[70vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    </div>
  );

  return (
    <div>
      <Navbar title="Analytics Overview" />
      <div className="p-6 space-y-6 max-w-[1600px] mx-auto">

        {/* KPI Row (4 cols x 2 rows = 8 cards) */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KPIStatCard title="Total Value Processed" value={`$${(s?.total_volume_usd ?? 0).toLocaleString()}`} icon={DollarSign} trend={{ value: 100, positive: true }} />
          <KPIStatCard title="Auto-Approval Rate" value={`${s?.auto_approval_rate_percentage ?? 0}%`} icon={TrendingUp} trend={{ value: s?.auto_approval_rate_percentage ?? 0, positive: (s?.auto_approval_rate_percentage ?? 0) >= 50 }} />
          <KPIStatCard title="Avg Processing Time" value={s?.average_processing_time_seconds ? `${s.average_processing_time_seconds}s` : "N/A"} icon={Clock} />
          <KPIStatCard title="Total Organizations" value={clients.length} icon={Users} />

          <KPIStatCard title="Fraud Flags" value={s?.total_fraud_flags ?? 0} icon={ShieldAlert} />
          <KPIStatCard title="Duplicates Caught" value={s?.total_duplicates ?? 0} icon={Copy} />
          <KPIStatCard title="Invoices Approved" value={(s?.total_approved ?? 0) + (s?.total_auto_approved ?? 0)} icon={CheckCircle} />
          <KPIStatCard title="Pending Review" value={s?.total_under_review ?? 0} icon={FileText} />
        </div>

        {/* Charts Row 1: Volume & Value Trends */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* 7-Day Volume Trend */}
          <Card className="glass-card">
            <CardHeader><CardTitle className="text-base font-medium flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Invoice Volume (7 Days)</CardTitle></CardHeader>
            <CardContent>
              {analytics?.daily_counts?.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={analytics.daily_counts}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 14%, 18%)" vertical={false} />
                    <XAxis dataKey="date" stroke="hsl(215,14%,55%)" fontSize={11} tickFormatter={v => v.slice(5)} />
                    <YAxis stroke="hsl(215,14%,55%)" fontSize={11} allowDecimals={false} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={ITEM_STYLE} />
                    <Bar dataKey="count" name="Invoices Processed" fill="hsl(217,91%,60%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-muted-foreground text-sm py-12">No invoice data yet.</p>}
            </CardContent>
          </Card>

          {/* 7-Day Dollar Volume Trend */}
          <Card className="glass-card">
            <CardHeader><CardTitle className="text-base font-medium flex items-center gap-2"><DollarSign className="h-4 w-4 text-emerald-500" /> Processed Value (USD)</CardTitle></CardHeader>
            <CardContent>
              {analytics?.volume_trend?.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={analytics.volume_trend}>
                    <defs>
                      <linearGradient id="colorUsd" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(142,71%,45%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(142,71%,45%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 14%, 18%)" vertical={false} />
                    <XAxis dataKey="date" stroke="hsl(215,14%,55%)" fontSize={11} tickFormatter={v => v.slice(5)} />
                    <YAxis stroke="hsl(215,14%,55%)" fontSize={11} tickFormatter={v => `$${v}`} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={ITEM_STYLE} formatter={(value: any) => [`$${value.toLocaleString()}`, "Volume USD"]} />
                    <Area type="monotone" dataKey="volume_usd" stroke="hsl(142,71%,45%)" fillOpacity={1} fill="url(#colorUsd)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-muted-foreground text-sm py-12">No financial data yet.</p>}
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2: Distribution & Processing Speed */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Top Vendors by USD */}
          <Card className="glass-card">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Database className="h-4 w-4 text-purple-400" /> Top Vendors by Volume</CardTitle></CardHeader>
            <CardContent>
              {analytics?.top_vendors?.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={analytics.top_vendors} layout="vertical" margin={{ left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,14%,18%)" horizontal={false} />
                    <XAxis type="number" stroke="hsl(215,14%,55%)" fontSize={11} tickFormatter={v => `$${v}`} />
                    <YAxis dataKey="name" type="category" stroke="hsl(215,14%,55%)" fontSize={11} width={120} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={ITEM_STYLE} formatter={(value: any) => [`$${value.toLocaleString()}`, "Total Processed"]} />
                    <Bar dataKey="volume_usd" fill="hsl(262,83%,58%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-muted-foreground text-sm py-12">No vendor data yet.</p>}
            </CardContent>
          </Card>

          {/* Top Clients by Volume */}
          <Card className="glass-card">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-blue-400" /> Active Client Orgs</CardTitle></CardHeader>
            <CardContent>
              {topClients.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={topClients} layout="vertical" margin={{ left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,14%,18%)" horizontal={false} />
                    <XAxis type="number" stroke="hsl(215,14%,55%)" fontSize={11} allowDecimals={false} />
                    <YAxis dataKey="name" type="category" stroke="hsl(215,14%,55%)" fontSize={11} width={120} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={ITEM_STYLE} />
                    <Bar dataKey="invoices" name="Total Uplloads" fill="hsl(217,91%,60%)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="text-center text-muted-foreground text-sm py-12">No client data yet.</p>}
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 3: Security & Stability */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Approval Distribution */}
          <Card className="glass-card flex flex-col">
            <CardHeader><CardTitle className="text-base">Approval Outcomes</CardTitle></CardHeader>
            <CardContent className="flex-1 flex flex-col justify-center">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={analytics?.approval_distribution ?? []} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" stroke="none">
                    {(analytics?.approval_distribution ?? []).map((_: any, i: number) => (
                      <Cell key={i} fill={PIE_COLORS[i]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={ITEM_STYLE} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-4 mt-2">
                {(analytics?.approval_distribution ?? []).map((item: any, i: number) => (
                  <div key={item.name} className="flex items-center gap-2 text-xs">
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                    <span className="text-muted-foreground">{item.name}</span>
                    <span className="font-semibold">{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Core Processing Speed */}
          <Card className="glass-card flex flex-col">
            <CardHeader><CardTitle className="text-base">AI Inference Speed (s)</CardTitle></CardHeader>
            <CardContent className="flex-1">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={analytics?.processing_time_trend ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,14%,18%)" />
                  <XAxis dataKey="date" stroke="hsl(215,14%,55%)" fontSize={11} tickFormatter={v => v.slice(5)} />
                  <YAxis stroke="hsl(215,14%,55%)" fontSize={11} domain={[0, 'auto']} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={ITEM_STYLE} formatter={(value: any) => [`${value}s`, "Avg Time"]} />
                  <Line type="monotone" dataKey="time" stroke="hsl(38,92%,50%)" strokeWidth={2} dot={{ r: 3, fill: "hsl(38,92%,50%)" }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Fraud Trend */}
          <Card className="glass-card flex flex-col">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-destructive" /> Fraud Anomalies</CardTitle></CardHeader>
            <CardContent className="flex-1">
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={analytics?.fraud_trend ?? []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222,14%,18%)" />
                  <XAxis dataKey="date" stroke="hsl(215,14%,55%)" fontSize={11} tickFormatter={v => v.slice(5)} />
                  <YAxis stroke="hsl(215,14%,55%)" fontSize={11} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={ITEM_STYLE} />
                  <Line type="stepAfter" dataKey="fraud" name="Anomalies" stroke="hsl(0,84%,60%)" strokeWidth={2} dot={{ r: 4, fill: "hsl(0,84%,60%)" }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics;
