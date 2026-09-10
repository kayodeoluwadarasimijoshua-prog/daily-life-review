import { NextResponse } from "next/server";
import { requireUser, withAuth } from "@/lib/api-guard";
import { listReports } from "@/lib/store";
import { ensureSeeded } from "@/lib/seed";

export const dynamic = "force-dynamic";

export const GET = withAuth(async function GET() {
  const user = requireUser();
  ensureSeeded();
  const reports = listReports(user.id);
  return NextResponse.json({ reports });
});
