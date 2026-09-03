import { Priority, Project, ScheduleBlock, Task, TaskStatus, User, WorkTimeState } from "./types";
import { dkey, FRI, MON, TODAY_DATE, TODAY_KEY, TUE, WED, addDays } from "./dates";

export const CURRENT_USER_ID = "u1";

export interface SeedSeq {
  task: number;
  block: number;
  hist: number;
  proj: number;
  user: number;
}

export interface SeedResult {
  state: WorkTimeState;
  seq: SeedSeq;
}

export function buildSeedData(): SeedResult {
  const users: User[] = [
    { id: "u1", name: "Alex Chen", role: "Software Engineer", department: "Engineering", email: "alex@worktime.io", capacity: 8, color: "#2D5A8C" },
    { id: "u2", name: "Priya Nair", role: "Product Designer", department: "Design", email: "priya@worktime.io", capacity: 7, color: "#7C4A9E" },
    { id: "u3", name: "Marcus Webb", role: "Sales Lead", department: "Sales", email: "marcus@worktime.io", capacity: 8, color: "#1F7A6C" },
    { id: "u4", name: "Jordan Lee", role: "QA Engineer", department: "Engineering", email: "jordan@worktime.io", capacity: 8, color: "#8C5A2B" },
  ];

  const projects: Project[] = [
    { id: "p1", name: "CRM", color: "#2D5A8C", description: "Customer management module — engineering, design and QA." },
    { id: "p2", name: "Sales", color: "#6B4FA0", description: "Pipeline, proposals and client outreach." },
    { id: "p3", name: "Meridian", color: "#1F7A6C", description: "Meridian account relationship and renewal." },
    { id: "p4", name: "Personal", color: "#8B98A5", description: "Breaks and personal time." },
    { id: "p5", name: "General", color: "#B9C3CA", description: "Uncategorized or one-off work." },
  ];

  let taskSeq = 1;
  let blockSeq = 1;

  const tasks: Task[] = [];
  const blocks: ScheduleBlock[] = [];

  function seedTask(t: {
    title: string;
    project: string;
    description?: string;
    estimatedHours: number;
    completedHours: number;
    deadline: string;
    priority: Priority;
    status: TaskStatus;
    userId?: string;
    assignedDay?: string;
  }): string {
    const id = "t" + taskSeq++;
    tasks.push({
      id,
      title: t.title,
      project: t.project,
      description: t.description ?? "",
      estimatedHours: t.estimatedHours,
      completedHours: t.completedHours,
      deadline: t.deadline,
      priority: t.priority,
      status: t.status,
      userId: t.userId ?? CURRENT_USER_ID,
      assignedDay: t.assignedDay,
    });
    return id;
  }

  function seedBlock(b: { taskId: string; day: string; order: number; duration: number; label?: string }): string {
    const id = "b" + blockSeq++;
    blocks.push({ id, taskId: b.taskId, day: b.day, order: b.order, duration: b.duration, overflow: false, start: null, end: null, label: b.label });
    return id;
  }

  // --- Monday (past, completed) ---
  const tClientSync = seedTask({ title: "Client Sync", project: "Meridian", description: "Weekly account sync with the Meridian stakeholders.", estimatedHours: 3, completedHours: 3, deadline: dkey(MON), priority: "Medium", status: "Completed" });
  const tBreakMon = seedTask({ title: "Lunch Break", project: "Personal", description: "Time away from the desk — scheduled like any other task.", estimatedHours: 1, completedHours: 1, deadline: dkey(MON), priority: "Low", status: "Completed" });
  const tDesignReview = seedTask({ title: "Design Review", project: "CRM", description: "Review UI proposals for the customer module with the design team.", estimatedHours: 3, completedHours: 3, deadline: dkey(MON), priority: "Low", status: "Completed" });
  seedBlock({ taskId: tClientSync, day: dkey(MON), order: 0, duration: 3 });
  seedBlock({ taskId: tBreakMon, day: dkey(MON), order: 1, duration: 1 });
  seedBlock({ taskId: tDesignReview, day: dkey(MON), order: 2, duration: 3 });

  // --- Tuesday (past, completed) ---
  const tSprintPlanning = seedTask({ title: "Sprint Planning", project: "CRM", description: "Plan the two-week sprint scope with the team.", estimatedHours: 3, completedHours: 3, deadline: dkey(TUE), priority: "Medium", status: "Completed" });
  const tBreakTue = seedTask({ title: "Lunch Break", project: "Personal", description: "Time away from the desk — scheduled like any other task.", estimatedHours: 1, completedHours: 1, deadline: dkey(TUE), priority: "Low", status: "Completed" });
  const tFeatureBuild1 = seedTask({ title: "Feature Build — Contacts", project: "CRM", description: "Build the contacts list view for the customer module.", estimatedHours: 4, completedHours: 4, deadline: dkey(TUE), priority: "High", status: "Completed" });
  seedBlock({ taskId: tSprintPlanning, day: dkey(TUE), order: 0, duration: 3 });
  seedBlock({ taskId: tBreakTue, day: dkey(TUE), order: 1, duration: 1 });
  seedBlock({ taskId: tFeatureBuild1, day: dkey(TUE), order: 2, duration: 4 });

  // --- Wednesday (past, slightly overloaded — historical) ---
  const tFeatureBuild2 = seedTask({ title: "Feature Build — Payments", project: "CRM", description: "Wire up the payments panel inside the customer module.", estimatedHours: 4, completedHours: 4, deadline: dkey(WED), priority: "High", status: "Completed" });
  const tBreakWed = seedTask({ title: "Lunch Break", project: "Personal", description: "Time away from the desk — scheduled like any other task.", estimatedHours: 1, completedHours: 1, deadline: dkey(WED), priority: "Low", status: "Completed" });
  const tCodeReview = seedTask({ title: "Code Review", project: "CRM", description: "Review open pull requests from the sprint.", estimatedHours: 4, completedHours: 4, deadline: dkey(WED), priority: "Medium", status: "Completed" });
  seedBlock({ taskId: tFeatureBuild2, day: dkey(WED), order: 0, duration: 4 });
  seedBlock({ taskId: tBreakWed, day: dkey(WED), order: 1, duration: 1 });
  seedBlock({ taskId: tCodeReview, day: dkey(WED), order: 2, duration: 4 });

  // --- Thursday = TODAY (the live, interactive day) ---
  const tCRMDev = seedTask({ title: "CRM Development", project: "CRM", description: "Complete the customer management module: contacts, integrations and QA.", estimatedHours: 8, completedHours: 4, deadline: dkey(FRI), priority: "High", status: "In Progress" });
  const tBreakThu = seedTask({ title: "Lunch Break", project: "Personal", description: "Time away from the desk — scheduled like any other task.", estimatedHours: 1, completedHours: 0, deadline: TODAY_KEY, priority: "Low", status: "Planned" });
  const tCRMDocs = seedTask({ title: "CRM Documentation", project: "CRM", description: "Write end-user and API documentation for the customer module.", estimatedHours: 1, completedHours: 0, deadline: dkey(addDays(TODAY_DATE, 2)), priority: "Medium", status: "Planned" });
  seedBlock({ taskId: tCRMDev, day: TODAY_KEY, order: 0, duration: 2, label: "Customer Module" });
  seedBlock({ taskId: tCRMDev, day: TODAY_KEY, order: 1, duration: 2, label: "API Integration" });
  seedBlock({ taskId: tBreakThu, day: TODAY_KEY, order: 2, duration: 1 });
  seedBlock({ taskId: tCRMDev, day: TODAY_KEY, order: 3, duration: 2, label: "Testing" });
  seedBlock({ taskId: tCRMDocs, day: TODAY_KEY, order: 4, duration: 1 });

  // --- Friday (future, planned) ---
  const tRetro = seedTask({ title: "Sprint Retro", project: "CRM", description: "Retrospective on the last two-week sprint.", estimatedHours: 2, completedHours: 0, deadline: dkey(FRI), priority: "Low", status: "Planned" });
  const tBreakFri = seedTask({ title: "Lunch Break", project: "Personal", description: "Time away from the desk — scheduled like any other task.", estimatedHours: 1, completedHours: 0, deadline: dkey(FRI), priority: "Low", status: "Planned" });
  const tBuffer = seedTask({ title: "Planning Buffer", project: "CRM", description: "Reserved time for whatever the sprint kickoff needs.", estimatedHours: 3, completedHours: 0, deadline: dkey(FRI), priority: "Low", status: "Planned" });
  seedBlock({ taskId: tRetro, day: dkey(FRI), order: 0, duration: 2 });
  seedBlock({ taskId: tBreakFri, day: dkey(FRI), order: 1, duration: 1 });
  seedBlock({ taskId: tBuffer, day: dkey(FRI), order: 2, duration: 3 });

  // --- Teammates (admin-visible only — plain hours-per-day, no draggable timeline) ---

  // Priya Nair — Product Designer (capacity 7h/day)
  seedTask({ userId: "u2", title: "Wireframe Review", project: "CRM", estimatedHours: 3, completedHours: 3, assignedDay: dkey(MON), deadline: dkey(MON), priority: "Medium", status: "Completed" });
  seedTask({ userId: "u2", title: "User Interviews", project: "CRM", estimatedHours: 3, completedHours: 3, assignedDay: dkey(MON), deadline: dkey(MON), priority: "Medium", status: "Completed" });
  seedTask({ userId: "u2", title: "Design System Updates", project: "CRM", estimatedHours: 4, completedHours: 4, assignedDay: dkey(TUE), deadline: dkey(TUE), priority: "Medium", status: "Completed" });
  seedTask({ userId: "u2", title: "Stakeholder Review", project: "CRM", estimatedHours: 3, completedHours: 3, assignedDay: dkey(TUE), deadline: dkey(TUE), priority: "Medium", status: "Completed" });
  seedTask({ userId: "u2", title: "Prototype Testing", project: "CRM", estimatedHours: 5, completedHours: 5, assignedDay: dkey(WED), deadline: dkey(WED), priority: "High", status: "Completed" });
  seedTask({ userId: "u2", title: "Design Critique", project: "CRM", estimatedHours: 3, completedHours: 3, assignedDay: dkey(WED), deadline: dkey(WED), priority: "Low", status: "Completed" });
  seedTask({ userId: "u2", title: "Customer Module UI Polish", project: "CRM", estimatedHours: 4, completedHours: 0, assignedDay: TODAY_KEY, deadline: dkey(FRI), priority: "High", status: "In Progress" });
  seedTask({ userId: "u2", title: "Handoff Prep", project: "CRM", estimatedHours: 2, completedHours: 0, assignedDay: TODAY_KEY, deadline: dkey(FRI), priority: "Medium", status: "Planned" });
  seedTask({ userId: "u2", title: "Sprint Demo Prep", project: "CRM", estimatedHours: 3, completedHours: 0, assignedDay: dkey(FRI), deadline: dkey(FRI), priority: "Low", status: "Planned" });

  // Marcus Webb — Sales Lead (capacity 8h/day)
  seedTask({ userId: "u3", title: "Pipeline Review", project: "Sales", estimatedHours: 2, completedHours: 2, assignedDay: dkey(MON), deadline: dkey(MON), priority: "Medium", status: "Completed" });
  seedTask({ userId: "u3", title: "Client Calls", project: "Sales", estimatedHours: 4, completedHours: 4, assignedDay: dkey(MON), deadline: dkey(MON), priority: "Medium", status: "Completed" });
  seedTask({ userId: "u3", title: "Proposal Writing", project: "Sales", estimatedHours: 3, completedHours: 3, assignedDay: dkey(TUE), deadline: dkey(TUE), priority: "High", status: "Completed" });
  seedTask({ userId: "u3", title: "Client Calls", project: "Sales", estimatedHours: 5, completedHours: 5, assignedDay: dkey(TUE), deadline: dkey(TUE), priority: "Medium", status: "Completed" });
  seedTask({ userId: "u3", title: "Contract Negotiation", project: "Sales", estimatedHours: 6, completedHours: 6, assignedDay: dkey(WED), deadline: dkey(WED), priority: "High", status: "Completed" });
  seedTask({ userId: "u3", title: "Team Sync", project: "Sales", estimatedHours: 2, completedHours: 2, assignedDay: dkey(WED), deadline: dkey(WED), priority: "Low", status: "Completed" });
  seedTask({ userId: "u3", title: "Meridian Renewal Call", project: "Meridian", estimatedHours: 3, completedHours: 0, assignedDay: TODAY_KEY, deadline: TODAY_KEY, priority: "High", status: "In Progress" });
  seedTask({ userId: "u3", title: "Proposal Writing — Atlas", project: "Sales", estimatedHours: 4, completedHours: 0, assignedDay: TODAY_KEY, deadline: dkey(FRI), priority: "Medium", status: "Planned" });
  seedTask({ userId: "u3", title: "Weekly Forecast", project: "Sales", estimatedHours: 2, completedHours: 0, assignedDay: dkey(FRI), deadline: dkey(FRI), priority: "Low", status: "Planned" });
  seedTask({ userId: "u3", title: "Pipeline Cleanup", project: "Sales", estimatedHours: 3, completedHours: 0, assignedDay: dkey(FRI), deadline: dkey(FRI), priority: "Low", status: "Planned" });

  // Jordan Lee — QA Engineer (capacity 8h/day) — runs tight mid-week, good example for the admin reports
  seedTask({ userId: "u4", title: "Regression Suite", project: "CRM", estimatedHours: 5, completedHours: 5, assignedDay: dkey(MON), deadline: dkey(MON), priority: "High", status: "Completed" });
  seedTask({ userId: "u4", title: "Bug Triage", project: "CRM", estimatedHours: 3, completedHours: 3, assignedDay: dkey(MON), deadline: dkey(MON), priority: "Medium", status: "Completed" });
  seedTask({ userId: "u4", title: "Regression Suite", project: "CRM", estimatedHours: 5, completedHours: 5, assignedDay: dkey(TUE), deadline: dkey(TUE), priority: "High", status: "Completed" });
  seedTask({ userId: "u4", title: "Automation Scripts", project: "CRM", estimatedHours: 4, completedHours: 4, assignedDay: dkey(TUE), deadline: dkey(TUE), priority: "Medium", status: "Completed" });
  seedTask({ userId: "u4", title: "Release Testing", project: "CRM", estimatedHours: 6, completedHours: 6, assignedDay: dkey(WED), deadline: dkey(WED), priority: "High", status: "Completed" });
  seedTask({ userId: "u4", title: "Bug Triage", project: "CRM", estimatedHours: 4, completedHours: 4, assignedDay: dkey(WED), deadline: dkey(WED), priority: "Medium", status: "Completed" });
  seedTask({ userId: "u4", title: "CRM Module QA", project: "CRM", estimatedHours: 5, completedHours: 0, assignedDay: TODAY_KEY, deadline: dkey(FRI), priority: "High", status: "In Progress" });
  seedTask({ userId: "u4", title: "Automation Scripts", project: "CRM", estimatedHours: 4, completedHours: 0, assignedDay: TODAY_KEY, deadline: dkey(FRI), priority: "Medium", status: "Planned" });
  seedTask({ userId: "u4", title: "Release Sign-off", project: "CRM", estimatedHours: 3, completedHours: 0, assignedDay: dkey(FRI), deadline: dkey(FRI), priority: "High", status: "Planned" });
  seedTask({ userId: "u4", title: "Sprint Retro", project: "CRM", estimatedHours: 2, completedHours: 0, assignedDay: dkey(FRI), deadline: dkey(FRI), priority: "Low", status: "Planned" });

  const state: WorkTimeState = {
    settings: { workStart: "09:00", workEnd: "18:00", capacity: 8, defaultSlot: 60 },
    users,
    projects,
    tasks,
    blocks,
    history: [],
  };

  return { state, seq: { task: taskSeq, block: blockSeq, hist: 1, proj: projects.length + 1, user: users.length + 1 } };
}
