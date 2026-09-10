import { MOODS, MOOD_BY_VALUE, scoreForMood, labelForMood } from "../moods";
import {
  STOPWORDS,
  SENTIMENT,
  WIN_WORDS,
  CHALLENGE_WORDS,
  THEMES,
} from "./lexicons";
import {
  parseISODate,
  addDaysISO,
  toISODate,
  startOfWeek,
  formatShort,
  formatWeekRange,
} from "../dates";

// ---------- text utilities ---------------------------------------------
function words(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

function sentences(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function stripToWords(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z'\s]/g, " ")
    .split(/\s+/);
}

function nearWord(text, w) {
  return new Set(stripToWords(text)).has(w);
}

function clip(s, n = 150) {
  if (s.length <= n) return s;
  return s.slice(0, n - 1).trimEnd() + "…";
}

// sentence-level signal: positive/negative markers
function sentenceSignal(sentence) {
  const toks = stripToWords(sentence);
  let score = 0;
  for (const t of toks) if (SENTIMENT[t] !== undefined) score += SENTIMENT[t];
  let negators = 0;
  const nwords = ["not", "no", "never", "didn", "wasn", "don", "hardly", "barely", "without"];
  for (const t of toks) if (nwords.includes(t)) negators++;
  const win = toks.filter((t) => WIN_WORDS.has(t)).length;
  const chal = toks.filter((t) => CHALLENGE_WORDS.has(t)).length;
  const neg = negators % 2 === 1;
  let kind = 0; // -1 challenge, 1 win, 0 neutral
  if (chal > 0 && !(neg && win === 0)) kind = -1;
  if (win > 0) kind = kind === -1 ? 0 : 1;
  if (score > 0) kind = 1;
  if (score < 0) kind = -1;
  return { score, win, chal, kind };
}

function inferMoodFromText(text) {
  const toks = stripToWords(text);
  let score = 0;
  for (const t of toks) if (SENTIMENT[t] !== undefined) score += SENTIMENT[t];
  const n = toks.length;
  const norm = n > 0 ? score / Math.max(1, Math.round(n / 10)) : 0;
  if (score >= 3 || norm >= 1.5) return "great";
  if (score >= 1 || norm >= 0.5) return "good";
  if (score <= -4 || norm <= -2) return "rough";
  if (score <= -1 || norm <= -0.5) return "low";
  return "okay";
}

function moodFromValueOrText(value, text) {
  if (value && MOOD_BY_VALUE[value]) return value;
  return inferMoodFromText(text || "");
}

function nearestMood(score) {
  let best = MOODS[MOODS.length - 1];
  let bestDiff = Infinity;
  for (const m of MOODS) {
    const d = Math.abs(m.score - score);
    if (d < bestDiff) {
      bestDiff = d;
      best = m;
    }
  }
  return best.value;
}

// ---------- main engine --------------------------------------------------
export function analyzeWeek(entries, opts = {}) {
  const norm = entries
    .filter((e) => e && e.date && (e.title || e.body))
    .map((e) => ({ ...e }))
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  if (norm.length === 0) return null;

  // week window (Monday..Sunday) around the entries
  const firstDate = parseISODate(norm[0].date);
  const weekStart = opts.weekStart || toISODate(startOfWeek(firstDate));
  const weekEnd = opts.weekEnd || addDaysISO(weekStart, 6);

  const weekEntries = norm.filter(
    (e) => e.date >= weekStart && e.date <= weekEnd
  );
  const pool = weekEntries.length > 0 ? weekEntries : norm;

  // unique dates + per-date mood
  const dayMap = new Map();
  const wordFreq = {};
  const themeHits = {};
  let sentenceSamples = []; // {date, sentence, kind, score}

  for (const e of pool) {
    const text = `${e.title}\n${e.body}`;
    const mood = moodFromValueOrText(e.mood, text);
    const score = scoreForMood(mood);
    const list = dayMap.get(e.date) || [];
    list.push({ e, mood, score });
    dayMap.set(e.date, list);

    for (const w of words(text)) {
      wordFreq[w] = (wordFreq[w] || 0) + 1;
      for (const [cat, keys] of Object.entries(THEMES)) {
        if (keys.includes(w)) themeHits[cat] = (themeHits[cat] || 0) + 1;
      }
    }

    for (const s of sentences(text)) {
      const sig = sentenceSignal(s);
      if (sig.kind !== 0) sentenceSamples.push({ date: e.date, title: e.title, sentence: s, ...sig });
    }
  }

  const journaledDays = dayMap.size;
  const totalEntries = pool.length;

  // ---- mood trend (always Mon..Sun so the chart aligns) ----
  const daysArr = [];
  let cur = weekStart;
  for (let i = 0; i < 7; i++) {
    const list = dayMap.get(cur);
    if (list) {
      const scores = list.map((x) => x.score);
      const avgDay = scores.reduce((a, b) => a + b, 0) / scores.length;
      const moodVal = nearestMood(avgDay);
      const moodsOnDay = [...new Set(list.map((x) => x.mood))];
      const dailyPick = moodsOnDay.includes(moodVal)
        ? moodVal
        : moodsOnDay[0] || moodVal;
      daysArr.push({
        date: cur,
        mood: dailyPick,
        moodLabel: labelForMood(dailyPick)?.label || "Okay",
        score: Math.round(avgDay * 10) / 10,
      });
    } else {
      daysArr.push({ date: cur, mood: null, moodLabel: null, score: null });
    }
    cur = addDaysISO(cur, 1);
  }

  const present = daysArr.filter((d) => d.score != null && d.score !== undefined);
  const presentScores = present.map((d) => d.score);
  const average =
    presentScores.length > 0
      ? Math.round((presentScores.reduce((a, b) => a + b, 0) / presentScores.length) * 10) / 10
      : 3;
  const dominantVal = nearestMood(average);
  const dominantLabel = labelForMood(dominantVal)?.label || "Okay";

  const presentLabels = present.map((d) => MOOD_BY_VALUE[d.mood].score);
  const split = Math.max(2, Math.ceil(presentLabels.length / 2));
  const first = presentLabels.slice(0, split);
  const second = presentLabels.slice(split);
  const a1 = first.length ? first.reduce((x, y) => x + y, 0) / first.length : null;
  const a2 = second.length ? second.reduce((x, y) => x + y, 0) / second.length : null;
  let direction = "stable";
  if (a1 !== null && a2 !== null) {
    const diff = a2 - a1;
    if (diff >= 0.6) direction = "improving";
    else if (diff <= -0.6) direction = "declining";
    else direction = "stable";
  }

  const moodTrend = {
    average,
    dominantValue: dominantVal,
    dominant: dominantLabel,
    direction,
    days: daysArr,
    journaledDays,
  };

  // ---- themes ----
  const themes = Object.entries(themeHits)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([cat, count]) => {
      let example = pool.find((e) =>
        words(`${e.title} ${e.body}`).some((w) => THEMES[cat].includes(w))
      );
      return {
        name: cat,
        count,
        distinctDays: new Set(pool.filter((e) => words(`${e.title} ${e.body}`).some((w) => THEMES[cat].includes(w))).map((e) => e.date)).size,
        example: example ? clip(example.title || example.body, 70) : null,
      };
    });

  // ---- wins & challenges ----
  const wins = sentenceSamples
    .filter((s) => s.kind === 1)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => ({
      date: s.date,
      title: s.title,
      text: clip(s.sentence, 160),
      score: s.score,
    }));
  const challenges = sentenceSamples
    .filter((s) => s.kind === -1)
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map((s) => ({
      date: s.date,
      title: s.title,
      text: clip(s.sentence, 160),
      score: s.score,
    }));

  // ---- patterns ----
  const patterns = [];
  patterns.push(
    journaledDays === 7
      ? "You journaled every single day — outstanding consistency for a full week."
      : `You recorded ${journaledDays} of the 7 days (${totalEntries} total ${totalEntries === 1 ? "entry" : "entries"}).`
  );
  const topTheme = themes[0];
  if (topTheme && topTheme.distinctDays >= 2) {
    patterns.push(
      `"${topTheme.name}" was your most recurring theme — it showed up ${topTheme.count} time${topTheme.count === 1 ? "" : "s"} across ${topTheme.distinctDays} different ${topTheme.distinctDays === 1 ? "day" : "days"}.`
    );
  }
  const directions = {
    improving: "Your mood trended upward over the course of the week.",
    declining: "Your mood dipped a little toward the end of the week.",
    stable: "Your mood held fairly steady all week.",
  };
  patterns.push(directions[direction]);
  const exerciseDays = pool.filter((e) =>
    words(`${e.title} ${e.body}`).some((w) => THEMES.Exercise.includes(w))
  ).length;
  if (exerciseDays >= 3) {
    patterns.push(`You mentioned exercise on ${exerciseDays} days — a healthy, consistent habit.`);
  } else if (exerciseDays > 0) {
    patterns.push(`Exercise appeared in your notes ${exerciseDays} day${exerciseDays === 1 ? "" : "s"} this week.`);
  }
  if (journaledDays >= 3 && wins.length && average >= 3.5) {
    patterns.push("The high points you captured outweigh the rough moments — you ended the week on a positive note.");
  }

  // ---- suggestions ----
  const suggestions = [];
  const allText = pool.map((e) => `${e.title} ${e.body}`).join(" ").toLowerCase();
  const chalToks = stripToWords(allText).filter((w) => CHALLENGE_WORDS.has(w));
  const stressy = chalToks.filter((w) => ["stressed", "stress", "stressful", "anxious", "anxiety", "overwhelmed", "worry", "worried"].includes(w)).length;
  const sleepy = pool.filter((e) => words(`${e.title} ${e.body}`).some((w) => THEMES.Sleep.includes(w))).length;
  const exerciseCount = exerciseDays;
  const hasWorkTop = themes[0] && themes[0].name === "Work";

  if (journaledDays < 6) {
    suggestions.push("Even on busy days, try a quick 2–3 line evening note — small daily check-ins make your weekly review much richer.");
  }
  if (stressy > 0) {
    suggestions.push("Stress-related words appeared often. Consider scheduling one genuinely restful block (walk, breathing, or a screen-free hour) to soften the week.");
  }
  if (sleepy === 0) {
    suggestions.push("Sleep didn't come up at all. Protecting 7–8 hours could noticeably lift your mood and focus next week.");
  } else if (sleepy > 0 && average < 3.2) {
    suggestions.push("You mentioned sleep several times this week — if rest has been rough, try an earlier wind-down and see how your mood follows.");
  }
  if (exerciseCount === 0) {
    suggestions.push("No exercise showed up in your notes. A 20-minute walk can be a simple mood reset if you have the energy.");
  }
  if (chalToks.filter((w) => ["money", "bills", "budget", "spent", "cost", "expensive", "debt"].includes(w)).length > 0) {
    suggestions.push("Money stress showed up this week. A short weekly budget check could turn anxiety into a plan.");
  }
  if (topTheme && topTheme.name !== "Work") {
    suggestions.push(`You engaged most with "${topTheme.name}" this week. Protect time for it — it clearly energises you.`);
  } else if (topTheme && topTheme.name === "Work" && average < 3.4) {
    suggestions.push("Work dominated your week but pulled your mood down. Try setting a firmer end-of-day boundary to reclaim some balance.");
  }
  if (suggestions.length < 3) {
    suggestions.push("Reflect next week on one thing you'd like to change — and one small thing you're proud to keep doing.");
  }

  // ---- summary ----
  const themeText = topTheme ? `"${topTheme.name}" was your clearest recurring theme` : "no single theme dominated";
  let summary =
    `Across ${totalEntries} ${totalEntries === 1 ? "entry" : "entries"} over ${journaledDays} journaled ${journaledDays === 1 ? "day" : "days"}, your week averaged a "${dominantLabel}" mood — `;
  summary +=
    direction === "improving"
      ? "and it was trending upward as the week went on. "
      : direction === "declining"
      ? "though it softened toward the end. "
      : "staying fairly steady throughout. ";
  summary += `Overall, ${themeText}. `;
  if (wins.length > 0 && challenges.length > 0)
    summary += `You had clear wins to celebrate, but also a few moments worth gentle attention. `;
  else if (wins.length > 0)
    summary += `It was a week filled with highlights worth holding onto. `;
  else if (challenges.length > 0)
    summary += `It leaned challenging at times — be kind to yourself. `;
  summary += `Keep the small rhythms that worked, and make space for a little more rest where things felt heavy.`;

  return {
    meta: {
      engine: "local-lexical-v1",
      generatedAt: new Date().toISOString(),
      weekStart,
      weekEnd,
    },
    summary,
    moodTrend,
    themes,
    wins,
    challenges,
    patterns,
    suggestions,
    stats: {
      totalEntries,
      journaledDays,
      weekLabel: formatWeekRange(weekStart),
    },
  };
}
