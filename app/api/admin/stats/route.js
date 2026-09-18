import { NextResponse } from "next/server";
import { checkAdmin } from "@/lib/admin-guard";
import { adminStats } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const denied = checkAdmin(req);
  if (denied) return denied;

  const stats = await adminStats();
  return NextResponse.json({ stats });
}
