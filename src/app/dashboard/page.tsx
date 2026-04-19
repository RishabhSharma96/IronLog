import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DashboardOverviewClient } from "@/components/dashboard-overview-client";

export default function DashboardPage() {
  const username = cookies().get("ironlog_session")?.value;

  if (!username) {
    redirect("/");
  }

  return <DashboardOverviewClient username={username} />;
}
