import * as React from 'react'

export interface InvoiceEmailData {
  contact_name?: string
  company?: string
  invoice_number?: string
  issue_date?: string
  due_date?: string
  description?: string
  period_label?: string
  subtotal?: string
  vat_line?: string
  vat_amount?: string
  total?: string
  bank_name?: string
  account_name?: string
  account_number?: string
  branch_code?: string
  reference?: string
  payfast_link?: string
  vat_number?: string
  client_vat_ref?: string
}

export function InvoiceEmail({
  contact_name = '',
  company = '',
  invoice_number = '',
  issue_date = '',
  due_date = '',
  description = '',
  period_label = '',
  subtotal = '',
  vat_line = '',
  vat_amount = '',
  total = '',
  bank_name = '',
  account_name = '',
  account_number = '',
  branch_code = '',
  reference = '',
  payfast_link = '',
  vat_number = '',
  client_vat_ref = '',
}: InvoiceEmailData) {
  const box = { border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px', marginBottom: 10, backgroundColor: '#f8fafc' }
  const key = { fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase' as const, color: '#64748b' }
  const val = { fontSize: 15, color: '#0f172a', marginTop: 4, fontFamily: 'Menlo, Consolas, monospace', wordBreak: 'break-all' as const }
  const row = { display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#0f172a', padding: '6px 0' }
  return (
    <div style={{ fontFamily: 'Helvetica, Arial, sans-serif', maxWidth: 600, backgroundColor: '#ffffff', padding: 20 }}>
      <div style={{ borderBottom: '2px solid #0f766e', paddingBottom: 12, marginBottom: 20 }}>
        <div style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#0f766e', fontWeight: 700 }}>DDHS Equity Intelligence</div>
        <div style={{ fontSize: 20, color: '#0f172a', marginTop: 4 }}>Invoice {invoice_number}</div>
      </div>

      <p style={{ color: '#0f172a', fontSize: 14, lineHeight: 1.5 }}>Hello {contact_name || company},</p>
      <p style={{ color: '#0f172a', fontSize: 14, lineHeight: 1.5 }}>
        Invoice {invoice_number} for {company} is attached below. Please settle it by EFT and use <strong>{reference}</strong> as your bank reference so we can match your payment.
      </p>

      <div style={box}>
        <div style={key}>Description</div>
        <div style={{ ...val, fontFamily: 'Helvetica, Arial, sans-serif', wordBreak: 'normal' }}>{description}</div>
        {period_label ? <div style={{ ...key, marginTop: 8 }}>Period</div> : null}
        {period_label ? <div style={val}>{period_label}</div> : null}
        <div style={{ ...key, marginTop: 8 }}>Issued</div>
        <div style={val}>{issue_date}</div>
        <div style={{ ...key, marginTop: 8 }}>Due by</div>
        <div style={val}>{due_date}</div>
      </div>

      <div style={{ ...box, padding: '4px 14px' }}>
        <div style={row}><span>Subtotal</span><span>{subtotal}</span></div>
        <div style={row}><span>{vat_line}</span><span>{vat_amount}</span></div>
        <div style={{ ...row, borderTop: '1px solid #e2e8f0', fontWeight: 700, fontSize: 16 }}><span>Total due</span><span>{total}</span></div>
      </div>

      <div style={box}>
        <div style={key}>Pay by EFT into</div>
        <div style={val}>{account_name}</div>
        <div style={{ ...key, marginTop: 8 }}>Bank</div>
        <div style={val}>{bank_name}</div>
        <div style={{ ...key, marginTop: 8 }}>Account number</div>
        <div style={val}>{account_number}</div>
        <div style={{ ...key, marginTop: 8 }}>Branch code</div>
        <div style={val}>{branch_code}</div>
        <div style={{ ...key, marginTop: 8 }}>Reference</div>
        <div style={val}>{reference}</div>
      </div>

      {payfast_link ? (
        <p style={{ marginTop: 16 }}>
          <a href={payfast_link} style={{ backgroundColor: '#0f766e', color: '#ffffff', padding: '10px 18px', borderRadius: 999, textDecoration: 'none', fontSize: 14 }}>
            Or pay online by card
          </a>
        </p>
      ) : null}

      <p style={{ color: '#64748b', fontSize: 13, lineHeight: 1.5, marginTop: 18 }}>
        If you would rather receive a formal tax invoice as a PDF, or anything above needs correcting, reply to this email and we will send it through.
      </p>
      <p style={{ color: '#64748b', fontSize: 12, marginTop: 24 }}>
        DDHS Equity Intelligence (Pty) Ltd{vat_number ? ` — VAT number ${vat_number}` : ''}{client_vat_ref ? ` — your VAT reference ${client_vat_ref}` : ''}
      </p>
    </div>
  )
}
