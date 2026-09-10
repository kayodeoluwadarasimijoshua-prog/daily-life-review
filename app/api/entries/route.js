import { NextResponse } from "next/server";
import { requireUser, withAuth } from "@/lib/api-guard";
import { listEntries, createEntry } from "@/lib/store";
import { parseEntryInput } from "@/lib/validate";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export const GET = withAuth(async function GET() {
  await ensureSeeded();
  const user = await requireUser();
  const entries = await listEntries(user.id);
  return NextResponse.json({ entries });
});

export const POST = withAuth(async function POST(req) {
  const user = await requireUser();
  const body = await req.json().catch(() => ({}));
  const parsed = parseEntryInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const entry = await createEntry(user.id, parsed.data);
  return NextResponse.json({ entry }, { status: 201 });
});
