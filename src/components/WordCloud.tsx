interface Props {
  words: Array<{ word: string; count: number }>;
  color: "positive" | "negative";
}

export function WordCloud({ words, color }: Props) {
  if (!words.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Not enough data.</p>;
  }
  const max = words[0].count;
  const min = words[words.length - 1].count;
  const colorVar = color === "positive" ? "var(--positive)" : "var(--negative)";

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 py-4">
      {words.map(({ word, count }) => {
        const scale = max === min ? 1 : (count - min) / (max - min);
        const size = 0.85 + scale * 1.4; // rem
        const opacity = 0.55 + scale * 0.45;
        return (
          <span
            key={word}
            title={`${word} — ${count} mentions`}
            className="font-semibold transition-transform hover:scale-110"
            style={{
              fontSize: `${size}rem`,
              color: colorVar,
              opacity,
              lineHeight: 1.1,
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
}
