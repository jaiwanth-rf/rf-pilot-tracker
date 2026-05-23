'use client'
import type { Playbook, PlaybookSection } from '@/lib/playbook-types'

const FONT = "'Nunito', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

interface Props {
  playbook: Playbook
  sections: PlaybookSection[]
}

export default function SynthesisBar({ playbook, sections }: Props) {
  const allItems = sections.flatMap(s => s.items)
  const totalItems = allItems.length
  const doneItems = allItems.filter(i => i.status === 'done' || i.status === 'delivered' || i.status === 'resolved').length
  const pct = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0

  const obstaclesPending = sections
    .filter(s => s.kind === 'obstacles')
    .flatMap(s => s.items)
    .filter(i => i.status === 'pending').length

  const promiseItems = sections
    .filter(s => s.kind === 'promises')
    .flatMap(s => s.items)

  const promisesInFlight = promiseItems.filter(i =>
    i.status === 'promised' || i.status === 'in_progress',
  ).length

  const now = new Date()
  const promisesOverdue = promiseItems.filter(i => {
    if (!i.expected_date) return false
    if (i.status === 'delivered') return false
    return new Date(i.expected_date) < now
  }).length

  const editedAgo = timeAgo(playbook.last_edited_at)

  return (
    <div style={{
      background: 'linear-gradient(90deg, #f8faff 0%, #f6f8fc 100%)',
      border: '1px solid #e8edf5',
      borderRadius: 10,
      padding: '9px 16px',
      fontSize: 12.5,
      fontWeight: 600,
      color: '#4b5563',
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      flexWrap: 'wrap',
      fontFamily: FONT,
      lineHeight: 1.4,
    }}>
      <span style={{ fontSize: 14 }}>📋</span>
      <span style={{ fontWeight: 700, color: '#1e1c18' }}>PLAYBOOK</span>

      <Dot />

      <span>
        <strong style={{ color: doneItems > 0 ? '#15803d' : '#374151' }}>{doneItems}/{totalItems}</strong>
        {' '}items complete
        {totalItems > 0 && (
          <span style={{ color: '#9ca3af', fontWeight: 500 }}>{' '}({pct}%)</span>
        )}
      </span>

      {obstaclesPending > 0 && (
        <>
          <Dot />
          <span>
            <strong style={{ color: '#c81e1e' }}>{obstaclesPending}</strong>
            {' '}obstacle{obstaclesPending !== 1 ? 's' : ''} pending
          </span>
        </>
      )}

      {promisesInFlight > 0 && (
        <>
          <Dot />
          <span>
            <strong style={{ color: '#6d28d9' }}>{promisesInFlight}</strong>
            {' '}promise{promisesInFlight !== 1 ? 's' : ''} in flight
            {promisesOverdue > 0 && (
              <span style={{
                marginLeft: 6,
                background: '#fff0f0', color: '#c81e1e',
                border: '1px solid #fdc5c5',
                borderRadius: 10, padding: '1px 7px',
                fontSize: 11, fontWeight: 700,
              }}>
                {promisesOverdue} overdue
              </span>
            )}
          </span>
        </>
      )}

      <Dot />

      <span style={{ color: '#9ca3af', fontWeight: 500 }}>
        last edited {editedAgo}
      </span>
    </div>
  )
}

function Dot() {
  return (
    <span style={{
      width: 3, height: 3, borderRadius: '50%',
      background: '#d1d5db', display: 'inline-block', flexShrink: 0,
    }} />
  )
}
