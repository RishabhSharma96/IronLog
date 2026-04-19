import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { DashboardClient } from "@/components/dashboard-client";
import { daySlugToKey } from "@/lib/week";

type Props = {
  params: { day: string };
};

export default function DayPage({ params }: Props) {
  const username = cookies().get("ironlog_session")?.value;

  if (!username) {
    redirect("/");
  }

  const day = daySlugToKey(params.day);
  if (!day) {
    notFound();
  }

  return (
    <DashboardClient
      username={username}
      initialDay={day}
      singleDayMode
    />
  );
}
