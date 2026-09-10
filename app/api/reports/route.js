import { NextResponse } from "next/server";
import { requireUser, withAuth } from "@/lib/api-guard";
import { listReports } from "@/lib/store";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export const GET = withAuth(async function GET() {
  await ensureSeeded();
  const user = await requireUser();
  const reports = await listReports(user.id);
  return NextResponse.json({ reports });
});
