import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Brain, BarChart3, Sparkles, Zap } from "lucide-react";
import { FileUpload, type ParsedReview } from "@/components/FileUpload";
import { Dashboard } from "@/components/Dashboard";
import { LivePrediction } from "@/components/LivePrediction";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI Sentiment Analysis & Insights Dashboard" },
      {
        name: "description",
        content:
          "Upload customer reviews and instantly get AI-powered sentiment analysis, business insights, and interactive analytics.",
      },
      { property: "og:title", content: "AI Sentiment Analysis Dashboard" },
      { property: "og:description", content: "AI-powered review analytics with live sentiment prediction." },
    ],
  }),
  component: Home,
});

function Home() {
  const [reviews, setReviews] = useState<ParsedReview[] | null>(null);
  const [fileName, setFileName] = useState("");

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Background glow */}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 h-[600px]"
        style={{ background: "var(--gradient-glow)" }}
        aria-hidden
      />

      <header className="relative z-10 border-b border-border/50 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl text-primary-foreground shadow-[var(--shadow-glow)]"
              style={{ background: "var(--gradient-hero)" }}
            >
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold leading-tight">SentimentIQ</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">AI Analytics</p>
            </div>
          </div>
          <nav className="hidden gap-6 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#dashboard" className="hover:text-foreground">Dashboard</a>
          </nav>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-6 py-10">
        {!reviews ? (
          <>
            {/* Hero */}
            <section className="py-12 text-center md:py-20">
              <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Powered by Lovable AI
              </div>
              <h1 className="mx-auto mt-6 max-w-3xl text-5xl font-bold tracking-tight md:text-6xl">
                Turn customer reviews into{" "}
                <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: "var(--gradient-hero)" }}
                >
                  actionable insights
                </span>
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">
                Upload a CSV of reviews and instantly get AI-powered sentiment analysis, beautiful
                visualizations, and business recommendations — no setup required.
              </p>
              <div className="mx-auto mt-10 max-w-2xl">
                <FileUpload
                  onData={(rows, name) => {
                    setReviews(rows);
                    setFileName(name);
                  }}
                />
              </div>
            </section>

            {/* Features */}
            <section id="features" className="grid gap-4 py-12 md:grid-cols-3">
              <Feature
                icon={<Brain className="h-5 w-5" />}
                title="Hybrid AI Engine"
                desc="Combines lexicon analysis, TF-IDF weighting, and live LLM classification for accuracy and speed."
              />
              <Feature
                icon={<BarChart3 className="h-5 w-5" />}
                title="Rich Visual Dashboards"
                desc="Pie charts, stacked bars, word clouds, and brand breakdowns — all interactive and responsive."
              />
              <Feature
                icon={<Zap className="h-5 w-5" />}
                title="Live Prediction API"
                desc="Type any review, get instant sentiment classification with a confidence score and AI explanation."
              />
            </section>

            {/* Live Prediction — always available on landing page */}
            <section className="py-6">
              <LivePrediction />
            </section>
          </>
        ) : (
          <section id="dashboard" className="py-6">
            <Dashboard reviews={reviews} fileName={fileName} onReset={() => setReviews(null)} />
          </section>
        )}
      </main>

      <footer className="relative z-10 mt-16 border-t border-border/50 py-6 text-center text-xs text-muted-foreground">
        Built with Lovable · TanStack Start · Lovable AI
      </footer>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-6 backdrop-blur-sm transition hover:border-primary/40 hover:bg-card">
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary">
        {icon}
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
