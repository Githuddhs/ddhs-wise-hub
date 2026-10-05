import * as React from 'react'

export interface DemoRequestData {
  full_name: string
  work_email: string
  phone?: string | null
  company: string
  job_title?: string | null
  company_size: string
  message?: string | null
}

const label = {
  padding: '6px 0',
  color: '#64748b',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: 10,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.12em',
  verticalAlign: 'top' as const,
  width: 130,
}

const value = { padding: '6px 0', color: '#0f172a', fontSize: 14, lineHeight: 1.5 }

export function DemoRequestEmail(data: DemoRequestData) {
  return (
    <div style={{ fontFamily: 'Helvetica, Arial, sans-serif', maxWidth: 560 }}>
      <div style={{ borderBottom: '2px solid #0f766e', paddingBottom: 12, marginBottom: 20 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#0f766e', fontWeight: 700 }}>
          DDHS Equity Intelligence
        </div>
        <div style={{ fontSize: 20, color: '#0f172a', marginTop: 4 }}>
          New demo request
        </div>
      </div>
      <p style={{ color: '#0f172a', fontSize: 14, lineHeight: 1.5 }}>
        A new demo request has been submitted on ddhs.co.za.
      </p>
      <table style={{ borderCollapse: 'collapse', width: '100%' }} cellPadding={0} cellSpacing={0}>
        <tbody>
          <tr><td style={label}>Name</td><td style={value}>{data.full_name}</td></tr>
          <tr><td style={label}>Work email</td><td style={value}>{data.work_email}</td></tr>
          {data.phone ? <tr><td style={label}>Phone</td><td style={value}>{data.phone}</td></tr> : null}
          <tr><td style={label}>Company</td><td style={value}>{data.company}</td></tr>
          {data.job_title ? <tr><td style={label}>Job title</td><td style={value}>{data.job_title}</td></tr> : null}
          <tr><td style={label}>Employees</td><td style={value}>{data.company_size}</td></tr>
        </tbody>
      </table>
      {data.message ? (
        <div style={{ marginTop: 16 }}>
          <div style={{ ...label, width: undefined, padding: 0 }}>What they would like to see</div>
          <div style={{ ...value, marginTop: 4, whiteSpace: 'pre-wrap' as const }}>{data.message}</div>
        </div>
      ) : null}
      <div style={{ marginTop: 24, paddingTop: 12, borderTop: '1px solid #e2e8f0', fontSize: 11, color: '#64748b' }}>
        Submitted {new Date().toISOString().replace('T', ' ').slice(0, 16)} UTC · POPIA consent given
      </div>
    </div>
  )
}
