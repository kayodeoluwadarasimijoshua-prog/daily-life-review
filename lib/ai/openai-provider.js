// Example provider that calls a real LLM (OpenAI-compatible chat API).
// Not used unless AI_PROVIDER=openai and OPENAI_API_KEY are set.
// It is wired to the same schema produced by the local engine so the rest
// of the app never needs to know which engine generated a report.

export async function generateWithOpenAI({ entries, weekStart, weekEnd }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const base = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";

  const input = entries
    .map((e) => `- [${e.date}] (mood: ${e.mood || "unset"}) ${e.title}\n  ${e.body}`)
    .join("\n");

  const system = `You are an empathic life-review assistant. Analyse a person's week of journal
entries and return a report as JSON with EXACTLY this shape:
{
  "meta": {"engine":"openai", "generatedAt":"<iso>"},
  "summary": "string",
  "moodTrend": {"average": number, "dominantValue":"great|good|okay|low|rough",
    "dominant":"Label", "direction":"improving|stable|declining", "days":[{date,mood,moodLabel,score}], "journaledDays":n},
  "themes":[{name,count,distinctDays,example}],
  "wins":[{date,title,text}],
  "challenges":[{date,title,text}],
  "patterns":["string"],
  "suggestions":["string"],
  "stats":{"totalEntries":n,"journaledDays":n,"weekLabel":"string"}
}
Use warm, specific, human language. mood values map to scores: great=5 good=4 okay=3 low=2 rough=1.
Return only the JSON object.`;

  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: `Week ${weekStart} to ${weekEnd}. Here are my notes:\n\n${input}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LLM request failed (${res.status}): ${body.slice(0, 200)}`);
  }

  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty completion");
  const parsed = JSON.parse(content);
  return { ...parsed, meta: { ...(parsed.meta || {}), engine: "openai", weekStart, weekEnd } };
}
