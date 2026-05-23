'use client'
import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// ─── Color tokens (used by AccountDetail + utility components) ────────
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

const FONT = "'Nunito', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"

// ─── Shared helpers ───────────────────────────────────────────────────
const ampUrl = (id: string) =>
  `https://app.amplitude.com/analytics/recruiterflow/project/204829/search/amplitude_id%3D${id}/activity`

const fmtDate = (iso: string, withTime = false) => {
  const d = new Date(iso)
  const date = d.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })
  return withTime ? date + ', ' + d.toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit' }) : date
}

// ─── Inline SVG icon components (no Font Awesome dependency) ─────────
type IconProps = { size?: number; style?: React.CSSProperties }

function ic(paths: React.ReactNode, { size = 14, style }: IconProps = {}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      style={{ display:'inline-block', verticalAlign:'middle', flexShrink:0, ...style }}
      aria-hidden="true">{paths}</svg>
  )
}

function RefreshIcon(p: IconProps) { return ic(<><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 21H3v-5"/></>, p) }
function SpinnerIcon({ size = 14, style }: IconProps = {}) { return ic(<path d="M21 12a9 9 0 1 1-6.219-8.56"/>, { size, style: { animation:'spin 0.8s linear infinite', ...style } }) }
function ArrowRightIcon(p: IconProps) { return ic(<><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></>, p) }
function XIcon(p: IconProps) { return ic(<><path d="M18 6 6 18"/><path d="M6 6l12 12"/></>, p) }
function PlusIcon(p: IconProps) { return ic(<><path d="M12 5v14"/><path d="M5 12h14"/></>, p) }
function SearchIcon(p: IconProps) { return ic(<><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></>, p) }
function GlobeIcon(p: IconProps) { return ic(<><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></>, p) }
function DownloadIcon(p: IconProps) { return ic(<><path d="M12 3v13"/><path d="M8 12l4 4 4-4"/><path d="M3 21h18"/></>, p) }
function WarningIcon(p: IconProps) { return ic(<><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></>, p) }
function CheckCircleIcon(p: IconProps) { return ic(<><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/></>, p) }
function UsersIcon(p: IconProps) { return ic(<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>, p) }
function BoltIcon(p: IconProps) { return ic(<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>, p) }
function ClockIcon(p: IconProps) { return ic(<><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></>, p) }
function RocketIcon(p: IconProps) { return ic(<><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></>, p) }
function ChartLineIcon(p: IconProps) { return ic(<><path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/></>, p) }
function EyeIcon(p: IconProps) { return ic(<><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></>, p) }
function UserSlashIcon(p: IconProps) { return ic(<><path d="M13 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M2 2l20 20"/></>, p) }
function UserClockIcon(p: IconProps) { return ic(<><path d="M15 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/><path d="M9 21v-2a4 4 0 0 1 .43-1.81"/><circle cx="20" cy="17" r="3"/><path d="M20 14.5v2.5l1.5 1"/></>, p) }
function SnowflakeIcon(p: IconProps) { return ic(<><path d="M12 2v20M2 12h20"/><path d="M12 6l-2-2M12 6l2-2M12 18l-2 2M12 18l2 2M6 12l-2-2M6 12l-2 2M18 12l2-2M18 12l2 2"/></>, p) }
function ClockRotateLeftIcon(p: IconProps) { return ic(<><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/></>, p) }
function UsersSlashIcon(p: IconProps) { return ic(<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M2 2l20 20"/></>, p) }

// ─── List-view logic ──────────────────────────────────────────────────

function classify(a: any): 'critical' | 'watch' | 'healthy' {
  if (a.daysSince > 14 || a.activeUsers === 0) return 'critical'
  if (a.inactiveUsers > 0 || a.daysSince > 7) return 'watch'
  return 'healthy'
}

function buildReasons(a: any) {
  // inactiveUsers from API = users with daysSince >= 14 (effectively "churned")
  const churnedCount = a.inactiveUsers || 0
  // watchInactive = users between 3-14 days inactive (not in explicit API field)
  const watchInactive = Math.max(0, (a.totalUsers || 0) - (a.activeUsers || 0) - churnedCount)
  const r: { icon: React.ReactNode; label: string; tone: 'critical' | 'watch' }[] = []
  if (churnedCount > 0) r.push({ icon: <UserSlashIcon size={10}/>, label: `${churnedCount} churned`, tone: 'critical' })
  else if (watchInactive > 0) r.push({ icon: <UserClockIcon size={10}/>, label: `${watchInactive} inactive`, tone: 'watch' })
  if (a.daysSince > 14) r.push({ icon: <SnowflakeIcon size={10}/>, label: `Cold ${a.daysSince}d`, tone: 'critical' })
  else if (a.daysSince > 7) r.push({ icon: <ClockRotateLeftIcon size={10}/>, label: `${a.daysSince}d since activity`, tone: 'watch' })
  if (a.activeUsers === 0 && a.totalUsers > 0) r.push({ icon: <UsersSlashIcon size={10}/>, label: 'Zero active users', tone: 'critical' })
  return r
}

// Derive top modules from per-user modules array in cached API response
function getTopModules(a: any): [string, number][] {
  if (!a.users?.length) return []
  const counts: Record<string, number> = {}
  a.users.forEach((u: any) => {
    u.modules?.forEach((m: string) => { counts[m] = (counts[m] || 0) + 1 })
  })
  return (Object.entries(counts) as [string, number][]).sort((x, y) => y[1] - x[1]).slice(0, 5)
}

// ─── Utility components (used by AccountDetail — do not remove) ───────

function Chip({ type = 'info', label, small }: any) {
  const m: any = {
    danger:{bg:T.R50,b:T.R75,fg:T.R400}, warn:{bg:T.Y50,b:'#fed7aa',fg:T.Y400},
    green:{bg:T.G50,b:T.G75,fg:T.G400}, info:{bg:T.B50,b:T.B75,fg:T.B400},
    purple:{bg:T.P50,b:T.P75,fg:T.P400}, neutral:{bg:T.N100,b:T.N200,fg:T.N600},
  }
  const c = m[type] || m.info
  return (
    <span style={{background:c.bg,border:`1px solid ${c.b}`,color:c.fg,fontSize:small?10:11,fontWeight:500,padding:small?'2px 8px':'3px 10px',borderRadius:20,whiteSpace:'nowrap'}}>
      {label}
    </span>
  )
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

// ─── New list-view visual components ─────────────────────────────────

function RFLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M0 18C0 8.05888 8.05888 0 18 0C27.9411 0 36 8.05888 36 18C36 27.9411 27.9411 36 18 36C8.05888 36 0 27.9411 0 18Z" fill="#4AA1FF"/>
      <path d="M10.06 27.0584C11.53 27.0584 12.4715 26.159 12.4715 24.5727V16.7884C12.4715 14.7115 13.2478 13.485 15.4446 13.4523C16.3861 13.4359 17.0798 13.2233 17.5423 12.8308C18.0048 12.4384 18.236 11.866 18.236 11.1137C18.236 10.296 18.0048 9.70731 17.5423 9.34753C17.1954 9.05317 16.6834 8.90599 16.0392 8.90599C14.2719 8.90599 12.8184 10.1979 12.3559 12.3729H12.2568V11.2282C12.2568 9.70731 11.3318 8.82422 9.97738 8.82422C8.58992 8.82422 7.64844 9.70731 7.64844 11.2282V24.5727C7.64844 26.159 8.60644 27.0584 10.06 27.0584Z" fill="white"/>
      <mask id="rf-logo-mask" style={{maskType:'alpha'} as React.CSSProperties} maskUnits="userSpaceOnUse" x="0" y="0" width="36" height="36">
        <path d="M0 18C0 8.05888 8.05888 0 18 0C27.9411 0 36 8.05888 36 18C36 27.9411 27.9411 36 18 36C8.05888 36 0 27.9411 0 18Z" fill="#4AA1FF"/>
      </mask>
      <g mask="url(#rf-logo-mask)">
        <path fillRule="evenodd" clipRule="evenodd" d="M34.6402 7.79297L66.4646 7.79297C67.6829 7.79297 68.6704 8.78053 68.6704 9.99874C68.6704 11.2169 67.6829 12.2045 66.4646 12.2045H34.7963C31.5452 12.2045 29.3288 12.2092 27.6679 12.4325C26.0705 12.6473 25.3211 13.0272 24.8086 13.5397C24.2961 14.0521 23.9162 14.8016 23.7014 16.399C23.4781 18.0599 23.4734 20.2763 23.4734 23.5274V24.8597C23.4735 27.9155 23.4736 30.4305 23.2061 32.4199C22.9255 34.5065 22.3149 36.3421 20.8461 37.8108C19.3774 39.2796 17.5418 39.8902 15.4552 40.1708C13.4658 40.4382 10.9509 40.4382 7.89517 40.4381H-84.1146C-85.3328 40.4381 -86.3203 39.4505 -86.3203 38.2323C-86.3203 37.0141 -85.3328 36.0266 -84.1146 36.0266H7.73899C10.9901 36.0266 13.2065 36.0219 14.8674 35.7986C16.4648 35.5838 17.2142 35.2039 17.7267 34.6914C18.2392 34.1789 18.6191 33.4295 18.8339 31.8321C19.0572 30.1712 19.0619 27.9548 19.0619 24.7037V23.3714C19.0618 20.3155 19.0617 17.8006 19.3292 15.8112C19.6097 13.7246 20.2204 11.889 21.6892 10.4203C23.1579 8.9515 24.9935 8.34084 27.0801 8.0603C29.0695 7.79283 31.5844 7.79289 34.6402 7.79297Z" fill="white"/>
        <path fillRule="evenodd" clipRule="evenodd" d="M15.5859 19.4102C15.5859 18.2732 16.5077 17.3514 17.6446 17.3514H25.8795C27.0165 17.3514 27.9382 18.2732 27.9382 19.4102C27.9382 20.5471 27.0165 21.4689 25.8795 21.4689H17.6446C16.5077 21.4689 15.5859 20.5471 15.5859 19.4102Z" fill="white"/>
      </g>
    </svg>
  )
}

function AIRASparkle({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="aira-sparkle-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4aa1ff"/>
          <stop offset="100%" stopColor="#6455ff"/>
        </linearGradient>
      </defs>
      <path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z" fill="url(#aira-sparkle-grad)"/>
    </svg>
  )
}

function DomainAvatar({ domain, size = 36, tier = 'healthy' }: { domain: string; size?: number; tier?: string }) {
  const [failed, setFailed] = useState(false)
  const initials = domain.replace(/\..+$/, '').slice(0, 2).toUpperCase()
  const tints: Record<string, { bg: string; fg: string }> = {
    critical: { bg: 'linear-gradient(135deg,#ffe1d8,#fdc5c5)', fg: '#c81e1e' },
    watch:    { bg: 'linear-gradient(135deg,#fef0d9,#fddc9d)', fg: '#a05c00' },
    healthy:  { bg: 'linear-gradient(135deg,#e3f0ff,#c2e0ff)', fg: '#1a6fd4' },
  }
  const t = tints[tier] || tints.healthy
  return (
    <div style={{
      width: size, height: size, borderRadius: 10,
      background: t.bg, color: t.fg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 800, fontSize: size * 0.36, letterSpacing: '-0.02em',
      flexShrink: 0, border: '1px solid rgba(255,255,255,0.6)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5)',
    }}>
      {failed ? initials : (
        <img
          src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
          alt=""
          width={size * 0.55}
          height={size * 0.55}
          style={{ borderRadius: 4 }}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  )
}

function Sparkline({ data, width = 96, height = 28, color = '#007bff' }: { data: number[]; width?: number; height?: number; color?: string }) {
  const hasData = data.some(v => v > 0)
  if (!hasData) {
    return <div style={{width, height, background:'#f0f1f3', borderRadius:4}}/>
  }
  const max = Math.max(...data, 1)
  const step = width / (data.length - 1)
  const pts = data.map((v, i) => [i * step, height - (v / max) * height])
  const path = 'M ' + pts.map(p => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L ')
  const fillPath = path + ` L ${width} ${height} L 0 ${height} Z`
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{display:'block'}}>
      <path d={fillPath} fill={color} opacity="0.12"/>
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round"/>
    </svg>
  )
}

function ActivityBars({ data, width = 140, height = 34, color = '#3471b3', dimColor = '#e9eef5' }: { data: number[]; width?: number; height?: number; color?: string; dimColor?: string }) {
  const max = Math.max(...data, 1)
  const gap = 2
  const barW = (width - (data.length - 1) * gap) / data.length
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{display:'block'}}>
      {data.map((v, i) => {
        const h = Math.max(2, (v / max) * height)
        return (
          <rect key={i}
            x={i * (barW + gap)} y={height - h}
            width={barW} height={h}
            rx={1}
            fill={v === 0 ? dimColor : color}
          />
        )
      })}
    </svg>
  )
}

function StatusPill({ tier, dense }: { tier: string; dense?: boolean }) {
  const map: Record<string, { bg: string; fg: string; bd: string; label: string; dot: string }> = {
    critical: { bg:'#fff0f0', fg:'#c81e1e', bd:'#fdc5c5', label:'Critical', dot:'#e01e5a' },
    watch:    { bg:'#fef7e7', fg:'#a05c00', bd:'#f9c96a', label:'Watch',    dot:'#f9aa10' },
    healthy:  { bg:'#edfbf4', fg:'#1a9e68', bd:'#8fd9bb', label:'Healthy',  dot:'#2eb67d' },
  }
  const m = map[tier]
  if (!m) return null
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:6,
      background: m.bg, color: m.fg, border:`1px solid ${m.bd}`,
      borderRadius: 20, padding: dense ? '2px 8px' : '3px 10px',
      fontSize: dense ? 11 : 12, fontWeight: 700, letterSpacing: '-0.005em',
      whiteSpace:'nowrap',
    }}>
      <span style={{width:6, height:6, borderRadius:'50%', background:m.dot, flexShrink:0, display:'inline-block'}}/>
      {m.label}
    </span>
  )
}

function UsersGauge({ active, inactive = 0, churned = 0, total, width = 84 }: { active: number; inactive?: number; churned?: number; total: number; width?: number }) {
  const safeTotal = Math.max(total, 1)
  const aw = (active / safeTotal) * width
  const iw = (inactive / safeTotal) * width
  const cw = (churned / safeTotal) * width
  return (
    <div style={{display:'flex', alignItems:'center', gap:8}}>
      <div style={{fontSize:13, fontWeight:700, color:'#1e1c18', fontVariantNumeric:'tabular-nums'}}>
        <span style={{color: active === total ? '#1a9e68' : '#1e1c18'}}>{active}</span>
        <span style={{color:'#96999c', fontWeight:600}}>/{total}</span>
      </div>
      <div style={{width, height:5, borderRadius:3, background:'#f0f1f3', overflow:'hidden', display:'flex'}}>
        {aw > 0 && <div style={{width:aw, background:'#2eb67d'}}/>}
        {iw > 0 && <div style={{width:iw, background:'#f9aa10'}}/>}
        {cw > 0 && <div style={{width:cw, background:'#e01e5a'}}/>}
      </div>
    </div>
  )
}

function ModuleChip({ name, count }: { name: string; count?: number }) {
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:5,
      background:'#f5f3ff', color:'#6d28d9', border:'1px solid #ddd6fe',
      borderRadius: 20, padding: '2px 9px', fontSize: 11, fontWeight: 600,
      whiteSpace:'nowrap',
    }}>
      {name}{count != null && <span style={{color:'#9b87e6', fontWeight:700}}>·{count}</span>}
    </span>
  )
}

function ReasonChip({ icon, label, tone = 'watch' }: { icon: React.ReactNode; label: string; tone?: 'critical' | 'watch' }) {
  const tones: Record<string, { bg: string; fg: string; bd: string }> = {
    critical: { bg:'#fff0f0', fg:'#c81e1e', bd:'#fdc5c5' },
    watch:    { bg:'#fef7e7', fg:'#a05c00', bd:'#f9c96a' },
  }
  const t = tones[tone] || tones.watch
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', gap:6,
      background:t.bg, color:t.fg, border:`1px solid ${t.bd}`,
      borderRadius:6, padding:'4px 9px', fontSize:12, fontWeight:600,
      whiteSpace:'nowrap',
    }}>
      {icon}
      {label}
    </span>
  )
}

function AtRiskCard({ account: a, onView, onRefresh, onRemove, refreshing }: any) {
  const [refreshHover, setRefreshHover] = useState(false)
  const [removeHover, setRemoveHover] = useState(false)
  const tier = classify(a)
  const reasons = buildReasons(a)
  const topModules = getTopModules(a)
  const churnedCount = a.inactiveUsers || 0
  const watchInactive = Math.max(0, (a.totalUsers || 0) - (a.activeUsers || 0) - churnedCount)
  const accentColor = tier === 'critical' ? '#e01e5a' : '#f59e0b'
  const accentBg = tier === 'critical' ? '#fff0f0' : '#fef7e7'
  // TODO: replace with real 14-day per-account sparkline from Amplitude events endpoint
  const sparkline: number[] = Array(14).fill(0)

  const iconBtnStyle = (hovered: boolean): React.CSSProperties => ({
    width:32, height:32, borderRadius:8,
    background: hovered ? 'rgba(245,245,245,0.98)' : 'rgba(255,255,255,0.95)',
    color:'#6a6e71',
    border:'1px solid #f4c2c2',
    boxShadow:'0 1px 2px rgba(15,31,61,0.06)',
    display:'inline-flex', alignItems:'center',
    justifyContent:'center', fontSize:13, cursor:'pointer', flexShrink:0,
    fontFamily:FONT,
    transition:'background 120ms',
  })

  return (
    <article style={{
      background:'#fff', border:'1px solid #efefef', borderRadius:12,
      position:'relative', overflow:'hidden',
      boxShadow:'0 1px 0 rgba(15,31,61,0.02), 0 8px 24px rgba(224,30,90,0.06)',
    }}>
      {/* Left severity accent bar */}
      <div style={{position:'absolute', left:0, top:0, bottom:0, width:4, background:accentColor}}/>
      {/* Header wash */}
      <div style={{
        position:'absolute', left:0, right:0, top:0, height:64,
        background:`linear-gradient(180deg, ${accentBg} 0%, rgba(255,255,255,0) 100%)`,
        pointerEvents:'none',
      }}/>

      <div style={{position:'relative', padding:'18px 20px 16px 24px'}}>
        {/* Top row: avatar · domain · reasons · status + actions */}
        <div style={{display:'flex', alignItems:'center', gap:14, marginBottom:14}}>
          <DomainAvatar domain={a.domain} size={44} tier={tier}/>
          <div style={{flex:1, minWidth:0}}>
            <div style={{display:'flex', alignItems:'baseline', gap:10, flexWrap:'wrap'}}>
              <h3 style={{margin:0, fontSize:18, fontWeight:800, color:'#0f1f3d', letterSpacing:'-0.01em'}}>
                {a.domain}
              </h3>
              <span style={{fontSize:12, color:'#96999c', fontWeight:500}}>
                Added {a.addedAt} · {(a.totalEvents || 0).toLocaleString()} events · {a.modulesCount || 0} modules
              </span>
            </div>
            <div style={{display:'flex', alignItems:'center', gap:7, marginTop:6, flexWrap:'wrap'}}>
              {reasons.map((r, i) => <ReasonChip key={i} {...r}/>)}
              {topModules.slice(0, 2).map(([name], i) => (
                <ModuleChip key={i} name={name}/>
              ))}
            </div>
          </div>
          <div style={{display:'flex', alignItems:'center', gap:8, flexShrink:0}}>
            <StatusPill tier={tier}/>
            <button
              onClick={onRefresh}
              disabled={refreshing}
              title="Refresh from Amplitude"
              onMouseEnter={() => setRefreshHover(true)}
              onMouseLeave={() => setRefreshHover(false)}
              style={{...iconBtnStyle(refreshHover), opacity: refreshing ? 0.5 : 1}}
              aria-label="Refresh"
            >
              {refreshing ? <SpinnerIcon size={13}/> : <RefreshIcon size={13}/>}
            </button>
            <button
              onClick={onView}
              style={{background:'#0f1f3d', color:'#fff', border:'none', borderRadius:8, padding:'7px 14px', fontSize:13, fontWeight:700, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:4, fontFamily:FONT}}
            >
              View <ArrowRightIcon size={10}/>
            </button>
            <button
              onClick={onRemove}
              onMouseEnter={() => setRemoveHover(true)}
              onMouseLeave={() => setRemoveHover(false)}
              style={iconBtnStyle(removeHover)}
              aria-label="Untrack"
              title="Stop tracking"
            >
              <XIcon size={13}/>
            </button>
          </div>
        </div>

        {/* Bottom row: user gauge · sparkline · AIRA insight */}
        <div style={{
          display:'grid', gridTemplateColumns:'auto auto 1fr', gap:20,
          alignItems:'center', paddingTop:14, borderTop:'1px solid #efefef',
        }}>
          {/* User split */}
          <div>
            <div style={{fontSize:10, fontWeight:700, color:'#96999c', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6}}>Users</div>
            <UsersGauge active={a.activeUsers || 0} inactive={watchInactive} churned={churnedCount} total={a.totalUsers || 0} width={110}/>
            <div style={{fontSize:11, color:'#6a6e71', marginTop:4, fontWeight:500}}>
              <span style={{color:'#1a9e68', fontWeight:700}}>{a.activeUsers || 0} active</span>
              {watchInactive > 0 && <span> · <span style={{color:'#a05c00', fontWeight:700}}>{watchInactive} inactive</span></span>}
              {churnedCount > 0 && <span> · <span style={{color:'#c81e1e', fontWeight:700}}>{churnedCount} churned</span></span>}
            </div>
          </div>

          {/* 14-day activity */}
          <div>
            <div style={{fontSize:10, fontWeight:700, color:'#96999c', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6}}>14-day activity</div>
            <ActivityBars data={sparkline} width={150} height={32} color="#3471b3" dimColor="#e9eef5"/>
            <div style={{fontSize:11, color:'#6a6e71', marginTop:4, fontWeight:500}}>
              Last seen{' '}
              <span style={{color: a.daysSince > 7 ? '#c81e1e' : '#a05c00', fontWeight:700}}>
                {a.daysSince === 0 ? 'today' : `${a.daysSince}d ago`}
              </span>
            </div>
          </div>

          {/* AIRA insight — static placeholder (TODO: generate via AIRA analysis endpoint) */}
          <div style={{
            background:'linear-gradient(115.83deg, #e3f0ff 1.33%, #fdf4f1 51.21%, #f8eff1 101.09%)',
            border:'1px solid #dfe7f5', borderRadius:10, padding:'10px 14px', minWidth:0,
          }}>
            <div style={{display:'flex', alignItems:'center', gap:6, marginBottom:4}}>
              <AIRASparkle size={12}/>
              <span style={{
                fontSize:10, fontWeight:800, letterSpacing:'0.5px', textTransform:'uppercase',
                background:'linear-gradient(115.67deg, #4aa1ff 15.76%, #6455ff 118.86%)',
                WebkitBackgroundClip:'text', backgroundClip:'text',
                WebkitTextFillColor:'transparent', color:'transparent',
              }}>Aira read</span>
            </div>
            {/* TODO: Replace with AIRA-generated per-account insight once insight endpoint is available */}
            <div style={{fontSize:13, color:'#33393d', lineHeight:1.45, fontWeight:500}}>
              {churnedCount > 0
                ? `${churnedCount} ${churnedCount === 1 ? 'user has' : 'users have'} been inactive for 14+ days. Consider a re-engagement check-in call before the pilot window closes.`
                : a.daysSince > 7
                  ? `No activity detected in the last ${a.daysSince} days. The pilot may need a nudge — a quick check-in call often re-activates cold accounts.`
                  : `${watchInactive} ${watchInactive === 1 ? 'user is' : 'users are'} at risk of dropping off. Proactive outreach recommended before they go fully cold.`
              }
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}

function HealthyCard({ account: a, onView, onRefresh, onRemove, refreshing }: any) {
  const [refreshHover, setRefreshHover] = useState(false)
  const [removeHover, setRemoveHover] = useState(false)
  const topModules = getTopModules(a)
  // TODO: replace with real 14-day sparkline from Amplitude events endpoint
  const sparkline: number[] = Array(14).fill(0)

  const iconBtnStyle = (hovered: boolean): React.CSSProperties => ({
    width:32, height:32, borderRadius:8,
    background: hovered ? 'rgba(240,253,247,0.98)' : 'rgba(255,255,255,0.95)',
    color:'#1a9e68',
    border:'1px solid #bce5d0',
    boxShadow:'0 1px 2px rgba(15,31,61,0.06)',
    display:'inline-flex', alignItems:'center',
    justifyContent:'center', fontSize:13, cursor:'pointer', flexShrink:0,
    fontFamily:FONT,
    transition:'background 120ms',
  })

  return (
    <article style={{
      background:'#fff', border:'1px solid #efefef', borderRadius:12,
      position:'relative', overflow:'hidden',
      boxShadow:'0 1px 0 rgba(15,31,61,0.02), 0 6px 18px rgba(26,158,104,0.05)',
    }}>
      {/* Left accent bar */}
      <div style={{position:'absolute', left:0, top:0, bottom:0, width:4, background:'#1a9e68'}}/>
      {/* Header wash */}
      <div style={{
        position:'absolute', left:0, right:0, top:0, height:64,
        background:'linear-gradient(180deg, #edfbf4 0%, rgba(255,255,255,0) 100%)',
        pointerEvents:'none',
      }}/>

      <div style={{position:'relative', padding:'18px 20px 16px 24px'}}>
        {/* Top row: avatar · domain · positive chips · status + actions */}
        <div style={{display:'flex', alignItems:'center', gap:14, marginBottom:14}}>
          <DomainAvatar domain={a.domain} size={44} tier="healthy"/>
          <div style={{flex:1, minWidth:0}}>
            <div style={{display:'flex', alignItems:'baseline', gap:10, flexWrap:'wrap'}}>
              <h3 style={{margin:0, fontSize:18, fontWeight:800, color:'#0f1f3d', letterSpacing:'-0.01em'}}>
                {a.domain}
              </h3>
              <span style={{fontSize:12, color:'#96999c', fontWeight:500}}>
                Added {a.addedAt} · {(a.totalEvents || 0).toLocaleString()} events · {a.modulesCount || 0} modules
              </span>
            </div>
            <div style={{display:'flex', alignItems:'center', gap:7, marginTop:6, flexWrap:'wrap'}}>
              {(a.totalUsers > 0 && a.activeUsers === a.totalUsers) && (
                <span style={{display:'inline-flex', alignItems:'center', gap:6, background:'#edfbf4', color:'#1a9e68', border:'1px solid #8fd9bb', borderRadius:6, padding:'4px 9px', fontSize:12, fontWeight:600, whiteSpace:'nowrap'}}>
                  <UsersIcon size={10}/>
                  All {a.activeUsers} users active
                </span>
              )}
              {a.daysSince === 0 ? (
                <span style={{display:'inline-flex', alignItems:'center', gap:6, background:'#edfbf4', color:'#1a9e68', border:'1px solid #8fd9bb', borderRadius:6, padding:'4px 9px', fontSize:12, fontWeight:600, whiteSpace:'nowrap'}}>
                  <BoltIcon size={10}/>
                  Active today
                </span>
              ) : (
                <span style={{display:'inline-flex', alignItems:'center', gap:6, background:'#f0fdf4', color:'#15803d', border:'1px solid #bbf7d0', borderRadius:6, padding:'4px 9px', fontSize:12, fontWeight:600, whiteSpace:'nowrap'}}>
                  <ClockIcon size={10}/>
                  Active {a.daysSince}d ago
                </span>
              )}
              {topModules.slice(0, 2).map(([name], i) => (
                <ModuleChip key={i} name={name}/>
              ))}
            </div>
          </div>
          <div style={{display:'flex', alignItems:'center', gap:8, flexShrink:0}}>
            <StatusPill tier="healthy"/>
            <button
              onClick={onRefresh}
              disabled={refreshing}
              title="Refresh from Amplitude"
              onMouseEnter={() => setRefreshHover(true)}
              onMouseLeave={() => setRefreshHover(false)}
              style={{...iconBtnStyle(refreshHover), opacity: refreshing ? 0.5 : 1}}
              aria-label="Refresh"
            >
              {refreshing ? <SpinnerIcon size={13}/> : <RefreshIcon size={13}/>}
            </button>
            <button
              onClick={onView}
              style={{background:'#0f1f3d', color:'#fff', border:'none', borderRadius:8, padding:'7px 14px', fontSize:13, fontWeight:700, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:4, fontFamily:FONT}}
            >
              View <ArrowRightIcon size={10}/>
            </button>
            <button
              onClick={onRemove}
              onMouseEnter={() => setRemoveHover(true)}
              onMouseLeave={() => setRemoveHover(false)}
              style={iconBtnStyle(removeHover)}
              aria-label="Untrack"
              title="Stop tracking"
            >
              <XIcon size={13}/>
            </button>
          </div>
        </div>

        {/* Bottom row: user gauge · sparkline · "what's working" insight */}
        <div style={{
          display:'grid', gridTemplateColumns:'auto auto 1fr', gap:20,
          alignItems:'center', paddingTop:14, borderTop:'1px solid #efefef',
        }}>
          {/* User split */}
          <div>
            <div style={{fontSize:10, fontWeight:700, color:'#96999c', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6}}>Users</div>
            <UsersGauge active={a.activeUsers || 0} total={a.totalUsers || 0} width={110}/>
            <div style={{fontSize:11, color:'#6a6e71', marginTop:4, fontWeight:500}}>
              <span style={{color:'#1a9e68', fontWeight:700}}>{a.activeUsers || 0} active</span>
              <span style={{color:'#96999c'}}> · {(a.totalUsers || 0) - (a.activeUsers || 0)} dormant</span>
            </div>
          </div>

          {/* 14-day activity */}
          <div>
            <div style={{fontSize:10, fontWeight:700, color:'#96999c', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:6}}>14-day activity</div>
            <ActivityBars data={sparkline} width={150} height={32} color="#2eb67d" dimColor="#d1fae5"/>
            <div style={{fontSize:11, color:'#6a6e71', marginTop:4, fontWeight:500}}>
              Last seen{' '}
              <span style={{color:'#1a9e68', fontWeight:700}}>
                {a.daysSince === 0 ? 'today' : `${a.daysSince}d ago`}
              </span>
            </div>
          </div>

          {/* What's working insight */}
          <div style={{
            background:'linear-gradient(115.83deg, #edfbf4 1.33%, #f0fdf9 51.21%, #f0fdf4 101.09%)',
            border:'1px solid #c3f0d8', borderRadius:10, padding:'10px 14px', minWidth:0,
          }}>
            <div style={{display:'flex', alignItems:'center', gap:6, marginBottom:4}}>
              <AIRASparkle size={12}/>
              <span style={{
                fontSize:10, fontWeight:800, letterSpacing:'0.5px', textTransform:'uppercase',
                background:'linear-gradient(115.67deg, #4aa1ff 15.76%, #6455ff 118.86%)',
                WebkitBackgroundClip:'text', backgroundClip:'text',
                WebkitTextFillColor:'transparent', color:'transparent',
              }}>Aira read</span>
            </div>
            <div style={{fontSize:13, color:'#33393d', lineHeight:1.45, fontWeight:500}}>
              {topModules.length > 0
                ? `Strong engagement — ${a.activeUsers || 0} ${(a.activeUsers || 0) === 1 ? 'user' : 'users'} active across ${topModules.length} module${topModules.length > 1 ? 's' : ''} including ${topModules[0]?.[0]}. Pilot is progressing well.`
                : `${a.activeUsers || 0} ${(a.activeUsers || 0) === 1 ? 'user' : 'users'} active in the last 7 days. No churn detected — this pilot is on track.`
              }
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div style={{
      background:'#fff', border:'1px solid #efefef', borderRadius:16,
      padding:'56px 32px 60px', textAlign:'center',
      position:'relative', overflow:'hidden',
    }}>
      <div style={{
        position:'absolute', inset:0,
        background:'radial-gradient(60% 50% at 30% 0%, rgba(74,161,255,0.07) 0%, transparent 60%), radial-gradient(50% 40% at 80% 20%, rgba(100,85,255,0.05) 0%, transparent 60%)',
        pointerEvents:'none',
      }}/>
      <div style={{position:'relative', maxWidth:480, margin:'0 auto'}}>
        {/* Tilted decorative tiles */}
        <div style={{display:'flex', justifyContent:'center', gap:8, marginBottom:24}}>
          {[
            { bg:'#e3f0ff', color:'#1a6fd4', icon:<RocketIcon size={18}/> },
            { bg:'#f5f3ff', color:'#6d28d9', icon:<ChartLineIcon size={18}/> },
            { bg:'#fef0d9', color:'#a05c00', icon:<UsersIcon size={18}/> },
          ].map(({ bg, color, icon }, i) => (
            <div key={i} style={{
              width:48, height:48, borderRadius:10, background:bg,
              border:'1px solid rgba(255,255,255,0.6)',
              boxShadow:'0 4px 12px rgba(15,31,61,0.06)',
              transform:`translateY(${i === 1 ? -6 : 0}px) rotate(${(i-1)*4}deg)`,
              display:'flex', alignItems:'center', justifyContent:'center',
              color, fontWeight:800,
            }}>
              {icon}
            </div>
          ))}
        </div>
        <h2 style={{margin:'0 0 8px', fontSize:22, fontWeight:800, color:'#0f1f3d', letterSpacing:'-0.01em'}}>
          Track your first pilot
        </h2>
        <p style={{margin:'0 0 24px', fontSize:14, color:'#6a6e71', lineHeight:1.55}}>
          Drop in a customer domain. We pull the last 30 days of Amplitude usage and
          tell you which accounts are sticking — and which need a nudge.
        </p>
        <button
          onClick={onAdd}
          style={{background:'#0f1f3d', color:'#fff', border:'none', borderRadius:10, padding:'11px 22px', fontSize:14, fontWeight:700, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:8, fontFamily:FONT}}
        >
          <PlusIcon size={11}/>
          Track a domain
        </button>
        <div style={{
          marginTop:28, paddingTop:20, borderTop:'1px solid #efefef',
          display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:18,
          fontSize:12, color:'#6a6e71', textAlign:'left',
        }}>
          {[
            { icon:<BoltIcon size={11}/>, t:'30-day refresh', b:'Active, inactive, churned — auto-classified.' },
            { icon:<EyeIcon size={11}/>, t:'Risk anchored', b:'At-risk pilots surface at the top, every time.' },
            { icon:<RocketIcon size={11}/>, t:'Per-user drilldown', b:'See exactly which user went cold and when.' },
          ].map((f, i) => (
            <div key={i}>
              <div style={{display:'inline-flex', alignItems:'center', justifyContent:'center', width:26, height:26, borderRadius:6, background:'#edf6ff', color:'#1a6fd4', marginBottom:8}}>
                {f.icon}
              </div>
              <div style={{fontWeight:700, color:'#0f1f3d', marginBottom:2, fontSize:13}}>{f.t}</div>
              <div style={{lineHeight:1.4}}>{f.b}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── AccountDetail — UNCHANGED ────────────────────────────────────────

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

// ─── Main Dashboard component ─────────────────────────────────────────

export default function Dashboard({ session }: any) {
  const router = useRouter()

  // ── Existing state (do not remove) ──────────────────────────────
  const [accounts, setAccounts] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [input, setInput] = useState('')
  const [adding, setAdding] = useState(false)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [refreshing, setRefreshing] = useState<Record<string, boolean>>({})

  // ── New list-view state ──────────────────────────────────────────
  const [tab, setTab] = useState<'all' | 'risk' | 'healthy'>('all')
  const [search, setSearch] = useState('')
  const [sortHealthyBy, setSortHealthyBy] = useState('lastSeen')

  useEffect(() => { loadProfile(); loadAccounts() }, [])

  // ── Data layer — UNCHANGED ───────────────────────────────────────
  async function loadProfile() {
    const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
    setProfile(data)
  }

  async function loadAccounts() {
    setLoading(true)
    const { data } = await supabase.from('tracked_domains').select('*').eq('user_id', session.user.id).order('added_at', { ascending: false })
    if (data) setAccounts(data.map(d => ({
      ...(d.cached_data || {}),
      domain: d.domain,
      status: d.cached_data ? 'ready' : 'empty',
      addedAt: fmtDate(d.added_at),
      lastRefreshed: d.last_refreshed ? fmtDate(d.last_refreshed, true) : null,
    })))
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
      const accountData = { ...data, addedAt, lastRefreshed: null, status:'ready' }
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

  async function refreshDomain(domain: string) {
    setRefreshing(prev => ({ ...prev, [domain]: true }))
    try {
      const res = await fetch('/api/amplitude', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ domain }) })
      const data = await res.json()
      if (res.ok) {
        const now = new Date().toISOString()
        await supabase.from('tracked_domains').update({ cached_data: data, last_refreshed: now }).eq('user_id', session.user.id).eq('domain', domain)
        const lastRefreshed = fmtDate(now, true)
        setAccounts(prev => prev.map(a => a.domain === domain ? { ...a, ...data, lastRefreshed, status: 'ready' } : a))
      }
    } catch {}
    setRefreshing(prev => ({ ...prev, [domain]: false }))
  }

  const signOut = () => supabase.auth.signOut()

  function exportCSV() {
    const rows = filtered.map(a => [
      a.domain,
      a._tier,
      a.totalUsers ?? 0,
      a.activeUsers ?? 0,
      a.inactiveUsers ?? 0,
      a.totalEvents ?? 0,
      a.modulesCount ?? 0,
      a.daysSince ?? 0,
      a.lastSeen ?? '',
      a.addedAt ?? '',
    ])
    const escape = (v: unknown) => {
      const s = String(v ?? '')
      return /[,"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const header = ['Domain','Tier','Total Users','Active Users','Inactive Users','Total Events','Modules Count','Days Since Last Activity','Last Seen','Added']
    const csv = [header, ...rows].map(r => r.map(escape).join(',')).join('\n')
    const date = new Date().toISOString().slice(0, 10)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rf-pilot-tracker-${date}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ── Derived list-view state ──────────────────────────────────────
  const readyAccounts = useMemo(() =>
    accounts.filter(a => a.status === 'ready').map(a => ({ ...a, _tier: classify(a) })),
    [accounts]
  )

  const filtered = useMemo(() => {
    let xs = readyAccounts
    if (search) xs = xs.filter(a => a.domain.toLowerCase().includes(search.toLowerCase()))
    if (tab === 'risk')    xs = xs.filter(a => a._tier !== 'healthy')
    if (tab === 'healthy') xs = xs.filter(a => a._tier === 'healthy')
    return xs
  }, [readyAccounts, search, tab])

  const atRisk = filtered.filter(a => a._tier !== 'healthy').sort((a, b) => {
    if (a._tier !== b._tier) return a._tier === 'critical' ? -1 : 1
    return b.daysSince - a.daysSince
  })

  const healthy = filtered.filter(a => a._tier === 'healthy').sort((a, b) => {
    if (sortHealthyBy === 'events') return b.totalEvents - a.totalEvents
    if (sortHealthyBy === 'users')  return b.totalUsers - a.totalUsers
    return a.daysSince - b.daysSince
  })

  const totals = useMemo(() => ({
    tracking:    readyAccounts.length,
    risk:        readyAccounts.filter(a => a._tier !== 'healthy').length,
    critical:    readyAccounts.filter(a => a._tier === 'critical').length,
    healthy:     readyAccounts.filter(a => a._tier === 'healthy').length,
    users:       readyAccounts.reduce((s, a) => s + (a.totalUsers || 0), 0),
    activeUsers: readyAccounts.reduce((s, a) => s + (a.activeUsers || 0), 0),
  }), [readyAccounts])

  const pendingAccounts = accounts.filter(a => a.status === 'loading' || a.status === 'error' || a.status === 'empty')

  // ── User identity ────────────────────────────────────────────────
  const userName = profile?.full_name || session.user.email || ''
  const userInitials = profile?.full_name
    ? profile.full_name.split(' ').map((s: string) => s[0]).join('').slice(0, 2).toUpperCase()
    : (session.user.email || '').slice(0, 2).toUpperCase()

  // ── Detail view — UNCHANGED ──────────────────────────────────────
  if (selected) return (
    <div style={{maxWidth:960,margin:'0 auto',padding:'1.5rem 1rem 3rem',fontFamily:'Inter, system-ui, sans-serif',background:'#f9fafb',minHeight:'100vh'}}>
      <AccountDetail account={selected} onBack={() => setSelected(null)} />
    </div>
  )

  // ── New list view ────────────────────────────────────────────────
  const ghostBtnStyle: React.CSSProperties = {
    background:'#fff', color:'#33393d', border:'1px solid #dfe0e0',
    borderRadius:8, padding:'7px 13px', fontSize:13, fontWeight:600,
    cursor:'pointer', display:'inline-flex', alignItems:'center', fontFamily:FONT,
  }

  return (
    <div style={{minHeight:'100vh', background:'#f6fbff', fontFamily:FONT, color:'#33393d', WebkitFontSmoothing:'antialiased'}}>

      {/* ═══ TOP NAV ═══ */}
      <header style={{
        height:56, background:'#fff', borderBottom:'1px solid #efefef',
        boxShadow:'8px 2px 16px rgba(1,87,152,0.10)',
        display:'flex', alignItems:'center', padding:'0 24px', gap:20,
        position:'sticky', top:0, zIndex:50,
      }}>
        <div style={{display:'flex', alignItems:'center', gap:12}}>
          <RFLogo size={28}/>
          <div style={{display:'flex', flexDirection:'column', lineHeight:1, gap:2}}>
            <span style={{fontSize:9, fontWeight:800, letterSpacing:'1.2px', color:'#96999c', textTransform:'uppercase'}}>Recruiterflow</span>
            <span style={{fontSize:16, fontWeight:800, color:'#1e1c18', letterSpacing:'-0.01em', display:'inline-flex', alignItems:'center', gap:8}}>
              Pilot tracker{' '}
              <span style={{fontSize:10, fontWeight:700, background:'#f5f3ff', color:'#6d28d9', border:'1px solid #ddd6fe', padding:'2px 8px', borderRadius:20, textTransform:'uppercase', letterSpacing:'0.3px'}}>
                Internal
              </span>
            </span>
          </div>
        </div>

        <div style={{
          flex:1, maxWidth:480, height:36,
          background:'rgba(230,234,240,0.3)', border:'1px solid #f4f5f7',
          borderRadius:24, display:'flex', alignItems:'center', gap:10,
          padding:'0 8px 0 14px', color:'#6a6e71', fontSize:13,
        }}>
          <SearchIcon size={12} style={{flexShrink:0}}/>
          <input
            type="text"
            placeholder="Search domains…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{flex:1, border:'none', outline:'none', background:'transparent', fontSize:13, color:'#1e1c18', fontFamily:FONT}}
          />
          <span style={{fontSize:11, fontWeight:700, color:'#6a6e71', background:'#fff', borderRadius:50, padding:'2px 10px', border:'1px solid #efefef', flexShrink:0}}>⌘K</span>
        </div>

        <div style={{display:'flex', alignItems:'center', gap:12, marginLeft:'auto'}}>
          <div style={{display:'flex', alignItems:'center', gap:9, padding:4}}>
            <div style={{
              width:32, height:32, borderRadius:'50%',
              background:'linear-gradient(135deg,#4aa1ff,#6455ff)',
              color:'#fff', fontSize:11, fontWeight:800,
              display:'flex', alignItems:'center', justifyContent:'center',
              border:'1.5px solid #fff', boxShadow:'0 1px 3px rgba(15,31,61,0.15)',
              flexShrink:0,
            }}>
              {userInitials}
            </div>
            <div style={{lineHeight:1.2}}>
              <div style={{fontSize:12, fontWeight:700, color:'#1e1c18'}}>{userName}</div>
              <div style={{fontSize:11, color:'#6a6e71'}}>{session.user.email}</div>
            </div>
          </div>
          <button onClick={signOut} style={ghostBtnStyle}>Sign out</button>
        </div>
      </header>

      {/* ═══ MAIN ═══ */}
      <main style={{width:'100%', maxWidth:1280, margin:'0 auto', padding:'24px 28px 64px', display:'flex', flexDirection:'column', gap:18}}>

        {/* PAGE HEAD */}
        <section style={{display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:24, flexWrap:'wrap'}}>
          <div>
            <h1 style={{margin:0, fontSize:26, fontWeight:800, color:'#1e1c18', letterSpacing:'-0.02em'}}>Pilot accounts</h1>
            <p style={{margin:'4px 0 0', fontSize:13, color:'#6a6e71', fontWeight:500}}>
              Last 30 days of Amplitude usage across{' '}
              <strong style={{color:'#1e1c18', fontWeight:700}}>{totals.tracking}</strong>{' '}
              tracked {totals.tracking === 1 ? 'domain' : 'domains'} ·{' '}
              <strong style={{color:'#1e1c18', fontWeight:700}}>{totals.users}</strong> users ·{' '}
              {totals.activeUsers} active this week
            </p>
          </div>
          <div style={{display:'flex', gap:8, alignItems:'center'}}>
            <button
              onClick={exportCSV}
              disabled={filtered.length === 0}
              style={{...ghostBtnStyle, opacity: filtered.length === 0 ? 0.4 : 1, cursor: filtered.length === 0 ? 'not-allowed' : 'pointer'}}
            >
              <DownloadIcon size={11} style={{marginRight:6}}/>
              Export
            </button>
            <button
              onClick={() => setAdding(a => !a)}
              style={{background:'#0f1f3d', color:'#fff', border:'none', borderRadius:8, padding:'8px 16px', fontSize:13, fontWeight:700, cursor:'pointer', display:'inline-flex', alignItems:'center', fontFamily:FONT}}
            >
              <PlusIcon size={11} style={{marginRight:8}}/>
              Track domain
            </button>
          </div>
        </section>

        {/* INLINE ADD-DOMAIN */}
        {adding && (
          <section style={{background:'#fff', border:'1.5px solid #a0ccfe', borderRadius:12, padding:'12px 14px 10px', boxShadow:'0 0 0 4px rgba(160,204,254,0.18)'}}>
            <div style={{display:'flex', alignItems:'center', gap:8, background:'#fafafa', borderRadius:8, padding:'4px 12px'}}>
              <GlobeIcon size={13} style={{color:'#6a6e71', flexShrink:0}}/>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addDomain(); if (e.key === 'Escape') setAdding(false) }}
                placeholder="e.g. kelaca.com"
                autoFocus
                style={{flex:1, border:'none', outline:'none', background:'transparent', fontSize:14, padding:'8px 0', color:'#1e1c18', fontFamily:FONT}}
              />
              <button onClick={addDomain} style={{background:'#0f1f3d', color:'#fff', border:'none', borderRadius:8, padding:'8px 16px', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:FONT}}>Track</button>
              <button onClick={() => setAdding(false)} style={ghostBtnStyle}>Cancel</button>
            </div>
            <div style={{display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#6a6e71', margin:'8px 4px 0', fontWeight:500}}>
              <AIRASparkle size={12}/>
              <span>Enter a company domain — we&rsquo;ll find every user via Amplitude automatically.</span>
            </div>
          </section>
        )}

        {/* INITIAL LOADING */}
        {loading && (
          <div style={{textAlign:'center', padding:'48px 0', fontSize:13, color:'#9ca3af'}}>
            Loading your accounts…
          </div>
        )}

        {/* PENDING ACCOUNTS (loading / error) */}
        {!loading && pendingAccounts.length > 0 && (
          <div style={{display:'flex', flexDirection:'column', gap:8}}>
            {pendingAccounts.map((a, i) => (
              <div key={i} style={{
                background:'#fff', border:`1px solid ${a.status === 'error' ? '#fdc5c5' : '#efefef'}`,
                borderRadius:12, padding:'12px 16px', display:'flex', alignItems:'center', gap:12,
              }}>
                <div style={{
                  width:36, height:36, borderRadius:10,
                  background:'linear-gradient(135deg,#e3f0ff,#c2e0ff)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontWeight:800, fontSize:13, color:'#1a6fd4', flexShrink:0,
                }}>
                  {a.domain.slice(0, 2).toUpperCase()}
                </div>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{fontSize:14, fontWeight:700, color:'#0f1f3d'}}>{a.domain}</div>
                  {a.status === 'loading' && <div style={{fontSize:12, color:'#9ca3af'}}>Searching Amplitude for @{a.domain} users…</div>}
                  {a.status === 'error' && <div style={{fontSize:12, color:'#c81e1e'}}>{a.error || 'No users found for this domain in Amplitude.'}</div>}
                  {a.status === 'empty' && <div style={{fontSize:12, color:'#9ca3af'}}>No data yet — click refresh to load.</div>}
                </div>
                <div style={{display:'flex', gap:8, alignItems:'center'}}>
                  {a.status === 'loading' && (
                    <span style={{fontSize:11, fontWeight:600, background:'#f0f1f3', color:'#6a6e71', padding:'3px 10px', borderRadius:20}}>
                      <SpinnerIcon size={11} style={{marginRight:5}}/>Finding users…
                    </span>
                  )}
                  {a.status === 'error' && (
                    <span style={{fontSize:11, fontWeight:700, background:'#fff0f0', color:'#c81e1e', border:'1px solid #fdc5c5', padding:'3px 10px', borderRadius:20}}>Not found</span>
                  )}
                  <button
                    onClick={() => removeDomain(a.domain)}
                    style={{background:'none', border:'none', color:'#d1d5db', fontSize:16, cursor:'pointer', padding:'2px 6px'}}
                  >✕</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* EMPTY STATE */}
        {!loading && readyAccounts.length === 0 && pendingAccounts.length === 0 && (
          <EmptyState onAdd={() => setAdding(true)}/>
        )}

        {/* MAIN LIST CONTENT */}
        {!loading && readyAccounts.length > 0 && (
          <>
            {/* KPI STRIP */}
            <section style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10}}>
              <button
                onClick={() => setTab('all')}
                style={{
                  background:'#fff', border:`1px solid ${tab === 'all' ? '#a0ccfe' : '#efefef'}`,
                  borderRadius:12, padding:'14px 16px', textAlign:'left',
                  cursor:'pointer', fontFamily:FONT, display:'flex', flexDirection:'column', gap:4,
                  boxShadow: tab === 'all' ? '0 0 0 3px rgba(160,204,254,0.25)' : 'none',
                  transition:'border-color 150ms, box-shadow 150ms',
                }}
              >
                <div style={{fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.6px', color:'#6a6e71'}}>Tracking</div>
                <div style={{fontSize:30, fontWeight:800, color:'#1e1c18', letterSpacing:'-0.02em', lineHeight:1, marginTop:2, fontVariantNumeric:'tabular-nums'}}>{totals.tracking}</div>
                <div style={{fontSize:11, color:'#96999c', fontWeight:500}}>all pilots</div>
              </button>

              <button
                onClick={() => setTab('risk')}
                style={{
                  background:'#fff', border:`1px solid ${tab === 'risk' ? '#fdc5c5' : '#efefef'}`,
                  borderRadius:12, padding:'14px 16px', textAlign:'left',
                  cursor:'pointer', fontFamily:FONT, display:'flex', flexDirection:'column', gap:4,
                  boxShadow: tab === 'risk' ? '0 0 0 3px rgba(253,197,197,0.4)' : 'none',
                  transition:'border-color 150ms, box-shadow 150ms',
                }}
              >
                <div style={{fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.6px', color:'#6a6e71'}}>Needs attention</div>
                <div style={{fontSize:30, fontWeight:800, color: totals.risk > 0 ? '#c81e1e' : '#1e1c18', letterSpacing:'-0.02em', lineHeight:1, marginTop:2, fontVariantNumeric:'tabular-nums', display:'flex', alignItems:'baseline', gap:10}}>
                  {totals.risk}
                  {totals.critical > 0 && (
                    <span style={{fontSize:11, fontWeight:700, color:'#c81e1e', background:'#fff0f0', border:'1px solid #fdc5c5', padding:'2px 7px', borderRadius:20, display:'inline-flex', alignItems:'center', gap:5}}>
                      <span style={{width:6, height:6, borderRadius:'50%', background:'#e01e5a', display:'inline-block'}}/>
                      {totals.critical} critical
                    </span>
                  )}
                </div>
                <div style={{fontSize:11, color:'#96999c', fontWeight:500}}>{totals.risk === 0 ? 'all calm' : 'open these first'}</div>
              </button>

              <button
                onClick={() => setTab('healthy')}
                style={{
                  background:'#fff', border:`1px solid ${tab === 'healthy' ? '#8fd9bb' : '#efefef'}`,
                  borderRadius:12, padding:'14px 16px', textAlign:'left',
                  cursor:'pointer', fontFamily:FONT, display:'flex', flexDirection:'column', gap:4,
                  boxShadow: tab === 'healthy' ? '0 0 0 3px rgba(143,217,187,0.3)' : 'none',
                  transition:'border-color 150ms, box-shadow 150ms',
                }}
              >
                <div style={{fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.6px', color:'#6a6e71'}}>Healthy</div>
                <div style={{fontSize:30, fontWeight:800, color: totals.healthy > 0 ? '#1a9e68' : '#1e1c18', letterSpacing:'-0.02em', lineHeight:1, marginTop:2, fontVariantNumeric:'tabular-nums'}}>{totals.healthy}</div>
                <div style={{fontSize:11, color:'#96999c', fontWeight:500}}>active &lt; 7d, no churn</div>
              </button>

              <div style={{background:'#fff', border:'1px solid #efefef', borderRadius:12, padding:'14px 16px', display:'flex', flexDirection:'column', gap:4}}>
                <div style={{fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.6px', color:'#6a6e71'}}>Total users</div>
                <div style={{fontSize:30, fontWeight:800, color:'#1e1c18', letterSpacing:'-0.02em', lineHeight:1, marginTop:2, fontVariantNumeric:'tabular-nums'}}>{totals.users}</div>
                <div style={{fontSize:11, fontWeight:500}}>
                  <span style={{color:'#1a9e68', fontWeight:700}}>{totals.activeUsers} active</span>
                  <span style={{color:'#96999c'}}> · {totals.users - totals.activeUsers} dormant</span>
                </div>
              </div>
            </section>

            {/* ═══ AT-RISK SECTION ═══ */}
            {atRisk.length > 0 && (
              <section style={{display:'flex', flexDirection:'column', gap:12}}>
                <header style={{display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16, padding:'6px 2px 0'}}>
                  <div style={{display:'flex', alignItems:'flex-start', gap:12}}>
                    <span style={{
                      width:36, height:36, borderRadius:10,
                      background:'#fff0f0', color:'#c81e1e', border:'1px solid #fdc5c5',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:15, flexShrink:0,
                    }}>
                      <WarningIcon size={18}/>
                    </span>
                    <div>
                      <h2 style={{margin:0, fontSize:16, fontWeight:800, color:'#1e1c18', letterSpacing:'-0.01em', lineHeight:1.2, display:'inline-flex', alignItems:'center', gap:10}}>
                        Needs your attention
                        <span style={{fontSize:11, fontWeight:800, background:'#fff0f0', color:'#c81e1e', border:'1px solid #fdc5c5', padding:'2px 9px', borderRadius:20}}>
                          {atRisk.length}
                        </span>
                      </h2>
                      <p style={{margin:'4px 0 0', fontSize:12.5, color:'#6a6e71', fontWeight:500, lineHeight:1.4, maxWidth:620}}>
                        Pilots with inactive users or{' '}
                        <span style={{color:'#33393d', fontWeight:700}}>no activity in the last 7 days</span>.
                        Open these first — every cold day hurts conversion.
                      </p>
                    </div>
                  </div>
                </header>
                <div style={{display:'flex', flexDirection:'column', gap:10}}>
                  {atRisk.map(a => (
                    <AtRiskCard
                      key={a.domain}
                      account={a}
                      refreshing={refreshing[a.domain]}
                      onView={() => router.push(`/accounts/${a.domain}`)}
                      onRefresh={() => refreshDomain(a.domain)}
                      onRemove={() => removeDomain(a.domain)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* ═══ HEALTHY SECTION ═══ */}
            {healthy.length > 0 && (
              <section style={{display:'flex', flexDirection:'column', gap:12}}>
                <header style={{display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16, padding:'6px 2px 0'}}>
                  <div style={{display:'flex', alignItems:'flex-start', gap:12}}>
                    <span style={{
                      width:36, height:36, borderRadius:10,
                      background:'#edfbf4', color:'#1a9e68', border:'1px solid #8fd9bb',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:15, flexShrink:0,
                    }}>
                      <CheckCircleIcon size={18}/>
                    </span>
                    <div>
                      <h2 style={{margin:0, fontSize:16, fontWeight:800, color:'#1e1c18', letterSpacing:'-0.01em', lineHeight:1.2, display:'inline-flex', alignItems:'center', gap:10}}>
                        Healthy pilots
                        <span style={{fontSize:11, fontWeight:800, background:'#edfbf4', color:'#1a9e68', border:'1px solid #8fd9bb', padding:'2px 9px', borderRadius:20}}>
                          {healthy.length}
                        </span>
                      </h2>
                      <p style={{margin:'4px 0 0', fontSize:12.5, color:'#6a6e71', fontWeight:500, lineHeight:1.4, maxWidth:620}}>
                        Active in the last 7 days with no dormant users. Glance, don&rsquo;t worry.
                      </p>
                    </div>
                  </div>
                  <label style={{display:'flex', alignItems:'center', gap:8, fontSize:12, color:'#6a6e71', fontWeight:600, cursor:'pointer'}}>
                    <span>Sort by</span>
                    <select
                      value={sortHealthyBy}
                      onChange={e => setSortHealthyBy(e.target.value)}
                      style={{background:'#fff', border:'1px solid #dfe0e0', borderRadius:6, padding:'5px 10px', fontSize:12, fontWeight:600, color:'#1e1c18', cursor:'pointer', fontFamily:FONT}}
                    >
                      <option value="lastSeen">Last seen</option>
                      <option value="events">Most events</option>
                      <option value="users">Most users</option>
                    </select>
                  </label>
                </header>
                <div style={{display:'flex', flexDirection:'column', gap:10}}>
                  {healthy.map(a => (
                    <HealthyCard
                      key={a.domain}
                      account={a}
                      refreshing={refreshing[a.domain]}
                      onView={() => router.push(`/accounts/${a.domain}`)}
                      onRefresh={() => refreshDomain(a.domain)}
                      onRemove={() => removeDomain(a.domain)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* NO-RESULTS (search filtered everything) */}
            {atRisk.length === 0 && healthy.length === 0 && (
              <div style={{background:'#fff', border:'1px dashed #dfe0e0', borderRadius:12, padding:'48px 24px', textAlign:'center'}}>
                <SearchIcon size={22} style={{color:'#c8cdd3', display:'block', marginBottom:10}}/>
                <div style={{fontSize:14, fontWeight:700, color:'#33393d'}}>Nothing matches</div>
                <div style={{fontSize:12, color:'#6a6e71', marginTop:4}}>Try a different filter or search.</div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
