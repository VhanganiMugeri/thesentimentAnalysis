import { useCallback, useState } from "react";
import Papa from "papaparse";
import { Upload, FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ParsedReview {
  text: string;
  rating?: number;
  brand?: string;
  name?: string;
}

interface Props {
  onData: (rows: ParsedReview[], fileName: string) => void;
}

const REVIEW_HINTS = ["review", "text", "content", "body", "comment", "feedback", "opinion", "message", "description", "tweet", "post"];
const RATING_HINTS = ["rating", "stars", "score", "rate"];
const BRAND_HINTS = ["brand", "manufacturer", "company", "vendor"];
const NAME_HINTS = ["product", "name", "title", "item"];

function findCol(keys: string[], hints: string[]): string | undefined {
  // exact match first
  for (const h of hints) {
    const exact = keys.find((k) => k.toLowerCase().trim() === h);
    if (exact) return exact;
  }
  // partial/substring
  for (const h of hints) {
    const partial = keys.find((k) => k.toLowerCase().includes(h));
    if (partial) return partial;
  }
  return undefined;
}

function pickVal(row: Record<string, unknown>, col?: string): string | undefined {
  if (!col) return undefined;
  const v = row[col];
  if (v == null) return undefined;
  const s = String(v).trim();
  return s ? s : undefined;
}

function detectTextColumn(rows: Record<string, unknown>[], keys: string[]): string | undefined {
  // try hint-based first
  const hinted = findCol(keys, REVIEW_HINTS);
  if (hinted) return hinted;
  // fallback: pick the string column with the longest average length
  const sample = rows.slice(0, 50);
  let best: { col: string; avg: number } | null = null;
  for (const k of keys) {
    let total = 0;
    let count = 0;
    for (const r of sample) {
      const v = r[k];
      if (typeof v === "string" || typeof v === "number") {
        const s = String(v).trim();
        if (s) { total += s.length; count++; }
      }
    }
    const avg = count > 0 ? total / count : 0;
    // must look like prose (avg length > 20 chars)
    if (avg > 20 && (!best || avg > best.avg)) best = { col: k, avg };
  }
  return best?.col;
}

export function FileUpload({ onData }: Props) {
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      setError(null);
      setLoading(true);
      Papa.parse<Record<string, unknown>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          const data = result.data.filter((r) => r && typeof r === "object");
          const keys = data.length ? Object.keys(data[0]) : [];
          const textCol = detectTextColumn(data, keys);
          if (!textCol) {
            setLoading(false);
            setError(`No review text column detected. Columns found: ${keys.join(", ") || "none"}.`);
            return;
          }
          const ratingCol = findCol(keys, RATING_HINTS);
          const brandCol = findCol(keys, BRAND_HINTS);
          const nameCol = findCol(keys, NAME_HINTS);
          const rows: ParsedReview[] = [];
          for (const row of data) {
            const text = pickVal(row, textCol);
            if (!text) continue;
            const ratingStr = pickVal(row, ratingCol);
            const ratingNum = ratingStr ? Number(ratingStr) : undefined;
            rows.push({
              text,
              rating: ratingNum !== undefined && !Number.isNaN(ratingNum) ? ratingNum : undefined,
              brand: pickVal(row, brandCol),
              name: pickVal(row, nameCol),
            });
          }
          setLoading(false);
          if (rows.length === 0) {
            setError(`Detected column "${textCol}" but no non-empty rows found.`);
            return;
          }
          onData(rows, file.name);
        },
        error: (err) => {
          setLoading(false);
          setError(err.message);
        },
      });
    },
    [onData],
  );

  const loadSample = async () => {
    setLoading(true);
    try {
      const res = await fetch("/sample-reviews.csv");
      const blob = await res.blob();
      handleFile(new File([blob], "sample-reviews.csv", { type: "text/csv" }));
    } catch (e) {
      setLoading(false);
      setError("Failed to load sample dataset.");
    }
  };

  return (
    <div className="w-full">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f) handleFile(f);
        }}
        className={cn(
          "relative rounded-2xl border-2 border-dashed p-12 text-center transition-all",
          "bg-card/40 backdrop-blur-sm",
          dragging ? "border-primary bg-primary/5 scale-[1.01]" : "border-border hover:border-primary/50",
        )}
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          {loading ? <FileText className="h-7 w-7 animate-pulse" /> : <Upload className="h-7 w-7" />}
        </div>
        <h3 className="text-lg font-semibold">Drop your CSV dataset here</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Or click to browse. We'll auto-detect the review and rating columns.
        </p>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); loadSample(); }}
            className="relative z-10 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90"
          >
            Try sample dataset
          </button>
          <span className="text-xs text-muted-foreground">500 electronics reviews</span>
        </div>
      </div>
      {error && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <X className="h-4 w-4" /> {error}
        </div>
      )}
    </div>
  );
}
