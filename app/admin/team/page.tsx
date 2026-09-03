import { redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/scheduling/current-user";
import { TeamView } from "@/components/admin/TeamView";

export default async function TeamPage() {
  const appUser = await getOrCreateAppUser();
  if (!appUser.isAdmin) redirect("/today");
  return <TeamView />;
}
