'use client'
import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import type { PlaybookItem as Item, PlaybookSection as Section, SectionKind } from '@/lib/playbook-types'
import { STATUS_BY_KIND } from '@/lib/playbook-types'
import PlaybookItem from './PlaybookItem'

const FONT = "'Nunito', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

interface Props {
  section: Section
  presentMode?: boolean
  readonly?: boolean
  onAddItem: () => void
  onUpdateItem: (itemId: string, patch: Partial<Item>) => void
  onDeleteItem: (itemId: string) => void
  onReorderItems: (sectionId: string, items: Item[]) => void
  onRenameSection?: (title: string) => void
  onDeleteSection?: () => void
}

export default function PlaybookSection({
  section,
  presentMode = false,
  readonly = false,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onReorderItems,
  onRenameSection,
  onDeleteSection,
}: Props) {
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState(section.title)
  const [hovered, setHovered] = useState(false)
  const [confirmDeleteSection, setConfirmDeleteSection] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = section.items.findIndex(i => i.id === active.id)
    const newIdx = section.items.findIndex(i => i.id === over.id)
    const reordered = arrayMove(section.items, oldIdx, newIdx).map((item, i) => ({
      ...item,
      sort_order: i,
    }))
    onReorderItems(section.id, reordered)
  }

  function saveTitle() {
    const t = titleDraft.trim()
    if (t && t !== section.title) onRenameSection?.(t)
    else setTitleDraft(section.title)
    setEditingTitle(false)
  }

  const isGroupSection = section.kind === 'success_criteria'
  const isTopLevel = !isGroupSection || section.title === 'Success criteria'

  return (
    <div
      style={{ marginBottom: 24 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setConfirmDeleteSection(false) }}
    >
      {/* Section header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
        paddingBottom: 8,
        borderBottom: isGroupSection && !isTopLevel ? '1px dashed #e5e7eb' : '1.5px solid #e5e7eb',
      }}>
        {editingTitle ? (
          <input
            value={titleDraft}
            onChange={e => setTitleDraft(e.target.value)}
            onBlur={saveTitle}
            onKeyDown={e => {
              if (e.key === 'Enter') saveTitle()
              if (e.key === 'Escape') { setTitleDraft(section.title); setEditingTitle(false) }
            }}
            autoFocus
            style={{
              flex: 1,
              fontSize: isTopLevel ? 14 : 13,
              fontWeight: isTopLevel ? 700 : 600,
              fontFamily: FONT,
              border: '1px solid #a0ccfe',
              borderRadius: 6,
              padding: '3px 8px',
              background: '#f8fcff',
              outline: 'none',
              color: '#1e1c18',
            }}
          />
        ) : (
          <h3
            onClick={() => { if (!readonly && !presentMode && onRenameSection) setEditingTitle(true) }}
            style={{
              margin: 0,
              flex: 1,
              fontSize: isTopLevel ? 14 : 13,
              fontWeight: isTopLevel ? 700 : 600,
              fontFamily: FONT,
              color: isTopLevel ? '#0f1f3d' : '#374151',
              cursor: (!readonly && !presentMode && onRenameSection) ? 'text' : 'default',
              letterSpacing: '-0.01em',
            }}
          >
            {section.title}
          </h3>
        )}

        {/* Item count badge */}
        <span style={{
          fontSize: 10, fontWeight: 700,
          background: '#f3f4f6', color: '#6b7280',
          border: '1px solid #e5e7eb',
          borderRadius: 10, padding: '1px 7px',
          whiteSpace: 'nowrap',
        }}>
          {section.items.filter(i => i.status === 'done' || i.status === 'delivered' || i.status === 'resolved').length}
          /{section.items.length}
        </span>

        {/* Section delete (only for success_criteria groups, not the parent header) */}
        {!readonly && !presentMode && onDeleteSection && isGroupSection && !isTopLevel && hovered && (
          confirmDeleteSection ? (
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#c81e1e', fontFamily: FONT, fontWeight: 600 }}>Delete group?</span>
              <button
                onClick={onDeleteSection}
                style={{ background: '#c81e1e', color: '#fff', border: 'none', borderRadius: 4, padding: '2px 7px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}
              >Yes</button>
              <button
                onClick={() => setConfirmDeleteSection(false)}
                style={{ background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 4, padding: '2px 7px', fontSize: 11, cursor: 'pointer', fontFamily: FONT }}
              >No</button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDeleteSection(true)}
              style={{ background: 'none', border: 'none', color: '#d1d5db', cursor: 'pointer', padding: '2px 4px', borderRadius: 4 }}
              title="Delete group"
            >
              <TrashIcon />
            </button>
          )
        )}
      </div>

      {/* Items */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={section.items.map(i => i.id)}
          strategy={verticalListSortingStrategy}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {section.items.map(item => (
              <PlaybookItem
                key={item.id}
                item={item}
                kind={section.kind}
                readonly={readonly}
                presentMode={presentMode}
                onUpdate={patch => onUpdateItem(item.id, patch)}
                onDelete={() => onDeleteItem(item.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Empty state hint */}
      {section.items.length === 0 && !presentMode && (
        <div style={{
          padding: '10px 8px',
          fontSize: 12.5,
          color: '#9ca3af',
          fontFamily: FONT,
          fontStyle: 'italic',
        }}>
          No items yet.
        </div>
      )}

      {/* Add item */}
      {!readonly && !presentMode && (
        <button
          onClick={onAddItem}
          style={{
            background: 'none',
            border: '1px dashed #d1d5db',
            borderRadius: 8,
            padding: '6px 12px',
            fontSize: 12,
            color: '#6b7280',
            cursor: 'pointer',
            fontFamily: FONT,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            marginTop: 6,
            width: '100%',
            transition: 'all 120ms',
          }}
          onMouseEnter={e => {
            const t = e.currentTarget
            t.style.background = '#f9fafb'
            t.style.borderColor = '#9ca3af'
            t.style.color = '#374151'
          }}
          onMouseLeave={e => {
            const t = e.currentTarget
            t.style.background = 'none'
            t.style.borderColor = '#d1d5db'
            t.style.color = '#6b7280'
          }}
        >
          <PlusIcon />
          Add item
        </button>
      )}
    </div>
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

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18"/>
      <path d="M8 6V4h8v2"/>
      <path d="M19 6l-1 14H6L5 6"/>
    </svg>
  )
}
