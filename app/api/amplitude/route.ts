import { NextRequest, NextResponse } from 'next/server'

function getAuth() {
  const key = process.env.AMPLITUDE_API_KEY
  const secret = process.env.AMPLITUDE_SECRET_KEY
  if (!key || !secret) throw new Error('AMPLITUDE_API_KEY or AMPLITUDE_SECRET_KEY is not set in environment variables')
  return Buffer.from(`${key}:${secret}`).toString('base64')
}

async function findUsersByDomain(domain: string) {
  const auth = getAuth()
  const res = await fetch(
    `https://amplitude.com/api/2/usersearch?user=${encodeURIComponent('@' + domain)}`,
    { headers: { Authorization: `Basic ${auth}` } }
  )
  if (res.status === 401 || res.status === 403) {
    throw new Error('Amplitude API credentials are invalid. Check AMPLITUDE_API_KEY and AMPLITUDE_SECRET_KEY.')
  }
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Amplitude API error (${res.status}): ${text.slice(0, 200)}`)
  }
  const data = await res.json()
  return (data.matches || []) as any[]
}

async function getUserActivity(amplitudeId: string) {
  const auth = getAuth()
  const res = await fetch(
    `https://amplitude.com/api/2/useractivity?user=${encodeURIComponent(amplitudeId)}&limit=200`,
    { headers: { Authorization: `Basic ${auth}` } }
  )
  const data = await res.json()
  return { events: data.events || [], userData: data.userData || {} }
}


function processEvents(events: any[], userData: any) {
  const now = Date.now()
  const day = 86400000
  const dailyMap: Record<string, number> = {}
  const eventCounts: Record<string, number> = {}
  const moduleSet = new Set<string>()

  events.forEach(e => {
    const name = e.event_type
    if (!name || name === '(none)') return
    const ts = e.client_event_time ? new Date(e.client_event_time).getTime() : 0
    const dateKey = new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    dailyMap[dateKey] = (dailyMap[dateKey] || 0) + 1
    eventCounts[name] = (eventCounts[name] || 0) + 1
    if (/notetaker/i.test(name)) moduleSet.add('Notetaker')
    if (/gpt/i.test(name)) moduleSet.add('RF GPT')
    if (/aira/i.test(name)) moduleSet.add('Aira Sourcing')
    if (/sequence|campaign/i.test(name)) moduleSet.add('Sequences')
    if (/extension/i.test(name)) moduleSet.add('Chrome Extension')
    if (/report/i.test(name)) moduleSet.add('Reporting')
    if (/pipeline|stage/i.test(name)) moduleSet.add('Pipeline')
    if (/job/i.test(name)) moduleSet.add('Jobs')
    if (/agent/i.test(name)) moduleSet.add('Agents')
    if (/dashboard/i.test(name)) moduleSet.add('Dashboard')
    if (/billing/i.test(name)) moduleSet.add('Billing')
  })

  const totalEvents = userData.num_events ?? events.length

  const topEvents = Object.entries(eventCounts)
    .sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([name, count]) => ({ name, count }))

  const lastUsedTs = userData.last_used ? new Date(userData.last_used).getTime() : 0
  const firstUsedTs = userData.first_used ? new Date(userData.first_used).getTime() : 0

  const daysSince = lastUsedTs ? Math.floor((now - lastUsedTs) / day) : 999
  const lastSeen = lastUsedTs
    ? new Date(lastUsedTs).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Never'
  const firstSeen = firstUsedTs
    ? new Date(firstUsedTs).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Unknown'

  const dailyActivity = Array.from({ length: 8 }, (_, i) => {
    const d = new Date(now - (7 - i) * day)
    const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    return { d: key, v: dailyMap[key] || 0 }
  })
  const activeDays = new Set(events.map(e => new Date(e.client_event_time || 0).toDateString())).size

  return { totalEvents, topEvents, modules: [...moduleSet], dailyActivity, activeDays, daysSince, lastSeen, firstSeen }
}

function buildFlags(stats: any) {
  const flags: { sev: string; t: string; b: string }[] = []
  if (stats.totalEvents === 0) flags.push({ sev: 'danger', t: 'No activity', b: 'This user has never triggered any events.' })
  else if (stats.daysSince >= 14) flags.push({ sev: 'danger', t: `${stats.daysSince} days inactive`, b: `Last seen ${stats.lastSeen}. Needs re-engagement.` })
  else if (stats.daysSince >= 3) flags.push({ sev: 'warn', t: `${stats.daysSince} days inactive`, b: `Last seen ${stats.lastSeen}.` })
  if (stats.totalEvents > 0 && stats.totalEvents < 15) flags.push({ sev: 'warn', t: 'Very low usage', b: `Only ${stats.totalEvents} events — minimal product exploration.` })
  if (stats.modules.includes('Notetaker')) flags.push({ sev: 'info', t: 'Using Notetaker', b: 'User has explored the Notetaker feature.' })
  if (stats.modules.includes('RF GPT')) flags.push({ sev: 'info', t: 'Using RF GPT', b: 'User has explored the AI assistant.' })
  if (stats.modules.includes('Aira Sourcing')) flags.push({ sev: 'info', t: 'Using Aira Sourcing', b: 'User is sourcing candidates via Aira.' })
  const failEvents = stats.topEvents.filter((e: any) => /fail|error/i.test(e.name))
  if (failEvents.length > 0) flags.push({ sev: 'warn', t: 'Errors detected', b: `Hit errors: ${failEvents.map((e: any) => e.name).join(', ')}` })
  return flags
}

export async function POST(req: NextRequest) {
  try {
    const { domain } = await req.json()
    if (!domain) return NextResponse.json({ error: 'Domain required' }, { status: 400 })
    const matches = await findUsersByDomain(domain)
    if (!matches.length) return NextResponse.json({ error: `No users found with @${domain} email addresses in Amplitude.` }, { status: 404 })

    const users = await Promise.all(
      matches.slice(0, 10).map(async (match: any) => {
        const amplitudeId = String(match.amplitude_id)
        const email = match.user_id || ''
        const { events, userData } = await getUserActivity(amplitudeId)
        const stats = processEvents(events, userData)
        const flags = buildFlags(stats)
        const displayName = userData.properties?.name || email.split('@')[0].split('.').map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')
        const initials = displayName.split(' ').map((s: string) => s[0]).join('').slice(0, 2).toUpperCase()
        return { email, name: displayName, initials, amplitudeId, ...stats, flags, status: stats.daysSince === 0 ? 'active' : stats.daysSince >= 14 ? 'danger' : stats.daysSince >= 3 ? 'warn' : 'active' }
      })
    )

    const totalEvents = users.reduce((s, u) => s + u.totalEvents, 0)
    const activeUsers = users.filter(u => u.daysSince < 3).length
    const inactiveUsers = users.filter(u => u.daysSince >= 14).length
    const allModules = [...new Set(users.flatMap(u => u.modules))]
    const daysSince = Math.min(...users.map(u => u.daysSince))
    const lastSeen = [...users].sort((a, b) => a.daysSince - b.daysSince)[0]?.lastSeen || 'Unknown'

    return NextResponse.json({ domain, totalUsers: users.length, activeUsers, inactiveUsers, totalEvents, modulesCount: allModules.length, daysSince, lastSeen, users })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
