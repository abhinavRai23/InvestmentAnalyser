"use client";

import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { usePortfolioStore } from "@/store/portfolioStore";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, RefreshCw, HardDrive, Info } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface ReportUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReportUploadModal({ open, onOpenChange }: ReportUploadModalProps) {
  const { setData } = usePortfolioStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [existingFiles, setExistingFiles] = useState<Array<{ name: string; size: number; modified: string }>>([]);
  const [uploadStatus, setUploadStatus] = useState<{ success: boolean; message: string } | null>(null);

  const fetchExistingFiles = async () => {
    try {
      const res = await fetch("/api/upload-reports");
      if (res.ok) {
        const data = await res.json();
        setExistingFiles(data.files || []);
      }
    } catch (e) {
      console.error("Failed to fetch report files list", e);
    }
  };

  useEffect(() => {
    if (open) {
      fetchExistingFiles();
      setUploadStatus(null);
    }
  }, [open]);

  const handleFiles = async (files: FileList | File[]) => {
    const validFiles = Array.from(files).filter(f => f.name.endsWith(".xlsx") || f.name.endsWith(".json"));
    if (validFiles.length === 0) {
      setUploadStatus({ success: false, message: "Please select valid Groww Excel files (.xlsx), Bank/FD template (.xlsx), or Portfolio Backup (.json)." });
      return;
    }

    setIsUploading(true);
    setUploadStatus(null);

    const formData = new FormData();
    validFiles.forEach(file => formData.append("files", file));

    try {
      const res = await fetch("/api/upload-reports", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();
      if (res.ok && result.success) {
        if (result.data) {
          setData(result.data);
        }
        setUploadStatus({
          success: true,
          message: `Successfully imported ${result.savedCount} report file(s)! Portfolio updated.`
        });
        fetchExistingFiles();
      } else {
        setUploadStatus({
          success: false,
          message: result.error || "Failed to process uploaded files."
        });
      }
    } catch (e: any) {
      setUploadStatus({
        success: false,
        message: e.message || "An error occurred while uploading."
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-w-full p-6">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>Import Reports & Assets</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Drag and drop Groww Excel exports (.xlsx), Bank & FD template (.xlsx), or Portfolio Backup (.json) to update your portfolio instantly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Dropzone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${isDragging
                ? "border-indigo-600 bg-indigo-500/10 scale-[1.01]"
                : "border-border/80 hover:border-indigo-500/50 hover:bg-muted/30"
              }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
              multiple
              accept=".xlsx,.json"
              className="hidden"
            />

            <div className="flex flex-col items-center justify-center space-y-2.5">
              <div className="h-11 w-11 rounded-full bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                {isUploading ? (
                  <RefreshCw className="h-5 w-5 animate-spin" />
                ) : (
                  <Upload className="h-5 w-5" />
                )}
              </div>

              <div>
                <p className="font-semibold text-sm text-foreground">
                  {isUploading ? "Processing & updating portfolio..." : "Click or Drag & Drop statements or backups here"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Supports Groww reports (.xlsx), Bank/FD sheets (.xlsx), or JSON backups
                </p>
              </div>

              <div className="flex items-center gap-2 mt-1">
                <Button variant="secondary" size="sm" disabled={isUploading}>
                  Browse Files
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open("/api/upload-reports?template=bank-fd", "_blank");
                  }}
                  className="text-xs"
                >
                  Bank/FD Template
                </Button>
              </div>
            </div>
          </div>

          {/* Status Message */}
          {uploadStatus && (
            <div
              className={`p-3 rounded-lg flex items-center space-x-2 text-xs font-medium ${uploadStatus.success
                  ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200"
                  : "bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200"
                }`}
            >
              {uploadStatus.success ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              )}
              <span>{uploadStatus.message}</span>
            </div>
          )}

          {/* Tips box */}
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-300">
              <Info className="h-3.5 w-3.5 shrink-0" />
              Tip: Automated Groww Report Emails
            </div>
            <p className="text-amber-800/90 dark:text-amber-200/90 leading-relaxed">
              Groww sends Excel statement attachments directly to your registered email on request. Simply download the attachment from your mail and drop it here!
            </p>
          </div>

          {/* Currently loaded statements */}
          {existingFiles.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <HardDrive className="h-3.5 w-3.5 text-indigo-500" /> Loaded Report Files ({existingFiles.length})
              </h4>
              <div className="max-h-36 overflow-y-auto border rounded-xl divide-y bg-muted/20">
                {existingFiles.map((file) => (
                  <div key={file.name} className="px-3.5 py-2 flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground truncate max-w-[260px] sm:max-w-[340px]" title={file.name}>
                      {file.name}
                    </span>
                    <div className="flex items-center space-x-3 text-[11px] text-muted-foreground shrink-0 font-mono">
                      <span>{formatFileSize(file.size)}</span>
                      <span>{new Date(file.modified).toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "-")}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
