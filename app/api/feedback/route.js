import { NextResponse } from "next/server";
import { requireUser, withAuth } from "@/lib/api-guard";
import { createFeedback, countFeedbackToday, FEEDBACK_KINDS } from "@/lib/store";

export const dynamic = "force-dynamic";

const MAX_LEN = 4000;
const DAILY_LIMIT = 10;

export const POST = withAuth(async function POST(req) {
  const user = await requireUser();
  const body = await req.json().catch(() => ({}));

  const message = String(body.message || "").trim();
  if (message.length < 5) {
    return NextResponse.json(
      { error: "Please write a little more so we understand." },
      { status: 400 }
    );
  }
  if (message.length > MAX_LEN) {
    return NextResponse.json(
      { error: `Please keep it under ${MAX_LEN} characters.` },
      { status: 400 }
    );
  }

  const kind = FEEDBACK_KINDS.includes(body.kind) ? body.kind : "other";

  let rating = Number(body.rating);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) rating = null;

  // Light abuse guard — stops an accidental loop flooding the table.
  const today = await countFeedbackToday(user.id);
  if (today >= DAILY_LIMIT) {
    return NextResponse.json(
      { error: "Thanks — you've sent plenty today. Please continue tomorrow." },
      { status: 429 }
    );
  }

  const id = await createFeedback({
    userId: user.id,
    name: user.name,
    email: user.email,
    kind,
    rating,
    message,
    userAgent: req.headers.get("user-agent"),
  });

  return NextResponse.json({ ok: true, id }, { status: 201 });
});
