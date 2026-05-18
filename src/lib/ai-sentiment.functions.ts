import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  text: z.string().min(1).max(2000),
});

export const predictSentimentAI = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      throw new Error("Lovable AI is not configured.");
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You are a sentiment analysis classifier. Respond with ONLY compact JSON of shape {\"sentiment\":\"positive|negative|neutral\",\"confidence\":0-1,\"explanation\":\"one short sentence\"}. No markdown.",
          },
          { role: "user", content: `Review: ${data.text}` },
        ],
      }),
    });

    if (res.status === 429) throw new Error("Rate limit exceeded. Try again shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted. Please add credits in Lovable settings.");
    if (!res.ok) throw new Error(`AI request failed: ${res.status}`);

    const json = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content ?? "";
    const cleaned = content.replace(/```json|```/g, "").trim();
    try {
      const parsed = JSON.parse(cleaned) as { sentiment: string; confidence: number; explanation: string };
      const sentiment = ["positive","negative","neutral"].includes(parsed.sentiment) ? parsed.sentiment : "neutral";
      return {
        sentiment: sentiment as "positive" | "negative" | "neutral",
        confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0.5)),
        explanation: String(parsed.explanation ?? ""),
      };
    } catch {
      return { sentiment: "neutral" as const, confidence: 0.5, explanation: content.slice(0, 200) };
    }
  });
