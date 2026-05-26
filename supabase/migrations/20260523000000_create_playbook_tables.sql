-- ─── Pilot Playbook schema ─────────────────────────────────────────────────
-- Apply manually in Supabase SQL editor. Do NOT auto-apply.
--
-- Prerequisites:
--   • tracked_domains table already exists (created by the Dashboard feature).
--     The FK below references tracked_domains(domain) — make sure a unique
--     index exists on tracked_domains.domain before applying if FK enforcement
--     is desired. The UNIQUE constraint on playbooks.domain ensures one
--     playbook per domain globally regardless.
--   • auth schema available (standard on every Supabase project).

-- ─── Item status enum ─────────────────────────────────────────────────────

do $$ begin
  create type item_status as enum (
    'pending', 'wip', 'check_with_team', 'done',
    'resolved', 'promised', 'in_progress', 'delivered'
  );
exception when duplicate_object then null; end $$;

-- ─── Section kind enum ────────────────────────────────────────────────────

do $$ begin
  create type section_kind as enum (
    'pre_requisites', 'success_criteria', 'obstacles', 'promises', 'next_steps'
  );
exception when duplicate_object then null; end $$;

-- ─── playbooks ─────────────────────────────────────────────────────────────

create table if not exists playbooks (
  id              uuid primary key default gen_random_uuid(),
  domain          text unique not null,
  customer_name   text,
  started_at      timestamptz not null default now(),
  ends_at         timestamptz,
  created_by      uuid references auth.users on delete set null,
  last_edited_at  timestamptz not null default now(),
  last_edited_by  uuid references auth.users on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─── playbook_sections ─────────────────────────────────────────────────────

create table if not exists playbook_sections (
  id           uuid primary key default gen_random_uuid(),
  playbook_id  uuid not null references playbooks(id) on delete cascade,
  kind         section_kind not null,
  title        text not null,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists playbook_sections_playbook_id_idx on playbook_sections(playbook_id);

-- ─── playbook_items ────────────────────────────────────────────────────────

create table if not exists playbook_items (
  id              uuid primary key default gen_random_uuid(),
  section_id      uuid not null references playbook_sections(id) on delete cascade,
  content         text not null default '',
  status          item_status not null default 'pending',
  owner           text,
  due_date        date,
  expected_date   date,
  internal_note   text,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists playbook_items_section_id_idx on playbook_items(section_id);

-- ─── updated_at triggers ──────────────────────────────────────────────────

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

do $$ begin
  create trigger playbooks_updated_at before update on playbooks
    for each row execute function set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger playbook_sections_updated_at before update on playbook_sections
    for each row execute function set_updated_at();
exception when duplicate_object then null; end $$;

do $$ begin
  create trigger playbook_items_updated_at before update on playbook_items
    for each row execute function set_updated_at();
exception when duplicate_object then null; end $$;

-- ─── Row Level Security ────────────────────────────────────────────────────
-- Playbooks are scoped per-account-globally: any authenticated user can
-- read and write any playbook. Per-workspace scoping comes in a later phase.

alter table playbooks          enable row level security;
alter table playbook_sections  enable row level security;
alter table playbook_items     enable row level security;

-- playbooks
create policy "authenticated read playbooks"
  on playbooks for select to authenticated using (true);

create policy "authenticated insert playbooks"
  on playbooks for insert to authenticated with check (true);

create policy "authenticated update playbooks"
  on playbooks for update to authenticated using (true);

create policy "authenticated delete playbooks"
  on playbooks for delete to authenticated using (true);

-- playbook_sections
create policy "authenticated read sections"
  on playbook_sections for select to authenticated using (true);

create policy "authenticated insert sections"
  on playbook_sections for insert to authenticated with check (true);

create policy "authenticated update sections"
  on playbook_sections for update to authenticated using (true);

create policy "authenticated delete sections"
  on playbook_sections for delete to authenticated using (true);

-- playbook_items
create policy "authenticated read items"
  on playbook_items for select to authenticated using (true);

create policy "authenticated insert items"
  on playbook_items for insert to authenticated with check (true);

create policy "authenticated update items"
  on playbook_items for update to authenticated using (true);

create policy "authenticated delete items"
  on playbook_items for delete to authenticated using (true);
