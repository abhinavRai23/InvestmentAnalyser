"use client";

import { useState, useRef } from "react";
import { usePortfolioStore } from "@/store/portfolioStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Upload, 
  FileSpreadsheet, 
  Sparkles, 
  ShieldCheck, 
  Download, 
  Info, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ChevronDown,
  Building2,
  PieChart,
  HelpCircle,
  FileCode,
  Users
} from "lucide-react";

export function WelcomeScreen() {
  const { setData, loadDemoPortfolio } = usePortfolioStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [activeGuideTab, setActiveGuideTab] = useState<"groww" | "bank">("groww");

  const handleFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(f => f.name.endsWith(".xlsx") || f.name.endsWith(".json"));

    if (validFiles.length === 0) {
      setUploadStatus({
        success: false,
        message: "Please drop a Groww Excel file (.xlsx), Bank/FD template (.xlsx), or Portfolio Backup (.json)."
      });
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
      if (res.ok && result.success && result.data) {
        setData(result.data);
      } else {
        setUploadStatus({
          success: false,
          message: result.error || "Failed to process files. Please verify the format."
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

  const handleDownloadTemplate = () => {
    window.open("/api/upload-reports?template=bank-fd", "_blank");
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Hero Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium border border-emerald-500/20 mb-1">
          <ShieldCheck className="h-4 w-4" />
          <span>100% Client-Side & Private • No data is stored on external servers</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
          Investment & Portfolio Analyser
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto">
          Deep overlap matrix, asset allocation, sector exposure, and risk analysis for Indian Mutual Funds, Direct Stocks, FDs, and Savings Accounts.
        </p>
      </div>

      {/* Main Upload Dropzone */}
      <Card className="border-2 border-dashed shadow-sm transition-all hover:border-indigo-500/50">
        <CardContent className="p-6 sm:p-10">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-xl p-8 text-center transition-all flex flex-col items-center justify-center space-y-4 ${
              isDragging
                ? "bg-indigo-500/10 scale-[1.01]"
                : "bg-muted/20 hover:bg-muted/40"
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

            <div className="h-16 w-16 rounded-full bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
              {isUploading ? (
                <RefreshCw className="h-8 w-8 animate-spin" />
              ) : (
                <Upload className="h-8 w-8" />
              )}
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-bold text-foreground">
                {isUploading ? "Analysing and generating portfolio..." : "Drag & Drop your statement files here"}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground max-w-md">
                Supports Groww Excel statements (<span className="font-semibold text-foreground">.xlsx</span>), Bank & FD templates (<span className="font-semibold text-foreground">.xlsx</span>), or Portfolio Backups (<span className="font-semibold text-foreground">.json</span>).
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700">
                Browse Files
              </Button>
            </div>
          </div>

          {/* Upload Status Alert */}
          {uploadStatus && (
            <div
              className={`mt-4 p-3 rounded-lg flex items-center gap-2 text-xs font-medium ${
                uploadStatus.success
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

          {/* Quick Actions Bar */}
          <div className="mt-6 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
              <span>Don't have your statement files handy right now?</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Select
                onValueChange={(url) => {
                  if (typeof url === "string" && url) window.open(url, "_blank");
                }}
              >
                <SelectTrigger className="h-8 text-xs w-[170px] bg-background">
                  <SelectValue placeholder="📥 Download Sample Files" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="/sample-files/Mutual_Funds_Person_A.xlsx" className="text-xs">
                    Person A: Mutual Funds (.xlsx)
                  </SelectItem>
                  <SelectItem value="/sample-files/Stocks_Holdings_Person_A.xlsx" className="text-xs">
                    Person A: Stocks (.xlsx)
                  </SelectItem>
                  <SelectItem value="/sample-files/Mutual_Funds_Person_B.xlsx" className="text-xs">
                    Person B: Mutual Funds (.xlsx)
                  </SelectItem>
                  <SelectItem value="/sample-files/Stocks_Holdings_Person_B.xlsx" className="text-xs">
                    Person B: Stocks (.xlsx)
                  </SelectItem>
                  <SelectItem value="/sample-files/Bank_and_FD_Sample_Person_A_B.xlsx" className="text-xs">
                    Bank & FDs Sample (.xlsx)
                  </SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadTemplate}
                className="gap-1.5 text-xs h-8"
              >
                <Download className="h-3.5 w-3.5 text-emerald-600" />
                <span>Bank/FD Template</span>
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={loadDemoPortfolio}
                className="gap-1.5 text-xs h-8 bg-amber-500/10 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 border border-amber-500/30 font-semibold"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Explore Demo Family</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interactive Step-by-Step Guide */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-indigo-500" />
              <span>How to get started</span>
            </h3>

            <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg text-xs">
              <button
                onClick={() => setActiveGuideTab("groww")}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  activeGuideTab === "groww"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Groww Statements
              </button>
              <button
                onClick={() => setActiveGuideTab("bank")}
                className={`px-3 py-1 rounded-md font-medium transition-all ${
                  activeGuideTab === "bank"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Bank & Fixed Deposits
              </button>
            </div>
          </div>

          {activeGuideTab === "groww" ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div className="p-4 rounded-xl bg-muted/40 border space-y-1.5">
                <div className="h-6 w-6 rounded-full bg-indigo-500/10 text-indigo-600 font-bold text-xs flex items-center justify-center">
                  1
                </div>
                <h4 className="font-semibold text-xs">Open Groww App</h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Open Groww on your phone and tap on your <strong>Profile photo</strong> in the top-right corner.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-muted/40 border space-y-1.5">
                <div className="h-6 w-6 rounded-full bg-indigo-500/10 text-indigo-600 font-bold text-xs flex items-center justify-center">
                  2
                </div>
                <h4 className="font-semibold text-xs">Download Report</h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Tap <strong>Reports</strong> $\rightarrow$ Select <strong>Mutual Fund Holdings</strong> or <strong>Stock Holdings</strong> $\rightarrow$ Choose <strong>Excel (.xlsx)</strong>.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-muted/40 border space-y-1.5">
                <div className="h-6 w-6 rounded-full bg-indigo-500/10 text-indigo-600 font-bold text-xs flex items-center justify-center">
                  3
                </div>
                <h4 className="font-semibold text-xs">Drop & Analyze</h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Groww emails the Excel attachment instantly. Download the attachment and drop it into the box above.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
              <div className="p-4 rounded-xl bg-muted/40 border space-y-1.5">
                <div className="h-6 w-6 rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-xs flex items-center justify-center">
                  1
                </div>
                <h4 className="font-semibold text-xs">Download Excel Template</h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Click the <strong>Bank & FD Template</strong> button above to get a clean spreadsheet for your savings, FDs, PPF, and NPS.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-muted/40 border space-y-1.5">
                <div className="h-6 w-6 rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-xs flex items-center justify-center">
                  2
                </div>
                <h4 className="font-semibold text-xs">Fill in your Balances</h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Enter your bank name, account or FD balance, and interest rate. You can omit account numbers if you prefer anonymity.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-muted/40 border space-y-1.5">
                <div className="h-6 w-6 rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-xs flex items-center justify-center">
                  3
                </div>
                <h4 className="font-semibold text-xs">Drop Together or in App</h4>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Drop the file here or manage them anytime inside the <strong>Bank, FD & Pension</strong> tab in your dashboard.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

