import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { activeProvider, providerStatus } from "@/lib/ai/index";
import { dbUrlLabel } from "@/lib/db";

export const dynamic = "force-dynamic";

// No secrets: reports which AI engine + database backend are active.
export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json({
    provider: activeProvider,
    providerStatus,
    database: dbUrlLabel,
    authenticated: !!user,
    version: "1.0.0",
  });
}
