import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { predictSentimentAI } from "@/lib/ai-sentiment.functions";
import { analyzeSentiment } from "@/lib/sentiment";

type Result = {
  sentiment: "positive" | "negative" | "neutral";
  confidence: number;
  explanation: string;
};

const EXAMPLES = [
  "This laptop is amazing and incredibly fast!",
  "Terrible build quality. Stopped working after a week.",
  "It's okay. Does what it says, nothing more.",
];

export function LivePrediction() {
  const predict = useServerFn(predictSentimentAI);
  const [text, setText] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await predict({ data: { text } });
      setResult(r);
    } catch (e) {
      // Fallback to local lexicon analyzer
      const local = analyzeSentiment(text);
      setResult({
        sentiment: local.sentiment,
        confidence: local.confidence,
        explanation: `(Local analysis) Detected ${local.positiveHits.length} positive and ${local.negativeHits.length} negative signals.`,
      });
      setError(e instanceof Error ? e.message : "AI unavailable — used local model.");
    } finally {
      setLoading(false);
    }
  };

  const colorClass = result
    ? result.sentiment === "positive"
      ? "border-[var(--positive)]/40 bg-[color-mix(in_oklab,var(--positive)_10%,transparent)]"
      : result.sentiment === "negative"
        ? "border-[var(--negative)]/40 bg-[color-mix(in_oklab,var(--negative)_10%,transparent)]"
        : "border-[var(--neutral)]/40 bg-[color-mix(in_oklab,var(--neutral)_10%,transparent)]"
    : "";

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Live AI Prediction</h3>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Type any review and our AI will classify the sentiment with an explanation.
      </p>

      <div className="space-y-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. The screen quality is stunning but battery drains too fast..."
          rows={3}
          className="w-full resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                onClick={() => setText(ex)}
                className="rounded-full border border-border bg-secondary/40 px-3 py-1 text-xs text-muted-foreground transition hover:bg-secondary"
              >
                {ex.slice(0, 32)}…
              </button>
            ))}
          </div>
          <button
            onClick={run}
            disabled={loading || !text.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Analyze
          </button>
        </div>
      </div>

      {result && (
        <div className={`mt-5 rounded-xl border p-5 ${colorClass}`}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Predicted Sentiment</p>
              <p className="mt-1 text-2xl font-bold capitalize">{result.sentiment}</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">Confidence</p>
              <p className="mt-1 text-2xl font-bold">{Math.round(result.confidence * 100)}%</p>
            </div>
          </div>
          {result.explanation && (
            <p className="mt-3 border-t border-border/50 pt-3 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">AI Explanation: </span>
              {result.explanation}
            </p>
          )}
          {error && <p className="mt-2 text-xs text-muted-foreground italic">{error}</p>}
        </div>
      )}
    </div>
  );
}
