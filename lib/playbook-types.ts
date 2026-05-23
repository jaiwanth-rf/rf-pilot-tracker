export type SectionKind =
  | 'pre_requisites'
  | 'success_criteria'
  | 'obstacles'
  | 'promises'
  | 'next_steps'

export type ItemStatus =
  | 'pending'
  | 'wip'
  | 'check_with_team'
  | 'done'
  | 'resolved'
  | 'promised'
  | 'in_progress'
  | 'delivered'

export interface Playbook {
  id: string
  domain: string
  customer_name: string | null
  started_at: string
  ends_at: string | null
  created_by: string | null
  last_edited_at: string
  last_edited_by: string | null
  created_at: string
  updated_at: string
}

export interface PlaybookSection {
  id: string
  playbook_id: string
  kind: SectionKind
  title: string
  sort_order: number
  created_at: string
  updated_at: string
  items: PlaybookItem[]
}

export interface PlaybookItem {
  id: string
  section_id: string
  content: string
  status: ItemStatus
  owner: string | null
  due_date: string | null
  expected_date: string | null
  internal_note: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export const STATUS_BY_KIND: Record<SectionKind, ItemStatus[]> = {
  pre_requisites:   ['pending', 'wip', 'check_with_team', 'done'],
  success_criteria: ['pending', 'wip', 'check_with_team', 'done'],
  obstacles:        ['pending', 'resolved'],
  promises:         ['promised', 'in_progress', 'delivered'],
  next_steps:       ['pending', 'in_progress', 'done'],
}

export const STATUS_CONFIG: Record<ItemStatus, { label: string; bg: string; fg: string; bd: string }> = {
  pending:        { label: 'Pending',       bg: '#f9fafb', fg: '#6b7280', bd: '#e5e7eb' },
  wip:            { label: 'WIP',           bg: '#eff6ff', fg: '#1d4ed8', bd: '#bfdbfe' },
  check_with_team:{ label: 'Check w/ team', bg: '#fffbeb', fg: '#92400e', bd: '#fde68a' },
  done:           { label: 'Done',          bg: '#f0fdf4', fg: '#15803d', bd: '#bbf7d0' },
  resolved:       { label: 'Resolved',      bg: '#f0fdf4', fg: '#15803d', bd: '#bbf7d0' },
  promised:       { label: 'Promised',      bg: '#f5f3ff', fg: '#6d28d9', bd: '#ddd6fe' },
  in_progress:    { label: 'In progress',   bg: '#eff6ff', fg: '#2563eb', bd: '#bfdbfe' },
  delivered:      { label: 'Delivered',     bg: '#ecfdf5', fg: '#065f46', bd: '#a7f3d0' },
}

export const SECTION_LABELS: Record<SectionKind, string> = {
  pre_requisites:   'Pre-requisites',
  success_criteria: 'Success criteria',
  obstacles:        'Obstacles',
  promises:         'Promises',
  next_steps:       'Next steps',
}

export const SECTION_ORDER: SectionKind[] = [
  'pre_requisites',
  'success_criteria',
  'obstacles',
  'promises',
  'next_steps',
]

export const DEFAULT_PREREQ_ITEMS = [
  'Pilot team identified (5 named users + admin)',
  'Kickoff call scheduled',
  'RF account provisioned + SSO configured',
  'Chrome extension installed for all users',
  'Invinius export reviewed by RF migration team',
  'Pilot success criteria documented (this doc)',
]
