import { supabase } from '@/lib/supabase'
import type {
  Playbook,
  PlaybookSection,
  PlaybookItem,
  SectionKind,
  ItemStatus,
} from '@/lib/playbook-types'
import {
  SECTION_ORDER,
  DEFAULT_PREREQ_ITEMS,
} from '@/lib/playbook-types'

// ─── Fetch ────────────────────────────────────────────────────────────────

export async function fetchPlaybook(domain: string): Promise<{
  playbook: Playbook
  sections: PlaybookSection[]
} | null> {
  const { data: pb, error } = await supabase
    .from('playbooks')
    .select('*')
    .eq('domain', domain)
    .single()

  if (error || !pb) return null

  const { data: sections } = await supabase
    .from('playbook_sections')
    .select('*, items:playbook_items(*)')
    .eq('playbook_id', pb.id)
    .order('sort_order', { ascending: true })

  const shaped = (sections ?? []).map((s: any) => ({
    ...s,
    items: (s.items ?? []).sort((a: PlaybookItem, b: PlaybookItem) => a.sort_order - b.sort_order),
  })) as PlaybookSection[]

  return { playbook: pb as Playbook, sections: shaped }
}

// ─── Create with defaults ─────────────────────────────────────────────────

export async function createPlaybook(
  domain: string,
  customerName: string | null,
  userId: string,
): Promise<{ playbook: Playbook; sections: PlaybookSection[] } | null> {
  const { data: pb, error: pbErr } = await supabase
    .from('playbooks')
    .insert({
      domain,
      customer_name: customerName,
      created_by: userId,
      last_edited_by: userId,
    })
    .select()
    .single()

  if (pbErr || !pb) return null

  const sectionRows = SECTION_ORDER.map((kind, i) => ({
    playbook_id: pb.id,
    kind,
    title: kindToTitle(kind),
    sort_order: i,
  }))

  const { data: sections, error: secErr } = await supabase
    .from('playbook_sections')
    .insert(sectionRows)
    .select()

  if (secErr || !sections) return null

  const prereqSection = sections.find((s: any) => s.kind === 'pre_requisites')
  if (prereqSection) {
    const itemRows = DEFAULT_PREREQ_ITEMS.map((content, i) => ({
      section_id: prereqSection.id,
      content,
      status: 'pending' as ItemStatus,
      sort_order: i,
    }))
    await supabase.from('playbook_items').insert(itemRows)
  }

  return fetchPlaybook(domain)
}

function kindToTitle(kind: SectionKind): string {
  const map: Record<SectionKind, string> = {
    pre_requisites:   'Pre-requisites',
    success_criteria: 'Success criteria',
    obstacles:        'Obstacles',
    promises:         'Promises',
    next_steps:       'Next steps',
  }
  return map[kind]
}

// ─── Playbook updates ─────────────────────────────────────────────────────

export async function updatePlaybookMeta(
  playbookId: string,
  patch: Partial<Pick<Playbook, 'customer_name' | 'started_at' | 'ends_at'>>,
  userId: string,
) {
  return supabase
    .from('playbooks')
    .update({ ...patch, last_edited_at: new Date().toISOString(), last_edited_by: userId })
    .eq('id', playbookId)
}

// ─── Section mutations ────────────────────────────────────────────────────

export async function addSection(
  playbookId: string,
  kind: SectionKind,
  title: string,
  sortOrder: number,
): Promise<PlaybookSection | null> {
  const { data, error } = await supabase
    .from('playbook_sections')
    .insert({ playbook_id: playbookId, kind, title, sort_order: sortOrder })
    .select()
    .single()
  if (error) return null
  return { ...(data as PlaybookSection), items: [] }
}

export async function updateSectionTitle(sectionId: string, title: string) {
  return supabase
    .from('playbook_sections')
    .update({ title })
    .eq('id', sectionId)
}

export async function deleteSection(sectionId: string) {
  return supabase.from('playbook_sections').delete().eq('id', sectionId)
}

export async function reorderSections(updates: { id: string; sort_order: number }[]) {
  return Promise.all(
    updates.map(({ id, sort_order }) =>
      supabase.from('playbook_sections').update({ sort_order }).eq('id', id),
    ),
  )
}

// ─── Item mutations ───────────────────────────────────────────────────────

export async function addItem(
  sectionId: string,
  sortOrder: number,
  defaultStatus: ItemStatus = 'pending',
): Promise<PlaybookItem | null> {
  const { data, error } = await supabase
    .from('playbook_items')
    .insert({ section_id: sectionId, content: '', status: defaultStatus, sort_order: sortOrder })
    .select()
    .single()
  if (error) return null
  return data as PlaybookItem
}

export async function updateItem(
  itemId: string,
  patch: Partial<Pick<PlaybookItem, 'content' | 'status' | 'owner' | 'due_date' | 'expected_date' | 'internal_note'>>,
) {
  return supabase.from('playbook_items').update(patch).eq('id', itemId)
}

export async function deleteItem(itemId: string) {
  return supabase.from('playbook_items').delete().eq('id', itemId)
}

export async function reorderItems(updates: { id: string; sort_order: number }[]) {
  return Promise.all(
    updates.map(({ id, sort_order }) =>
      supabase.from('playbook_items').update({ sort_order }).eq('id', id),
    ),
  )
}
