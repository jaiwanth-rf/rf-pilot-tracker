'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import LoginPage from '@/components/LoginPage'
import Dashboard from '@/components/Dashboard'

export default function Home() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontFamily:'Inter, sans-serif', background:'#f9fafb' }}>
      <div style={{ fontSize:14, color:'#6b7280' }}>Loading...</div>
    </div>
  )

  if (!session) return <LoginPage />
  return <Dashboard session={session} />
}
