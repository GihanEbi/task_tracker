"use client";

import { useWorkTime } from "@/lib/scheduling/context";
import { Topbar } from "@/components/layout/Topbar";
import { UserAvatar } from "@/components/ui/UserAvatar";

export function TeamView() {
  const store = useWorkTime();

  return (
    <>
      <Topbar eyebrow="Admin" title="Team" action={{ label: "+ Add user", onClick: () => store.openAddUserModal() }} />
      <div className="people-grid">
        {store.state.users.map((u) => {
          const taskCount = store.tasksForUser(u.id).length;
          return (
            <button className="user-card" key={u.id} onClick={() => store.openUserDetail(u.id)}>
              <div className="user-card-top">
                <UserAvatar name={u.name} color={u.color} />
                <div>
                  <div className="user-card-name">
                    {u.name}
                    {u.id === store.state.currentUserId ? " · You" : ""}
                  </div>
                  <div className="user-card-role">
                    {u.role}
                    {u.isAdmin ? " · Admin" : ""}
                  </div>
                </div>
              </div>
              <div className="user-card-stats">
                <div className="user-card-hours">
                  {taskCount} <span style={{ fontSize: 11, color: "var(--ink-faint)", fontWeight: 400 }}>task{taskCount === 1 ? "" : "s"}</span>
                </div>
                <span className="badge b-neutral">{u.capacity}h/day</span>
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}
