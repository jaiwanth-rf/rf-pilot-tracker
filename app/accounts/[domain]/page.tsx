'use client'
import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import PilotPlaybookTab from '@/components/playbook/PilotPlaybookTab'
import SynthesisBar from '@/components/playbook/SynthesisBar'
import { fetchPlaybook } from '@/lib/playbook-queries'
import type { Playbook, PlaybookSection } from '@/lib/playbook-types'

const FONT = "'Nunito', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

// ─── Color tokens (matches Dashboard) ─────────────────────────────────────
const T = {
  B50:'#edf6ff', B75:'#b5d8ff', B300:'#4aa1ff', B400:'#3471b3',
  DB50:'#e8edf5', DB400:'#1a3260', DB500:'#0f1f3d',
  R50:'#fef0f0', R75:'#fdc5c5', R300:'#f05252', R400:'#c81e1e',
  G50:'#f0fdf4', G75:'#bbf7d0', G300:'#16a34a', G400:'#15803d',
  Y50:'#fffbeb', Y300:'#f59e0b', Y400:'#b45309',
  P50:'#f5f3ff', P75:'#ddd6fe', P400:'#6d28d9',
  N0:'#ffffff', N50:'#f9fafb', N100:'#f3f4f6', N200:'#e5e7eb',
  N300:'#d1d5db', N400:'#9ca3af', N500:'#6b7280', N600:'#4b5563', N700:'#374151',
}

type Params = Promise<{ domain: string }>

export default function AccountDetailPage({ params }: { params: Params }) {
  const { domain } = use(params)
  const router = useRouter()

  const [session, setSession] = useState<any>(null)
  const [account, setAccount] = useState<any>(null)
  const [loadingAuth, setLoadingAuth] = useState(true)
  const [loadingAccount, setLoadingAccount] = useState(true)
  const [activeTab, setActiveTab] = useState<'account' | 'playbook'>('playbook')

  // ── Playbook stats for the tab badge ──────────────────────────────
  const [playbookData, setPlaybookData] = useState<{
    playbook: Playbook
    sections: PlaybookSection[]
  } | null>(null)

  // ── Auth ──────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) { router.replace('/'); return }
      setSession(data.session)
      setLoadingAuth(false)
    })
  }, [router])

  // ── Fetch account data ────────────────────────────────────────────
  useEffect(() => {
    if (!session) return
    supabase
      .from('tracked_domains')
      .select('*')
      .eq('user_id', session.user.id)
      .eq('domain', domain)
      .single()
      .then(({ data }) => {
        setAccount(data)
        setLoadingAccount(false)
      })
  }, [session, domain])

  // ── Fetch playbook for the badge ──────────────────────────────────
  useEffect(() => {
    fetchPlaybook(domain).then(result => {
      if (result) setPlaybookData(result)
    })
  }, [domain])

  if (loadingAuth || loadingAccount) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontFamily:FONT }}>
        <Spinner />
      </div>
    )
  }

  const cachedData = account?.cached_data ?? {}
  const customerName: string =
    cachedData.domain
      ? cachedData.domain.replace(/\..+$/, '').replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
      : domain

  // ── Playbook badge stats ──────────────────────────────────────────
  const allItems = playbookData?.sections.flatMap(s => s.items) ?? []
  const doneItems = allItems.filter(i =>
    i.status === 'done' || i.status === 'delivered' || i.status === 'resolved',
  ).length
  const hasAttentionDot = playbookData?.sections.some(s => {
    if (s.kind === 'obstacles' && s.items.some(i => i.status === 'pending')) return true
    if (s.kind === 'promises' && s.items.some(i => {
      if (i.status === 'delivered' || !i.expected_date) return false
      return new Date(i.expected_date) < new Date()
    })) return true
    if (s.kind === 'pre_requisites' && s.items.some(i => {
      if (i.status === 'done') return false
      return i.due_date && new Date(i.due_date) < new Date()
    })) return true
    return false
  }) ?? false

  return (
    <div style={{ minHeight:'100vh', background:'#f6fbff', fontFamily:FONT, WebkitFontSmoothing:'antialiased' }}>

      {/* ─── Top nav ─────────────────────────────────────────────── */}
      <header style={{
        height:56, background:'#fff', borderBottom:'1px solid #efefef',
        boxShadow:'0 2px 16px rgba(1,87,152,0.08)',
        display:'flex', alignItems:'center', padding:'0 24px', gap:16,
        position:'sticky', top:0, zIndex:50,
      }}>
        <button
          onClick={() => router.push('/')}
          style={{
            background:'none', border:'none', cursor:'pointer',
            display:'flex', alignItems:'center', gap:8,
            color:T.N500, fontSize:13, fontWeight:600, fontFamily:FONT, padding:'6px 4px',
          }}
        >
          <ChevronLeft />
          All accounts
        </button>

        <div style={{ width:1, height:20, background:T.N200 }} />

        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <DomainAvatar domain={domain} size={32} />
          <div>
            <div style={{ fontSize:15, fontWeight:800, color:T.DB500, letterSpacing:'-0.01em', lineHeight:1 }}>
              {customerName}
            </div>
            <div style={{ fontSize:11, color:T.N400, marginTop:2 }}>
              {domain}
            </div>
          </div>
        </div>
      </header>

      {/* ─── Tab bar ─────────────────────────────────────────────── */}
      <div style={{
        background:'#fff', borderBottom:'1px solid #efefef',
        padding:'0 24px', display:'flex', alignItems:'center', gap:0,
      }}>
        <TabButton
          label="Account"
          active={activeTab === 'account'}
          onClick={() => setActiveTab('account')}
        />
        <TabButton
          label="Pilot Playbook"
          active={activeTab === 'playbook'}
          onClick={() => setActiveTab('playbook')}
          badge={allItems.length > 0 ? `${doneItems}/${allItems.length}` : undefined}
          attentionDot={hasAttentionDot}
        />
      </div>

      {/* ─── Content ─────────────────────────────────────────────── */}
      <main style={{ maxWidth:960, margin:'0 auto', padding:'28px 24px 80px' }}>

        {/* ─── Synthesis bar (shown on both tabs if playbook exists) */}
        {playbookData && (
          <div style={{ marginBottom:20 }}>
            <SynthesisBar playbook={playbookData.playbook} sections={playbookData.sections} />
          </div>
        )}

        {activeTab === 'account' && (
          <AccountTab account={cachedData} domain={domain} />
        )}

        {activeTab === 'playbook' && session && (
          <PilotPlaybookTab
            domain={domain}
            customerName={customerName}
            userId={session.user.id}
          />
        )}
      </main>
    </div>
  )
}

// ─── Tab button ───────────────────────────────────────────────────────────

function TabButton({
  label, active, onClick, badge, attentionDot,
}: {
  label: string
  active: boolean
  onClick: () => void
  badge?: string
  attentionDot?: boolean
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background:'none', border:'none', cursor:'pointer',
        padding:'14px 20px 12px', fontSize:13, fontWeight:active ? 700 : 500,
        color: active ? T.DB500 : T.N500,
        borderBottom: active ? `2px solid ${T.B300}` : '2px solid transparent',
        display:'flex', alignItems:'center', gap:7,
        fontFamily:FONT, transition:'color 120ms',
        position:'relative',
      }}
    >
      {label}
      {badge && (
        <span style={{
          fontSize:10, fontWeight:700,
          background: active ? T.B50 : T.N100,
          color: active ? T.B400 : T.N500,
          border:`1px solid ${active ? T.B75 : T.N200}`,
          borderRadius:10, padding:'1px 7px',
        }}>
          {badge}
        </span>
      )}
      {attentionDot && (
        <span style={{
          width:6, height:6, borderRadius:'50%',
          background:'#e01e5a', display:'inline-block', flexShrink:0,
        }} title="Needs attention" />
      )}
    </button>
  )
}

// ─── Account tab content ──────────────────────────────────────────────────

function AccountTab({ account, domain }: { account: any; domain: string }) {
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const users: any[] = account.users ?? []

  useEffect(() => {
    if (users.length > 0 && !selectedUser) setSelectedUser(users[0])
  }, [users, selectedUser])

  const allModules = [...new Set(users.flatMap((u: any) => u.modules ?? []))] as string[]
  const totalEvents: number = account.totalEvents ?? 0
  const activeUsers: number = account.activeUsers ?? 0
  const inactiveUsers: number = account.inactiveUsers ?? 0
  const daysSince: number = account.daysSince ?? 0

  const card: React.CSSProperties = { background:T.N0, border:`1px solid ${T.N200}`, borderRadius:12, padding:'16px 18px' }

  if (!account || Object.keys(account).length === 0) {
    return (
      <div style={{ ...card, textAlign:'center', padding:'40px', color:T.N400, fontSize:13 }}>
        No account data yet — refresh this domain from the dashboard to load usage data.
      </div>
    )
  }

  return (
    <div>
      {/* Overview strip */}
      <div style={{ background:T.DB500, borderRadius:12, padding:'16px 20px', marginBottom:16 }}>
        <div style={{ fontSize:10, fontWeight:600, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:10 }}>
          Account overview
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {[
            { l:'Total users',  v:account.totalUsers ?? 0,             a:T.N0 },
            { l:'Active',       v:activeUsers,                          a:activeUsers>0 ? T.G75 : T.R75 },
            { l:'Inactive',     v:inactiveUsers,                        a:inactiveUsers>0 ? T.R75 : T.N0 },
            { l:'Total events', v:totalEvents.toLocaleString(),         a:T.N0 },
            { l:'Last seen',    v:daysSince===0 ? 'Today' : `${daysSince}d ago`, a:daysSince>=3 ? T.Y300 : T.G75 },
            { l:'Modules',      v:account.modulesCount ?? 0,            a:T.B75 },
          ].map((m,i) => (
            <div key={i} style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:9, padding:'10px 13px', flex:1, minWidth:80 }}>
              <div style={{ fontSize:9, color:'rgba(255,255,255,0.4)', marginBottom:4, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' }}>{m.l}</div>
              <div style={{ fontSize:20, fontWeight:700, color:m.a, lineHeight:1 }}>{m.v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Two-column: modules + user activity | per-user detail */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        {/* Modules */}
        <div style={card}>
          <div style={{ fontSize:10, fontWeight:600, color:T.N400, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:10 }}>
            Modules tested
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:14 }}>
            {allModules.map((m, i) => {
              const count = users.filter((u: any) => (u.modules ?? []).includes(m)).length
              return (
                <span key={i} style={{ background:T.P50, border:`1px solid ${T.P75}`, color:T.P400, fontSize:11, padding:'3px 9px', borderRadius:20, fontFamily:FONT }}>
                  {m} <strong>·{count}</strong>
                </span>
              )
            })}
            {allModules.length === 0 && <span style={{ fontSize:12, color:T.N400 }}>No modules detected yet</span>}
          </div>
          <div style={{ fontSize:10, fontWeight:600, color:T.N400, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>
            User activity
          </div>
          {users.map((u: any, i: number) => {
            const maxEv = Math.max(...users.map((x: any) => x.totalEvents ?? 0), 1)
            return (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:7 }}>
                <div style={{ width:28, height:28, borderRadius:'50%', background:T.DB50, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:T.DB400, flexShrink:0 }}>
                  {u.initials}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:2 }}>
                    <span style={{ color:T.N700, fontWeight:500 }}>{u.name || u.email}</span>
                    <span style={{ color:T.N500 }}>{(u.totalEvents ?? 0).toLocaleString()} events</span>
                  </div>
                  <div style={{ height:4, background:T.N100, borderRadius:2 }}>
                    <div style={{ height:4, width:`${Math.round(((u.totalEvents??0)/Math.max(maxEv,1))*100)}%`, background:u.daysSince>=14?T.R300:u.daysSince>=3?T.Y300:T.G300, borderRadius:2 }} />
                  </div>
                </div>
                <StatusChip label={u.daysSince>=14?'Churned':u.daysSince>=3?'Inactive':'Active'} type={u.daysSince>=14?'danger':u.daysSince>=3?'warn':'green'} />
              </div>
            )
          })}
        </div>

        {/* User picker + detail */}
        {users.length > 0 && (
          <div style={{ display:'grid', gridTemplateRows:'auto', gap:12 }}>
            <div style={{ background:T.N0, border:`1px solid ${T.N200}`, borderRadius:12, overflow:'hidden' }}>
              {users.map((u: any, i: number) => (
                <div
                  key={i}
                  onClick={() => setSelectedUser(u)}
                  style={{
                    display:'flex', alignItems:'center', gap:10, padding:'10px 14px',
                    cursor:'pointer',
                    background:selectedUser?.email===u.email ? T.B50 : T.N0,
                    borderLeft:`3px solid ${selectedUser?.email===u.email ? T.B300 : 'transparent'}`,
                    borderBottom:`1px solid ${T.N100}`,
                  }}
                >
                  <div style={{ width:32, height:32, borderRadius:'50%', background:T.DB50, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:T.DB400, flexShrink:0 }}>
                    {u.initials}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:T.DB500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {u.email}
                    </div>
                    <div style={{ fontSize:10, color:T.N400 }}>{u.totalEvents} events · {u.activeDays}d active</div>
                  </div>
                  <StatusChip small label={u.daysSince>=14?'Churned':`${u.daysSince}d`} type={u.daysSince>=14?'danger':u.daysSince>=3?'warn':'green'} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Shared micro-components ──────────────────────────────────────────────

function StatusChip({ label, type, small }: { label: string; type: string; small?: boolean }) {
  const m: any = {
    danger:{ bg:T.R50, b:T.R75, fg:T.R400 },
    warn:{   bg:T.Y50, b:'#fed7aa', fg:T.Y400 },
    green:{  bg:T.G50, b:T.G75, fg:T.G400 },
  }
  const c = m[type] || m.green
  return (
    <span style={{ background:c.bg, border:`1px solid ${c.b}`, color:c.fg, fontSize:small?10:11, fontWeight:500, padding:small?'2px 8px':'3px 10px', borderRadius:20, whiteSpace:'nowrap', fontFamily:FONT }}>
      {label}
    </span>
  )
}

function DomainAvatar({ domain, size = 36 }: { domain: string; size?: number }) {
  const [failed, setFailed] = useState(false)
  const initials = domain.replace(/\..+$/, '').slice(0, 2).toUpperCase()
  return (
    <div style={{ width:size, height:size, borderRadius:Math.round(size*0.25), background:'linear-gradient(135deg,#e3f0ff,#c2e0ff)', color:'#1a6fd4', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800, fontSize:size*0.36, flexShrink:0 }}>
      {failed ? initials : (
        <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`} alt="" width={size*0.55} height={size*0.55} style={{ borderRadius:4 }} onError={() => setFailed(true)} />
      )}
    </div>
  )
}

function Spinner() {
  return (
    <div style={{ display:'inline-block', width:32, height:32, border:'3px solid #e5e7eb', borderTopColor:'#4aa1ff', borderRadius:'50%', animation:'spin 0.7s linear infinite' }}>
      <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  )
}

function ChevronLeft() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15 18l-6-6 6-6"/>
    </svg>
  )
}
