"use client";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { KPIStatCard } from "@/components/KPIStatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { FileText, CheckCircle, Clock, XCircle, Loader2, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const ClientDashboard = () => {
  const navigate = useRouter();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const data = await apiClient.listInvoices("client");
        data.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
        setInvoices(data);
      } catch (err) {
        console.error("Failed to fetch invoices", err);
      } finally {
        setLoading(false);
      }
    };
    fetchInvoices();
  }, []);

  const processingCount = invoices.filter((i) => i.status === "processing" || i.status === "PROCESSING").length;
  const doneCount = invoices.filter((i) => i.status !== "processing" && i.status !== "PROCESSING").length;
  // Assume newly added (less than 1 minute old and processing) implies queued. Simplest mock for the UI:
  const queuedCount = 0; // Handled instantly by Python/Postgres backend

  const recent = invoices.slice(0, 5);

  // 7-Day Chart aggregation
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    // Use local date string (YYYY-MM-DD) to avoid UTC timezone mismatch
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  });

  const volumeData = last7Days.map(date => {
    const count = invoices.filter(inv => {
      if (!inv.created_at) return false;
      const invLocal = new Date(inv.created_at);
      const y = invLocal.getFullYear();
      const m = String(invLocal.getMonth() + 1).padStart(2, "0");
      const d = String(invLocal.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}` === date;
    }).length;
    const dObj = new Date(date + "T12:00:00"); // noon to avoid DST issues
    const dayLabel = dObj.toLocaleDateString("en-US", { weekday: "short" })[0];
    const fullLabel = dObj.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    // Use the ISO date string as the unique key so Sat/Sun aren't both "S" (causes hover collision)
    return { date, dayLabel, count, fullDate: fullLabel };
  });

  const BarLabel = ({ x, y, width, value }: any) => {
    if (!value) return null;
    return (
      <text x={x + width / 2} y={y - 6} fill="hsl(215, 14%, 75%)" textAnchor="middle" fontSize={11} fontWeight={600}>
        {value}
      </text>
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0]?.payload?.fullDate;
      return (
        <div style={{ backgroundColor: "hsl(222, 14%, 12%)", border: "1px solid hsl(222, 14%, 25%)", borderRadius: 8, padding: "8px 14px", color: "white" }}>
          <p className="text-xs text-muted-foreground mb-1">{d}</p>
          <p className="text-sm font-semibold">{payload[0].value} invoice{payload[0].value !== 1 ? "s" : ""} processed</p>
        </div>
      );
    }
    return null;
  };

  const TOOLTIP_STYLE = { backgroundColor: "hsl(222, 14%, 12%)", borderColor: "hsl(222, 14%, 25%)", borderRadius: "8px", color: "white" };

  return (
    <div>
      <Navbar title="Dashboard" />
      <div className="p-6 space-y-6 max-w-7xl mx-auto">

        {/* Live Pipeline Status mimicking the slide deck */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="glass-card bg-primary/10 border-primary/20">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-2">
              <span className="text-sm font-medium text-primary">Queued</span>
              <span className="text-3xl font-bold">{queuedCount}</span>
            </CardContent>
          </Card>
          <Card className="glass-card bg-amber-500/10 border-amber-500/20">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-2">
              <span className="text-sm font-medium text-amber-500">Processing</span>
              <span className="text-3xl font-bold">{processingCount}</span>
            </CardContent>
          </Card>
          <Card className="glass-card bg-status-approved/10 border-status-approved/20">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-2">
              <span className="text-sm font-medium text-status-approved">Done</span>
              <span className="text-3xl font-bold">{doneCount}</span>
            </CardContent>
          </Card>
        </div>

        {/* Email Ingestion Instruction */}
        <Card className="glass-card bg-indigo-500/5 border-indigo-500/20">
          <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4 text-left">
              <div className="rounded-full bg-indigo-500/10 p-3">
                <Activity className="h-6 w-6 text-indigo-400" />
              </div>
              <div>
                <CardTitle className="text-lg mb-1">Submit via Email</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Skip the manual upload! Send your invoices directly to your dedicated ingestion address.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-muted/40 p-2 pl-4 rounded-xl border border-border w-full md:w-auto">
              <span className="text-sm font-mono text-indigo-300 truncate">testeralfa516@gmail.com</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-3 hover:bg-indigo-500/10"
                onClick={() => {
                  navigator.clipboard.writeText("testeralfa516@gmail.com");
                  alert("Email copied to clipboard!");
                }}
              >
                Copy
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* 7-Day Volume Array Chart */}
          <Card className="glass-card flex flex-col">
            <CardHeader>
              <CardTitle className="text-base text-muted-foreground font-normal tracking-wide">Processing Volume (7 days)</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 pb-2">
              {loading ? (
                <div className="h-full min-h-[250px] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
              ) : (
                <ResponsiveContainer width="100%" height={270}>
                  <BarChart data={volumeData} margin={{ top: 24, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(222, 14%, 18%)" />
                    <XAxis
                      dataKey="date"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 12, fill: "hsl(215, 14%, 55%)" }}
                      dy={10}
                      tickFormatter={(val) => {
                        const d = new Date(val + "T12:00:00");
                        return d.toLocaleDateString("en-US", { weekday: "short" })[0];
                      }}
                    />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(215, 14%, 55%)" }} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(222, 14%, 15%)" }} />
                    <Bar dataKey="count" name="Processed" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} maxBarSize={40} label={<BarLabel />} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Recent Invoices Table */}
          <Card className="glass-card flex flex-col h-[350px]">
            <CardHeader className="pb-2">
              <CardTitle className="text-base text-muted-foreground font-normal tracking-wide">Recent Invoices</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
              {loading ? (
                <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : invoices.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-sm">No invoices processed yet.</div>
              ) : (
                <Table>
                  <TableBody>
                    {recent.map((inv: any) => (
                      <TableRow key={inv.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate.push(`/client/invoices/${inv.id}`)}>
                        <TableCell className="font-medium px-2 py-3">{inv.vendor_name || inv.vendor || "Analyzing..."}</TableCell>
                        <TableCell className="px-2 py-3 text-right">
                          <StatusBadge status={inv.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;
