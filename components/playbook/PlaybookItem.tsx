'use client'
import { useEffect, useRef, useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ItemStatus, PlaybookItem as Item, SectionKind } from '@/lib/playbook-types'
import StatusBadge from './StatusBadge'

const FONT = "'Nunito', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

interface Props {
  item: Item
  kind: SectionKind
  readonly?: boolean
  presentMode?: boolean
  onUpdate: (patch: Partial<Item>) => void
  onDelete: () => void
}

export default function PlaybookItem({
  item,
  kind,
  readonly = false,
  presentMode = false,
  onUpdate,
  onDelete,
}: Props) {
  const [editing, setEditing] = useState(item.content === '')
  const [draft, setDraft] = useState(item.content)
  const [noteDraft, setNoteDraft] = useState(item.internal_note ?? '')
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const contentRef = useRef<HTMLTextAreaElement>(null)
  const noteRef = useRef<HTMLTextAreaElement>(null)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id })

  useEffect(() => {
    if (editing && contentRef.current) {
      contentRef.current.focus()
      contentRef.current.select()
    }
  }, [editing])

  function saveContent() {
    const trimmed = draft.trim()
    if (trimmed !== item.content) {
      onUpdate({ content: trimmed })
    }
    setEditing(false)
  }

  function saveNote() {
    const trimmed = noteDraft.trim()
    onUpdate({ internal_note: trimmed || null })
    setShowNoteInput(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveContent() }
    if (e.key === 'Escape') { setDraft(item.content); setEditing(false) }
  }

  function handleNoteKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveNote() }
    if (e.key === 'Escape') { setNoteDraft(item.internal_note ?? ''); setShowNoteInput(false) }
  }

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const showInternalNote = !presentMode && (item.internal_note || showNoteInput)

  return (
    <div
      ref={setNodeRef}
      style={style}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setConfirmDelete(false) }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        padding: '6px 8px',
        borderRadius: 8,
        background: hovered ? '#fafafa' : 'transparent',
        transition: 'background 120ms',
        position: 'relative',
      }}>
        {/* Drag handle */}
        {!presentMode && (
          <button
            {...attributes}
            {...listeners}
            style={{
              cursor: isDragging ? 'grabbing' : 'grab',
              background: 'none',
              border: 'none',
              padding: '2px 2px',
              color: hovered ? '#9ca3af' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0,
              marginTop: 2,
              transition: 'color 120ms',
            }}
            title="Drag to reorder"
            aria-label="Drag to reorder"
          >
            <GripIcon />
          </button>
        )}

        {/* Status badge */}
        <div style={{ marginTop: 2, flexShrink: 0 }}>
          <StatusBadge
            status={item.status}
            kind={kind}
            readonly={readonly}
            onChange={status => onUpdate({ status })}
          />
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {editing ? (
            <textarea
              ref={contentRef}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={saveContent}
              rows={1}
              placeholder="Add item…"
              style={{
                width: '100%',
                border: '1px solid #a0ccfe',
                borderRadius: 6,
                padding: '4px 8px',
                fontSize: 13,
                fontFamily: FONT,
                fontWeight: 500,
                color: '#1e1c18',
                resize: 'none',
                outline: 'none',
                background: '#f8fcff',
                lineHeight: 1.5,
                boxShadow: '0 0 0 3px rgba(160,204,254,0.2)',
              }}
            />
          ) : (
            <span
              onClick={() => setEditing(true)}
              style={{
                fontSize: 13,
                fontFamily: FONT,
                fontWeight: 500,
                color: item.status === 'done' || item.status === 'delivered' || item.status === 'resolved'
                  ? '#9ca3af' : '#1e1c18',
                textDecoration: item.status === 'done' || item.status === 'delivered' || item.status === 'resolved'
                  ? 'line-through' : 'none',
                cursor: 'text',
                display: 'block',
                lineHeight: 1.5,
                padding: '2px 0',
              }}
            >
              {item.content || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>Untitled item</span>}
            </span>
          )}

          {/* Internal note */}
          {showInternalNote && !presentMode && (
            <div style={{ marginTop: 4 }}>
              {showNoteInput ? (
                <textarea
                  ref={noteRef}
                  value={noteDraft}
                  onChange={e => setNoteDraft(e.target.value)}
                  onKeyDown={handleNoteKeyDown}
                  onBlur={saveNote}
                  rows={2}
                  placeholder="Internal note (not shown in present mode)…"
                  autoFocus
                  style={{
                    width: '100%',
                    border: '1px solid #e5e7eb',
                    borderRadius: 6,
                    padding: '4px 8px',
                    fontSize: 11.5,
                    fontFamily: FONT,
                    fontStyle: 'italic',
                    color: '#6b7280',
                    resize: 'none',
                    outline: 'none',
                    background: '#fafafa',
                    lineHeight: 1.5,
                  }}
                />
              ) : item.internal_note ? (
                <div
                  onClick={() => { setNoteDraft(item.internal_note ?? ''); setShowNoteInput(true) }}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 5,
                    cursor: 'text',
                    fontSize: 11.5,
                    fontStyle: 'italic',
                    color: '#9ca3af',
                    lineHeight: 1.4,
                    padding: '2px 0',
                  }}
                >
                  <LockIcon />
                  <span>{item.internal_note}</span>
                </div>
              ) : null}
            </div>
          )}

          {/* Add internal note affordance */}
          {editing && !item.internal_note && !showNoteInput && !presentMode && (
            <button
              onMouseDown={e => { e.preventDefault(); setShowNoteInput(true) }}
              style={{
                background: 'none',
                border: 'none',
                padding: '2px 0',
                fontSize: 11,
                color: '#9ca3af',
                cursor: 'pointer',
                fontFamily: FONT,
                marginTop: 2,
              }}
            >
              + Add internal note
            </button>
          )}
        </div>

        {/* Delete */}
        {!readonly && !presentMode && hovered && (
          <div style={{ flexShrink: 0, marginTop: 2 }}>
            {confirmDelete ? (
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#c81e1e', fontFamily: FONT, fontWeight: 600 }}>Delete?</span>
                <button
                  onClick={onDelete}
                  style={{ background: '#c81e1e', color: '#fff', border: 'none', borderRadius: 4, padding: '2px 7px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}
                >Yes</button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  style={{ background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 4, padding: '2px 7px', fontSize: 11, cursor: 'pointer', fontFamily: FONT }}
                >No</button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                style={{ background: 'none', border: 'none', padding: '2px 4px', color: '#d1d5db', cursor: 'pointer', borderRadius: 4 }}
                title="Delete item"
                aria-label="Delete item"
              >
                <TrashIcon />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function GripIcon() {
  return (
    <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor" aria-hidden="true">
      <circle cx="4" cy="3" r="1.5"/>
      <circle cx="8" cy="3" r="1.5"/>
      <circle cx="4" cy="8" r="1.5"/>
      <circle cx="8" cy="8" r="1.5"/>
      <circle cx="4" cy="13" r="1.5"/>
      <circle cx="8" cy="13" r="1.5"/>
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

function LockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginTop: 1, flexShrink: 0 }} aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
    </svg>
  )
}
