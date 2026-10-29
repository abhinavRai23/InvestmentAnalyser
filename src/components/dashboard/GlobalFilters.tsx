"use client";

import { useState, useRef, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Person } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, ChevronDown, UserCheck } from "lucide-react";

interface GlobalFiltersProps {
  people: Person[];
  selectedOwnerIds: string[];
  setSelectedOwnerIds: (ids: string[]) => void;
  assetType: string;
  setAssetType: (value: string) => void;
}

export function GlobalFilters({
  people,
  selectedOwnerIds,
  setSelectedOwnerIds,
  assetType,
  setAssetType,
}: GlobalFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isAllSelected =
    selectedOwnerIds.includes("ALL") ||
    selectedOwnerIds.length === 0 ||
    (people.length > 0 && selectedOwnerIds.length === people.length);

  const getDisplayText = () => {
    if (isAllSelected) return "Entire Family";
    if (selectedOwnerIds.length === 1) {
      const p = people.find((p) => p.id === selectedOwnerIds[0]);
      return p ? p.name : selectedOwnerIds[0];
    }
    const names = selectedOwnerIds
      .map((id) => people.find((p) => p.id === id)?.name || id)
      .join(", ");
    return names.length > 20 ? `${selectedOwnerIds.length} Members` : names;
  };

  // 1-Click Select Person
  const selectSinglePerson = (personId: string) => {
    setSelectedOwnerIds([personId]);
    setIsOpen(false);
  };

  // Select Entire Family
  const selectAll = () => {
    setSelectedOwnerIds(["ALL"]);
    setIsOpen(false);
  };

  // Multi-select toggle checkbox
  const togglePersonCheckbox = (e: React.MouseEvent, personId: string) => {
    e.stopPropagation(); // prevent row click single-select
    let current = isAllSelected ? people.map((p) => p.id) : [...selectedOwnerIds];

    if (current.includes(personId)) {
      current = current.filter((id) => id !== personId);
    } else {
      current.push(personId);
    }

    if (current.length === 0 || current.length === people.length) {
      setSelectedOwnerIds(["ALL"]);
    } else {
      setSelectedOwnerIds(current);
    }
  };

  return (
    <div className="flex items-center space-x-3 flex-wrap gap-y-2">
      {/* Quick 1-Click Family Member Pills */}
      <div className="hidden lg:flex items-center space-x-1.5 bg-muted/40 p-1 rounded-lg border border-border/60">
        <button
          onClick={selectAll}
          className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${isAllSelected
              ? "bg-indigo-600 text-white shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
            }`}
        >
          Entire Family
        </button>
        {people.map((p) => {
          const isSelected = !isAllSelected && selectedOwnerIds.length === 1 && selectedOwnerIds[0] === p.id;
          const firstName = p.name.split(" ")[0];
          return (
            <button
              key={p.id}
              onClick={() => selectSinglePerson(p.id)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${isSelected
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
                }`}
              title={`1-Click Filter for ${p.name}`}
            >
              {firstName}
            </button>
          );
        })}
      </div>

      {/* Multi-Select / Detailed Dropdown */}
      <div className="relative inline-block text-left" ref={containerRef}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="h-8 text-sm px-3 flex items-center space-x-2 border-input bg-background hover:bg-accent hover:text-accent-foreground min-w-[170px] justify-between shadow-xs"
        >
          <div className="flex items-center space-x-2 truncate max-w-[140px]">
            <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="truncate">{getDisplayText()}</span>
          </div>
          <div className="flex items-center space-x-1 shrink-0">
            {!isAllSelected && selectedOwnerIds.length > 1 && (
              <Badge variant="secondary" className="px-1 py-0 text-[10px] h-4">
                {selectedOwnerIds.length}
              </Badge>
            )}
            <ChevronDown className="h-3.5 w-3.5 opacity-50" />
          </div>
        </Button>

        {isOpen && (
          <div className="absolute left-0 mt-1 w-60 rounded-md border border-border bg-popover text-popover-foreground shadow-xl dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700 z-50 p-1.5 space-y-1 animate-in fade-in-80 zoom-in-95">
            <div className="text-[11px] font-semibold text-muted-foreground px-2 pt-1 pb-0.5">
              1-Click Select or Check Multiple:
            </div>

            {/* Entire Family Option */}
            <div
              onClick={selectAll}
              className={`flex items-center justify-between px-2.5 py-1.5 text-sm rounded-md cursor-pointer font-medium transition-colors ${isAllSelected ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 font-semibold" : "hover:bg-accent"
                }`}
            >
              <div className="flex items-center space-x-2.5">
                <Users className="h-4 w-4 text-indigo-500 shrink-0" />
                <span>Entire Family</span>
              </div>
              {isAllSelected && <UserCheck className="h-4 w-4 text-indigo-600" />}
            </div>

            <div className="h-px bg-border my-1" />

            <div className="max-h-56 overflow-y-auto space-y-0.5">
              {people.map((p) => {
                const isSelected = !isAllSelected && selectedOwnerIds.includes(p.id);
                const isSingleSelected = !isAllSelected && selectedOwnerIds.length === 1 && selectedOwnerIds[0] === p.id;

                return (
                  <div
                    key={p.id}
                    onClick={() => selectSinglePerson(p.id)}
                    className={`flex items-center justify-between px-2.5 py-1.5 text-sm rounded-md cursor-pointer group transition-colors ${isSingleSelected
                        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 font-semibold"
                        : "hover:bg-accent"
                      }`}
                  >
                    <div className="flex items-center space-x-2.5 truncate pr-2">
                      <Checkbox
                        checked={isAllSelected || isSelected}
                        onClick={(e) => togglePersonCheckbox(e, p.id)}
                      />
                      <span className="truncate">{p.name}</span>
                    </div>

                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        selectSinglePerson(p.id);
                      }}
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-muted hover:bg-indigo-600 hover:text-white transition-colors shrink-0"
                      title={`1-Click Select Only ${p.name}`}
                    >
                      Only
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Asset Type Selector */}
      <Select value={assetType} onValueChange={(v) => { if (v) setAssetType(v); }}>
        <SelectTrigger className="w-[160px] h-8 text-sm">
          <SelectValue placeholder="All Assets" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Assets</SelectItem>
          <SelectItem value="stock">Direct Stocks</SelectItem>
          <SelectItem value="mutual_fund">Mutual Funds</SelectItem>
          <SelectItem value="gold">Gold</SelectItem>
          <SelectItem value="silver">Silver</SelectItem>
          <SelectItem value="etf">ETFs</SelectItem>
          <SelectItem value="pf">Provident Fund</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
