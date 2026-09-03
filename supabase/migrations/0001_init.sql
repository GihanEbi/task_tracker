create extension if not exists pgcrypto;

create table users (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text unique,
  name text not null,
  role text not null,
  department text not null,
  email text not null,
  capacity numeric not null default 8,
  color text not null,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text not null,
  description text not null default '',
  created_at timestamptz not null default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  project_id uuid not null references projects(id),
  description text not null default '',
  estimated_hours numeric not null default 0 check (estimated_hours >= 0),
  completed_hours numeric not null default 0 check (completed_hours >= 0),
  deadline date not null,
  priority text not null check (priority in ('High','Medium','Low')),
  status text not null check (status in ('Planned','In Progress','Completed')),
  user_id uuid not null references users(id),
  assigned_day date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tasks_user_id_idx on tasks(user_id);
create index tasks_project_id_idx on tasks(project_id);

create table schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  day date not null,
  "order" numeric not null,
  duration numeric not null check (duration > 0),
  overflow boolean not null default false,
  start_minutes integer,
  end_minutes integer,
  label text,
  created_at timestamptz not null default now()
);
create index schedule_blocks_day_idx on schedule_blocks(day);
create index schedule_blocks_task_id_idx on schedule_blocks(task_id);

create table schedule_history (
  id uuid primary key default gen_random_uuid(),
  block_id uuid references schedule_blocks(id) on delete cascade,
  task_id uuid not null references tasks(id) on delete cascade,
  ts timestamptz not null default now(),
  text text not null,
  is_move boolean not null default false
);
create index schedule_history_task_id_idx on schedule_history(task_id);

create table user_settings (
  user_id uuid primary key references users(id) on delete cascade,
  work_start text not null default '09:00',
  capacity numeric not null default 8,
  default_slot integer not null default 60
);
