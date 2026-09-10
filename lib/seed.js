import { hashPassword } from "./auth";
import { createEntry, saveReport, findUserByEmail, createUser, ensureSchema } from "./store";
import { addDaysISO, addDays, toISODate, currentWeekStartISO } from "./dates";
import { analyzeWeek } from "./ai/analysis";

export const DEMO_EMAIL = "demo@dailyreview.app";
export const DEMO_PASSWORD = "demo1234";

// Realistic sample journal entries (daysAgo relative to "today") so the
// seeded data always looks alive regardless of the current date.
const SAMPLES = [
  { da: 33, mood: "good", title: "Slow start, steady finish", body: "Woke up a bit late and rushed through emails. Still managed a full day of work on the quarterly report. Walked to the shop at lunch to clear my head. Felt okay once the evening came." },
  { da: 31, mood: "good", title: "Gym after work", body: "Lifted weights for the first time in ages. Legs are sore but I'm proud I finally went back. Cooked a simple pasta dinner and read 20 minutes before bed. Small wins count." },
  { da: 30, mood: "great", title: "A productive day at the office", body: "Knocked out the presentation and my manager actually said it was excellent. Felt confident during the team meeting. Treated myself to sushi with a coworker. Excited about the project direction." },
  { da: 29, mood: "okay", title: "Busy but fine", body: "Chores and errands all afternoon. Grocery shopping took forever. Didn't get much time for myself but the flat feels tidy now which helps. Called my sister for a bit." },
  { da: 28, mood: "good", title: "Weekend reset", body: "Slept in properly for once. Went for a long morning walk by the river, the weather was lovely. Did some meal prep for the week ahead. Felt peaceful and recharged." },
  { da: 26, mood: "rough", title: "Tough day at work", body: "A deadline got moved up and I panicked a little. Ended up staying late and felt stressed the whole day. Headache by the evening. I know tomorrow is a fresh start but today was hard." },
  { da: 25, mood: "good", title: "Better today", body: "Talked to my manager about splitting the workload and she was really supportive. Got through the urgent tasks and left on time. Cooked a proper dinner and went to bed early." },
  { da: 24, mood: "great", title: "Date night", body: "Had dinner at a lovely little Italian place with Amara. We laughed a lot and walked home hand in hand. Feeling really grateful for her. Booked tickets for a play next weekend too." },
  { da: 23, mood: "okay", title: "Average Thursday", body: "Meetings all day, not much deep work done. Felt a bit distracted. Did a short yoga video in the evening which helped my back. Nothing special, just a normal day." },
  { da: 22, mood: "good", title: "Cheered up", body: "Met the group for brunch, it was so good to catch up. Played a bit of football in the park after. Tired but happy at the end of the day." },
  { da: 21, mood: "great", title: "Weekend hike", body: "Did a 10km hike with friends. The view at the top was incredible and the fresh air did me wonders. Felt strong and clear-headed. Could really get used to weekends like this." },
  { da: 19, mood: "low", title: "Rough sleep, low energy", body: "Couldn't sleep last night and dragged myself through Monday. Felt anxious about money after checking my budget. Ordered takeout instead of cooking. Hoping the week gets better." },
  { da: 18, mood: "good", title: "Back on track", body: "Forced myself to the gym and it worked. Wrote out a simple budget and realised I'm actually fine. Small plan = less worry. Made a nice stir fry for dinner." },
  { da: 17, mood: "good", title: "Learning at work", body: "Took an online course module on data dashboards and finally clicked. Feels good to grow my skills. Finished everything before 6 for once." },
  { da: 16, mood: "great", title: "Celebrated a promotion!", body: "Got promoted today! My manager announced it in the meeting and the whole team clapped. I'm honestly so proud and grateful. Called my parents to tell them. Big night out with friends planned for Friday." },
  { da: 15, mood: "great", title: "Celebration dinner", body: "Dinner and drinks with friends to celebrate the promotion. Ate way too much but it was worth it. Laughed until my cheeks hurt. This week has been incredible." },
  { da: 14, mood: "good", title: "Sleepy Saturday", body: "Recovering from last night. Slept late, did laundry, watched a film. Kept it low-key and that felt right. Ready for a fresh week." },
  { da: 12, mood: "okay", title: "Sunday scaries", body: "A bit of anxiety about the new week and the extra responsibility. Did some journaling and a calm walk which helped. Reminded myself I was ready for this." },
  { da: 11, mood: "good", title: "New role, day one", body: "First day in the new position. Felt a little nervous but everyone was welcoming. Took lots of notes and asked questions. Ended the day feeling capable." },
  { da: 10, mood: "low", title: "Feeling the pressure", body: "New responsibilities are heavier than I expected. Worked late and felt overwhelmed by everything I don't know yet. Skipped the gym. Need to be kinder to myself while I learn." },
  { da: 9, mood: "good", title: "Asked for help", body: "Asked a teammate to walk me through the systems and it helped a lot. Realised nobody expects me to know everything on day three. Went for a run to reset. Feeling steadier." },
  { da: 8, mood: "great", title: "Momentum", body: "Finally finished the training modules and took ownership of my first project. Made a real plan and ticked things off all day. Ended work feeling genuinely excited again." },
  { da: 7, mood: "good", title: "Cooked with Amara", body: "We made a big pot of jollof rice and watched the game together. Simple, cosy evening. My back is a bit sore from sitting too long but generally a warm, happy day." },
  { da: 6, mood: "great", title: "Saturday market run", body: "Went to the local market early and grabbed fresh fruit and veg. Tried a new recipe for lunch that turned out great. Read in the park all afternoon. Properly content." },
  { da: 4, mood: "okay", title: "Mondays, eh", body: "Slept okay but the alarm hurt. Solid day at work, got through my task list. Was tired by the evening so skipped the gym again. Need to get back into that habit." },
  { da: 3, mood: "good", title: "Better habits", body: "Went to the gym after work, pushed through and felt great after. Meal-prepped for the rest of the week. Small discipline stacking up." },
  { da: 2, mood: "good", title: "Good but busy", body: "Very full day of meetings and follow-ups. Felt stretched but productive. Talked through the week with Amara in the evening which helped me feel settled." },
  { da: 1, mood: "good", title: "Strong close to the week", body: "Wrapped up all my loose ends before the weekend. Colleague said thanks for helping with their report. Walked home and enjoyed the sunset. Ready for a lighter weekend." },
];

async function seedFor(userId, quiet) {
  const today = new Date();
  const made = [];
  for (const s of SAMPLES) {
    const date = toISODate(addDays(today, -s.da));
    const entry = await createEntry(userId, {
      date,
      title: s.title,
      body: s.body,
      mood: s.mood,
    });
    made.push({ entry, date });
  }

  // Weekly reports for the three most recent completed weeks.
  const monday = currentWeekStartISO();
  let seededReports = 0;
  for (let wk = 1; wk <= 3; wk++) {
    const weekStart = addDaysISO(monday, -7 * wk);
    const weekEnd = addDaysISO(weekStart, 6);
    const weekEntries = made
      .filter((m) => m.date >= weekStart && m.date <= weekEnd)
      .map((m) => m.entry);
    if (weekEntries.length > 0) {
      const payload = analyzeWeek(weekEntries, { weekStart, weekEnd });
      if (payload) {
        await saveReport(userId, { weekStart, weekEnd, payload });
        seededReports++;
      }
    }
  }

  if (!quiet) {
    console.log(
      `[seed] demo user ${userId}: ${made.length} entries, ${seededReports} reports`
    );
  }
  return { entries: made.length, reports: seededReports };
}

let inFlight = null;

/**
 * Idempotent: creates the demo account + history the first time it runs.
 * Safe to await on every request (it short-circuits once seeded).
 */
export async function ensureSeeded() {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      await ensureSchema();
      const existing = await findUserByEmail(DEMO_EMAIL);
      if (existing) return { seeded: false, userId: existing.id };
      const user = await createUser({
        name: "Amara Demo",
        email: DEMO_EMAIL,
        passwordHash: hashPassword(DEMO_PASSWORD),
      });
      const res = await seedFor(user.id, false);
      return { seeded: true, userId: user.id, ...res };
    } catch (err) {
      console.error("[seed] failed:", err);
      inFlight = null; // allow a retry on the next request
      return { seeded: false, error: String(err?.message || err) };
    }
  })();
  return inFlight;
}

export function listDemoHint() {
  return { email: DEMO_EMAIL, password: DEMO_PASSWORD };
}
