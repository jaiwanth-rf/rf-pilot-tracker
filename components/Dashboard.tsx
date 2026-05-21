'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const T = {
  B50:'#edf6ff',B75:'#b5d8ff',B300:'#4aa1ff',B400:'#3471b3',
  DB50:'#e8edf5',DB400:'#1a3260',DB500:'#0f1f3d',
  R50:'#fef0f0',R75:'#fdc5c5',R300:'#f05252',R400:'#c81e1e',
  G50:'#f0fdf4',G75:'#bbf7d0',G300:'#16a34a',G400:'#15803d',
  Y50:'#fffbeb',Y300:'#f59e0b',Y400:'#b45309',
  P50:'#f5f3ff',P75:'#ddd6fe',P400:'#6d28d9',
  N0:'#ffffff',N50:'#f9fafb',N100:'#f3f4f6',N200:'#e5e7eb',
  N300:'#d1d5db',N400:'#9ca3af',N500:'#6b7280',N600:'#4b5563',N700:'#374151',
}

const ampUrl = (id: string) => `https://app.amplitude.com/analytics/recruiterflow/project/204829/search/amplitude_id%3D${id}/activity`

function Chip({ type='info', label, small }: any) {
  const m: any = { danger:{bg:T.R50,b:T.R75,fg:T.R400}, warn:{bg:T.Y50,b:'#fed7aa',fg:T.Y400}, green:{bg:T.G50,b:T.G75,fg:T.G400}, info:{bg:T.B50,b:T.B75,fg:T.B400}, purple:{bg:T.P50,b:T.P75,fg:T.P400}, neutral:{bg:T.N100,b:T.N200,fg:T.N600} }
  const c = m[type] || m.info
  return <span style={{background:c.bg,border:`1px solid ${c.b}`,color:c.fg,fontSize:small?10:11,fontWeight:500,padding:small?'2px 8px':'3px 10px',borderRadius:20,whiteSpace:'nowrap'}}>{label}</span>
}

function Bar({ label, count, max }: any) {
  return (
    <div style={{marginBottom:7}}>
      <div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:3}}>
        <span style={{color:T.N700,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'75%'}}>{label}</span>
        <span style={{color:T.N500,fontWeight:600}}>{count}</span>
      </div>
      <div style={{height:4,background:T.N200,borderRadius:2}}>
        <div style={{height:4,width:`${Math.round((count/Math.max(max,1))*100)}%`,background:T.B300,borderRadius:2}}/>
      </div>
    </div>
  )
}

function MiniChart({ data }: any) {
  const max = Math.max(...data.map((d: any) => d.v), 1)
  return (
    <div style={{display:'flex',alignItems:'flex-end',gap:4,height:44}}>
      {data.map((d: any, i: number) => (
        <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:3}}>
          <div style={{width:'100%',background:d.v>0?T.B300:T.N200,borderRadius:'2px 2px 0 0',height:Math.max(3,(d.v/max)*36)}}/>
          <span style={{fontSize:8,color:T.N400,fontWeight:500,whiteSpace:'nowrap'}}>{d.d.split(' ')[1]}</span>
        </div>
      ))}
    </div>
  )
}

function AccountDetail({ account, onBack }: any) {
  const [selectedUser, setSelectedUser] = useState(account.users[0])
  const [tab, setTab] = useState('account')
  const allModules = [...new Set(account.users.flatMap((u: any) => u.modules))] as string[]
  const topEvents = (() => {
    const map: any = {}
    account.users.forEach((u: any) => u.topEvents.forEach((e: any) => { map[e.name]=(map[e.name]||0)+e.count }))
    return Object.entries(map).sort((a: any,b: any)=>b[1]-a[1]).slice(0,10).map(([n,c])=>({n,c}))
  })()
  const maxEv = Math.max(...account.users.map((u: any) => u.totalEvents))
  const insights: any[] = []
  const churned = account.users.filter((u: any) => u.daysSince >= 14)
  const inactive = account.users.filter((u: any) => u.daysSince >= 3 && u.daysSince < 14)
  const active = account.users.filter((u: any) => u.daysSince < 3)
  const aiUsers = account.users.filter((u: any) => u.modules.some((m: string) => /gpt|aira|agent/i.test(m)))
  const seqUsers = account.users.filter((u: any) => u.modules.some((m: string) => /sequence/i.test(m)))
  const topUser = [...account.users].sort((a: any,b: any) => b.activeDays-a.activeDays)[0]
  const lowEv = account.users.filter((u: any) => u.totalEvents < 20 && u.daysSince >= 7)
  if (churned.length) insights.push({sev:'danger',t:`${churned.length} user${churned.length>1?'s':''} churned`,b:`${churned.map((u:any)=>u.name).join(', ')} logged in once and never returned.`})
  if (active.length) insights.push({sev:'info',t:`${active.length} user${active.length>1?'s':''} still active`,b:`${active.map((u:any)=>u.name).join(', ')} logged in recently.`})
  if (aiUsers.length) insights.push({sev:'info',t:`AI features tested by ${aiUsers.length}`,b:`${aiUsers.map((u:any)=>u.name).join(', ')} explored RF GPT, Aira, or Agents.`})
  if (seqUsers.length) insights.push({sev:'info',t:`Sequences adopted by ${seqUsers.length}`,b:`${seqUsers.map((u:any)=>u.name).join(', ')} built sequences.`})
  if (inactive.length) insights.push({sev:'warn',t:`${inactive.length} inactive 3-14d`,b:`${inactive.map((u:any)=>u.name).join(', ')} haven't logged in recently.`})
  if (topUser?.activeDays > 2) insights.push({sev:'info',t:`Power user: ${topUser.name}`,b:`${topUser.activeDays} active days, ${topUser.totalEvents} events.`})
  if (lowEv.length) insights.push({sev:'warn',t:`${lowEv.length} low-engagement user${lowEv.length>1?'s':''}`,b:`${lowEv.map((u:any)=>u.name).join(', ')} have under 20 events.`})
  const card = {background:T.N0,border:`1px solid ${T.N200}`,borderRadius:12,padding:'16px 18px'}

  return (
    <div>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:18}}>
        <button onClick={onBack} style={{background:T.N100,border:`1px solid ${T.N200}`,borderRadius:8,padding:'6px 14px',fontSize:12,fontWeight:500,color:T.N600,cursor:'pointer'}}>← All accounts</button>
        <div style={{flex:1}}>
          <div style={{fontSize:20,fontWeight:700,color:T.DB500}}>{account.domain}</div>
          <div style={{fontSize:11,color:T.N400}}>{account.totalUsers} users · Added {account.addedAt}</div>
        </div>
        <Chip type={account.inactiveUsers>0?'danger':'green'} label={`${account.inactiveUsers} churned`}/>
      </div>
      <div style={{background:T.DB500,borderRadius:12,padding:'16px 20px',marginBottom:12}}>
        <div style={{fontSize:10,fontWeight:600,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:10}}>Account overview</div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {[{l:'Total users',v:account.totalUsers,a:T.N0},{l:'Active',v:account.activeUsers,a:account.activeUsers>0?T.G75:T.R75},{l:'Churned',v:account.inactiveUsers,a:account.inactiveUsers>0?T.R75:T.N0},{l:'Total events',v:account.totalEvents,a:T.N0},{l:'Last seen',v:`${account.daysSince}d ago`,a:account.daysSince>=3?T.Y300:T.G75},{l:'Modules',v:account.modulesCount,a:T.B75}].map((m,i)=>(
            <div key={i} style={{background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:9,padding:'10px 13px',flex:1,minWidth:80}}>
              <div style={{fontSize:9,color:'rgba(255,255,255,0.4)',marginBottom:4,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em'}}>{m.l}</div>
              <div style={{fontSize:20,fontWeight:700,color:m.a,lineHeight:1}}>{m.v}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{display:'flex',gap:0,marginBottom:12,background:T.N200,borderRadius:10,padding:3}}>
        {['account','users'].map(t=>(
          <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:'7px',fontSize:12,cursor:'pointer',borderRadius:8,border:'none',background:tab===t?T.DB500:'transparent',color:tab===t?T.N0:T.N500,fontWeight:tab===t?600:500,transition:'all 0.15s'}}>
            {t==='account'?'Account insights':'User breakdown'}
          </button>
        ))}
      </div>
      {tab==='account' && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div style={card}>
            <div style={{fontSize:10,fontWeight:600,color:T.N400,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:12}}>Top events · all users</div>
            {topEvents.map((e:any,i:number)=><Bar key={i} label={e.n} count={e.c} max={topEvents[0]?.c||1}/>)}
          </div>
          <div style={card}>
            <div style={{fontSize:10,fontWeight:600,color:T.N400,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:10}}>Modules tested</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:5,marginBottom:14}}>
              {allModules.map((m,i)=>{
                const count=account.users.filter((u:any)=>u.modules.includes(m)).length
                return <span key={i} style={{background:T.P50,border:`1px solid ${T.P75}`,color:T.P400,fontSize:11,padding:'3px 9px',borderRadius:20}}>{m} <strong>·{count}</strong></span>
              })}
            </div>
            <div style={{fontSize:10,fontWeight:600,color:T.N400,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:8}}>User activity</div>
            {account.users.map((u:any,i:number)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:10,marginBottom:7}}>
                <div style={{width:28,height:28,borderRadius:'50%',background:T.DB50,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:T.DB400,flexShrink:0}}>{u.initials}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:2}}>
                    <span style={{color:T.N700,fontWeight:500}}>{u.name}</span>
                    <span style={{color:T.N500}}>{u.totalEvents} events</span>
                  </div>
                  <div style={{height:4,background:T.N100,borderRadius:2}}>
                    <div style={{height:4,width:`${Math.round((u.totalEvents/Math.max(maxEv,1))*100)}%`,background:u.daysSince>=14?T.R300:u.daysSince>=3?T.Y300:T.G300,borderRadius:2}}/>
                  </div>
                </div>
                <Chip type={u.daysSince>=14?'danger':u.daysSince>=3?'warn':'green'} label={u.daysSince>=14?'Churned':u.daysSince>=3?'Inactive':'Active'} small/>
              </div>
            ))}
          </div>
          <div style={{...card,gridColumn:'1/-1'}}>
            <div style={{fontSize:10,fontWeight:600,color:T.N400,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:12}}>Account health</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              {insights.slice(0,6).map((f,i)=>{
                const fc:any={danger:{bg:T.R50,b:T.R75,fg:T.R400},warn:{bg:T.Y50,b:'#fed7aa',fg:T.Y400},info:{bg:T.B50,b:T.B75,fg:T.B400}}[f.sev as string]
                return <div key={i} style={{background:fc.bg,border:`1px solid ${fc.b}`,borderRadius:8,padding:'10px 13px',fontSize:12,color:fc.fg,lineHeight:1.5}}><strong>{f.t}</strong><br/>{f.b}</div>
              })}
            </div>
          </div>
        </div>
      )}
      {tab==='users' && (
        <div style={{display:'grid',gridTemplateColumns:'260px 1fr',gap:12,alignItems:'start'}}>
          <div style={{background:T.N0,border:`1px solid ${T.N200}`,borderRadius:12,overflow:'hidden'}}>
            {account.users.map((u:any,i:number)=>(
              <div key={i} onClick={()=>setSelectedUser(u)} style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',cursor:'pointer',background:selectedUser?.email===u.email?T.B50:T.N0,borderLeft:`3px solid ${selectedUser?.email===u.email?T.B300:'transparent'}`,borderBottom:`1px solid ${T.N100}`}}>
                <div style={{width:34,height:34,borderRadius:'50%',background:T.DB50,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:T.DB400,flexShrink:0}}>{u.initials}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:12,fontWeight:600,color:T.DB500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{u.email}</div>
                  <div style={{fontSize:10,color:T.N400}}>{u.totalEvents} events · {u.activeDays}d active</div>
                </div>
                <Chip type={u.daysSince>=14?'danger':u.daysSince>=3?'warn':'green'} label={u.daysSince>=14?'Churned':`${u.daysSince}d`} small/>
              </div>
            ))}
          </div>
          {selectedUser && (
            <div style={card}>
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
                <div style={{width:42,height:42,borderRadius:'50%',background:T.DB50,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:700,color:T.DB400}}>{selectedUser.initials}</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:14,fontWeight:600,color:T.DB500}}>{selectedUser.email}</div>
                  <div style={{fontSize:11,color:T.N400}}>First seen {selectedUser.firstSeen} · Last seen {selectedUser.lastSeen}</div>
                </div>
                <a href={ampUrl(selectedUser.amplitudeId)} target="_blank" rel="noreferrer" style={{fontSize:11,color:T.B400,fontWeight:600,textDecoration:'none',background:T.B50,border:`1px solid ${T.B75}`,padding:'5px 10px',borderRadius:6}}>Amplitude →</a>
              </div>
              <div style={{display:'flex',gap:8,marginBottom:14}}>
                {[{l:'Events',v:selectedUser.totalEvents,c:selectedUser.totalEvents<15?T.Y400:T.G400},{l:'Active days',v:selectedUser.activeDays,c:T.DB500},{l:'Last seen',v:selectedUser.daysSince===0?'Today':`${selectedUser.daysSince}d ago`,c:selectedUser.daysSince>=14?T.R400:selectedUser.daysSince>=3?T.Y400:T.G400}].map((s,i)=>(
                  <div key={i} style={{background:T.N50,border:`1px solid ${T.N200}`,borderRadius:9,padding:'10px 13px',flex:1}}>
                    <div style={{fontSize:9,color:T.N400,fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:4}}>{s.l}</div>
                    <div style={{fontSize:18,fontWeight:700,color:s.c,lineHeight:1}}>{s.v}</div>
                  </div>
                ))}
              </div>
              {selectedUser.dailyActivity?.length > 0 && (
                <div style={{marginBottom:14}}>
                  <div style={{fontSize:10,fontWeight:600,color:T.N400,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:8}}>Daily activity · last 8 days</div>
                  <MiniChart data={selectedUser.dailyActivity}/>
                </div>
              )}
              <div style={{marginBottom:14}}>
                <div style={{fontSize:10,fontWeight:600,color:T.N400,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:8}}>Modules tested</div>
                <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
                  {selectedUser.modules.map((m:string,i:number)=><span key={i} style={{background:T.P50,border:`1px solid ${T.P75}`,color:T.P400,fontSize:11,padding:'3px 9px',borderRadius:20}}>{m}</span>)}
                </div>
              </div>
              <div style={{marginBottom:14}}>
                <div style={{fontSize:10,fontWeight:600,color:T.N400,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:8}}>Top events</div>
                {selectedUser.topEvents.slice(0,8).map((e:any,i:number)=><Bar key={i} label={e.name} count={e.count} max={selectedUser.topEvents[0]?.count||1}/>)}
              </div>
              <div>
                <div style={{fontSize:10,fontWeight:600,color:T.N400,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:8}}>Flags & insights</div>
                {selectedUser.flags.map((f:any,i:number)=>{
                  const fc:any={danger:{bg:T.R50,b:T.R75,fg:T.R400},warn:{bg:T.Y50,b:'#fed7aa',fg:T.Y400},info:{bg:T.B50,b:T.B75,fg:T.B400}}[f.sev as string]
                  return <div key={i} style={{background:fc.bg,border:`1px solid ${fc.b}`,borderRadius:8,padding:'8px 12px',marginBottom:6,fontSize:12,color:fc.fg}}><strong>{f.t}</strong> — {f.b}</div>
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Dashboard({ session }: any) {
  const [accounts, setAccounts] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [input, setInput] = useState('')
  const [adding, setAdding] = useState(false)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => { loadProfile(); loadAccounts() }, [])

  async function loadProfile() {
    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
    setProfile(data)
  }

  async function loadAccounts() {
    setLoading(true)
    const { data } = await supabase.from('tracked_domains').select('*').eq('user_id', session.user.id).order('added_at', { ascending: false })
    if (data) setAccounts(data.map(d => ({ ...d, ...(d.cached_data || {}), status: d.cached_data ? 'ready' : 'empty' })))
    setLoading(false)
  }

  async function addDomain() {
    const domain = input.trim().toLowerCase().replace(/^https?:\/\//,'').replace(/\//,'')
    if (!domain || !domain.includes('.')) return
    if (accounts.some(a => a.domain === domain)) { setInput(''); setAdding(false); return }
    const addedAt = new Date().toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })
    const placeholder = { domain, status:'loading', addedAt, totalUsers:0, activeUsers:0, inactiveUsers:0, totalEvents:0, modulesCount:0, daysSince:0, lastSeen:'—', users:[] }
    setAccounts(prev => [placeholder, ...prev])
    setInput(''); setAdding(false)
    try {
      const res = await fetch('/api/amplitude', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ domain }) })
      const data = await res.json()
      if (!res.ok) { setAccounts(prev => prev.map(a => a.domain===domain ? {...a, status:'error', error:data.error} : a)); return }
      const accountData = { ...data, addedAt, status:'ready' }
      await supabase.from('tracked_domains').insert({ user_id:session.user.id, domain, cached_data:data })
      setAccounts(prev => prev.map(a => a.domain===domain ? accountData : a))
    } catch (err:any) {
      setAccounts(prev => prev.map(a => a.domain===domain ? {...a, status:'error', error:err.message} : a))
    }
  }

  async function removeDomain(domain: string) {
    await supabase.from('tracked_domains').delete().eq('user_id', session.user.id).eq('domain', domain)
    setAccounts(prev => prev.filter(a => a.domain !== domain))
    if (selected?.domain === domain) setSelected(null)
  }

  const signOut = () => supabase.auth.signOut()
  const danger = accounts.filter(a => a.status==='ready' && a.inactiveUsers>0).length

  if (selected) return (
    <div style={{maxWidth:960,margin:'0 auto',padding:'1.5rem 1rem 3rem',fontFamily:'Inter, system-ui, sans-serif',background:'#f9fafb',minHeight:'100vh'}}>
      <AccountDetail account={selected} onBack={() => setSelected(null)} />
    </div>
  )

  return (
    <div style={{maxWidth:700,margin:'0 auto',padding:'1.5rem 1rem 3rem',fontFamily:'Inter, system-ui, sans-serif',background:'#f9fafb',minHeight:'100vh'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20}}>
        <div style={{width:5,height:32,background:'#4aa1ff',borderRadius:3}}/>
        <div style={{flex:1}}>
          <div style={{fontSize:10,fontWeight:600,color:'#9ca3af',letterSpacing:'0.08em',textTransform:'uppercase',marginBottom:2}}>Recruiterflow</div>
          <div style={{fontSize:22,fontWeight:700,color:'#0f1f3d'}}>Pilot tracker</div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:12,color:'#6b7280'}}>{profile?.full_name || session.user.email}</span>
          <button onClick={signOut} style={{background:'#f3f4f6',border:'1px solid #e5e7eb',borderRadius:7,padding:'6px 12px',fontSize:12,color:'#4b5563',cursor:'pointer'}}>Sign out</button>
          <button onClick={() => setAdding(a=>!a)} style={{background:'#0f1f3d',border:'none',borderRadius:8,padding:'8px 16px',fontSize:13,fontWeight:600,color:'#fff',cursor:'pointer'}}>+ Track domain</button>
        </div>
      </div>

      {adding && (
        <div style={{background:'#fff',border:'1px solid #b5d8ff',borderRadius:12,padding:'14px 16px',marginBottom:14}}>
          <div style={{display:'flex',gap:8,marginBottom:8}}>
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addDomain()} placeholder="e.g. kelaca.com" autoFocus style={{flex:1,fontSize:13,border:'1px solid #e5e7eb',borderRadius:8,padding:'8px 12px',fontFamily:'Inter, sans-serif',outline:'none'}}/>
            <button onClick={addDomain} style={{background:'#3471b3',border:'none',borderRadius:8,padding:'8px 16px',fontSize:13,fontWeight:600,color:'#fff',cursor:'pointer'}}>Track</button>
            <button onClick={() => setAdding(false)} style={{background:'#f3f4f6',border:'1px solid #e5e7eb',borderRadius:8,padding:'8px 12px',fontSize:13,color:'#6b7280',cursor:'pointer'}}>Cancel</button>
          </div>
          <div style={{fontSize:11,color:'#9ca3af'}}>💡 Enter a company domain — the app finds all users automatically via Amplitude</div>
        </div>
      )}

      {accounts.filter(a=>a.status==='ready').length > 0 && (
        <div style={{display:'flex',gap:8,marginBottom:14}}>
          {[{l:'Tracking',v:accounts.filter(a=>a.status==='ready').length,c:'#0f1f3d'},{l:'At risk',v:danger,c:danger>0?'#c81e1e':'#15803d'},{l:'Total users',v:accounts.filter(a=>a.status==='ready').reduce((s,a)=>s+a.totalUsers,0),c:'#0f1f3d'}].map((s,i)=>(
            <div key={i} style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:9,padding:'9px 13px',flex:1,textAlign:'center'}}>
              <div style={{fontSize:9,color:'#9ca3af',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:3}}>{s.l}</div>
              <div style={{fontSize:22,fontWeight:700,color:s.c}}>{s.v}</div>
            </div>
          ))}
        </div>
      )}

      {danger > 0 && <div style={{background:'#fef0f0',border:'1px solid #fdc5c5',borderRadius:9,padding:'10px 14px',marginBottom:12,fontSize:13,color:'#c81e1e',fontWeight:500}}>⚠️ {danger} account{danger>1?'s':''} have churned users needing attention</div>}
      {loading && <div style={{textAlign:'center',padding:'40px 0',fontSize:13,color:'#9ca3af'}}>Loading your accounts…</div>}
      {!loading && accounts.length === 0 && (
        <div style={{textAlign:'center',padding:'48px 0',color:'#9ca3af'}}>
          <div style={{fontSize:32,marginBottom:12}}>🚀</div>
          <div style={{fontSize:15,fontWeight:500,color:'#4b5563',marginBottom:6}}>No pilot accounts tracked yet</div>
          <div style={{fontSize:13}}>Click "+ Track domain" to add your first pilot account</div>
        </div>
      )}

      {accounts.map((a,i) => (
        <div key={i} style={{background:'#fff',border:`1px solid ${a.status==='error'?'#fdc5c5':'#e5e7eb'}`,borderRadius:12,padding:'16px 18px',marginBottom:10}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:44,height:44,borderRadius:10,background:'#e8edf5',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:700,color:'#1a3260',flexShrink:0}}>{a.domain.slice(0,2).toUpperCase()}</div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:15,fontWeight:600,color:'#0f1f3d'}}>{a.domain}</div>
              <div style={{fontSize:11,color:'#9ca3af'}}>Added {a.addedAt}</div>
            </div>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              {a.status==='loading' && <Chip type="neutral" label="Finding users…"/>}
              {a.status==='error' && <Chip type="danger" label="Not found"/>}
              {a.status==='ready' && <>
                <div style={{textAlign:'right',marginRight:4}}>
                  <div style={{fontSize:11,color:'#6b7280'}}>{a.totalUsers} users · {a.totalEvents} events</div>
                  <div style={{fontSize:11,color:'#9ca3af'}}>Last seen {a.daysSince}d ago</div>
                </div>
                <Chip type={a.inactiveUsers>0?'warn':'green'} label={a.inactiveUsers>0?`${a.inactiveUsers} inactive`:'All active'}/>
                <button onClick={() => setSelected(a)} style={{background:'#0f1f3d',border:'none',borderRadius:7,padding:'6px 14px',fontSize:12,fontWeight:600,color:'#fff',cursor:'pointer'}}>View →</button>
              </>}
            </div>
            <button onClick={() => removeDomain(a.domain)} style={{background:'none',border:'none',color:'#d1d5db',fontSize:16,cursor:'pointer',padding:'2px 6px'}}>✕</button>
          </div>
          {a.status==='error' && <div style={{marginTop:10,background:'#fef0f0',border:'1px solid #fdc5c5',borderRadius:8,padding:'10px 12px',fontSize:12,color:'#c81e1e'}}>{a.error || 'No users found for this domain in Amplitude.'}</div>}
          {a.status==='loading' && <div style={{marginTop:8,fontSize:12,color:'#9ca3af'}}>Searching Amplitude for @{a.domain} users…</div>}
        </div>
      ))}
    </div>
  )
}
