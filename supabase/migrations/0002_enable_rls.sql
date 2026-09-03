-- Lock every table down to the secret key only. No policies are defined, so
-- with RLS enabled the publishable (public) key gets zero access — all reads
-- and writes must go through the Next.js Server Actions, which use the
-- secret key (bypasses RLS) after their own authorization checks.
alter table users enable row level security;
alter table projects enable row level security;
alter table tasks enable row level security;
alter table schedule_blocks enable row level security;
alter table schedule_history enable row level security;
alter table user_settings enable row level security;
