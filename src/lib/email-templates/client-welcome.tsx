import * as React from 'react'

export interface ClientWelcomeData {
  contact_name?: string
  company?: string
  login_email?: string
  password?: string
  site_url?: string
}

export function ClientWelcomeEmail({
  contact_name = '',
  company = '',
  login_email = '',
  password = '',
  site_url = 'https://ddhs-wise-hub.lovable.app',
}: ClientWelcomeData) {
  const box = { border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px', marginBottom: 10, backgroundColor: '#f8fafc' }
  const key = { fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase' as const, color: '#64748b' }
  const val = { fontSize: 15, color: '#0f172a', marginTop: 4, fontFamily: 'Menlo, Consolas, monospace', wordBreak: 'break-all' as const }
  return (
    <div style={{ fontFamily: 'Helvetica, Arial, sans-serif', maxWidth: 600, backgroundColor: '#ffffff', padding: 20 }}>
      <div style={{ borderBottom: '2px solid #0f766e', paddingBottom: 12, marginBottom: 20 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#0f766e', fontWeight: 700 }}>DDHS Equity Intelligence</div>
        <div style={{ fontSize: 20, color: '#0f172a', marginTop: 4 }}>Your {company || 'workspace'} is ready</div>
      </div>
      <p style={{ color: '#0f172a', fontSize: 14, lineHeight: 1.5 }}>Hello {contact_name},</p>
      <p style={{ color: '#0f172a', fontSize: 14, lineHeight: 1.5 }}>
        Your Employment Equity workspace has been set up. Sign in with the details below, import your workforce data, and your
        dashboard, plan and evidence repository will fill in.
      </p>
      <div style={box}><div style={key}>Sign-in page</div><div style={val}>{site_url}/auth</div></div>
      <div style={box}><div style={key}>Work email</div><div style={val}>{login_email}</div></div>
      <div style={box}><div style={key}>Password</div><div style={val}>{password}</div></div>
      <p style={{ color: '#64748b', fontSize: 13, lineHeight: 1.5 }}>
        Please keep these details private. If a colleague needs access, reply to this email and we will arrange it.
      </p>
      <p style={{ marginTop: 24 }}>
        <a href={`${site_url}/auth`} style={{ backgroundColor: '#0f766e', color: '#ffffff', padding: '10px 18px', borderRadius: 999, textDecoration: 'none', fontSize: 14 }}>
          Sign in to your workspace
        </a>
      </p>
      <p style={{ color: '#64748b', fontSize: 12, marginTop: 24 }}>DDHS Equity Intelligence (Pty) Ltd — guidance only, not legal advice.</p>
    </div>
  )
}
