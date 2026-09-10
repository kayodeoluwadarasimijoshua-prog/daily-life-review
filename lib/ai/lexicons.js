// Lightweight lexical resources powering the local analysis engine.
// These are intentionally modest heuristics — the AI provider interface
// (see index.js) is designed so a real LLM can replace all of this later.

export const STOPWORDS = new Set(
  `a about above after again all also am an and any are as at be because been before being
   between both but by can could did do does doing down during each few for from further had
   has have having he her here hers herself him himself his how i if in into is it its itself
   just me more most my myself no nor not now of off on once only or other our ours ourselves
   out over own same she should so some such than that the their theirs them themselves then
   there these they this those through to too under until up very was we were what when where
   which while who whom why will with would you your yours yourself yourselves very really
   today's gonna wanna got get got gonna let ve ll d em t s re dont cant isnt wasnt werent
   didnt doesnt couldnt wouldnt shouldnt it's i'm we're they're don't can't im ve would they
   one two three day days week weekend morning afternoon evening night tonight later now
   back still just also every everything anything something nothing someone maybe perhaps
   quite pretty kind kinda sort bit lot lots whole basically actually anyway though also
   almost always never often sometimes usually today yesterday tomorrow
  `.split(/\s+/)
);

// word -> sentiment (-3..+3)
export const SENTIMENT = {
  happy: 3, glad: 3, joy: 3, joyfully: 3, wonderful: 3, fantastic: 3, amazing: 3,
  amazing: 3, incredible: 3, awesome: 3, great: 2, good: 2, lovely: 3, nice: 2,
  excellent: 3, brilliant: 3, enjoyed: 3, enjoy: 2, love: 3, loved: 3, fun: 3,
  excited: 3, exciting: 3, grateful: 3, thankful: 3, grateful: 3, blessed: 3,
  proud: 3, accomplished: 3, achieved: 3, achievement: 3, success: 3, successful: 3,
  celebrated: 3, celebration: 3, win: 2, won: 3, win: 2, progress: 2, improved: 2,
  productive: 2, peaceful: 3, calm: 2, relaxed: 3, relaxed: 3, restful: 2, fresh: 1,
  energetic: 2, motivated: 3, motivated: 3, inspired: 3, inspired: 3, hopeful: 3,
  content: 2, comfortable: 1, cozy: 2, delicious: 2, tasty: 2, beautiful: 2,
  sunny: 2, nice: 2, sweet: 2, kind: 2, helpful: 2, good: 2, better: 2, best: 3,
  laugh: 2, laughed: 2, smile: 2, smiled: 2, smiling: 2, cheerful: 2, okay: 0,
  fine: 1, average: 0, meh: -1,
  bad: -2, terrible: -3, awful: -3, horrible: -3, sad: -3, unhappy: -3, down: -2,
  upset: -3, angry: -3, mad: -2, frustrated: -3, frustration: -3, annoyed: -2,
  stressed: -3, stress: -3, stressful: -3, overwhelmed: -3, overwhelmed: -3, tired: -2,
  exhausted: -3, drained: -3, worn: -2, burned: -2, anxious: -3, anxiety: -3,
  worried: -3, worry: -2, nervous: -2, scared: -2, afraid: -2, lonely: -3, alone: -1,
  bored: -2, boring: -2, bored: -2, disappointing: -3, disappointed: -3, disappointed: -3,
  failed: -3, failure: -3, stuck: -2, struggle: -2, struggled: -2, hard: -2, difficult: -2,
  tough: -2, challenge: -1, challenging: -2, rough: -3, painful: -3, pain: -2, hurt: -2,
  hurt: -2, sick: -3, ill: -3, unwell: -2, headache: -2, tired: -2, cranky: -2,
  grumpy: -2, cried: -3, cry: -3, tear: -1, missed: -1, lose: -2, lost: -2, error: -2,
  mistake: -2, problem: -2, problems: -2, issue: -1, issues: -1, conflict: -2, fight: -2,
  argument: -2, argue: -2, procrastinated: -2, procrastinate: -2, lazy: -2, unmotivated: -2,
  boring: -2, low: -1, rough: -3, nightmare: -3, panic: -3, broke: -2, money: 0,
  busy: -1, rushed: -1, late: -1, tiring: -2, long: -1, deadline: -1, pressure: -1,
  meh: -1, blah: -2, blahs: -2, okayish: 0, bittersweet: 0, mixed: -1,
};

export const WIN_WORDS = new Set([
  "achieved", "achieve", "accomplished", "accomplish", "completed", "complete", "finished",
  "win", "won", "success", "successful", "celebrated", "celebration", "celebrate", "proud",
  "promoted", "raise", "good", "great", "awesome", "amazing", "wonderful", "exciting",
  "grateful", "thankful", "happy", "glad", "progress", "improved", "improve", "best",
  "passed", "got", "received", "earned", "confident", "milestone", "started", "new",
  "met", "booked", "signed", "accepted", "finished", "finally", "recovered", "healed",
  "finally", "manage", "managed", "solved", "resolved", "deal", "closed", "learned",
  "fun", "enjoyed", "relaxed", "peaceful", "productive", "motivated",
]);

export const CHALLENGE_WORDS = new Set([
  "stressed", "stress", "stressful", "anxious", "anxiety", "worried", "worry", "overwhelmed",
  "overwhelm", "exhausted", "tired", "burned", "drained", "sad", "upset", "angry", "frustrated",
  "frustration", "annoyed", "difficult", "hard", "tough", "struggle", "struggled", "struggling",
  "failed", "failure", "procrastinated", "procrastinate", "sick", "ill", "unwell", "pain",
  "headache", "cranky", "grumpy", "cried", "missed", "conflict", "argument", "argue", "fight",
  "deadline", "pressure", "rushed", "late", "mistake", "problem", "issues", "lonely", "bored",
  "low", "down", "rough", "awful", "terrible", "broke", "rushed", "unmotivated", "lazy",
  "nightmare", "panic", "busy", "overwhelming", "crying", "worst", "scared", "afraid",
]);

// category -> keywords
export const THEMES = {
  Work: ["work", "job", "office", "meeting", "meetings", "meet", "colleague", "colleagues", "boss", "manager", "client", "clients", "project", "projects", "deadline", "task", "tasks", "email", "emails", "report", "presentation", "presented", "presenting", "interview", "shift", "coworker", "coworkers", "boss", "team"],
  Health: ["health", "sick", "ill", "doctor", "hospital", "medicine", "medication", "headache", "fever", "cold", "flu", "pain", "symptom", "symptoms", "checkup", "clinic", "energy", "tired", "exhausted", "rest", "sleep"],
  Exercise: ["exercise", "gym", "workout", "workouts", "ran", "run", "running", "walk", "walked", "walking", "yoga", "pilates", "swim", "swimming", "bike", "cycling", "cardio", "strength", "fitness", "train", "trained", "stretch", "stretching", "hike", "hiking", "steps"],
  Food: ["food", "eat", "ate", "eating", "cook", "cooked", "cooking", "dinner", "lunch", "breakfast", "meal", "meals", "restaurant", "coffee", "tea", "recipe", "snack", "snacks", "fruit", "vegetables", "salad", "takeout", "groceries"],
  Sleep: ["sleep", "slept", "sleepless", "insomnia", "nap", "napped", "woke", "wake", "waking", "bed", "early", "late", "rested", "restful", "tired", "exhausted", "groggy", "refreshed"],
  Family: ["family", "mom", "dad", "mother", "father", "brother", "sister", "son", "daughter", "wife", "husband", "parents", "parent", "kids", "kid", "grandma", "grandpa", "cousin", "aunt", "uncle", "home", "house", "children", "partner"],
  Friends: ["friend", "friends", "buddy", "pals", "hang", "hung", "hangout", "hangouts", "lunch", "dinner", "party", "gathering", "catch", "chatted", "chat", "texted", "called"],
  Romance: ["date", "dates", "boyfriend", "girlfriend", "partner", "love", "valentine", "anniversary", "relationship", "spouse", "marriage", "married", "engaged", "crush"],
  Money: ["money", "bills", "bill", "rent", "mortgage", "savings", "saved", "budget", "budgeting", "salary", "paycheck", "paid", "income", "expense", "expenses", "debt", "loan", "invest", "investment", "cost"],
  Learning: ["study", "studied", "studying", "exam", "exams", "test", "class", "classes", "course", "courses", "school", "university", "learn", "learning", "read", "reading", "book", "books", "lecture", "assignment", "homework", "degree"],
  Travel: ["travel", "trip", "trips", "flight", "flights", "flight", "vacation", "vacay", "road", "drive", "drove", "driving", "airport", "hotel", "abroad", "commute", "commuting", "visit", "visited", "holiday"],
  Creativity: ["write", "writing", "journal", "journaling", "sketch", "painting", "paint", "draw", "drawing", "art", "music", "guitar", "piano", "sing", "song", "songs", "poem", "photography", "photos", "photograph", "craft", "coding", "code"],
  Chores: ["chores", "cleaned", "cleaning", "laundry", "dishes", "vacuum", "tidied", "organize", "organizing", "declutter", "groceries", "errands", "errand", "cook", "cooked", "meal", "mealprep"],
};

export const CATEGORY_ORDER = Object.keys(THEMES);
