"use client";
import { useParams } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { StatusBadge } from "@/components/StatusBadge";
import { apiClient } from "@/lib/api-client";
import { useInvoiceStatus } from "@/hooks/useInvoiceStatus";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Clock, AlertCircle, Loader2, FileText, Trash2, RefreshCw } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

const ClientInvoiceDetail = () => {
  const { id } = useParams();
  const [invoice, setInvoice] = useState<any>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1.0);
  const [actionBusy, setActionBusy] = useState(false);
  const router = useRouter();
  const isHoveringPreview = useRef(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isHoveringPreview.current) return;
    if (e.ctrlKey && (e.key === '+' || e.key === '=' || e.key === 'NumpadAdd')) {
      e.preventDefault();
      setZoom(z => Math.min(4, parseFloat((z + 0.15).toFixed(2))));
    } else if (e.ctrlKey && (e.key === '-' || e.key === 'NumpadSubtract')) {
      e.preventDefault();
      setZoom(z => Math.max(0.25, parseFloat((z - 0.15).toFixed(2))));
    } else if (e.ctrlKey && e.key === '0') {
      e.preventDefault();
      setZoom(1.0);
    }
  }, []);

  const handleDelete = async () => {
    if (!confirm(`Delete this invoice? This cannot be undone.`)) return;
    setActionBusy(true);
    try {
      await apiClient.deleteInvoice(id as string);
      router.push("/client/invoices");
    } catch (e: any) {
      alert(e.message || "Delete failed.");
      setActionBusy(false);
    }
  };

  const handleReprocess = async () => {
    if (!confirm(`Re-run AI processing? This will reset the extracted data until finished.`)) return;
    setActionBusy(true);
    try {
      await apiClient.reprocessInvoice(id as string);
      window.location.reload(); // Hard reload to clear all states and trigger new polling
    } catch (e: any) {
      alert(e.message || "Reprocess failed.");
      setActionBusy(false);
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Initialize Polling. Make initial status null to prevent false positive processing screens
  const { status: polledStatus, confidenceScore, error } = useInvoiceStatus(id as string, null as any);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const data = await apiClient.getInvoiceDetails(id as string, "client");
        setInvoice(data);

        try {
          const previewUrl = await apiClient.getFileBlob(id as string, "client");
          setFileUrl(previewUrl);
        } catch (e) {
          console.error("No preview available", e);
        }
      } catch (e) {
        console.error("Failed to load invoice details:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [id, polledStatus]);

  if (loading && !invoice) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen border-none shadow-none bg-transparent">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!invoice) return <div className="p-6 text-center text-muted-foreground">Invoice not found</div>;

  // Use the live polled status if available, fallback to the snapshot invoice status
  const currentStatus = (polledStatus && (polledStatus as any) !== "loading" && (polledStatus as any) !== "null") ? polledStatus : invoice.status;
  const isProcessing = currentStatus === "processing" || currentStatus === "PROCESSING";

  const confidencePercent = confidenceScore ? Math.round(confidenceScore * 100) :
    (invoice.confidence_score ? Math.round(invoice.confidence_score * 100) : 0);

  return (
    <div>
      <Navbar title={invoice.invoice_number ? `Invoice Review / ${invoice.invoice_number}` : "Invoice Details"} />
      <div className="p-6 grid gap-6 lg:grid-cols-2 max-w-[95vw] mx-auto">

        {/* Left Pane: Source Document Viewer */}
        <div
          className="space-y-6 h-[calc(100vh-8rem)] lg:sticky lg:top-24"
          onMouseEnter={() => { isHoveringPreview.current = true; }}
          onMouseLeave={() => { isHoveringPreview.current = false; }}
        >
          <Card className="glass-card h-full flex flex-col overflow-hidden border-primary/10">
            <CardHeader className="py-3 px-4 border-b bg-muted/20">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-muted-foreground">
                  <FileText className="h-4 w-4" /> SOURCE DOCUMENT
                </CardTitle>
                <div className="flex items-center gap-2">
                  {/* Zoom controls */}
                  <div className="flex items-center gap-1 border border-border rounded-md overflow-hidden text-xs">
                    <button
                      onClick={() => setZoom(z => Math.max(0.25, parseFloat((z - 0.2).toFixed(2))))}
                      className="px-2 py-1 hover:bg-muted transition-colors font-bold text-base leading-none select-none"
                      title="Zoom Out"
                    >−</button>
                    <button
                      onClick={() => setZoom(1.0)}
                      className="px-2 py-1 hover:bg-muted transition-colors font-mono text-[10px] min-w-[3rem] text-center select-none"
                      title="Reset Zoom"
                    >{Math.round(zoom * 100)}%</button>
                    <button
                      onClick={() => setZoom(z => Math.min(4, parseFloat((z + 0.2).toFixed(2))))}
                      className="px-2 py-1 hover:bg-muted transition-colors font-bold text-base leading-none select-none"
                      title="Zoom In"
                    >+</button>
                  </div>
                  {fileUrl && (
                    <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-primary hover:underline">
                      Fullscreen ↗
                    </a>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1 relative overflow-auto bg-black/5 dark:bg-white/5">
              {fileUrl ? (
                invoice?.file_url?.match(/\.(jpeg|jpg|png)$/i) ? (
                  <div className="w-full min-h-full p-4 flex items-start justify-center" style={{ transformOrigin: 'top center' }}>
                    <img
                      src={fileUrl}
                      alt="Invoice Document"
                      className="rounded drop-shadow-sm"
                      style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', transition: 'transform 0.15s ease', maxWidth: '100%' }}
                    />
                  </div>
                ) : (
                  <div className="w-full h-full" style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', transition: 'transform 0.15s ease' }}>
                    <iframe src={`${fileUrl}#toolbar=0`} className="w-full h-full border-0 rounded-b-lg" title="Invoice Preview Document" style={{ height: `${100 / zoom}%`, width: `${100 / zoom}%` }} />
                  </div>
                )
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center text-muted-foreground">
                  <Loader2 className="h-8 w-8 animate-spin opacity-50 mb-2" />
                  <p className="text-sm tracking-tight opacity-70">Fetching securely from Cloud Storage...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Pane: Extracted Data & Pipeline Status */}
        <div className="space-y-6 lg:pb-24">

          {/* Sticky Status Header Strip */}
          <Card className="glass-card">
            <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <StatusBadge status={currentStatus} />
                {!isProcessing && confidencePercent > 0 && (
                  <div className="hidden sm:flex items-center gap-2 border-l pl-4 border-border">
                    <span className="text-xs font-semibold tracking-tight text-muted-foreground">CONFIDENCE /</span>
                    <span className="text-sm font-mono font-bold">{confidencePercent}%</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3">
                {/* Only show error banner compactly if failed */}
                {(currentStatus === "error" || error) && (
                  <div className="flex items-center gap-2 text-destructive bg-destructive/10 px-3 py-1.5 rounded-full text-xs font-medium border border-destructive/20">
                    <AlertCircle className="h-4 w-4" /> AI processing failed unexpectedly
                  </div>
                )}

                {/* Action Buttons */}
                {!isProcessing && (
                  <div className="flex items-center gap-2 border-l pl-3 border-border">
                    {/* Reprocess (Allowed for processing_failed, rejected, auto_approved) */}
                    {["processing_failed", "rejected", "auto_approved"].includes(currentStatus) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1.5"
                        onClick={handleReprocess}
                        disabled={actionBusy}
                      >
                        {actionBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3 text-primary" />}
                        Reprocess
                      </Button>
                    )}

                    {/* Delete (Allowed for all EXCEPT manually approved) */}
                    {currentStatus !== "approved" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs gap-1.5 border hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                        onClick={handleDelete}
                        disabled={actionBusy}
                      >
                        {actionBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                        Delete
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {isProcessing ? (
            <Card className="glass-card shadow-lg border-primary/20 bg-primary/5">
              <CardContent className="p-16 flex flex-col items-center justify-center text-center space-y-6">
                <Loader2 className="h-16 w-16 animate-spin text-primary mb-2" />
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">AI extracting data pipeline...</h2>
                  <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                    The Groq LLM model is currently processing visual data, extracting math, and structuring line items.
                  </p>
                </div>
                <div className="w-full max-w-sm mt-8">
                  <Progress value={undefined} className="h-2 w-full animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Top Level Summary Extraction */}
              <Card className="glass-card shadow-sm">
                <CardHeader className="py-4 border-b bg-muted/10">
                  <CardTitle className="text-sm tracking-tight flex items-center justify-between">
                    <span>AI SUMMARY SHEET</span>
                    {invoice.extracted_json?.tax > 0 && (
                      <span className="text-xs font-normal text-muted-foreground bg-foreground/5 px-2 py-0.5 rounded">Includes Tax Info</span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-2 gap-y-8 gap-x-6 md:grid-cols-3">
                    {/* Primary Info */}
                    <div>
                      <p className="text-[11px] uppercase font-bold tracking-widest text-muted-foreground mb-1">Vendor Name</p>
                      <p className="font-semibold text-lg">{invoice.vendor_name || invoice.extracted_json?.vendor_name || "Unknown"}</p>
                    </div>
                    {invoice.extracted_json?.client_name && (
                      <div>
                        <p className="text-[11px] uppercase font-bold tracking-widest text-muted-foreground mb-1">Billed To (Client)</p>
                        <p className="font-semibold text-lg">{invoice.extracted_json.client_name}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-[11px] uppercase font-bold tracking-widest text-muted-foreground mb-1">Invoice Number</p>
                      <p className="font-mono text-lg">{invoice.invoice_number || invoice.extracted_json?.invoice_number || "N/A"}</p>
                    </div>

                    {/* Tax IDs */}
                    {invoice.extracted_json?.seller_tax_id && (
                      <div>
                        <p className="text-[11px] uppercase font-bold tracking-widest text-muted-foreground mb-1">Vendor Tax ID</p>
                        <p className="font-mono text-sm">{invoice.extracted_json.seller_tax_id}</p>
                      </div>
                    )}
                    {invoice.extracted_json?.client_tax_id && (
                      <div>
                        <p className="text-[11px] uppercase font-bold tracking-widest text-muted-foreground mb-1">Client Tax ID</p>
                        <p className="font-mono text-sm">{invoice.extracted_json.client_tax_id}</p>
                      </div>
                    )}

                    {/* Dates & Financials */}
                    <div>
                      <p className="text-[11px] uppercase font-bold tracking-widest text-muted-foreground mb-1">Extracted Date</p>
                      <p className="text-md">{invoice.extracted_json?.invoice_date || "N/A"}</p>
                    </div>
                    {invoice.extracted_json?.subtotal != null && (
                      <div>
                        <p className="text-[11px] uppercase font-bold tracking-widest text-muted-foreground mb-1">Subtotal</p>
                        <p className="text-md">${invoice.extracted_json.subtotal.toLocaleString()}</p>
                      </div>
                    )}
                    {invoice.extracted_json?.tax != null && (
                      <div>
                        <p className="text-[11px] uppercase font-bold tracking-widest text-muted-foreground mb-1">Tax Amount</p>
                        <p className="text-md">${invoice.extracted_json.tax.toLocaleString()}</p>
                      </div>
                    )}
                    <div className={invoice.extracted_json?.subtotal != null ? "md:col-span-3 pt-4 border-t border-border/50" : ""}>
                      <p className="text-[11px] uppercase font-bold tracking-widest text-muted-foreground mb-1">Gross Total Amount</p>
                      <p className="text-3xl font-bold text-primary max-w-full truncate">${(invoice.total_amount || invoice.extracted_json?.grand_total || 0).toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Line Items Extracted Array */}
              {invoice.extracted_json?.line_items && invoice.extracted_json.line_items.length > 0 && (
                <Card className="glass-card shadow-sm">
                  <CardHeader className="py-4 border-b bg-muted/10"><CardTitle className="text-sm tracking-tight">EXTRACTED LINE ITEMS</CardTitle></CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader className="bg-muted/30">
                        <TableRow>
                          <TableHead className="font-semibold">Item Description</TableHead>
                          <TableHead className="text-right font-semibold">Qty</TableHead>
                          <TableHead className="text-right font-semibold">Unit Price</TableHead>
                          <TableHead className="text-right font-semibold">Subtotal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoice.extracted_json.line_items.map((li: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell className="max-w-[200px] truncate">{li.description || "-"}</TableCell>
                            <TableCell className="text-right text-muted-foreground">{li.qty || 1}</TableCell>
                            <TableCell className="text-right text-muted-foreground">${(li.unit_price || 0).toLocaleString()}</TableCell>
                            <TableCell className="text-right font-semibold">${(li.line_total || 0).toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Activity Pipeline Timeline */}
          <Card className="glass-card">
            <CardHeader className="py-4 border-b"><CardTitle className="text-sm tracking-tight text-muted-foreground">AUDIT PIPELINE TIMELINE</CardTitle></CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {invoice.events && invoice.events.length > 0 ? invoice.events.map((event: any, i: number) => (
                  <div key={event.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="h-2.5 w-2.5 rounded-full bg-primary mt-1.5 flex-shrink-0 shadow-sm" />
                      {i < invoice.events.length - 1 && <div className="w-px flex-1 bg-border/60 mt-2 mb-2" />}
                    </div>
                    <div className="pb-4">
                      <p className="text-xs font-bold tracking-widest text-primary uppercase">{event.event_type}</p>
                      {event.message && <p className="text-sm text-foreground mt-0.5">{event.message}</p>}
                      <p className="text-[10px] text-muted-foreground mt-1.5 flex items-center gap-1 opacity-60">
                        <Clock className="h-3 w-3" />
                        {new Date(event.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-muted-foreground italic">No events recorded yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
};

export default ClientInvoiceDetail;
