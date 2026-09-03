"use client";

import { WorkTimeProvider, useWorkTime } from "@/lib/scheduling/context";
import type { WorkTimeState } from "@/lib/scheduling/types";
import { Sidebar } from "./Sidebar";
import { ToastContainer } from "@/components/ui/ToastContainer";
import { AddTaskModal } from "@/components/modals/AddTaskModal";
import { AddUserModal } from "@/components/modals/AddUserModal";
import { AddProjectModal } from "@/components/modals/AddProjectModal";
import { TaskDetailPanel } from "@/components/panels/TaskDetailPanel";
import { UserDetailPanel } from "@/components/panels/UserDetailPanel";
import { ProjectDetailPanel } from "@/components/panels/ProjectDetailPanel";
import { QuickInsertPopover } from "@/components/timeline/QuickInsertPopover";

function Overlays() {
  const store = useWorkTime();
  return (
    <>
      {store.ui.addTask && <AddTaskModal key={store.ui.addTaskKey} opts={store.ui.addTask} />}
      {store.ui.addUser && <AddUserModal key={store.ui.addUserKey} />}
      {store.ui.addProject && <AddProjectModal key={store.ui.addProjectKey} />}
      {store.ui.taskDetail && <TaskDetailPanel />}
      {store.ui.userDetail && <UserDetailPanel />}
      {store.ui.projectDetail && <ProjectDetailPanel />}
      {store.ui.quickInsert && <QuickInsertPopover key={store.ui.quickInsertKey} qi={store.ui.quickInsert} />}
      <ToastContainer />
    </>
  );
}

export function AppShell({ children, initialState }: { children: React.ReactNode; initialState: WorkTimeState }) {
  return (
    <WorkTimeProvider initialState={initialState}>
      <div className="app">
        <Sidebar />
        <main className="content">{children}</main>
      </div>
      <Overlays />
    </WorkTimeProvider>
  );
}
