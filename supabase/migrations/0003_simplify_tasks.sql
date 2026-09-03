-- Simplify tasks: drop deadline/status/completed_hours/assigned_day (no
-- deadline-risk or completion tracking in this product), add created_by /
-- updated_by audit columns alongside the existing created_at / updated_at.

alter table tasks
  drop column deadline,
  drop column status,
  drop column completed_hours,
  drop column assigned_day;

alter table tasks
  add column created_by uuid references users(id),
  add column updated_by uuid references users(id);

update tasks set created_by = user_id, updated_by = user_id where created_by is null;

alter table tasks
  alter column created_by set not null,
  alter column updated_by set not null;
