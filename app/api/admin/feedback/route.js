import { NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin-guard";
import { listFeedback, setFeedbackStatus, deleteFeedback } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const denied = checkAdmin(req);
  if (denied) return denied;

  const items = await listFeedback({ limit: 300 });
  return NextResponse.json({ count: items.length, items });
}

export async function PATCH(req) {
  const denied = checkAdmin(req);
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const id = Number(body.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  const ok = await setFeedbackStatus(id, String(body.status || ""));
  if (!ok) return NextResponse.json({ error: "Invalid status." }, { status: 400 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req) {
  const denied = checkAdmin(req);
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const id = Number(body.id);
  if (!Number.isFinite(id)) {
    return NextResponse.json({ error: "Invalid id." }, { status: 400 });
  }

  await deleteFeedback(id);
  return NextResponse.json({ ok: true });
}
