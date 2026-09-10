import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { ensureSeeded } from "@/lib/seed";
import { Shell } from "../components/Shell";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }) {
  await ensureSeeded();
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return <Shell user={user}>{children}</Shell>;
}
