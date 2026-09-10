import { NextResponse } from "next/server";
import { requireUser, withAuth } from "@/lib/api-guard";
import { getEntry, updateEntry, deleteEntry } from "@/lib/store";
import { parseEntryInput } from "@/lib/validate";

export const dynamic = "force-dynamic";

export const GET = withAuth(async function GET(req, ctx) {
  const user = requireUser();
  const { id } = await ctx.params;
  const entry = getEntry(user.id, Number(id));
  if (!entry) return NextResponse.json({ error: "Entry not found." }, { status: 404 });
  return NextResponse.json({ entry });
});

export const PUT = withAuth(async function PUT(req, ctx) {
  const user = requireUser();
  const { id } = await ctx.params;
  const existing = getEntry(user.id, Number(id));
  if (!existing) return NextResponse.json({ error: "Entry not found." }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const parsed = parseEntryInput(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const updated = updateEntry(user.id, Number(id), parsed.data);
  return NextResponse.json({ entry: updated });
});

export const DELETE = withAuth(async function DELETE(req, ctx) {
  const user = requireUser();
  const { id } = await ctx.params;
  const ok = deleteEntry(user.id, Number(id));
  if (!ok) return NextResponse.json({ error: "Entry not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
});
