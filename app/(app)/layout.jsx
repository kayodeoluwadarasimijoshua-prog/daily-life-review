import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { ensureSeeded } from "@/lib/seed";
import { Shell } from "../components/Shell";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }) {
  const user = getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  // Lazily seed demo data on first real request (idempotent).
  ensureSeeded();

  return <Shell user={user}>{children}</Shell>;
}
