'use client'
import { useEffect, useRef, useState } from 'react'
import type { ItemStatus, SectionKind } from '@/lib/playbook-types'
import { STATUS_BY_KIND, STATUS_CONFIG } from '@/lib/playbook-types'

const FONT = "'Nunito', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

interface Props {
  status: ItemStatus
  kind: SectionKind
  readonly?: boolean
  onChange?: (status: ItemStatus) => void
}

export default function StatusBadge({ status, kind, readonly = false, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const cfg = STATUS_CONFIG[status]
  const options = STATUS_BY_KIND[kind]

  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => { if (!readonly) setOpen(o => !o) }}
        disabled={readonly}
        style={{
          background: cfg.bg,
          color: cfg.fg,
          border: `1px solid ${cfg.bd}`,
          borderRadius: 12,
          padding: '2px 9px',
          fontSize: 11,
          fontWeight: 700,
          cursor: readonly ? 'default' : 'pointer',
          fontFamily: FONT,
          whiteSpace: 'nowrap',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          transition: 'opacity 120ms',
        }}
        title={readonly ? undefined : 'Change status'}
      >
        <span style={{
          width: 5, height: 5, borderRadius: '50%',
          background: cfg.fg, display: 'inline-block', flexShrink: 0,
        }} />
        {cfg.label}
        {!readonly && (
          <span style={{ marginLeft: 2, opacity: 0.5, fontSize: 9 }}>▾</span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          left: 0,
          zIndex: 100,
          background: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 10,
          boxShadow: '0 8px 24px rgba(15,31,61,0.12)',
          padding: 4,
          minWidth: 150,
        }}>
          {options.map(s => {
            const c = STATUS_CONFIG[s]
            const isSelected = s === status
            return (
              <button
                key={s}
                onClick={() => { onChange?.(s); setOpen(false) }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  padding: '7px 10px',
                  border: 'none',
                  borderRadius: 7,
                  background: isSelected ? c.bg : 'transparent',
                  cursor: 'pointer',
                  fontFamily: FONT,
                  fontSize: 12,
                  fontWeight: isSelected ? 700 : 500,
                  color: isSelected ? c.fg : '#374151',
                  textAlign: 'left',
                }}
              >
                <span style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: c.fg, flexShrink: 0,
                }} />
                {c.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
