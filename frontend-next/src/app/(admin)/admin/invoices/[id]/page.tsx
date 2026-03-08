"use client";
import { useEffect, useState, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Download, Eye, AlertCircle, FileText, CheckCircle, RefreshCw, Slash, Copy, Zap } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { toast } from "sonner";

export default function AdminInvoiceDetail() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const isAutoPilot = searchParams?.get("autopilot") === "true";

  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const [handling, setHandling] = useState(false);
  const [zoom, setZoom] = useState(1);

  // AutoPilot Specific State
  const [autoPilotStatus, setAutoPilotStatus] = useState<"ANALYZING" | "APPROVED" | "REJECTED" | "ADMIN_PASS_NEEDED" | "UNCERTAIN" | "IDLE">("IDLE");
  const hasExecutedRef = useRef(false);

  useEffect(() => {
    if (!id) return;
    apiClient.get(`/admin/invoices/${id}`)
      .then(setInvoice)
      .catch((e) => {
        console.error(e);
      })
      .finally(() => setLoading(false));

    apiClient.getFileBlob(id, "admin")
      .then(setPdfUrl)
      .catch((e) => console.log("No file available for viewing", e));
  }, [id]);

  // ── Ghost UI AutoPilot Loop ──────────────────────────────────────────────────
  useEffect(() => {
    if (isAutoPilot && invoice && !loading && !hasExecutedRef.current && invoice.status === "under_review") {
      hasExecutedRef.current = true;
      setAutoPilotStatus("ANALYZING");

      // Give the human 1.5 seconds to visually "see" the invoice before the AI processes it
      setTimeout(async () => {
        try {
          const result = await apiClient.autoReviewSingleInvoice(id);

          if (result.result === "APPROVED") {
            setAutoPilotStatus("APPROVED");
            setInvoice((prev: any) => ({ ...prev, status: "approved" }));

            setTimeout(() => {
              router.push("/admin/invoices?resumeAutopilot=true");
            }, 2500);

          } else if (result.result === "REJECTED") {
            setAutoPilotStatus("REJECTED");
            setInvoice((prev: any) => ({ ...prev, status: "rejected" }));

            setTimeout(() => {
              router.push("/admin/invoices?resumeAutopilot=true");
            }, 2500);

          } else if (result.result === "ADMIN_PASS_NEEDED" || result.result === "UNCERTAIN") {
            setAutoPilotStatus("ADMIN_PASS_NEEDED");
            setInvoice((prev: any) => ({ ...prev, status: "admin_pass_needed" }));

            setTimeout(() => {
              router.push("/admin/invoices?resumeAutopilot=true");
            }, 2500);

          } else {
            // Unhandled fallback
            setAutoPilotStatus("UNCERTAIN");
            toast.warning("AI Uncertain: Yielding control to Human Admin", { duration: 5000 });
            router.replace(`/admin/invoices/${id}`);
            return; // STOP the loop
          }

        } catch (e) {
          console.error("AutoPilot failed:", e);
          setAutoPilotStatus("UNCERTAIN");
          toast.error("AutoPilot Exception: Falling back to manual.");
          router.replace(`/admin/invoices/${id}`);
        }
      }, 1500);
    }
  }, [isAutoPilot, invoice, loading, id, router]);


  if (loading) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="mt-4 text-muted-foreground">Loading specific invoice data...</p>
    </div>
  );

  if (!invoice) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center">
      <AlertCircle className="h-10 w-10 text-destructive mb-4" />
      <h2 className="text-xl font-bold">Invoice Not Found</h2>
      <Button variant="outline" className="mt-6" onClick={() => router.push("/admin/invoices")}>
        Back to Queue
      </Button>
    </div>
  );

  const parsedJson = invoice.extracted_json || {};
  const lineItems = parsedJson.line_items || [];
  const currentStatus = invoice.status;
  const isPending = currentStatus === "processing" || currentStatus === "under_review" || currentStatus === "admin_pass_needed";

  const handleApprove = async () => {
    if (!confirm("Are you sure you want to officially APPROVE this invoice?")) return;
    setHandling(true);
    try {
      await apiClient.adminApproveInvoice(id);
      setInvoice((prev: any) => ({ ...prev, status: "approved" }));
    } catch (e: any) {
      alert("Failed to approve: " + e.message);
    } finally {
      setHandling(false);
    }
  };

  const handleReject = async () => {
    const reason = prompt("Enter a reason for rejecting this invoice:") || "Admin rejected without comment.";
    setHandling(true);
    try {
      await apiClient.adminRejectInvoice(id, reason);
      setInvoice((prev: any) => ({ ...prev, status: "rejected" }));
    } catch (e: any) {
      alert("Failed to reject: " + e.message);
    } finally {
      setHandling(false);
    }
  };


  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden relative">
      <Navbar title={`Review: ${invoice.vendor_name || "Unknown Document"}`} />

      {/* GHOST UI OVERLAY */}
      {isAutoPilot && autoPilotStatus !== "IDLE" && autoPilotStatus !== "UNCERTAIN" && (
        <div className="absolute inset-0 z-50 bg-background/60 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-auto transition-all animate-in fade-in duration-500">
          <div className="bg-card w-[420px] p-8 rounded-2xl shadow-2xl border border-border flex flex-col items-center text-center">

            {autoPilotStatus === "ANALYZING" && (
              <>
                <div className="h-20 w-20 rounded-full bg-indigo-500/20 flex items-center justify-center mb-6 relative">
                  <div className="absolute inset-0 rounded-full border-t-2 border-indigo-500 animate-spin" />
                  <Zap className="h-10 w-10 text-indigo-500 animate-pulse" />
                </div>
                <h2 className="text-xl font-bold tracking-tight mb-2">Autonomous Agent Active</h2>
                <p className="text-muted-foreground text-sm">Evaluating cross-checks and organizational policies against Llama 3.1 extractions...</p>
              </>
            )}

            {autoPilotStatus === "APPROVED" && (
              <>
                <div className="h-20 w-20 rounded-full bg-emerald-500/20 flex items-center justify-center mb-6 animate-in zoom-in">
                  <CheckCircle className="h-10 w-10 text-emerald-500" />
                </div>
                <h2 className="text-xl font-bold tracking-tight mb-2 text-emerald-500">Invoice Approved</h2>
                <p className="text-muted-foreground text-sm">Verification passed safely. Skipping to next document...</p>
              </>
            )}

            {autoPilotStatus === "REJECTED" && (
              <>
                <div className="h-20 w-20 rounded-full bg-destructive/20 flex items-center justify-center mb-6 animate-in zoom-in">
                  <Slash className="h-10 w-10 text-destructive" />
                </div>
                <h2 className="text-xl font-bold tracking-tight mb-2 text-destructive">Invoice Rejected</h2>
                <p className="text-muted-foreground text-sm">Fraud or validation anomaly detected. Skipping to next document...</p>
              </>
            )}

            {autoPilotStatus === "ADMIN_PASS_NEEDED" && (
              <>
                <div className="h-20 w-20 rounded-full bg-amber-500/20 flex items-center justify-center mb-6 animate-in zoom-in">
                  <AlertCircle className="h-10 w-10 text-amber-500" />
                </div>
                <h2 className="text-xl font-bold tracking-tight mb-2 text-amber-500">Admin Pass Needed</h2>
                <p className="text-muted-foreground text-sm">AI is uncertain. Flagged for manual review. Skipping to next document...</p>
              </>
            )}

          </div>
        </div>
      )}

      {/* Action Header Ribbon */}
      <div className="border-b border-border bg-card/40 backdrop-blur shrink-0 supports-[backdrop-filter]:bg-background/60">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 px-6 max-w-[1600px] mx-auto gap-4">

          {/* Left: Identity */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/admin/invoices")}
              className="p-2 -ml-2 hover:bg-muted text-muted-foreground hover:text-foreground rounded-full transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="h-10 w-10 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
                {invoice.vendor_name || "Extracting Vendor..."}
              </h1>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono">{invoice.id.split('-')[0]}</span>
                {invoice.processing_time_seconds && (
                  <>
                    <span>•</span>
                    <span>Processed in {invoice.processing_time_seconds}s</span>
                  </>
                )}
                {invoice.created_at && (
                  <>
                    <span>•</span>
                    <span>{formatDistanceToNow(new Date(invoice.created_at))} ago</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              {invoice.fraud_flag && (
                <Badge variant="destructive" className="flex gap-1 py-1 px-3 border-red-500/30">
                  <AlertCircle className="h-3 w-3" /> Fraud Risk
                </Badge>
              )}
              {invoice.duplicate_flag && (
                <Badge variant="outline" className="flex gap-1 py-1 px-3 border-amber-500/50 text-amber-500">
                  <Copy className="h-3 w-3" /> Duplicate
                </Badge>
              )}
            </div>
            <StatusBadge status={currentStatus} />

            {/* Admin Override Controls */}
            {isPending && (
              <div className="flex items-center gap-2 border-l pl-3 border-border">
                <Button
                  size="sm"
                  variant="default"
                  onClick={handleApprove}
                  disabled={handling}
                  className="h-8 shadow-sm font-medium"
                >
                  {handling ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3 mr-1.5" />}
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleReject}
                  disabled={handling}
                  className="h-8 shadow-sm bg-red-950/40 text-red-500 hover:bg-destructive hover:text-destructive-foreground"
                >
                  {handling ? <Loader2 className="h-3 w-3 animate-spin" /> : <Slash className="h-3 w-3 mr-1.5" />}
                  Reject
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Split Screen Layout */}
      <div className="flex-1 flex overflow-hidden">

        {/* LEFT PANE: Document Preview */}
        <div className="w-1/2 flex flex-col border-r border-border bg-muted/20 relative">
          <div className="h-10 flex flex-wrap items-center justify-between px-4 border-b border-border bg-card/50 text-xs font-medium text-muted-foreground shrink-0 shadow-sm">
            <span className="flex items-center gap-2"><Eye className="h-3 w-3" /> Original Document</span>

            <div className="flex items-center gap-3">
              {/* Zoom controls */}
              <div className="flex items-center gap-1 border border-border rounded-md overflow-hidden bg-background/50">
                <button
                  onClick={() => setZoom(z => Math.max(0.25, parseFloat((z - 0.2).toFixed(2))))}
                  className="px-2 py-0.5 hover:bg-muted transition-colors font-bold text-base leading-none select-none"
                  title="Zoom Out"
                >−</button>
                <button
                  onClick={() => setZoom(1.0)}
                  className="px-2 py-0.5 hover:bg-muted transition-colors font-mono text-[9px] min-w-[2.5rem] text-center select-none"
                  title="Reset Zoom"
                >{Math.round(zoom * 100)}%</button>
                <button
                  onClick={() => setZoom(z => Math.min(4, parseFloat((z + 0.2).toFixed(2))))}
                  className="px-2 py-0.5 hover:bg-muted transition-colors font-bold text-base leading-none select-none"
                  title="Zoom In"
                >+</button>
              </div>

              {pdfUrl && (
                <a href={pdfUrl} download={`Invoice_${invoice.vendor_name || invoice.id}.pdf`} className="hover:text-foreground flex items-center gap-1 transition-colors">
                  <Download className="h-3 w-3" /> <span className="hidden xl:inline">Download</span>
                </a>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-auto bg-black/5 dark:bg-white/5 relative">
            {pdfUrl ? (
              invoice?.file_url?.match(/\.(jpeg|jpg|png)$/i) ? (
                <div className="w-full min-h-full p-4 flex items-start justify-center" style={{ transformOrigin: 'top center' }}>
                  <img
                    src={pdfUrl}
                    alt="Invoice Document"
                    className="rounded drop-shadow-sm"
                    style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', transition: 'transform 0.15s ease', maxWidth: '100%' }}
                  />
                </div>
              ) : (
                <div className="w-full h-full" style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', transition: 'transform 0.15s ease' }}>
                  <iframe src={`${pdfUrl}#toolbar=0`} className="w-full h-full border-0 rounded-b-lg" title="Invoice PDF" style={{ height: `${100 / zoom}%`, width: `${100 / zoom}%` }} />
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground/50">
                <AlertCircle className="h-12 w-12 mb-4 opacity-20" />
                <p className="text-sm">Document preview currently unavailable</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANE: Extracted Data & Schema */}
        <div className="w-1/2 flex flex-col bg-background relative z-10">
          <div className="h-10 flex items-center px-4 border-b border-border bg-card/50 text-xs font-medium text-muted-foreground shrink-0 shadow-sm">
            <span className="flex items-center gap-2"><RefreshCw className="h-3 w-3" /> Extracted Intelligence</span>
          </div>

          <div className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-8 pb-32">

            {/* Key Info Banner */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-5 bg-card border border-border/80 rounded-xl shadow-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Invoice Number</p>
                <p className="font-mono text-sm font-semibold">{invoice.invoice_number || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Issue Date</p>
                <p className="text-sm font-semibold">{parsedJson.invoice_date || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total Amount</p>
                <p className="text-sm font-bold text-emerald-500">${invoice.total_amount?.toLocaleString() || "0.00"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">AI Confidence</p>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-sm font-semibold flex items-center gap-1">
                    {invoice.confidence_score ? `${(invoice.confidence_score * 100).toFixed(1)}%` : "N/A"}
                  </p>
                  {invoice.confidence_score && (
                    <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${invoice.confidence_score > 0.90 ? 'bg-emerald-500' : invoice.confidence_score > 0.70 ? 'bg-amber-500' : 'bg-destructive'}`}
                        style={{ width: `${invoice.confidence_score * 100}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold tracking-wide uppercase text-muted-foreground">Recognized Line Items</h3>
              <div className="border border-border/60 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 border-b border-border/60">
                    <tr>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Description</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground w-20">Qty</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground w-28">Unit Price</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground w-32">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {lineItems.length > 0 ? (
                      lineItems.map((item: any, idx: number) => (
                        <tr key={idx} className="hover:bg-muted/20 transition-colors">
                          <td className="py-3 px-4">{item.description}</td>
                          <td className="text-right py-3 px-4 font-mono">{item.quantity}</td>
                          <td className="text-right py-3 px-4 font-mono">${item.unit_price?.toLocaleString() ?? "0"}</td>
                          <td className="text-right py-3 px-4 font-mono font-medium">${item.total_price?.toLocaleString() ?? "0"}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-muted-foreground text-sm">
                          No individual line items could be extracted.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Audit Events Thread */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold tracking-wide uppercase text-muted-foreground">Audit Trail</h3>
              <div className="relative pl-4 space-y-6 before:absolute before:inset-0 before:ml-[23px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-border before:to-transparent">
                {invoice.events?.length > 0 ? invoice.events.map((evt: any) => (
                  <div key={evt.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    <div className="flex items-center justify-center w-4 h-4 rounded-full border border-primary bg-primary/20 text-primary-foreground shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 relative">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                    </div>
                    <div className="w-[calc(100%-2.5rem)] md:w-[calc(50%-1.5rem)] pl-3 md:pl-0 md:group-even:pr-3 md:group-odd:pl-3">
                      <div className="p-3 bg-card border border-border/60 rounded-lg shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                          <div className="font-bold text-xs text-primary">{evt.event_type}</div>
                          <time className="text-[10px] text-muted-foreground font-mono">{new Date(evt.created_at).toLocaleString()}</time>
                        </div>
                        <div className="text-sm text-foreground">{evt.message || "Status updated."}</div>
                      </div>
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground">No events recorded.</p>
                )}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
