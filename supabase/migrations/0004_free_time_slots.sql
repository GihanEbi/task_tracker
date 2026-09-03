-- Free time slots reuse the tasks table: project and priority become
-- optional (NULL = not applicable), flagged by is_free_slot. The existing
-- priority check constraint already tolerates NULL values.

alter table tasks
  alter column project_id drop not null,
  alter column priority drop not null;

alter table tasks
  add column is_free_slot boolean not null default false;
