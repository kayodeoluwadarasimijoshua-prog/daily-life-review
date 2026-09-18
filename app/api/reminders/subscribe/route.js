import { NextResponse } from "next/server";
import { requireUser, withAuth } from "@/lib/api-guard";
import { savePushSub, deletePushSub } from "@/lib/store";

export const dynamic = "force-dynamic";

export const POST = withAuth(async function POST(req) {
  const user = await requireUser();
  const body = await req.json().catch(() => ({}));

  const endpoint = body?.subscription?.endpoint;
  const keys = body?.subscription?.keys;

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: "Invalid push subscription." }, { status: 400 });
  }

  await savePushSub(user.id, { endpoint, keys });
  return NextResponse.json({ ok: true });
});

export const DELETE = withAuth(async function DELETE(req) {
  await requireUser();
  const body = await req.json().catch(() => ({}));
  if (body?.endpoint) await deletePushSub(body.endpoint);
  return NextResponse.json({ ok: true });
});
