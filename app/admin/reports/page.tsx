import { redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/scheduling/current-user";
import { ReportsView } from "@/components/admin/ReportsView";

export default async function ReportsPage() {
  const appUser = await getOrCreateAppUser();
  if (!appUser.isAdmin) redirect("/today");
  return <ReportsView />;
}
