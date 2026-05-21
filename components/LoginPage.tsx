'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const handle = async () => {
    setLoading(true); setError(''); setMessage('')
    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    } else {
      const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } })
      if (error) setError(error.message)
      else setMessage('Check your email to confirm your account!')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f9fafb', fontFamily:'Inter, system-ui, sans-serif' }}>
      <div style={{ background:'#fff', borderRadius:16, padding:'40px 36px', width:380, boxShadow:'0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:28 }}>
          <div style={{ width:5, height:36, background:'#4aa1ff', borderRadius:3 }} />
          <div>
            <div style={{ fontSize:22, fontWeight:700, color:'#0f1f3d', margin:0 }}>Pilot Tracker</div>
            <div style={{ fontSize:12, color:'#9ca3af', marginTop:2 }}>Recruiterflow · Sales team</div>
          </div>
        </div>

        {error && <div style={{ background:'#fef0f0', border:'1px solid #fdc5c5', borderRadius:8, padding:'9px 12px', fontSize:12, color:'#c81e1e', marginBottom:12 }}>{error}</div>}
        {message && <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8, padding:'9px 12px', fontSize:12, color:'#15803d', marginBottom:12 }}>{message}</div>}

        {mode === 'signup' && (
          <div>
            <label style={{ fontSize:12, fontWeight:500, color:'#374151', marginBottom:5, display:'block' }}>Full name</label>
            <input style={{ width:'100%', padding:'10px 12px', border:'1px solid #e5e7eb', borderRadius:8, fontSize:13, outline:'none', boxSizing:'border-box', marginBottom:14 }} placeholder="Jane Smith" value={name} onChange={e => setName(e.target.value)} />
          </div>
        )}

        <label style={{ fontSize:12, fontWeight:500, color:'#374151', marginBottom:5, display:'block' }}>Work email</label>
        <input style={{ width:'100%', padding:'10px 12px', border:'1px solid #e5e7eb', borderRadius:8, fontSize:13, outline:'none', boxSizing:'border-box', marginBottom:14 }} type="email" placeholder="jane@recruiterflow.com" value={email} onChange={e => setEmail(e.target.value)} />

        <label style={{ fontSize:12, fontWeight:500, color:'#374151', marginBottom:5, display:'block' }}>Password</label>
        <input style={{ width:'100%', padding:'10px 12px', border:'1px solid #e5e7eb', borderRadius:8, fontSize:13, outline:'none', boxSizing:'border-box', marginBottom:14 }} type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handle()} />

        <button style={{ width:'100%', padding:'11px', background:'#0f1f3d', border:'none', borderRadius:9, color:'#fff', fontSize:14, fontWeight:600, cursor:'pointer', marginTop:4 }} onClick={handle} disabled={loading}>
          {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
        </button>

        <div style={{ textAlign:'center', marginTop:18, fontSize:12, color:'#6b7280' }}>
          {mode === 'login'
            ? <span>No account? <span style={{ color:'#4aa1ff', cursor:'pointer', fontWeight:500 }} onClick={() => setMode('signup')}>Sign up</span></span>
            : <span>Have an account? <span style={{ color:'#4aa1ff', cursor:'pointer', fontWeight:500 }} onClick={() => setMode('login')}>Sign in</span></span>
          }
        </div>
      </div>
    </div>
  )
}
