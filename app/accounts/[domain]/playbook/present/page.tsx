'use client'
import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import PilotPlaybookTab from '@/components/playbook/PilotPlaybookTab'

const FONT = "'Nunito', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

type Params = Promise<{ domain: string }>

export default function PresentModePage({ params }: { params: Params }) {
  const { domain } = use(params)
  const router = useRouter()

  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [customerName, setCustomerName] = useState<string | null>(null)
  // Print-mode: navigate here with ?print=1 to auto-trigger window.print()
  const [isPrintMode, setIsPrintMode] = useState(false)
  const [playbookReady, setPlaybookReady] = useState(false)

  // ── Auth ──────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace('/'); return }
      setSession(data.session)
      setLoading(false)
    })
  }, [router])

  // ── Detect ?print=1 from URL (after hydration) ────────────────────
  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    setIsPrintMode(p.get('print') === '1')
  }, [])

  // ── Auto-print once playbook is fully rendered ────────────────────
  useEffect(() => {
    if (!isPrintMode || !playbookReady) return
    // Small delay: let fonts & layout paint after React commit
    const timer = setTimeout(() => {
      const handleAfterPrint = () => router.push(`/accounts/${domain}`)
      window.addEventListener('afterprint', handleAfterPrint, { once: true })
      window.print()
    }, 600)
    return () => clearTimeout(timer)
  }, [isPrintMode, playbookReady, domain, router])

  // ── Resolve customer name from tracked_domains ─────────────────
  useEffect(() => {
    if (!session) return
    supabase
      .from('tracked_domains')
      .select('cached_data, domain')
      .eq('user_id', session.user.id)
      .eq('domain', domain)
      .single()
      .then(({ data }) => {
        if (data) {
          const raw = data.domain as string
          setCustomerName(
            raw
              .replace(/\..+$/, '')
              .replace(/-/g, ' ')
              .replace(/\b\w/g, (c: string) => c.toUpperCase()),
          )
        }
      })
  }, [session, domain])

  if (loading) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontFamily:FONT }}>
        <Spinner />
      </div>
    )
  }

  const displayName = customerName ?? domain
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  return (
    <div
      id="playbook-print-content"
      data-print-title={displayName}
      data-print-date={today}
      style={{ minHeight:'100vh', background:'#fff', fontFamily:FONT, WebkitFontSmoothing:'antialiased' }}
    >
      {/* ─── Slim present-mode bar ─────────────────────────────────── */}
      <div
        className="no-print"
        style={{
          height:48, background:'#fff', borderBottom:'1px solid #f0f0f0',
          display:'flex', alignItems:'center', padding:'0 28px', gap:16,
          position:'sticky', top:0, zIndex:50,
          boxShadow:'0 1px 4px rgba(15,31,61,0.05)',
        }}
      >
        {/* RF logo */}
        <RFLogo size={22} />

        {/* Title */}
        <div style={{ flex:1, display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:14, fontWeight:700, color:'#0f1f3d', letterSpacing:'-0.01em' }}>
            {displayName}
          </span>
          <span style={{ fontSize:12, color:'#9ca3af', fontWeight:500 }}>·</span>
          <span style={{ fontSize:12, color:'#6b7280', fontWeight:600 }}>Pilot Playbook</span>
        </div>

        {/* Exit link */}
        <button
          onClick={() => router.push(`/accounts/${domain}`)}
          style={{
            background:'#f3f4f6', color:'#374151', border:'1px solid #e5e7eb',
            borderRadius:7, padding:'6px 12px', fontSize:12, fontWeight:700,
            cursor:'pointer', display:'flex', alignItems:'center', gap:6,
            fontFamily:FONT,
          }}
          title="Exit present mode (Esc)"
        >
          <XIcon />
          Exit
        </button>
      </div>

      {/* ─── PDF print header (visible only on print) ──────────────── */}
      <div style={{ display:'none' }} className="print-only" aria-hidden="true">
        {/* Rendered via CSS ::before pseudo-element on #playbook-print-content */}
      </div>

      {/* ─── Playbook content ──────────────────────────────────────── */}
      <main style={{ maxWidth:880, margin:'0 auto', padding:'36px 28px 80px' }}>
        {session && (
          <PilotPlaybookTab
            domain={domain}
            customerName={displayName}
            userId={session.user.id}
            presentMode
            onReady={() => setPlaybookReady(true)}
          />
        )}
      </main>

      {/* Print footer via CSS @page rules in globals.css */}
    </div>
  )
}

function Spinner() {
  return (
    <div style={{ display:'inline-block', width:28, height:28, border:'3px solid #e5e7eb', borderTopColor:'#4aa1ff', borderRadius:'50%', animation:'spin 0.7s linear infinite' }}>
      <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  )
}

function XIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12"/>
    </svg>
  )
}

function RFLogo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ flexShrink:0 }}>
      <path d="M0 18C0 8.05888 8.05888 0 18 0C27.9411 0 36 8.05888 36 18C36 27.9411 27.9411 36 18 36C8.05888 36 0 27.9411 0 18Z" fill="#4AA1FF"/>
      <path d="M10.06 27.0584C11.53 27.0584 12.4715 26.159 12.4715 24.5727V16.7884C12.4715 14.7115 13.2478 13.485 15.4446 13.4523C16.3861 13.4359 17.0798 13.2233 17.5423 12.8308C18.0048 12.4384 18.236 11.866 18.236 11.1137C18.236 10.296 18.0048 9.70731 17.5423 9.34753C17.1954 9.05317 16.6834 8.90599 16.0392 8.90599C14.2719 8.90599 12.8184 10.1979 12.3559 12.3729H12.2568V11.2282C12.2568 9.70731 11.3318 8.82422 9.97738 8.82422C8.58992 8.82422 7.64844 9.70731 7.64844 11.2282V24.5727C7.64844 26.159 8.60644 27.0584 10.06 27.0584Z" fill="white"/>
      <mask id="rf-present-mask" style={{ maskType:'alpha' } as React.CSSProperties} maskUnits="userSpaceOnUse" x="0" y="0" width="36" height="36">
        <path d="M0 18C0 8.05888 8.05888 0 18 0C27.9411 0 36 8.05888 36 18C36 27.9411 27.9411 36 18 36C8.05888 36 0 27.9411 0 18Z" fill="#4AA1FF"/>
      </mask>
      <g mask="url(#rf-present-mask)">
        <path fillRule="evenodd" clipRule="evenodd" d="M34.6402 7.79297L66.4646 7.79297C67.6829 7.79297 68.6704 8.78053 68.6704 9.99874C68.6704 11.2169 67.6829 12.2045 66.4646 12.2045H34.7963C31.5452 12.2045 29.3288 12.2092 27.6679 12.4325C26.0705 12.6473 25.3211 13.0272 24.8086 13.5397C24.2961 14.0521 23.9162 14.8016 23.7014 16.399C23.4781 18.0599 23.4734 20.2763 23.4734 23.5274V24.8597C23.4735 27.9155 23.4736 30.4305 23.2061 32.4199C22.9255 34.5065 22.3149 36.3421 20.8461 37.8108C19.3774 39.2796 17.5418 39.8902 15.4552 40.1708C13.4658 40.4382 10.9509 40.4382 7.89517 40.4381H-84.1146C-85.3328 40.4381 -86.3203 39.4505 -86.3203 38.2323C-86.3203 37.0141 -85.3328 36.0266 -84.1146 36.0266H7.73899C10.9901 36.0266 13.2065 36.0219 14.8674 35.7986C16.4648 35.5838 17.2142 35.2039 17.7267 34.6914C18.2392 34.1789 18.6191 33.4295 18.8339 31.8321C19.0572 30.1712 19.0619 27.9548 19.0619 24.7037V23.3714C19.0618 20.3155 19.0617 17.8006 19.3292 15.8112C19.6097 13.7246 20.2204 11.889 21.6892 10.4203C23.1579 8.9515 24.9935 8.34084 27.0801 8.0603C29.0695 7.79283 31.5844 7.79289 34.6402 7.79297Z" fill="white"/>
        <path fillRule="evenodd" clipRule="evenodd" d="M15.5859 19.4102C15.5859 18.2732 16.5077 17.3514 17.6446 17.3514H25.8795C27.0165 17.3514 27.9382 18.2732 27.9382 19.4102C27.9382 20.5471 27.0165 21.4689 25.8795 21.4689H17.6446C16.5077 21.4689 15.5859 20.5471 15.5859 19.4102Z" fill="white"/>
      </g>
    </svg>
  )
}
