import * as React from 'react'

export interface ActionReminderData {
  items?: { title: string; due_date: string; status: string; owner: string; overdue: boolean }[]
  calendarUrl?: string
}

export function ActionReminderEmail({ items = [], calendarUrl = 'https://transform-wise-hub.lovable.app/calendar' }: ActionReminderData) {
  const cell = { padding: '8px 6px', borderBottom: '1px solid #e2e8f0', fontSize: 13, color: '#0f172a' }
  return (
    <div style={{ fontFamily: 'Helvetica, Arial, sans-serif', maxWidth: 600, backgroundColor: '#ffffff', padding: 20 }}>
      <div style={{ borderBottom: '2px solid #0f766e', paddingBottom: 12, marginBottom: 20 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#0f766e', fontWeight: 700 }}>DDHS Equity Intelligence</div>
        <div style={{ fontSize: 20, color: '#0f172a', marginTop: 4 }}>EE committee actions need attention</div>
      </div>
      <p style={{ color: '#0f172a', fontSize: 14, lineHeight: 1.5 }}>These committee actions are overdue or due within the next 3 days.</p>
      <table style={{ borderCollapse: 'collapse', width: '100%' }} cellPadding={0} cellSpacing={0}>
        <thead><tr>{['Action', 'Due', 'Status', 'Owner'].map((h) => <th key={h} style={{ ...cell, textAlign: 'left', color: '#64748b', fontSize: 11, textTransform: 'uppercase' }}>{h}</th>)}</tr></thead>
        <tbody>{items.map((i, n) => (
          <tr key={n}><td style={cell}>{i.title}</td><td style={{ ...cell, color: i.overdue ? '#b91c1c' : '#0f172a' }}>{i.due_date}{i.overdue ? ' (overdue)' : ''}</td><td style={cell}>{i.status}</td><td style={cell}>{i.owner}</td></tr>
        ))}</tbody>
      </table>
      <p style={{ marginTop: 24 }}><a href={calendarUrl} style={{ backgroundColor: '#0f766e', color: '#ffffff', padding: '10px 18px', borderRadius: 999, textDecoration: 'none', fontSize: 14 }}>Open compliance calendar</a></p>
    </div>
  )
}
