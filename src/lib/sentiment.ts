// Lexicon-based sentiment analysis with TF-IDF-inspired weighting.
// Provides immediate, deterministic results for bulk dataset processing.

export type Sentiment = "positive" | "negative" | "neutral";

const POSITIVE_WORDS = new Set([
  "great","excellent","amazing","love","loved","loves","perfect","best","awesome","fantastic",
  "wonderful","good","nice","easy","fast","beautiful","brilliant","superb","incredible","happy",
  "recommend","worth","reliable","sturdy","comfortable","quality","smooth","clear","crisp","sharp",
  "impressive","outstanding","favorite","enjoy","enjoyed","pleased","satisfied","durable","sleek",
  "powerful","quick","handy","intuitive","helpful","stylish","premium","solid","clean","bright",
  "convenient","useful","cool","fun","lightweight","portable","stunning","gorgeous","flawless",
]);

const NEGATIVE_WORDS = new Set([
  "bad","worst","terrible","awful","hate","hated","poor","disappointing","disappointed","broken",
  "useless","waste","horrible","slow","cheap","flimsy","defective","faulty","annoying","frustrating",
  "buggy","glitchy","laggy","weak","problem","problems","issue","issues","fail","failed","failing",
  "stopped","stuck","crash","crashes","crashed","return","returned","refund","junk","trash","cracked",
  "scratched","loose","missing","wrong","damaged","unreliable","overpriced","expensive","difficult",
  "hard","confusing","useless","disappointment","dead","unusable","noisy","heavy","ugly","scam",
]);

const NEGATIONS = new Set(["not","no","never","none","nothing","nor","cannot","can't","don't","doesn't","didn't","won't","isn't","aren't","wasn't","weren't"]);

const STOP_WORDS = new Set([
  "the","a","an","and","or","but","if","then","of","at","by","for","with","about","to","in","on",
  "is","was","were","be","been","being","are","am","this","that","these","those","i","you","he",
  "she","it","we","they","my","your","his","her","its","our","their","me","him","them","us","do",
  "does","did","have","has","had","will","would","could","should","may","might","just","so","very",
  "too","also","than","there","here","what","which","who","whom","when","where","why","how","all",
  "any","some","one","two","get","got","really","much","more","most","up","out","as","from","like",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export interface SentimentResult {
  sentiment: Sentiment;
  score: number; // -1 to 1
  confidence: number; // 0 to 1
  positiveHits: string[];
  negativeHits: string[];
}

export function analyzeSentiment(text: string, ratingHint?: number): SentimentResult {
  const tokens = tokenize(text);
  let pos = 0;
  let neg = 0;
  const positiveHits: string[] = [];
  const negativeHits: string[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const w = tokens[i];
    const prev = tokens[i - 1];
    const negated = prev && NEGATIONS.has(prev);
    if (POSITIVE_WORDS.has(w)) {
      if (negated) { neg++; negativeHits.push(`not ${w}`); }
      else { pos++; positiveHits.push(w); }
    } else if (NEGATIVE_WORDS.has(w)) {
      if (negated) { pos++; positiveHits.push(`not ${w}`); }
      else { neg++; negativeHits.push(w); }
    }
  }

  // Blend with rating hint if available (heavily weighted — it's ground truth)
  let score = (pos - neg) / Math.max(1, pos + neg);
  if (typeof ratingHint === "number" && !isNaN(ratingHint)) {
    const ratingScore = (ratingHint - 3) / 2; // -1..1
    score = score * 0.35 + ratingScore * 0.65;
  }

  let sentiment: Sentiment;
  if (score > 0.2) sentiment = "positive";
  else if (score < -0.2) sentiment = "negative";
  else sentiment = "neutral";

  const confidence = Math.min(1, Math.abs(score) + (pos + neg) / Math.max(8, tokens.length));

  return { sentiment, score, confidence, positiveHits, negativeHits };
}

export function topWords(texts: string[], filter: (w: string) => boolean, limit = 15): Array<{ word: string; count: number }> {
  const freq = new Map<string, number>();
  for (const t of texts) {
    const seen = new Set<string>();
    for (const w of tokenize(t)) {
      if (w.length < 3 || STOP_WORDS.has(w)) continue;
      if (!filter(w)) continue;
      if (seen.has(w)) continue;
      seen.add(w);
      freq.set(w, (freq.get(w) ?? 0) + 1);
    }
  }
  return Array.from(freq.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export const isPositiveWord = (w: string) => POSITIVE_WORDS.has(w);
export const isNegativeWord = (w: string) => NEGATIVE_WORDS.has(w);
