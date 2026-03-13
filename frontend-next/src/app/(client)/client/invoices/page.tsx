"use client";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { StatusBadge } from "@/components/StatusBadge";
import { apiClient } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, RefreshCw } from "lucide-react";

export default function ClientInvoices() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null); // tracks in-progress action per row

  const fetchInvoices = async () => {
    try {
      const data = await apiClient.listInvoices("client");
      const sorted = data.sort((a: any, b: any) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setInvoices(sorted);
    } catch (e) {
      console.error("Failed to load invoices", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInvoices(); }, []);

  const handleDelete = async (inv: any) => {
    if (!confirm(`Delete invoice from "${inv.vendor_name || "this vendor"}"? This cannot be undone.`)) return;
    setActionId(inv.id);
    try {
      await apiClient.deleteInvoice(inv.id);
      setInvoices((prev) => prev.filter((i) => i.id !== inv.id));
    } catch (e: any) {
      alert(e.message || "Delete failed.");
    } finally {
      setActionId(null);
    }
  };

  const handleReprocess = async (inv: any) => {
    if (!confirm(`Re-run AI processing on this invoice? It will be temporarily set back to Processing.`)) return;
    setActionId(inv.id);
    try {
      await apiClient.reprocessInvoice(inv.id);
      await fetchInvoices(); // Refresh the list to show updated status
    } catch (e: any) {
      alert(e.message || "Reprocess failed.");
    } finally {
      setActionId(null);
    }
  };

  const canReprocess = (status: string) =>
    ["processing", "under_review", "processing_failed", "rejected", "auto_approved"].includes(status);

  const canDelete = (status: string) =>
    status !== "approved";


  return (
    <div>
      <Navbar title="My Invoices" />
      <div className="p-6 max-w-7xl mx-auto">
        <Card className="glass-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">All Invoices</CardTitle>
              <span className="text-xs text-muted-foreground">{invoices.length} invoice{invoices.length !== 1 ? "s" : ""}</span>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
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
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No invoices uploaded yet.
                        </TableCell>
                      </TableRow>
                    ) : invoices.map((inv) => {
                      const isBusy = actionId === inv.id;
                      return (
                        <TableRow key={inv.id} className="hover:bg-muted/50">
                          <TableCell className="font-medium">
                            {inv.vendor_name || <span className="text-muted-foreground italic">Analyzing...</span>}
                          </TableCell>
                          <TableCell className="font-mono text-sm">{inv.invoice_number || "—"}</TableCell>
                          <TableCell>
                            {inv.total_amount ? `$${inv.total_amount.toLocaleString()}` : "—"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(inv.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell><StatusBadge status={inv.status} /></TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              {/* View Details */}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-xs"
                                onClick={() => router.push(`/client/invoices/${inv.id}`)}
                              >
                                View
                              </Button>

                              {/* Reprocess — only for stuck/unprocessed */}
                              {canReprocess(inv.status) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-primary hover:bg-primary/10"
                                  title="Re-run AI processing"
                                  disabled={isBusy}
                                  onClick={() => handleReprocess(inv)}
                                >
                                  {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                </Button>
                              )}

                              {/* Delete */}
                              {canDelete(inv.status) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                  title="Delete invoice"
                                  disabled={isBusy}
                                  onClick={() => handleDelete(inv)}
                                >
                                  {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
