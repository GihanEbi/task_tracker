import { redirect } from "next/navigation";
import { getOrCreateAppUser } from "@/lib/scheduling/current-user";
import { ProjectsView } from "@/components/admin/ProjectsView";

export default async function ProjectsPage() {
  const appUser = await getOrCreateAppUser();
  if (!appUser.isAdmin) redirect("/today");
  return <ProjectsView />;
}
