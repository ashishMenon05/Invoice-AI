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

type UploadState = "idle" | "selected" | "uploading" | "processing" | "complete";

const ClientUpload = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [state, setState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.includes("pdf") || f.type.includes("image") || f.type.includes("csv") || f.type.includes("spreadsheet") || f.type.includes("excel") || f.name.match(/\.(pdf|jpe?g|png|csv|xlsx?)$/i)
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

    try {
      const total = files.length;
      let completed = 0;
      const BATCH_SIZE = 3; // Free tier: max 3 concurrent uploads to avoid OCR timeouts

      for (let i = 0; i < files.length; i += BATCH_SIZE) {
        const batch = files.slice(i, i + BATCH_SIZE);
        await Promise.all(
          batch.map(async (file) => {
            await apiClient.uploadInvoice(file);
            completed += 1;
            setProgress(Math.round((completed / total) * 100));
          })
        );
      }

      // Route back to dashboard to view all newly processing invoices
      window.location.href = `/client/dashboard`;
    } catch (e) {
      console.error(e);
      setState("idle");
      alert("Upload failed. Disconnected from backend?");
    }
  };

  return (
    <div>
      <Navbar title="Upload Invoice" />
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        {/* Drop Zone */}
        <Card className="glass-card">
          <CardContent className="p-0">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={cn(
                "flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-12 transition-all cursor-pointer",
                dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              )}
              onClick={() => document.getElementById("file-input")?.click()}
            >
              <div className="rounded-full bg-primary/10 p-4">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-lg font-medium">Drag & drop invoices here</p>
                <p className="text-sm text-muted-foreground">or click to browse · PDF, Images & Spreadsheets supported · Bulk upload enabled</p>
              </div>
              <input id="file-input" type="file" accept=".pdf,.jpg,.jpeg,.png,.csv,.xlsx,.xls" multiple className="hidden" onChange={onFileSelect} />
            </div>
          </CardContent>
        </Card>

        {/* Email Tip */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
          <Activity className="h-5 w-5 shrink-0" />
          <p className="text-sm">
            <span className="font-semibold">Pro Tip:</span> You can also email your invoices to <span className="font-mono text-white">testeralfa516@gmail.com</span> and we'll process them automatically!
          </p>
        </div>

        {/* File List */}
        <AnimatePresence>
          {files.length > 0 && state === "selected" && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <Card className="glass-card">
                <CardHeader className="flex-row items-center justify-between">
                  <CardTitle className="text-base">{files.length} file(s) ready</CardTitle>
                  <Button onClick={handleUpload}>Upload & Process</Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{f.name}</span>
                        <span className="text-xs text-muted-foreground">{(f.size / 1024).toFixed(0)} KB</span>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeFile(i)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
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
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="font-medium">Uploading...</span>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground">{progress}% complete</p>
            </CardContent>
          </Card>
        )}

        {/* Processing */}
        {state === "processing" && (
          <Card className="glass-card">
            <CardContent className="p-6 text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="font-medium">AI is extracting invoice data...</p>
              <p className="text-sm text-muted-foreground">Running validation checks</p>
            </CardContent>
          </Card>
        )}

        {/* Complete */}
        {state === "complete" && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CheckCircle className="h-5 w-5 text-status-approved" />
                  Extraction Complete
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-xs text-muted-foreground">Vendor</p><p className="font-medium">Acme Corp</p></div>
                  <div><p className="text-xs text-muted-foreground">Invoice #</p><p className="font-mono font-medium">#2024001</p></div>
                  <div><p className="text-xs text-muted-foreground">Amount</p><p className="font-medium">$12,450.00</p></div>
                  <div><p className="text-xs text-muted-foreground">Confidence</p><p className="font-mono font-medium text-status-approved">94%</p></div>
                </div>
                <div className="border-t border-border pt-4">
                  <p className="text-sm font-medium mb-3">Validation Summary</p>
                  <div className="space-y-2">
                    {["Math Valid", "Schema Valid", "Fraud Check"].map((v) => (
                      <div key={v} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-status-approved" />
                        <span>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <Button onClick={() => { setFiles([]); setState("idle"); setProgress(0); }} variant="outline" className="w-full">
                  Upload More Invoices
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ClientUpload;
