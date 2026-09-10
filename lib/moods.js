// Central definition of the supported mood tags.
// value: stored value, label, emoji, color tokens, numeric score (5=best).

export const MOODS = [
  { value: "great", label: "Great", emoji: "😄", color: "#22c55e", score: 5 },
  { value: "good", label: "Good", emoji: "🙂", color: "#2dd4bf", score: 4 },
  { value: "okay", label: "Okay", emoji: "😐", color: "#60a5fa", score: 3 },
  { value: "low", label: "Low", emoji: "😕", color: "#f59e0b", score: 2 },
  { value: "rough", label: "Rough", emoji: "😞", color: "#f87171", score: 1 },
];

export const MOOD_BY_VALUE = Object.fromEntries(MOODS.map((m) => [m.value, m]));

export function labelForMood(value) {
  if (!value) return null;
  return MOOD_BY_VALUE[value] || null;
}

// numeric score 1..5 for a mood value (defaults to neutral 3)
export function scoreForMood(value) {
  if (!value) return 3;
  return MOOD_BY_VALUE[value] ? MOOD_BY_VALUE[value].score : 3;
}
