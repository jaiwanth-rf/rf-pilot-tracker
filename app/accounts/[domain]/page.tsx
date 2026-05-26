'use client'
import React, { use, useEffect, useState } from 'react'
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

// ─── Account tab content (matches production AccountDetail) ──────────────

function Bar({ label, count, max }: { label: string; count: number; max: number }) {
  return (
    <div style={{ marginBottom:7 }}>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:3 }}>
        <span style={{ color:T.N700, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'75%' }}>{label}</span>
        <span style={{ color:T.N500, fontWeight:600 }}>{count}</span>
      </div>
      <div style={{ height:4, background:T.N200, borderRadius:2 }}>
        <div style={{ height:4, width:`${Math.round((count / Math.max(max, 1)) * 100)}%`, background:T.B300, borderRadius:2 }} />
      </div>
    </div>
  )
}

function MiniChart({ data }: { data: { v: number; d: string }[] }) {
  const max = Math.max(...data.map(d => d.v), 1)
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:4, height:44 }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
          <div style={{ width:'100%', background:d.v > 0 ? T.B300 : T.N200, borderRadius:'2px 2px 0 0', height:Math.max(3, (d.v / max) * 36) }} />
          <span style={{ fontSize:8, color:T.N400, fontWeight:500, whiteSpace:'nowrap' }}>{d.d.split(' ')[1]}</span>
        </div>
      ))}
    </div>
  )
}

function AccountTab({ account, domain }: { account: any; domain: string }) {
  const users: any[] = account?.users ?? []
  const [selectedUser, setSelectedUser] = useState<any>(users[0] ?? null)
  const [tab, setTab] = useState<'account' | 'users'>('account')

  const allModules = [...new Set(users.flatMap((u: any) => u.modules ?? []))] as string[]

  const topEvents = (() => {
    const map: Record<string, number> = {}
    users.forEach((u: any) => (u.topEvents ?? []).forEach((e: any) => { map[e.name] = (map[e.name] || 0) + e.count }))
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([n, c]) => ({ n, c: c as number }))
  })()

  const maxEv = Math.max(...users.map((u: any) => u.totalEvents ?? 0), 1)

  const insights: { sev: string; t: string; b: string }[] = []
  const churned = users.filter((u: any) => (u.daysSince ?? 0) >= 14)
  const inactive = users.filter((u: any) => (u.daysSince ?? 0) >= 3 && (u.daysSince ?? 0) < 14)
  const active   = users.filter((u: any) => (u.daysSince ?? 0) < 3)
  const aiUsers  = users.filter((u: any) => (u.modules ?? []).some((m: string) => /gpt|aira|agent/i.test(m)))
  const seqUsers = users.filter((u: any) => (u.modules ?? []).some((m: string) => /sequence/i.test(m)))
  const topUser  = [...users].sort((a: any, b: any) => (b.activeDays ?? 0) - (a.activeDays ?? 0))[0]
  const lowEv    = users.filter((u: any) => (u.totalEvents ?? 0) < 20 && (u.daysSince ?? 0) >= 7)

  if (churned.length) insights.push({ sev:'danger', t:`${churned.length} user${churned.length > 1 ? 's' : ''} churned`, b:`${churned.map((u:any) => u.name).join(', ')} logged in once and never returned.` })
  if (active.length)  insights.push({ sev:'info',   t:`${active.length} user${active.length > 1 ? 's' : ''} still active`, b:`${active.map((u:any) => u.name).join(', ')} logged in recently.` })
  if (aiUsers.length) insights.push({ sev:'info',   t:`AI features tested by ${aiUsers.length}`, b:`${aiUsers.map((u:any) => u.name).join(', ')} explored RF GPT, Aira, or Agents.` })
  if (seqUsers.length) insights.push({ sev:'info',  t:`Sequences adopted by ${seqUsers.length}`, b:`${seqUsers.map((u:any) => u.name).join(', ')} built sequences.` })
  if (inactive.length) insights.push({ sev:'warn',  t:`${inactive.length} inactive 3-14d`, b:`${inactive.map((u:any) => u.name).join(', ')} haven't logged in recently.` })
  if (topUser?.activeDays > 2) insights.push({ sev:'info', t:`Power user: ${topUser.name}`, b:`${topUser.activeDays} active days, ${topUser.totalEvents} events.` })
  if (lowEv.length)   insights.push({ sev:'warn',  t:`${lowEv.length} low-engagement user${lowEv.length > 1 ? 's' : ''}`, b:`${lowEv.map((u:any) => u.name).join(', ')} have under 20 events.` })

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
      {/* ── Account overview dark strip ── */}
      <div style={{ background:T.DB500, borderRadius:12, padding:'16px 20px', marginBottom:12 }}>
        <div style={{ fontSize:10, fontWeight:600, color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:10 }}>Account overview</div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {[
            { l:'Total users',  v:account.totalUsers ?? 0,                           a:T.N0 },
            { l:'Active',       v:account.activeUsers ?? 0,                          a:(account.activeUsers ?? 0) > 0 ? T.G75 : T.R75 },
            { l:'Churned',      v:account.inactiveUsers ?? 0,                        a:(account.inactiveUsers ?? 0) > 0 ? T.R75 : T.N0 },
            { l:'Total events', v:(account.totalEvents ?? 0).toLocaleString(),        a:T.N0 },
            { l:'Last seen',    v:`${account.daysSince ?? 0}d ago`,                  a:(account.daysSince ?? 0) >= 3 ? T.Y300 : T.G75 },
            { l:'Modules',      v:account.modulesCount ?? 0,                         a:T.B75 },
          ].map((m, i) => (
            <div key={i} style={{ background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:9, padding:'10px 13px', flex:1, minWidth:80 }}>
              <div style={{ fontSize:9, color:'rgba(255,255,255,0.4)', marginBottom:4, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em' }}>{m.l}</div>
              <div style={{ fontSize:20, fontWeight:700, color:m.a, lineHeight:1 }}>{m.v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tab switcher: Account insights | User breakdown ── */}
      <div style={{ display:'flex', gap:0, marginBottom:12, background:T.N200, borderRadius:10, padding:3 }}>
        {(['account', 'users'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            flex:1, padding:'7px', fontSize:12, cursor:'pointer', borderRadius:8,
            border:'none', background:tab === t ? T.DB500 : 'transparent',
            color:tab === t ? T.N0 : T.N500, fontWeight:tab === t ? 600 : 500,
            transition:'all 0.15s', fontFamily:FONT,
          }}>
            {t === 'account' ? 'Account insights' : 'User breakdown'}
          </button>
        ))}
      </div>

      {/* ── Account insights tab ── */}
      {tab === 'account' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          {/* Top events */}
          <div style={card}>
            <div style={{ fontSize:10, fontWeight:600, color:T.N400, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:12 }}>Top events · all users</div>
            {topEvents.map((e, i) => <Bar key={i} label={e.n} count={e.c} max={topEvents[0]?.c || 1} />)}
          </div>

          {/* Modules + user activity */}
          <div style={card}>
            <div style={{ fontSize:10, fontWeight:600, color:T.N400, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:10 }}>Modules tested</div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:14 }}>
              {allModules.map((m, i) => {
                const count = users.filter((u: any) => (u.modules ?? []).includes(m)).length
                return (
                  <span key={i} style={{ background:T.P50, border:`1px solid ${T.P75}`, color:T.P400, fontSize:11, padding:'3px 9px', borderRadius:20 }}>
                    {m} <strong>·{count}</strong>
                  </span>
                )
              })}
            </div>
            <div style={{ fontSize:10, fontWeight:600, color:T.N400, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>User activity</div>
            {users.map((u: any, i: number) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:7 }}>
                <div style={{ width:28, height:28, borderRadius:'50%', background:T.DB50, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:T.DB400, flexShrink:0 }}>
                  {u.initials}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:2 }}>
                    <span style={{ color:T.N700, fontWeight:500 }}>{u.name}</span>
                    <span style={{ color:T.N500 }}>{u.totalEvents} events</span>
                  </div>
                  <div style={{ height:4, background:T.N100, borderRadius:2 }}>
                    <div style={{ height:4, width:`${Math.round(((u.totalEvents ?? 0) / Math.max(maxEv, 1)) * 100)}%`, background:(u.daysSince ?? 0) >= 14 ? T.R300 : (u.daysSince ?? 0) >= 3 ? T.Y300 : T.G300, borderRadius:2 }} />
                  </div>
                </div>
                <StatusChip type={(u.daysSince ?? 0) >= 14 ? 'danger' : (u.daysSince ?? 0) >= 3 ? 'warn' : 'green'} label={(u.daysSince ?? 0) >= 14 ? 'Churned' : (u.daysSince ?? 0) >= 3 ? 'Inactive' : 'Active'} small />
              </div>
            ))}
          </div>

          {/* Account health (full-width) */}
          <div style={{ ...card, gridColumn:'1/-1' }}>
            <div style={{ fontSize:10, fontWeight:600, color:T.N400, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:12 }}>Account health</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              {insights.slice(0, 6).map((f, i) => {
                const fc: Record<string, { bg:string; b:string; fg:string }> = {
                  danger: { bg:T.R50, b:T.R75,      fg:T.R400 },
                  warn:   { bg:T.Y50, b:'#fed7aa',   fg:T.Y400 },
                  info:   { bg:T.B50, b:T.B75,       fg:T.B400 },
                }
                const c = fc[f.sev] ?? fc.info
                return (
                  <div key={i} style={{ background:c.bg, border:`1px solid ${c.b}`, borderRadius:8, padding:'10px 13px', fontSize:12, color:c.fg, lineHeight:1.5 }}>
                    <strong>{f.t}</strong><br/>{f.b}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── User breakdown tab ── */}
      {tab === 'users' && (
        <div style={{ display:'grid', gridTemplateColumns:'260px 1fr', gap:12, alignItems:'start' }}>
          {/* Left: user list */}
          <div style={{ background:T.N0, border:`1px solid ${T.N200}`, borderRadius:12, overflow:'hidden' }}>
            {users.map((u: any, i: number) => (
              <div key={i} onClick={() => setSelectedUser(u)} style={{
                display:'flex', alignItems:'center', gap:10, padding:'12px 14px',
                cursor:'pointer',
                background:selectedUser?.email === u.email ? T.B50 : T.N0,
                borderLeft:`3px solid ${selectedUser?.email === u.email ? T.B300 : 'transparent'}`,
                borderBottom:`1px solid ${T.N100}`,
              }}>
                <div style={{ width:34, height:34, borderRadius:'50%', background:T.DB50, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:T.DB400, flexShrink:0 }}>
                  {u.initials}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:T.DB500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{u.email}</div>
                  <div style={{ fontSize:10, color:T.N400 }}>{u.totalEvents} events · {u.activeDays}d active</div>
                </div>
                <StatusChip type={(u.daysSince ?? 0) >= 14 ? 'danger' : (u.daysSince ?? 0) >= 3 ? 'warn' : 'green'} label={(u.daysSince ?? 0) >= 14 ? 'Churned' : `${u.daysSince}d`} small />
              </div>
            ))}
          </div>

          {/* Right: per-user detail */}
          {selectedUser && (
            <div style={card}>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
                <div style={{ width:42, height:42, borderRadius:'50%', background:T.DB50, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:T.DB400 }}>
                  {selectedUser.initials}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:14, fontWeight:600, color:T.DB500 }}>{selectedUser.email}</div>
                  <div style={{ fontSize:11, color:T.N400 }}>First seen {selectedUser.firstSeen} · Last seen {selectedUser.lastSeen}</div>
                </div>
                <a
                  href={`https://app.amplitude.com/analytics/recruiterflow/project/204829/search/amplitude_id%3D${selectedUser.amplitudeId}/activity`}
                  target="_blank" rel="noreferrer"
                  style={{ fontSize:11, color:T.B400, fontWeight:600, textDecoration:'none', background:T.B50, border:`1px solid ${T.B75}`, padding:'5px 10px', borderRadius:6 }}
                >
                  Amplitude →
                </a>
              </div>

              <div style={{ display:'flex', gap:8, marginBottom:14 }}>
                {[
                  { l:'Events',      v:selectedUser.totalEvents,  c:(selectedUser.totalEvents ?? 0) < 15 ? T.Y400 : T.G400 },
                  { l:'Active days', v:selectedUser.activeDays,   c:T.DB500 },
                  { l:'Last seen',   v:(selectedUser.daysSince ?? 0) === 0 ? 'Today' : `${selectedUser.daysSince}d ago`, c:(selectedUser.daysSince ?? 0) >= 14 ? T.R400 : (selectedUser.daysSince ?? 0) >= 3 ? T.Y400 : T.G400 },
                ].map((s, i) => (
                  <div key={i} style={{ background:T.N50, border:`1px solid ${T.N200}`, borderRadius:9, padding:'10px 13px', flex:1 }}>
                    <div style={{ fontSize:9, color:T.N400, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:4 }}>{s.l}</div>
                    <div style={{ fontSize:18, fontWeight:700, color:s.c, lineHeight:1 }}>{s.v}</div>
                  </div>
                ))}
              </div>

              {(selectedUser.dailyActivity?.length ?? 0) > 0 && (
                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:10, fontWeight:600, color:T.N400, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>Daily activity · last 8 days</div>
                  <MiniChart data={selectedUser.dailyActivity} />
                </div>
              )}

              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:10, fontWeight:600, color:T.N400, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>Modules tested</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:5 }}>
                  {(selectedUser.modules ?? []).map((m: string, i: number) => (
                    <span key={i} style={{ background:T.P50, border:`1px solid ${T.P75}`, color:T.P400, fontSize:11, padding:'3px 9px', borderRadius:20 }}>{m}</span>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:10, fontWeight:600, color:T.N400, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>Top events</div>
                {(selectedUser.topEvents ?? []).slice(0, 8).map((e: any, i: number) => (
                  <Bar key={i} label={e.name} count={e.count} max={(selectedUser.topEvents ?? [])[0]?.count || 1} />
                ))}
              </div>

              <div>
                <div style={{ fontSize:10, fontWeight:600, color:T.N400, textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>Flags & insights</div>
                {(selectedUser.flags ?? []).map((f: any, i: number) => {
                  const fc: Record<string, { bg:string; b:string; fg:string }> = {
                    danger: { bg:T.R50, b:T.R75,    fg:T.R400 },
                    warn:   { bg:T.Y50, b:'#fed7aa', fg:T.Y400 },
                    info:   { bg:T.B50, b:T.B75,     fg:T.B400 },
                  }
                  const c = fc[f.sev] ?? fc.info
                  return (
                    <div key={i} style={{ background:c.bg, border:`1px solid ${c.b}`, borderRadius:8, padding:'8px 12px', marginBottom:6, fontSize:12, color:c.fg }}>
                      <strong>{f.t}</strong> — {f.b}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
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
