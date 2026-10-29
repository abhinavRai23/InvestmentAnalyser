"use client";

import { useState, useMemo, useRef, Fragment } from "react";
import { usePortfolioStore } from "@/store/portfolioStore";
import { CustomAsset, CustomAssetCategory } from "@/lib/types";
import { formatCurrency, getRelativeTimeString, formatDateIndian } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus,
  Download,
  Upload,
  Search,
  Pencil,
  Trash2,
  Building2,
  Wallet,
  PiggyBank,
  Landmark,
  User,
  ShieldCheck,
  Smartphone,
  Mail,
  Users,
  List,
  Info,
  AlertCircle,
  Calendar,
  FileSpreadsheet
} from "lucide-react";

export function CustomAssetsManager() {
  const { data, filters, addCustomAsset, updateCustomAsset, deleteCustomAsset, setCustomAssets } = usePortfolioStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedOwner, setSelectedOwner] = useState<string>("ALL");
  const [groupingMode, setGroupingMode] = useState<"CATEGORY" | "PERSON">("CATEGORY");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<CustomAsset | null>(null);

  // Form Fields State
  const [formData, setFormData] = useState({
    ownerId: "",
    category: "FD" as CustomAssetCategory,
    institution: "",
    accountNumber: "",
    investedValue: "",
    currentValue: "",
    interestRate: "",
    minimumBalance: "",
    maturityType: "DATE" as "DATE" | "INDEFINITE",
    maturityDate: "",
    notes: ""
  });

  const people = data?.people || [];
  const customAssets = data?.customAssets || [];

  const globalSelectedOwnerIds = useMemo(() => {
    return filters?.selectedOwnerIds || (filters?.ownerId === 'ALL' ? ['ALL'] : [filters?.ownerId || 'ALL']);
  }, [filters?.selectedOwnerIds, filters?.ownerId]);

  const isAllGlobalSelected = globalSelectedOwnerIds.includes('ALL') ||
    globalSelectedOwnerIds.length === 0 ||
    (people.length > 0 && globalSelectedOwnerIds.length === people.length);

  const activeOwnerIds = selectedOwner !== 'ALL'
    ? [selectedOwner]
    : (isAllGlobalSelected ? undefined : globalSelectedOwnerIds);

  // Assets filtered by member and category
  const ownerFilteredAssets = useMemo(() => {
    if (!activeOwnerIds) return customAssets;
    return customAssets.filter((asset) => activeOwnerIds.includes(asset.ownerId));
  }, [customAssets, activeOwnerIds]);

  // Filtered Assets list (including search & category)
  const filteredAssets = useMemo(() => {
    return ownerFilteredAssets.filter((asset) => {
      if (selectedCategory !== "ALL" && asset.category !== selectedCategory) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const inst = (asset.institution || "").toLowerCase();
        const acc = (asset.accountNumber || "").toLowerCase();
        const notes = (asset.notes || "").toLowerCase();
        const cat = (asset.category || "").toLowerCase();
        const owner = (people.find(p => p.id === asset.ownerId)?.name || asset.ownerId).toLowerCase();

        if (!inst.includes(q) && !acc.includes(q) && !notes.includes(q) && !cat.includes(q) && !owner.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [ownerFilteredAssets, selectedCategory, searchQuery, people]);

  // Section 1: Savings Accounts
  const savingsAssets = useMemo(() => {
    return filteredAssets.filter(a => a.category === "Savings Account");
  }, [filteredAssets]);

  // Section 2: Fixed Deposits (FDs)
  const fdAssets = useMemo(() => {
    const fds = filteredAssets.filter(a => a.category === "FD");

    const postOffice = fds.filter(a => {
      const inst = (a.institution || "").toLowerCase();
      const notes = (a.notes || "").toLowerCase();
      return inst.includes("post office") || notes.includes("nsc");
    });

    const mobikwik = fds.filter(a => {
      const inst = (a.institution || "").toLowerCase();
      return inst.includes("mobikwik");
    });

    const bankFds = fds.filter(a => !postOffice.includes(a) && !mobikwik.includes(a));

    return { all: fds, postOffice, mobikwik, bankFds };
  }, [filteredAssets]);

  // Section 3: Retirement & Pension Funds (NPS, PPF, EPF)
  const retirementAssets = useMemo(() => {
    return filteredAssets.filter(a => a.category === "NPS" || a.category === "PPF" || a.category === "EPF");
  }, [filteredAssets]);

  // Other Custom Assets
  const otherAssets = useMemo(() => {
    return filteredAssets.filter(a =>
      a.category !== "Savings Account" &&
      a.category !== "FD" &&
      a.category !== "NPS" &&
      a.category !== "PPF" &&
      a.category !== "EPF"
    );
  }, [filteredAssets]);

  // Summary totals
  const metrics = useMemo(() => {
    const savingsTotal = savingsAssets.reduce((s, a) => s + (a.currentValue || 0), 0);
    const fdTotal = fdAssets.all.reduce((s, a) => s + (a.currentValue || 0), 0);
    const retirementTotal = retirementAssets.reduce((s, a) => s + (a.currentValue || 0), 0);
    const grandTotal = savingsTotal + fdTotal + retirementTotal + otherAssets.reduce((s, a) => s + (a.currentValue || 0), 0);

    return { savingsTotal, fdTotal, retirementTotal, grandTotal };
  }, [savingsAssets, fdAssets, retirementAssets, otherAssets]);

  const handleOpenAddModal = () => {
    setEditingAsset(null);
    setFormData({
      ownerId: people.length > 0 ? people[0].id : "",
      category: "FD",
      institution: "",
      accountNumber: "",
      investedValue: "",
      currentValue: "",
      interestRate: "",
      minimumBalance: "",
      maturityType: "DATE",
      maturityDate: "",
      notes: ""
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (asset: CustomAsset) => {
    setEditingAsset(asset);
    const isIndefinite = !asset.maturityDate || asset.maturityDate.toUpperCase() === "INDEFINITE" || asset.maturityDate === "N/A";
    setFormData({
      ownerId: asset.ownerId,
      category: asset.category,
      institution: asset.institution,
      accountNumber: asset.accountNumber || "",
      investedValue: asset.investedValue.toString(),
      currentValue: asset.currentValue.toString(),
      interestRate: asset.interestRate ? asset.interestRate.toString() : "",
      minimumBalance: asset.minimumBalance ? asset.minimumBalance.toString() : "",
      maturityType: isIndefinite ? "INDEFINITE" : "DATE",
      maturityDate: isIndefinite ? "" : (asset.maturityDate || ""),
      notes: asset.notes || ""
    });
    setIsModalOpen(true);
  };

  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.ownerId || !formData.institution || (!formData.currentValue && !formData.investedValue)) return;

    const currentVal = parseFloat(formData.currentValue || formData.investedValue) || 0;
    const investedVal = currentVal;
    const intRate = formData.interestRate ? parseFloat(formData.interestRate) : undefined;
    const minBal = formData.minimumBalance ? parseFloat(formData.minimumBalance) : undefined;
    const finalMaturity = formData.maturityType === "INDEFINITE" ? "Indefinite" : (formData.maturityDate || "Indefinite");

    const todayStr = new Date().toISOString().split("T")[0];

    if (editingAsset) {
      await updateCustomAsset({
        ...editingAsset,
        ownerId: formData.ownerId,
        category: formData.category,
        institution: formData.institution,
        accountNumber: formData.accountNumber || undefined,
        investedValue: investedVal,
        currentValue: currentVal,
        interestRate: intRate,
        minimumBalance: minBal,
        maturityDate: finalMaturity,
        lastUpdated: todayStr,
        notes: formData.notes || undefined
      });
    } else {
      await addCustomAsset({
        ownerId: formData.ownerId,
        category: formData.category,
        institution: formData.institution,
        accountNumber: formData.accountNumber || undefined,
        investedValue: investedVal,
        currentValue: currentVal,
        interestRate: intRate,
        minimumBalance: minBal,
        maturityDate: finalMaturity,
        lastUpdated: todayStr,
        notes: formData.notes || undefined
      });
    }

    setIsModalOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this custom asset?")) {
      await deleteCustomAsset(id);
    }
  };

  // Download JSON export
  const handleDownloadJSON = () => {
    const jsonStr = JSON.stringify(customAssets, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `custom_assets_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Upload/Import JSON file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          await setCustomAssets(parsed);
          alert(`Successfully imported ${parsed.length} custom assets!`);
        } else {
          alert("Invalid file format. Please upload a JSON array of custom assets.");
        }
      } catch (err) {
        alert("Failed to parse JSON file.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Helper row renderer without redundant Category column
  const renderAssetRow = (asset: CustomAsset, options: { showOwnerColumn?: boolean; showMaturityColumn?: boolean }) => {
    const { showOwnerColumn = true, showMaturityColumn = false } = options;
    const ownerName = people.find((p) => p.id === asset.ownerId)?.name || asset.ownerId;
    const isIndefinite = !asset.maturityDate || asset.maturityDate.toLowerCase() === "indefinite" || asset.maturityDate === "N/A";

    const isBelowMinBalance = asset.category === "Savings Account" && typeof asset.minimumBalance === "number" && asset.currentValue < asset.minimumBalance;

    // FD Maturity Status calculation (Matured = Dark Red, <1 Mo = Light Red, <6 Mo = Yellow)
    const getFdStatus = (matDate?: string) => {
      if (!matDate || matDate.toLowerCase() === "indefinite" || matDate === "N/A") return "INDEFINITE";
      const dateObj = new Date(matDate);
      if (isNaN(dateObj.getTime())) return "INDEFINITE";
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (dateObj < today) return "MATURED";
      const diffMs = dateObj.getTime() - today.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays <= 30) return "MATURING_1M"; // Within 1 Month -> Light Red
      if (diffDays <= 180) return "MATURING_6M"; // Within 6 Months -> Yellow/Amber
      return "ACTIVE";
    };

    const fdStatus = asset.category === "FD" ? getFdStatus(asset.maturityDate) : "INDEFINITE";

    return (
      <tr key={asset.id} className={`transition-colors ${isBelowMinBalance
          ? "bg-rose-500/10 hover:bg-rose-500/15 dark:bg-rose-950/30"
          : fdStatus === "MATURED"
            ? "bg-rose-950/20 hover:bg-rose-950/30 dark:bg-rose-950/50 border-l-4 border-l-rose-600"
            : fdStatus === "MATURING_1M"
              ? "bg-rose-500/10 hover:bg-rose-500/15 dark:bg-rose-950/30 border-l-4 border-l-rose-400"
              : fdStatus === "MATURING_6M"
                ? "bg-amber-500/10 hover:bg-amber-500/15 dark:bg-amber-950/30 border-l-4 border-l-amber-400"
                : "hover:bg-muted/30"
        }`}>
        {showOwnerColumn && (
          <td className="px-3.5 py-2.5 font-medium truncate">
            <div className="flex items-center space-x-1.5 truncate">
              <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">{ownerName}</span>
            </div>
          </td>
        )}
        <td className="px-3.5 py-2.5 font-semibold text-foreground truncate" title={asset.institution}>
          {asset.institution}
        </td>
        <td className="px-3.5 py-2.5 text-muted-foreground font-mono text-[11px] truncate">
          {asset.accountNumber || "-"}
        </td>
        <td className="px-3.5 py-2.5 text-right font-mono truncate">
          {isBelowMinBalance ? (
            <div className="flex flex-col items-end">
              <span className="font-bold text-rose-600 dark:text-rose-400">
                {formatCurrency(asset.currentValue)}
              </span>
              <span className="text-[9px] font-bold text-rose-700 bg-rose-100 dark:bg-rose-900/60 dark:text-rose-300 px-1 py-0.2 rounded border border-rose-300 dark:border-rose-700" title={`Below minimum required balance of ${formatCurrency(asset.minimumBalance!)}`}>
                🚨 Min ₹{asset.minimumBalance!.toLocaleString()}
              </span>
            </div>
          ) : (
            <span className="font-bold text-foreground">{formatCurrency(asset.currentValue)}</span>
          )}
        </td>
        <td className="px-3.5 py-2.5 text-right font-mono truncate">
          {asset.interestRate ? (
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {asset.interestRate}% p.a.
            </span>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </td>
        {showMaturityColumn && (
          <td className="px-3.5 py-2.5 truncate">
            {isIndefinite ? (
              <Badge variant="secondary" className="text-[10px] font-normal bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                Indefinite / N/A
              </Badge>
            ) : (
              <div className="flex items-center space-x-1.5">
                <span className="text-xs font-semibold text-foreground font-mono">{formatDateIndian(asset.maturityDate)}</span>
                {fdStatus === "MATURED" && (
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-rose-600 text-white animate-pulse cursor-help shrink-0" title={`🚨 FD Matured on ${formatDateIndian(asset.maturityDate)} — Action Needed!`}>
                    <AlertCircle className="h-3.5 w-3.5" />
                  </span>
                )}
                {fdStatus === "MATURING_1M" && (
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300 border border-rose-300 dark:border-rose-700 cursor-help shrink-0" title={`⚠️ Maturing within 1 month on ${formatDateIndian(asset.maturityDate)}`}>
                    <Info className="h-3.5 w-3.5" />
                  </span>
                )}
                {fdStatus === "MATURING_6M" && (
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-400 cursor-help shrink-0" title={`⚡ Maturing within 6 months on ${formatDateIndian(asset.maturityDate)}`}>
                    <Info className="h-3.5 w-3.5" />
                  </span>
                )}
              </div>
            )}
          </td>
        )}
        <td className="px-3.5 py-2.5 font-mono text-[11px] truncate">
          {asset.lastUpdated ? (
            (() => {
              const rel = getRelativeTimeString(asset.lastUpdated);
              const formattedDate = formatDateIndian(asset.lastUpdated);
              return (
                <div className="flex items-center space-x-1 truncate" title={`Last updated balance on ${formattedDate}`}>
                  <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="font-semibold text-foreground">{formattedDate}</span>
                  {rel.text && (
                    <span className={`text-[10px] whitespace-nowrap ${rel.isStale ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-muted-foreground font-medium'}`}>
                      ({rel.text})
                    </span>
                  )}
                </div>
              );
            })()
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </td>
        <td className="px-3.5 py-2.5 text-xs text-muted-foreground truncate w-52 max-w-[208px]" title={asset.notes || ""}>
          {asset.notes || "-"}
        </td>
        <td className="px-3.5 py-2.5 text-center whitespace-nowrap">
          <div className="flex items-center justify-center space-x-1">
            <Button
              onClick={() => handleOpenEditModal(asset)}
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-indigo-600"
              title="Edit"
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              onClick={() => handleDelete(asset.id)}
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-rose-600"
              title="Delete"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </td>
      </tr>
    );
  };

  // Section 1: Savings Accounts Table with Seamless Person Sub-Headers
  const renderSavingsSection = () => {
    if (savingsAssets.length === 0) {
      return <div className="py-6 text-center text-xs text-muted-foreground">No Savings Accounts matching filter.</div>;
    }

    // Group savings assets by person
    const personSavingsMap = new Map<string, CustomAsset[]>();
    savingsAssets.forEach(asset => {
      const list = personSavingsMap.get(asset.ownerId) || [];
      list.push(asset);
      personSavingsMap.set(asset.ownerId, list);
    });

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse table-fixed">
          <thead className="bg-muted/40 font-semibold text-muted-foreground border-b uppercase tracking-wider">
            <tr>
              <th className="px-3.5 py-2.5 w-44">Institution / Bank</th>
              <th className="px-3.5 py-2.5 w-36">Account / Ref #</th>
              <th className="px-3.5 py-2.5 text-right w-32">Current Balance</th>
              <th className="px-3.5 py-2.5 text-right w-24">Interest Rate</th>
              <th className="px-3.5 py-2.5 w-44">Last Updated</th>
              <th className="px-3.5 py-2.5 w-48">Notes</th>
              <th className="px-3.5 py-2.5 text-center w-20">Actions</th>
            </tr>
          </thead>
          <tbody>
            {Array.from(personSavingsMap.entries()).map(([ownerId, assets]) => {
              const ownerName = people.find(p => p.id === ownerId)?.name || ownerId;
              const subtotal = assets.reduce((s, a) => s + (a.currentValue || 0), 0);

              return (
                <Fragment key={`person-group-${ownerId}`}>
                  {/* Full-bleed Person Subheader Row */}
                  <tr className="bg-muted/30 border-y font-bold text-foreground">
                    <td colSpan={7} className="px-4 py-2.5 bg-muted/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="h-5 w-5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                            <User className="h-3 w-3 shrink-0" />
                          </div>
                          <span className="text-xs font-bold text-foreground">{ownerName}</span>
                          <Badge variant="outline" className="text-[10px] font-normal px-2 py-0 bg-background">
                            {assets.length} {assets.length === 1 ? 'account' : 'accounts'}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-[11px] text-muted-foreground font-medium">Subtotal:</span>
                          <span className="text-xs font-extrabold text-foreground font-mono">
                            {formatCurrency(subtotal)}
                          </span>
                        </div>
                      </div>
                    </td>
                  </tr>
                  {/* Account Rows for this Person */}
                  {assets.map(asset => renderAssetRow(asset, { showOwnerColumn: false, showMaturityColumn: false }))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // Section 2: Fixed Deposits Master Table with Seamless Sub-Header Rows
  const renderFdSection = () => {
    if (fdAssets.all.length === 0) {
      return <div className="py-6 text-center text-xs text-muted-foreground">No Fixed Deposits matching filter.</div>;
    }

    const subGroups = [
      {
        key: "postoffice",
        title: "📮 Post Office FDs & NSC",
        icon: Mail,
        iconColor: "text-amber-600 dark:text-amber-400",
        items: fdAssets.postOffice
      },
      {
        key: "mobikwik",
        title: "📱 Mobikwik Fixed Deposits",
        icon: Smartphone,
        iconColor: "text-indigo-600 dark:text-indigo-400",
        items: fdAssets.mobikwik
      },
      {
        key: "bankfds",
        title: "🏢 Bank Fixed Deposits (IDFC, Kotak, SBI, ICICI)",
        icon: Building2,
        iconColor: "text-blue-600 dark:text-blue-400",
        items: fdAssets.bankFds
      }
    ].filter(g => g.items.length > 0);

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse table-fixed">
          {/* SINGLE MASTER HEADER (NON-STICKY) */}
          <thead className="bg-muted/40 font-semibold text-muted-foreground border-b uppercase tracking-wider">
            <tr>
              <th className="px-3.5 py-2.5 w-32">Owner</th>
              <th className="px-3.5 py-2.5 w-44">Institution / Bank</th>
              <th className="px-3.5 py-2.5 w-36">Account / Ref #</th>
              <th className="px-3.5 py-2.5 text-right w-32">Current Value</th>
              <th className="px-3.5 py-2.5 text-right w-24">Interest Rate</th>
              <th className="px-3.5 py-2.5 w-28">Maturity Date</th>
              <th className="px-3.5 py-2.5 w-44">Last Updated</th>
              <th className="px-3.5 py-2.5 w-48">Notes</th>
              <th className="px-3.5 py-2.5 text-center w-20">Actions</th>
            </tr>
          </thead>
          <tbody>
            {subGroups.map(group => {
              const groupTotal = group.items.reduce((s, a) => s + (a.currentValue || 0), 0);
              const IconComp = group.icon;

              return (
                <Fragment key={`fd-subgroup-${group.key}`}>
                  {/* Full-bleed Category Divider Subheader Row */}
                  <tr className="bg-muted/40 border-y font-bold text-foreground">
                    <td colSpan={9} className="px-4 py-2.5 bg-muted/40">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <IconComp className={`h-4 w-4 ${group.iconColor}`} />
                          <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                            {group.title} ({group.items.length})
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-[11px] text-muted-foreground font-medium">Subtotal:</span>
                          <span className="text-xs font-extrabold text-foreground font-mono">
                            {formatCurrency(groupTotal)}
                          </span>
                        </div>
                      </div>
                    </td>
                  </tr>
                  {/* FD Rows for this Sub-group */}
                  {group.items.map(asset => renderAssetRow(asset, { showOwnerColumn: true, showMaturityColumn: true }))}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // Section 3: Retirement Funds Table (Non-sticky, no Category column)
  const renderRetirementSection = () => {
    if (retirementAssets.length === 0) {
      return <div className="py-6 text-center text-xs text-muted-foreground">No Retirement Funds matching filter.</div>;
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse table-fixed">
          <thead className="bg-muted/40 font-semibold text-muted-foreground border-b uppercase tracking-wider">
            <tr>
              <th className="px-3.5 py-2.5 w-32">Owner</th>
              <th className="px-3.5 py-2.5 w-44">Institution / Fund</th>
              <th className="px-3.5 py-2.5 w-36">Account / PRAN #</th>
              <th className="px-3.5 py-2.5 text-right w-32">Current Value</th>
              <th className="px-3.5 py-2.5 text-right w-24">Interest Rate</th>
              <th className="px-3.5 py-2.5 w-44">Last Updated</th>
              <th className="px-3.5 py-2.5 w-48">Notes</th>
              <th className="px-3.5 py-2.5 text-center w-20">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {retirementAssets.map(asset => renderAssetRow(asset, { showOwnerColumn: true, showMaturityColumn: false }))}
          </tbody>
        </table>
      </div>
    );
  };

  // Person-Wise View Mode: Group Entire Portfolio by Member
  const renderEntirePersonWiseSection = () => {
    return (
      <div className="space-y-6">
        {people.map((person) => {
          const personAssets = filteredAssets.filter(a => a.ownerId === person.id);
          if (personAssets.length === 0) return null;

          const pSavings = personAssets.filter(a => a.category === "Savings Account");
          const pFds = personAssets.filter(a => a.category === "FD");
          const pRetirement = personAssets.filter(a => a.category === "NPS" || a.category === "PPF" || a.category === "EPF");
          const pTotal = personAssets.reduce((sum, a) => sum + (a.currentValue || 0), 0);

          return (
            <Card key={person.id} className="overflow-hidden shadow-2xs border-indigo-500/20">
              <CardHeader className="py-3 px-5 border-b bg-indigo-500/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="h-7 w-7 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                      {person.name.charAt(0)}
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold">{person.name}</CardTitle>
                      <p className="text-[11px] text-muted-foreground">
                        {personAssets.length} fixed & custom accounts
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground mr-2 font-medium">Member Total:</span>
                    <span className="text-base font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">
                      {formatCurrency(pTotal)}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0 divide-y">
                {pSavings.length > 0 && (
                  <div>
                    <div className="bg-emerald-500/5 px-4 py-2 flex items-center justify-between border-b">
                      <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                        <Wallet className="h-3.5 w-3.5" /> Savings Accounts ({pSavings.length})
                      </span>
                      <span className="text-xs font-bold text-foreground font-mono">
                        {formatCurrency(pSavings.reduce((s, a) => s + a.currentValue, 0))}
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse table-fixed">
                        <thead className="bg-muted/40 font-semibold text-muted-foreground border-b uppercase">
                          <tr>
                            <th className="px-3.5 py-2 w-44">Institution</th>
                            <th className="px-3.5 py-2 w-36">Account #</th>
                            <th className="px-3.5 py-2 text-right w-32">Current Balance</th>
                            <th className="px-3.5 py-2 text-right w-24">Interest</th>
                            <th className="px-3.5 py-2 w-44">Last Updated</th>
                            <th className="px-3.5 py-2 w-48">Notes</th>
                            <th className="px-3.5 py-2 text-center w-20">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {pSavings.map(asset => renderAssetRow(asset, { showOwnerColumn: false, showMaturityColumn: false }))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {pFds.length > 0 && (
                  <div>
                    <div className="bg-blue-500/5 px-4 py-2 flex items-center justify-between border-b">
                      <span className="text-xs font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1.5">
                        <Landmark className="h-3.5 w-3.5" /> Fixed Deposits ({pFds.length})
                      </span>
                      <span className="text-xs font-bold text-foreground font-mono">
                        {formatCurrency(pFds.reduce((s, a) => s + a.currentValue, 0))}
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse table-fixed">
                        <thead className="bg-muted/40 font-semibold text-muted-foreground border-b uppercase">
                          <tr>
                            <th className="px-3.5 py-2 w-44">Institution</th>
                            <th className="px-3.5 py-2 w-36">Account #</th>
                            <th className="px-3.5 py-2 text-right w-32">Current Value</th>
                            <th className="px-3.5 py-2 text-right w-24">Interest</th>
                            <th className="px-3.5 py-2 w-28">Maturity Date</th>
                            <th className="px-3.5 py-2 w-44">Last Updated</th>
                            <th className="px-3.5 py-2 w-48">Notes</th>
                            <th className="px-3.5 py-2 text-center w-20">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {pFds.map(asset => renderAssetRow(asset, { showOwnerColumn: false, showMaturityColumn: true }))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {pRetirement.length > 0 && (
                  <div>
                    <div className="bg-purple-500/5 px-4 py-2 flex items-center justify-between border-b">
                      <span className="text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                        <PiggyBank className="h-3.5 w-3.5" /> Pension & Provident Funds ({pRetirement.length})
                      </span>
                      <span className="text-xs font-bold text-foreground font-mono">
                        {formatCurrency(pRetirement.reduce((s, a) => s + a.currentValue, 0))}
                      </span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse table-fixed">
                        <thead className="bg-muted/40 font-semibold text-muted-foreground border-b uppercase">
                          <tr>
                            <th className="px-3.5 py-2 w-44">Institution</th>
                            <th className="px-3.5 py-2 w-36">Account #</th>
                            <th className="px-3.5 py-2 text-right w-32">Current Value</th>
                            <th className="px-3.5 py-2 text-right w-24">Interest</th>
                            <th className="px-3.5 py-2 w-44">Last Updated</th>
                            <th className="px-3.5 py-2 w-48">Notes</th>
                            <th className="px-3.5 py-2 text-center w-20">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {pRetirement.map(asset => renderAssetRow(asset, { showOwnerColumn: false, showMaturityColumn: false }))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Bank, FD & Pension Assets</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Categorized savings accounts, fixed deposits, and pension/provident funds per family member.
          </p>
        </div>
        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          <Select
            onValueChange={(val) => {
              if (val === "EXPORT") handleDownloadJSON();
              if (val === "IMPORT") fileInputRef.current?.click();
              if (val === "TEMPLATE") window.open("/api/upload-reports?template=bank-fd", "_blank");
            }}
          >
            <SelectTrigger className="h-8 text-xs w-[160px] bg-background border-dashed">
              <SelectValue placeholder="Backup & Restore" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EXPORT" className="text-xs">
                <div className="flex items-center gap-1.5">
                  <Download className="h-3.5 w-3.5 text-blue-600" />
                  <span>Export Backup JSON</span>
                </div>
              </SelectItem>
              <SelectItem value="IMPORT" className="text-xs">
                <div className="flex items-center gap-1.5">
                  <Upload className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Import Backup JSON</span>
                </div>
              </SelectItem>
              <SelectItem value="TEMPLATE" className="text-xs">
                <div className="flex items-center gap-1.5">
                  <FileSpreadsheet className="h-3.5 w-3.5 text-amber-600" />
                  <span>Bank & FD Template</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".json"
            className="hidden"
          />
          <Button onClick={handleOpenAddModal} className="h-8 text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700">
            <Plus className="h-3.5 w-3.5" /> Add Custom Asset
          </Button>
        </div>
      </div>

      {/* Top Categorized Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="bg-card shadow-2xs border-emerald-500/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                1. Savings Accounts
              </p>
              <h3 className="text-xl font-extrabold mt-1 text-foreground font-mono">{formatCurrency(metrics.savingsTotal)}</h3>
            </div>
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
              <Wallet className="h-4.5 w-4.5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-2xs border-blue-500/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                2. Fixed Deposits (FDs)
              </p>
              <h3 className="text-xl font-extrabold mt-1 text-foreground font-mono">{formatCurrency(metrics.fdTotal)}</h3>
            </div>
            <div className="h-9 w-9 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
              <Landmark className="h-4.5 w-4.5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-2xs border-purple-500/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                3. Pension & Provident
              </p>
              <h3 className="text-xl font-extrabold mt-1 text-foreground font-mono">{formatCurrency(metrics.retirementTotal)}</h3>
            </div>
            <div className="h-9 w-9 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
              <PiggyBank className="h-4.5 w-4.5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-2xs border-indigo-500/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                Total Fixed Assets
              </p>
              <h3 className="text-xl font-extrabold mt-1 text-indigo-600 dark:text-indigo-400 font-mono">{formatCurrency(metrics.grandTotal)}</h3>
            </div>
            <div className="h-9 w-9 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
              <Building2 className="h-4.5 w-4.5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls Bar: Grouping Mode Toggle, Search & Filters */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-muted/20 p-2.5 rounded-xl border border-border/60">
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          {/* Grouping Mode Pill Toggle */}
          <div className="flex items-center p-0.5 bg-muted/60 rounded-lg border border-border/50 text-xs">
            <button
              onClick={() => setGroupingMode("CATEGORY")}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-md transition-all font-medium ${groupingMode === "CATEGORY"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <Building2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>Asset Category</span>
            </button>
            <button
              onClick={() => setGroupingMode("PERSON")}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-md transition-all font-medium ${groupingMode === "PERSON"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground"
                }`}
            >
              <Users className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Person-Wise</span>
            </button>
          </div>

          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search bank, account, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-xs bg-background"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={selectedCategory} onValueChange={(val) => setSelectedCategory(val || "ALL")}>
            <SelectTrigger className="h-8 text-xs w-[160px] bg-background">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Categories</SelectItem>
              <SelectItem value="Savings Account">Savings Accounts</SelectItem>
              <SelectItem value="FD">Fixed Deposits (FD)</SelectItem>
              <SelectItem value="NPS">NPS</SelectItem>
              <SelectItem value="PPF">PPF</SelectItem>
              <SelectItem value="EPF">EPF</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedOwner} onValueChange={(val) => setSelectedOwner(val || "ALL")}>
            <SelectTrigger className="h-8 text-xs w-[160px] bg-background">
              <SelectValue placeholder="All Members" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Family Members</SelectItem>
              {people.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* RENDER BY GROUPING MODE */}
      {groupingMode === "PERSON" ? (
        renderEntirePersonWiseSection()
      ) : (
        <>
          {/* ── SECTION 1: SAVINGS ACCOUNTS (SEAMLESS PERSON SUB-HEADERS) ───────────────── */}
          {(selectedCategory === "ALL" || selectedCategory === "Savings Account") && (
            <Card className="overflow-hidden shadow-2xs border-emerald-500/20">
              <CardHeader className="py-3 px-5 border-b bg-emerald-500/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Wallet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <CardTitle className="text-base font-bold">1. Savings Accounts</CardTitle>
                    <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-none">
                      {savingsAssets.length} Accounts
                    </Badge>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground mr-2 font-medium">Section Total:</span>
                    <span className="text-sm font-extrabold text-foreground font-mono">
                      {formatCurrency(savingsAssets.reduce((s, a) => s + a.currentValue, 0))}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {renderSavingsSection()}
              </CardContent>
            </Card>
          )}

          {/* ── SECTION 2: FIXED DEPOSITS (FDs) MASTER UNIFIED TABLE ───────────────────── */}
          {(selectedCategory === "ALL" || selectedCategory === "FD") && (
            <Card className="overflow-hidden shadow-2xs border-blue-500/20">
              <CardHeader className="py-3 px-5 border-b bg-blue-500/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Landmark className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <CardTitle className="text-base font-bold">2. Fixed Deposits (FDs) & Term Deposits</CardTitle>
                    <Badge variant="secondary" className="text-[10px] bg-blue-500/10 text-blue-700 dark:text-blue-300 border-none">
                      {fdAssets.all.length} FDs
                    </Badge>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground mr-2 font-medium">Section Total:</span>
                    <span className="text-sm font-extrabold text-foreground font-mono">
                      {formatCurrency(fdAssets.all.reduce((s, a) => s + a.currentValue, 0))}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {renderFdSection()}
              </CardContent>
            </Card>
          )}

          {/* ── SECTION 3: RETIREMENT & PENSION FUNDS (UNIFIED TABLE) ────────────────── */}
          {(selectedCategory === "ALL" || selectedCategory === "NPS" || selectedCategory === "PPF" || selectedCategory === "EPF") && (
            <Card className="overflow-hidden shadow-2xs border-purple-500/20">
              <CardHeader className="py-3 px-5 border-b bg-purple-500/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <PiggyBank className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <CardTitle className="text-base font-bold">3. Retirement & Pension Funds (NPS, PPF, EPF)</CardTitle>
                    <Badge variant="secondary" className="text-[10px] bg-purple-500/10 text-purple-700 dark:text-purple-300 border-none">
                      {retirementAssets.length} Accounts
                    </Badge>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground mr-2 font-medium">Section Total:</span>
                    <span className="text-sm font-extrabold text-foreground font-mono">
                      {formatCurrency(retirementAssets.reduce((s, a) => s + a.currentValue, 0))}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {renderRetirementSection()}
              </CardContent>
            </Card>
          )}

          {/* Other Assets (if any) */}
          {otherAssets.length > 0 && (
            <Card className="overflow-hidden shadow-2xs border-slate-500/20">
              <CardHeader className="py-3 px-5 border-b bg-slate-500/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <ShieldCheck className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                    <CardTitle className="text-base font-bold">4. Other Custom Assets</CardTitle>
                  </div>
                  <span className="text-sm font-extrabold text-foreground font-mono">
                    {formatCurrency(otherAssets.reduce((s, a) => s + a.currentValue, 0))}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse table-fixed">
                    <thead className="bg-muted/40 font-semibold text-muted-foreground border-b uppercase">
                      <tr>
                        <th className="px-3.5 py-2.5 w-32">Owner</th>
                        <th className="px-3.5 py-2.5 w-44">Institution</th>
                        <th className="px-3.5 py-2.5 w-36">Account #</th>
                        <th className="px-3.5 py-2.5 text-right w-32">Current Value</th>
                        <th className="px-3.5 py-2.5 text-right w-24">Interest</th>
                        <th className="px-3.5 py-2.5 w-32">Last Updated</th>
                        <th className="px-3.5 py-2.5 w-48">Notes</th>
                        <th className="px-3.5 py-2.5 text-center w-20">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {otherAssets.map(asset => renderAssetRow(asset, { showOwnerColumn: true, showMaturityColumn: false }))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Add / Edit Asset Modal Dialog */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editingAsset ? "Edit Custom Asset" : "Add Custom Asset"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveAsset} className="space-y-4 py-2">
            {/* Owner Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Owner / Member *</label>
              <Select
                value={formData.ownerId}
                onValueChange={(val) => { if (val) setFormData(prev => ({ ...prev, ownerId: val })); }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Member" />
                </SelectTrigger>
                <SelectContent>
                  {people.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Asset Category */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Asset Category *</label>
              <Select
                value={formData.category}
                onValueChange={(val) => { if (val) setFormData(prev => ({ ...prev, category: val as CustomAssetCategory })); }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FD">Fixed Deposit (FD)</SelectItem>
                  <SelectItem value="Savings Account">Savings Account</SelectItem>
                  <SelectItem value="NPS">National Pension System (NPS)</SelectItem>
                  <SelectItem value="PPF">Public Provident Fund (PPF)</SelectItem>
                  <SelectItem value="EPF">Employee Provident Fund (EPF)</SelectItem>
                  <SelectItem value="Other">Other Fixed Investment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bank / Institution */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Bank / Institution Name *</label>
              <Input
                placeholder="e.g. Post Office, Mobikwik, IDFC First, ICICI, SBI"
                value={formData.institution}
                onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                required
              />
            </div>

            {/* Account / Ref Number */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Account / Reference Number</label>
              <Input
                placeholder="e.g. 20044067387, Folio No."
                value={formData.accountNumber}
                onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
              />
            </div>

            {/* Single Current Balance / Amount Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Current Balance / Amount (₹) *</label>
              <Input
                type="number"
                placeholder="e.g. 124770"
                value={formData.currentValue || formData.investedValue}
                onChange={(e) => setFormData({ ...formData, currentValue: e.target.value, investedValue: e.target.value })}
                required
              />
            </div>

            {/* Minimum Required Balance for Savings Accounts */}
            {formData.category === "Savings Account" && (
              <div className="space-y-1.5 p-2.5 rounded-lg bg-rose-500/5 border border-rose-500/20">
                <label className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span>Minimum Required Balance (₹)</span>
                  <span className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">(Triggers alert if balance drops below)</span>
                </label>
                <Input
                  type="number"
                  placeholder="e.g. 25000 (IDFC), 10000 (ICICI/Kotak), 5000 (Union)"
                  value={formData.minimumBalance}
                  onChange={(e) => setFormData({ ...formData, minimumBalance: e.target.value })}
                  className="bg-background"
                />
              </div>
            )}

            {/* Interest Rate & Maturity */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Interest Rate (% p.a.)</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 7.25"
                  value={formData.interestRate}
                  onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Maturity Type</label>
                <Select
                  value={formData.maturityType}
                  onValueChange={(val) => { if (val) setFormData(prev => ({ ...prev, maturityType: val as "DATE" | "INDEFINITE" })); }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DATE">Specific Date</SelectItem>
                    <SelectItem value="INDEFINITE">Indefinite / N/A</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.maturityType === "DATE" && (
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Maturity Date</label>
                <Input
                  type="date"
                  value={formData.maturityDate}
                  onChange={(e) => setFormData({ ...formData, maturityDate: e.target.value })}
                />
              </div>
            )}

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Notes / Remarks</label>
              <Input
                placeholder="e.g. SIP 70000, NSC, UPI / Salary"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
                {editingAsset ? "Save Changes" : "Add Asset"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
