"use client";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { StatusBadge } from "@/components/StatusBadge";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Zap, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Suspense } from "react";

function InvoicesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isResuming = searchParams?.get("resumeAutopilot") === "true";

  const [invoices, setInvoices] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [batchLoading, setBatchLoading] = useState(false);
  const limit = 50;

  const handleBatchReview = async () => {
    // Find the very first invoice that is UNDER_REVIEW
    const target = invoices.find(inv => inv.status === "under_review");
    if (!target) {
      toast.info("No invoices currently require manual review.");
      return;
    }

    // Jump into the first invoice and trigger the visual autopilot mode
    toast.success("Initializing Autonomous Agent...");
    router.push(`/admin/invoices/${target.id}?autopilot=true`);
  };

  const handleReprocessFailed = async () => {
    setBatchLoading(true);
    try {
      const data = await apiClient.reprocessFailedBatch();
      toast.success(data.message);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to trigger batch re-extraction.");
    } finally {
      setBatchLoading(false);
    }
  };

  // Poll for admin updates every 5 seconds so they see live approvals hit the queue.
  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        // The revised backend returns { items: [], total: number }
        const res = await fetch(`http://localhost:8000/api/v1/admin/invoices?limit=${limit}&skip=${page * limit}`, {
          headers: { Authorization: `Bearer ${document.cookie.match(/(^| )auth_token=([^;]+)/)?.[2] || ""}` }
        });
        if (!res.ok) throw new Error("Fetch failed");

        const data = await res.json();

        // Ensure graceful fallback if the backend hasn't been reloaded yet
        if (Array.isArray(data)) {
          setInvoices(data);
          setTotal(data.length);
        } else {
          setInvoices(data.items || []);
          setTotal(data.total || 0);
        }
      } catch (e) {
        console.error("Failed to load admin invoices", e);
      } finally {
        setLoading(false);
      }
    };


    fetchInvoices();
    const interval = setInterval(fetchInvoices, 5000);
    return () => clearInterval(interval);
  }, [page]);

  // Handle Returning from a Ghost UI AutoPilot Sequence
  useEffect(() => {
    if (isResuming && !loading && invoices.length > 0) {
      const target = invoices.find(inv => inv.status === "under_review");
      if (target) {
        toast.info("Auto-Pilot Sequence Continuing...");
        // Strip the resume param so we don't accidentally loop if the user clicks back later
        router.replace(`/admin/invoices/${target.id}?autopilot=true`);
      } else {
        toast.success("Auto-Pilot Queue Exhausted. All documents processed.");
        router.replace("/admin/invoices");
      }
    }
  }, [isResuming, loading, invoices, router]);

  return (
    <div>
      <Navbar title="Global Invoice Queue" />
      <div className="p-6 max-w-7xl mx-auto">
        <Card className="glass-card flex-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-3">
                Review Queue
                {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </CardTitle>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <Button
                  size="sm"
                  onClick={handleBatchReview}
                  disabled={total === 0 || batchLoading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white flex gap-2 transition-all shadow-md shadow-indigo-500/20"
                >
                  <Zap className="h-4 w-4 fill-current animate-pulse delay-75" />
                  Launch Ghost UI Auto-Pilot
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReprocessFailed}
                  disabled={total === 0 || batchLoading}
                  className="flex gap-2 border-indigo-500/30 hover:bg-indigo-500/10 text-indigo-300"
                >
                  {batchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Reprocess Failed Invoices
                </Button>
                <div className="h-4 w-px bg-border" />
                <span>Total: {total}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Prev</Button>
                  <Button variant="outline" size="sm" disabled={(page + 1) * limit >= total} onClick={() => setPage(p => p + 1)}>Next</Button>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading && invoices.length === 0 ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date Uploaded</TableHead>
                      <TableHead>Confidence</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No invoices in the global queue.
                        </TableCell>
                      </TableRow>
                    ) : invoices.map((inv) => (
                      <TableRow key={inv.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{inv.vendor_name || "Processing..."}</TableCell>
                        <TableCell className="font-mono text-sm">{inv.invoice_number || "..."}</TableCell>
                        <TableCell>${(inv.total_amount || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(inv.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {inv.confidence_score !== null ? `${Math.round(inv.confidence_score * 100)}%` : "N/A"}
                        </TableCell>
                        <TableCell><StatusBadge status={inv.status} /></TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/invoices/${inv.id}`)}>
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AdminInvoices() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading dashboard...</div>}>
      <InvoicesContent />
    </Suspense>
  );
}
