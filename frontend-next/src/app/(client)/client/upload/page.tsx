"use client";
import { useState, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, X, CheckCircle, Loader2, Activity } from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type UploadState = "idle" | "selected" | "uploading" | "complete";

// Poll status until no longer "processing", max 3 minutes (180s)
async function waitForProcessing(invoiceId: string, timeoutMs = 180_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000") + "/api/v1";
      const match = document.cookie.match(/(^| )auth_token=([^;]+)/);
      const token = match ? match[2] : null;
      const res = await fetch(`${API_URL}/invoices/${invoiceId}/status`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status && data.status !== "processing") return; // Done!
      }
    } catch {
      // Network blip — keep polling
    }
    await new Promise((r) => setTimeout(r, 4000)); // check every 4s
  }
  // Timeout reached — continue anyway (don't block the queue)
}

const ClientUpload = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [state, setState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [currentFile, setCurrentFile] = useState("");
  const [currentStep, setCurrentStep] = useState<"uploading" | "processing">("uploading");
  const [dragOver, setDragOver] = useState(false);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.includes("pdf") || f.type.includes("image") || f.type.includes("csv") ||
      f.type.includes("spreadsheet") || f.type.includes("excel") ||
      f.name.match(/\.(pdf|jpe?g|png|csv|xlsx?)$/i)
    );
    if (dropped.length) { setFiles((prev) => [...prev, ...dropped]); setState("selected"); }
  }, []);

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length) { setFiles((prev) => [...prev, ...selected]); setState("selected"); }
  };

  const removeFile = (i: number) => {
    setFiles((f) => f.filter((_, idx) => idx !== i));
    if (files.length <= 1) setState("idle");
  };

  const handleUpload = async () => {
    setState("uploading");
    const total = files.length;
    let completed = 0;

    try {
      // ── SEQUENTIAL: one file at a time ──────────────────────────────────
      for (const file of files) {
        // Step A: upload the file
        setCurrentFile(file.name);
        setCurrentStep("uploading");
        setProgress(Math.round((completed / total) * 100));

        const result = await apiClient.uploadInvoice(file);
        const invoiceId = result?.id;

        // Step B: wait for AI to finish processing (up to 3 min) before next file
        if (invoiceId) {
          setCurrentStep("processing");
          await waitForProcessing(invoiceId, 180_000);
        }

        completed += 1;
        setProgress(Math.round((completed / total) * 100));
      }
      // ────────────────────────────────────────────────────────────────────

      setState("complete");
      setTimeout(() => {
        window.location.href = "/client/dashboard";
      }, 1200);
    } catch (e) {
      console.error(e);
      setState("idle");
      alert("Upload failed. Check your connection or try a smaller file.");
    }
  };

  return (
    <div>
      <Navbar title="Upload Invoice" />
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
        {/* Drop Zone */}
        <Card className="glass-card">
          <CardContent className="p-0">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={cn(
                "flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-8 md:p-12 transition-all cursor-pointer",
                dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              )}
              onClick={() => document.getElementById("file-input")?.click()}
            >
              <div className="rounded-full bg-primary/10 p-4">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-base md:text-lg font-medium">Drag &amp; drop invoices here</p>
                <p className="text-xs md:text-sm text-muted-foreground">
                  or click to browse · PDF, Images &amp; Spreadsheets · Processed one-by-one
                </p>
              </div>
              <input
                id="file-input"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.csv,.xlsx,.xls"
                multiple
                className="hidden"
                onChange={onFileSelect}
              />
            </div>
          </CardContent>
        </Card>

        {/* Email Tip */}
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
          <Activity className="h-5 w-5 shrink-0 mt-0.5" />
          <p className="text-sm">
            <span className="font-semibold">Pro Tip:</span> Email invoices to{" "}
            <span className="font-mono text-white">testeralfa516@gmail.com</span> and we'll process
            them automatically!
          </p>
        </div>

        {/* File List */}
        <AnimatePresence>
          {files.length > 0 && state === "selected" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Card className="glass-card">
                <CardHeader className="flex-row items-center justify-between pb-3">
                  <CardTitle className="text-base">{files.length} file(s) ready</CardTitle>
                  <Button onClick={handleUpload}>Upload &amp; Process</Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium truncate">{f.name}</span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {(f.size / 1024).toFixed(0)} KB
                        </span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeFile(i)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground pt-1 px-1">
                    Files will be processed one-by-one (up to 3 min each) to ensure accurate AI extraction.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upload Progress */}
        {state === "uploading" && (
          <Card className="glass-card">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    {currentStep === "uploading" ? `↑ Uploading: ${currentFile}` : `⚙️ AI processing: ${currentFile}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {currentStep === "processing"
                      ? "Waiting for extraction to complete (up to 3 min)…"
                      : "Sending to server…"}
                  </p>
                </div>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground">{progress}% of files done</p>
            </CardContent>
          </Card>
        )}

        {/* Complete */}
        {state === "complete" && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="glass-card">
              <CardContent className="p-6 text-center space-y-3">
                <CheckCircle className="h-10 w-10 text-green-400 mx-auto" />
                <p className="font-semibold text-lg">All done! Redirecting to dashboard…</p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ClientUpload;
