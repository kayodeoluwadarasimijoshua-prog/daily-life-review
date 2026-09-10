import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { activeProvider, providerStatus } from "@/lib/ai/index";

export const dynamic = "force-dynamic";

// Public-ish (no secrets): reports which AI engine is active.
export async function GET() {
  const user = getCurrentUser();
  return NextResponse.json({
    provider: activeProvider,
    providerStatus,
    authenticated: !!user,
    version: "1.0.0",
  });
}
