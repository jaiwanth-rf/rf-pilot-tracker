'use client'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import type { ItemStatus, Playbook, PlaybookItem, PlaybookSection as PlaybookSectionData, SectionKind } from '@/lib/playbook-types'
import { SECTION_ORDER, STATUS_BY_KIND } from '@/lib/playbook-types'
import {
  addItem,
  addSection,
  createPlaybook,
  deleteItem,
  deleteSection,
  fetchPlaybook,
  reorderItems,
  updateItem,
  updateSectionTitle,
} from '@/lib/playbook-queries'
import PlaybookSection from './PlaybookSection'

const FONT = "'Nunito', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

interface Props {
  domain: string
  customerName: string | null
  userId: string
  presentMode?: boolean
}

export default function PilotPlaybookTab({
  domain,
  customerName,
  userId,
  presentMode = false,
}: Props) {
  const router = useRouter()
  const [playbook, setPlaybook] = useState<Playbook | null>(null)
  const [sections, setSections] = useState<PlaybookSectionData[]>([])
  const [loading, setLoading] = useState(true)
  const [newGroupName, setNewGroupName] = useState('')
  const [addingGroup, setAddingGroup] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    let result = await fetchPlaybook(domain)
    if (!result) {
      result = await createPlaybook(domain, customerName, userId)
    }
    if (result) {
      setPlaybook(result.playbook)
      setSections(orderSections(result.sections))
    }
    setLoading(false)
  }, [domain, customerName, userId])

  useEffect(() => { load() }, [load])

  // Esc to exit present mode
  useEffect(() => {
    if (!presentMode) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') router.push(`/accounts/${domain}`)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [presentMode, domain, router])

  // ─── Attention dot logic ──────────────────────────────────────────
  const hasAttention = sections.some(s => {
    if (s.kind === 'obstacles' && s.items.some(i => i.status === 'pending')) return true
    if (s.kind === 'promises' && s.items.some(i => {
      if (!i.expected_date) return false
      if (i.status === 'delivered') return false
      return new Date(i.expected_date) < new Date()
    })) return true
    if (s.kind === 'pre_requisites' && s.items.some(i => {
      if (i.status === 'done') return false
      return i.due_date && new Date(i.due_date) < new Date()
    })) return true
    return false
  })
  void hasAttention // exposed via export below

  // ─── Handlers ─────────────────────────────────────────────────────

  function updateItemOptimistic(
    sectionId: string,
    itemId: string,
    patch: Partial<PlaybookItem>,
  ) {
    setSections(prev =>
      prev.map(s =>
        s.id !== sectionId
          ? s
          : { ...s, items: s.items.map(i => (i.id === itemId ? { ...i, ...patch } : i)) },
      ),
    )
    updateItem(itemId, patch).then(({ error }) => {
      if (error) {
        toast.error('Failed to save — reverting')
        load()
      }
    })
  }

  async function handleAddItem(sectionId: string) {
    const section = sections.find(s => s.id === sectionId)
    if (!section) return
    const sortOrder = section.items.length
    const defaultStatus: ItemStatus = STATUS_BY_KIND[section.kind][0]
    const item = await addItem(sectionId, sortOrder, defaultStatus)
    if (!item) { toast.error('Failed to add item'); return }
    setSections(prev =>
      prev.map(s => (s.id === sectionId ? { ...s, items: [...s.items, item] } : s)),
    )
  }

  async function handleDeleteItem(sectionId: string, itemId: string) {
    setSections(prev =>
      prev.map(s =>
        s.id !== sectionId ? s : { ...s, items: s.items.filter(i => i.id !== itemId) },
      ),
    )
    const { error } = await deleteItem(itemId)
    if (error) { toast.error('Failed to delete'); load() }
  }

  async function handleReorderItems(sectionId: string, reordered: PlaybookItem[]) {
    setSections(prev =>
      prev.map(s => (s.id === sectionId ? { ...s, items: reordered } : s)),
    )
    await reorderItems(reordered.map(i => ({ id: i.id, sort_order: i.sort_order })))
  }

  async function handleRenameSection(sectionId: string, title: string) {
    setSections(prev => prev.map(s => (s.id === sectionId ? { ...s, title } : s)))
    const { error } = await updateSectionTitle(sectionId, title)
    if (error) { toast.error('Failed to rename'); load() }
  }

  async function handleDeleteSection(sectionId: string) {
    setSections(prev => prev.filter(s => s.id !== sectionId))
    const { error } = await deleteSection(sectionId)
    if (error) { toast.error('Failed to delete group'); load() }
  }

  async function handleAddGroup() {
    if (!playbook || !newGroupName.trim()) return
    const existingGroups = sections.filter(s => s.kind === 'success_criteria')
    const sortOrder = Math.max(...existingGroups.map(s => s.sort_order), 0) + 1
    const section = await addSection(playbook.id, 'success_criteria', newGroupName.trim(), sortOrder)
    if (!section) { toast.error('Failed to add group'); return }
    setSections(prev => orderSections([...prev, section]))
    setNewGroupName('')
    setAddingGroup(false)
  }

  function handleExportPDF() {
    const date = new Date().toISOString().slice(0, 10)
    document.title = `${domain}-pilot-playbook-${date}`
    window.print()
    setTimeout(() => { document.title = 'RF Pilot Tracker' }, 1000)
  }

  // ─── Loading ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ padding: '48px 0', textAlign: 'center', fontFamily: FONT }}>
        <div style={{ display: 'inline-block', width: 32, height: 32, border: '3px solid #e5e7eb', borderTopColor: '#4aa1ff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        <div style={{ marginTop: 12, fontSize: 13, color: '#6b7280' }}>Loading playbook…</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!playbook) {
    return (
      <div style={{ padding: '48px 0', textAlign: 'center', fontFamily: FONT, fontSize: 13, color: '#6b7280' }}>
        Could not load playbook. Check your Supabase connection.
      </div>
    )
  }

  // ─── Section grouping: success_criteria sections interleaved ─────

  const sectionsByKind: Record<string, PlaybookSectionData[]> = {}
  sections.forEach(s => {
    if (!sectionsByKind[s.kind]) sectionsByKind[s.kind] = []
    sectionsByKind[s.kind].push(s)
  })

  return (
    <div style={{ fontFamily: FONT }}>
      {/* Playbook header */}
      <div style={{
        background: '#fff',
        border: '1px solid #e8edf5',
        borderRadius: 12,
        padding: '20px 24px',
        marginBottom: 24,
        boxShadow: '0 1px 4px rgba(15,31,61,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
          <div>
            <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 800, color: '#0f1f3d', letterSpacing: '-0.02em' }}>
              {customerName || domain}
            </h2>
            <div style={{ display: 'flex', gap: 16, fontSize: 12.5, color: '#6b7280', fontWeight: 500, flexWrap: 'wrap' }}>
              <span>
                <strong style={{ color: '#374151' }}>Pilot start:</strong>{' '}
                {formatDate(playbook.started_at)}
              </span>
              {playbook.ends_at && (
                <span>
                  <strong style={{ color: '#374151' }}>Pilot end:</strong>{' '}
                  {formatDate(playbook.ends_at)}
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
            <button
              onClick={handleExportPDF}
              style={ghostBtn}
              title="Export to PDF"
            >
              <PDFIcon />
              Export PDF
            </button>
            {!presentMode && (
              <button
                onClick={() => router.push(`/accounts/${domain}/playbook/present`)}
                style={{
                  background: '#0f1f3d', color: '#fff', border: 'none',
                  borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                  fontFamily: FONT,
                }}
              >
                <PresentIcon />
                Present mode
              </button>
            )}
            {presentMode && (
              <button
                onClick={() => router.push(`/accounts/${domain}`)}
                style={ghostBtn}
                title="Exit present mode (Esc)"
              >
                <XIcon />
                Exit present
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sections */}
      <div style={{
        background: '#fff',
        border: '1px solid #e8edf5',
        borderRadius: 12,
        padding: '24px 24px',
        boxShadow: '0 1px 4px rgba(15,31,61,0.04)',
      }}>
        {SECTION_ORDER.map(kind => {
          const kindsForThisGroup = sectionsByKind[kind] ?? []
          if (kindsForThisGroup.length === 0) return null

          if (kind === 'success_criteria') {
            // Render all success_criteria sections together under one header
            return (
              <div key={kind} style={{ marginBottom: 32 }}>
                <SectionHeader kind={kind} />
                {kindsForThisGroup.map(section => (
                  <PlaybookSection
                    key={section.id}
                    section={section}
                    presentMode={presentMode}
                    onAddItem={() => handleAddItem(section.id)}
                    onUpdateItem={(itemId, patch) => updateItemOptimistic(section.id, itemId, patch)}
                    onDeleteItem={itemId => handleDeleteItem(section.id, itemId)}
                    onReorderItems={(sid, items) => handleReorderItems(sid, items)}
                    onRenameSection={t => handleRenameSection(section.id, t)}
                    onDeleteSection={() => handleDeleteSection(section.id)}
                  />
                ))}
                {/* Add team group button */}
                {!presentMode && (
                  <div style={{ marginTop: 4 }}>
                    {addingGroup ? (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                          value={newGroupName}
                          onChange={e => setNewGroupName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleAddGroup()
                            if (e.key === 'Escape') { setAddingGroup(false); setNewGroupName('') }
                          }}
                          autoFocus
                          placeholder="Group name, e.g. Operations"
                          style={{
                            flex: 1, border: '1px solid #a0ccfe', borderRadius: 6,
                            padding: '6px 10px', fontSize: 13, fontFamily: FONT,
                            outline: 'none', background: '#f8fcff', color: '#1e1c18',
                          }}
                        />
                        <button onClick={handleAddGroup} style={{ background: '#0f1f3d', color: '#fff', border: 'none', borderRadius: 7, padding: '7px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}>Add</button>
                        <button onClick={() => { setAddingGroup(false); setNewGroupName('') }} style={{ background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 7, padding: '7px 10px', fontSize: 12, cursor: 'pointer', fontFamily: FONT }}>Cancel</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAddingGroup(true)}
                        style={{
                          background: 'none', border: '1px dashed #d1d5db', borderRadius: 8,
                          padding: '6px 12px', fontSize: 12, color: '#6b7280', cursor: 'pointer',
                          fontFamily: FONT, display: 'flex', alignItems: 'center', gap: 6,
                        }}
                      >
                        <PlusIcon />
                        Add team group
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          }

          return (
            <div key={kind} style={{ marginBottom: 32 }}>
              <SectionHeader kind={kind} />
              {kindsForThisGroup.map(section => (
                <PlaybookSection
                  key={section.id}
                  section={section}
                  presentMode={presentMode}
                  onAddItem={() => handleAddItem(section.id)}
                  onUpdateItem={(itemId, patch) => updateItemOptimistic(section.id, itemId, patch)}
                  onDeleteItem={itemId => handleDeleteItem(section.id, itemId)}
                  onReorderItems={(sid, items) => handleReorderItems(sid, items)}
                />
              ))}
            </div>
          )
        })}
      </div>

      {/* Print stylesheet */}
      <style>{`
        @media print {
          body > *:not(#playbook-print-root) { display: none !important; }
          #playbook-print-root { display: block !important; }
          .no-print { display: none !important; }
          @page { margin: 1.2cm; }
        }
      `}</style>
    </div>
  )
}

// ─── Header for each top-level section kind ───────────────────────────────

function SectionHeader({ kind }: { kind: SectionKind }) {
  const cfg: Record<SectionKind, { label: string; bg: string; fg: string; bd: string; emoji: string }> = {
    pre_requisites:   { label: 'Pre-requisites',   bg: '#f0f9ff', fg: '#0369a1', bd: '#bae6fd', emoji: '✅' },
    success_criteria: { label: 'Success criteria', bg: '#f0fdf4', fg: '#15803d', bd: '#bbf7d0', emoji: '🎯' },
    obstacles:        { label: 'Obstacles',        bg: '#fff7ed', fg: '#c2410c', bd: '#fed7aa', emoji: '⚠️' },
    promises:         { label: 'Promises',         bg: '#faf5ff', fg: '#6d28d9', bd: '#ddd6fe', emoji: '🤝' },
    next_steps:       { label: 'Next steps',       bg: '#f8faff', fg: '#1d4ed8', bd: '#bfdbfe', emoji: '→' },
  }
  const c = cfg[kind]
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      marginBottom: 14, paddingBottom: 12,
      borderBottom: '2px solid #f3f4f6',
    }}>
      <span style={{
        fontSize: 11, background: c.bg, color: c.fg,
        border: `1px solid ${c.bd}`, borderRadius: 8,
        padding: '3px 9px', fontWeight: 700,
        fontFamily: "'Nunito', sans-serif",
        display: 'flex', alignItems: 'center', gap: 5,
      }}>
        {c.emoji} {c.label}
      </span>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function orderSections(sections: PlaybookSectionData[]): PlaybookSectionData[] {
  return [...sections].sort((a, b) => {
    const ka = SECTION_ORDER.indexOf(a.kind)
    const kb = SECTION_ORDER.indexOf(b.kind)
    if (ka !== kb) return ka - kb
    return a.sort_order - b.sort_order
  })
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const ghostBtn: React.CSSProperties = {
  background: '#fff',
  color: '#374151',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  padding: '7px 14px',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontFamily: "'Nunito', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
}

function PresentIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="3" width="20" height="14" rx="2"/>
      <path d="M8 21h8M12 17v4"/>
    </svg>
  )
}

function PDFIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
      <polyline points="14 2 14 8 20 8"/>
    </svg>
  )
}

function XIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12"/>
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14"/>
    </svg>
  )
}
