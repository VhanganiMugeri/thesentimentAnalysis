import { useMemo } from "react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, MessageSquare, Sparkles, AlertTriangle, ThumbsUp } from "lucide-react";
import type { ParsedReview } from "./FileUpload";
import { analyzeSentiment, isNegativeWord, isPositiveWord, topWords, type Sentiment } from "@/lib/sentiment";
import { LivePrediction } from "./LivePrediction";
import { WordCloud } from "./WordCloud";

interface Props {
  reviews: ParsedReview[];
  fileName: string;
  onReset: () => void;
}

const COLORS: Record<Sentiment, string> = {
  positive: "oklch(0.74 0.18 155)",
  negative: "oklch(0.68 0.22 25)",
  neutral: "oklch(0.75 0.15 80)",
};

export function Dashboard({ reviews, fileName, onReset }: Props) {
  const analyzed = useMemo(
    () => reviews.map((r) => ({ ...r, ...analyzeSentiment(r.text, r.rating) })),
    [reviews],
  );

  const stats = useMemo(() => {
    const counts = { positive: 0, negative: 0, neutral: 0 };
    for (const a of analyzed) counts[a.sentiment]++;
    const total = analyzed.length;
    return {
      total,
      positive: counts.positive,
      negative: counts.negative,
      neutral: counts.neutral,
      pPct: ((counts.positive / total) * 100).toFixed(1),
      nPct: ((counts.negative / total) * 100).toFixed(1),
      uPct: ((counts.neutral / total) * 100).toFixed(1),
      avgRating: (
        analyzed.filter((a) => typeof a.rating === "number").reduce((s, a) => s + (a.rating ?? 0), 0) /
        Math.max(1, analyzed.filter((a) => typeof a.rating === "number").length)
      ).toFixed(2),
    };
  }, [analyzed]);

  const pieData = [
    { name: "Positive", value: stats.positive, color: COLORS.positive },
    { name: "Neutral", value: stats.neutral, color: COLORS.neutral },
    { name: "Negative", value: stats.negative, color: COLORS.negative },
  ];

  const brandData = useMemo(() => {
    const map = new Map<string, { brand: string; positive: number; negative: number; neutral: number }>();
    for (const a of analyzed) {
      const b = a.brand || "Unknown";
      const e = map.get(b) ?? { brand: b, positive: 0, negative: 0, neutral: 0 };
      e[a.sentiment]++;
      map.set(b, e);
    }
    return Array.from(map.values())
      .sort((x, y) => (y.positive + y.negative + y.neutral) - (x.positive + x.negative + x.neutral))
      .slice(0, 8);
  }, [analyzed]);

  const ratingTrend = useMemo(() => {
    const buckets = [1, 2, 3, 4, 5].map((r) => ({ rating: `${r}★`, positive: 0, negative: 0, neutral: 0 }));
    for (const a of analyzed) {
      if (typeof a.rating !== "number") continue;
      const idx = Math.min(4, Math.max(0, Math.round(a.rating) - 1));
      buckets[idx][a.sentiment]++;
    }
    return buckets;
  }, [analyzed]);

  const positiveTexts = analyzed.filter((a) => a.sentiment === "positive").map((a) => a.text);
  const negativeTexts = analyzed.filter((a) => a.sentiment === "negative").map((a) => a.text);
  const topPositive = useMemo(() => topWords(positiveTexts, isPositiveWord, 18), [positiveTexts]);
  const topNegative = useMemo(() => topWords(negativeTexts, isNegativeWord, 18), [negativeTexts]);

  const insights = useMemo(() => generateInsights(stats, topPositive, topNegative, brandData), [stats, topPositive, topNegative, brandData]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Analyzing</p>
          <h2 className="text-2xl font-semibold">{fileName}</h2>
        </div>
        <button
          onClick={onReset}
          className="rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-secondary"
        >
          Upload new dataset
        </button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi icon={<MessageSquare className="h-5 w-5" />} label="Total Reviews" value={stats.total} accent="primary" />
        <Kpi icon={<TrendingUp className="h-5 w-5" />} label="Positive" value={`${stats.pPct}%`} accent="positive" sub={`${stats.positive} reviews`} />
        <Kpi icon={<Minus className="h-5 w-5" />} label="Neutral" value={`${stats.uPct}%`} accent="neutral" sub={`${stats.neutral} reviews`} />
        <Kpi icon={<TrendingDown className="h-5 w-5" />} label="Negative" value={`${stats.nPct}%`} accent="negative" sub={`${stats.negative} reviews`} />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Card title="Sentiment Distribution" className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={3}>
                {pieData.map((d) => <Cell key={d.name} fill={d.color} stroke="none" />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ color: "var(--color-muted-foreground)" }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Sentiment by Rating" className="lg:col-span-3">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={ratingTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="rating" stroke="var(--color-muted-foreground)" />
              <YAxis stroke="var(--color-muted-foreground)" />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Bar dataKey="positive" stackId="a" fill={COLORS.positive} radius={[0, 0, 0, 0]} />
              <Bar dataKey="neutral" stackId="a" fill={COLORS.neutral} />
              <Bar dataKey="negative" stackId="a" fill={COLORS.negative} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Brand breakdown */}
      <Card title="Top Brands — Sentiment Breakdown">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={brandData} layout="vertical" margin={{ left: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis type="number" stroke="var(--color-muted-foreground)" />
            <YAxis type="category" dataKey="brand" stroke="var(--color-muted-foreground)" width={110} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend />
            <Bar dataKey="positive" stackId="a" fill={COLORS.positive} />
            <Bar dataKey="neutral" stackId="a" fill={COLORS.neutral} />
            <Bar dataKey="negative" stackId="a" fill={COLORS.negative} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Word clouds */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Top Praised Features" icon={<ThumbsUp className="h-4 w-4 text-[var(--positive)]" />}>
          <WordCloud words={topPositive} color="positive" />
        </Card>
        <Card title="Common Complaints" icon={<AlertTriangle className="h-4 w-4 text-[var(--negative)]" />}>
          <WordCloud words={topNegative} color="negative" />
        </Card>
      </div>

      {/* AI insights */}
      <Card title="AI-Generated Business Insights" icon={<Sparkles className="h-4 w-4 text-primary" />}>
        <ul className="space-y-3">
          {insights.map((ins, i) => (
            <li key={i} className="flex gap-3 rounded-lg bg-secondary/40 p-4">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                {i + 1}
              </span>
              <p className="text-sm leading-relaxed">{ins}</p>
            </li>
          ))}
        </ul>
      </Card>

      {/* Live prediction */}
      <LivePrediction />
    </div>
  );
}

const tooltipStyle = {
  backgroundColor: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: "8px",
  color: "var(--color-foreground)",
};

function Card({ title, icon, children, className = "" }: { title: string; icon?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)] ${className}`}>
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Kpi({ icon, label, value, sub, accent }: { icon: React.ReactNode; label: string; value: string | number; sub?: string; accent: "primary" | "positive" | "negative" | "neutral" }) {
  const colorMap = {
    primary: "text-primary bg-primary/15",
    positive: "text-[var(--positive)] bg-[color-mix(in_oklab,var(--positive)_18%,transparent)]",
    negative: "text-[var(--negative)] bg-[color-mix(in_oklab,var(--negative)_18%,transparent)]",
    neutral: "text-[var(--neutral)] bg-[color-mix(in_oklab,var(--neutral)_18%,transparent)]",
  };
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-bold">{value}</p>
          {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${colorMap[accent]}`}>{icon}</div>
      </div>
    </div>
  );
}

function generateInsights(
  stats: { total: number; pPct: string; nPct: string; uPct: string; avgRating: string; positive: number; negative: number },
  topPos: Array<{ word: string; count: number }>,
  topNeg: Array<{ word: string; count: number }>,
  brands: Array<{ brand: string; positive: number; negative: number; neutral: number }>,
): string[] {
  const out: string[] = [];
  const pPct = Number(stats.pPct);
  out.push(
    `Overall customer satisfaction is ${pPct >= 70 ? "strong" : pPct >= 50 ? "moderate" : "concerning"}: ${stats.pPct}% of ${stats.total} reviews are positive with an average rating of ${stats.avgRating}/5.`,
  );
  if (topPos.length) {
    out.push(`Customers most consistently praise these qualities: ${topPos.slice(0, 5).map((w) => w.word).join(", ")}. Consider highlighting these strengths in marketing copy.`);
  }
  if (topNeg.length) {
    out.push(`Recurring complaint themes center on: ${topNeg.slice(0, 5).map((w) => w.word).join(", ")}. Prioritizing fixes here would directly lift CSAT.`);
  } else {
    out.push(`No dominant complaint pattern detected — negative reviews appear scattered rather than systemic.`);
  }
  if (brands.length > 1) {
    const ranked = [...brands].sort((a, b) => {
      const ar = a.positive / Math.max(1, a.positive + a.negative + a.neutral);
      const br = b.positive / Math.max(1, b.positive + b.negative + b.neutral);
      return br - ar;
    });
    const best = ranked[0];
    const worst = ranked[ranked.length - 1];
    out.push(`Brand performance ranges from "${best.brand}" (top sentiment) to "${worst.brand}" (lowest) — useful for vendor scorecards and supply decisions.`);
  }
  if (Number(stats.nPct) > 20) {
    out.push(`Negative sentiment exceeds 20% — recommend a deep-dive root-cause analysis on the bottom-rated SKUs and a proactive outreach campaign for affected customers.`);
  } else {
    out.push(`Negative sentiment remains below 20% — current quality control and support workflows appear effective; maintain monitoring cadence.`);
  }
  return out;
}
