import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(val: number) {
  if (isNaN(val) || val === undefined) return "-";
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val);
}

export function formatDateIndian(dateStr?: string): string {
  if (!dateStr || dateStr.toLowerCase() === "indefinite" || dateStr === "N/A") {
    return dateStr || "-";
  }

  const parts = dateStr.trim().split("-");
  if (parts.length === 3 && parts[0].length === 4) {
    const [year, month, day] = parts;
    return `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`;
  }

  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }

  return dateStr;
}

export function getRelativeTimeString(dateStr?: string): { text: string; isStale: boolean } {
  if (!dateStr || dateStr.toLowerCase() === "indefinite" || dateStr === "N/A") {
    return { text: "", isStale: false };
  }

  const dateObj = new Date(dateStr);
  if (isNaN(dateObj.getTime())) return { text: "", isStale: false };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffMs = today.getTime() - dateObj.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return { text: "Today", isStale: false };
  }
  if (diffDays === 1) {
    return { text: "1 day ago", isStale: false };
  }
  if (diffDays < 7) {
    return { text: `${diffDays} days ago`, isStale: false };
  }
  if (diffDays < 30) {
    const wks = Math.floor(diffDays / 7);
    return { text: `${wks} ${wks === 1 ? "wk" : "wks"} ago`, isStale: false };
  }
  if (diffDays < 365) {
    const mos = Math.floor(diffDays / 30);
    return { text: `${mos} ${mos === 1 ? "mo" : "mos"} ago`, isStale: diffDays >= 30 };
  }
  const yrs = Math.floor(diffDays / 365);
  return { text: `${yrs} ${yrs === 1 ? "yr" : "yrs"} ago`, isStale: true };
}

export function normalizeCompanyName(name: string): string {
  if (!name) return "Unknown";

  let normalized = name.toLowerCase();

  // Remove common corporate suffixes
  normalized = normalized.replace(/\b(ltd|limited|inc|corp|corporation|co|company|bank|india|industries)\b/g, '');

  // Strip all non-alphanumeric characters for a clean comparison key
  normalized = normalized.replace(/[^a-z0-9]/g, '');

  // Specific overrides for common mismatches
  if (normalized.startsWith('hdfc') && !normalized.includes('amc') && !normalized.includes('life')) return 'hdfcbank';
  if (normalized.startsWith('icici') && !normalized.includes('pruden') && !normalized.includes('lombard')) return 'icicibank';
  if (normalized.startsWith('tcs') || normalized.includes('tataconsultancy')) return 'tcs';
  if (normalized.startsWith('reliance')) return 'reliance';
  if (normalized.startsWith('infy') || normalized.startsWith('infosys')) return 'infosys';
  if (normalized.startsWith('itc')) return 'itc';
  if (normalized.startsWith('sbi') || (normalized.includes('statebank'))) return 'sbi';
  if (normalized.startsWith('bajajfin')) return 'bajajfinance';
  if (normalized.startsWith('bhartiartl') || normalized.includes('bhartiairtel')) return 'bhartiairtel';
  if (normalized.startsWith('kotak')) return 'kotakbank';
  if (normalized.startsWith('lt') || normalized.includes('larsentoubro') || normalized.includes('larsenandtoubro')) return 'lt';
  if (normalized.startsWith('axis')) return 'axisbank';
  if (normalized.startsWith('asianpaint')) return 'asianpaints';
  if (normalized.startsWith('maruti')) return 'maruti';
  if (normalized.startsWith('sunpharm')) return 'sunpharma';
  if (normalized.startsWith('hindunilvr') || normalized.includes('hindustanunilever')) return 'hindustanunilever';

  return normalized;
}
