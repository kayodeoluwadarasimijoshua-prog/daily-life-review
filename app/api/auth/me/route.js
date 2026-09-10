import { NextResponse } from "next/server";
import { getCurrentUser, publicUser } from "@/lib/session";

export async function GET() {
  const user = getCurrentUser();
  if (!user) return NextResponse.json({ user: null });
  return NextResponse.json({ user: publicUser(user) });
}
