import type { ComponentType } from 'react'
import { DemoRequestEmail } from './demo-request'
import { ActionReminderEmail } from './action-reminder'
import { ClientWelcomeEmail } from './client-welcome'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 *
 * Example:
 *   import { template as welcomeTemplate } from './welcome'
 *   // then add to TEMPLATES: 'welcome': welcomeTemplate
 */
export const TEMPLATES: Record<string, TemplateEntry> = {
  'demo-request': {
    component: DemoRequestEmail,
    subject: (data) => `Demo request — ${data['company']}`,
    displayName: 'Demo request notification',
    previewData: {
      full_name: 'Thandi Nkosi',
      work_email: 'thandi@example.co.za',
      phone: '+27 82 000 0000',
      company: 'Example Manufacturing (Pty) Ltd',
      job_title: 'HR Director',
      company_size: '150–499',
      message: 'We need help with our EEA2 submission.',
    },
    // Fixed recipient: internal demo-request alerts.
    to: 'sdm@ddhs.co.za',
  },
  'action-reminder': {
    component: ActionReminderEmail,
    subject: (data) => `${(data['items'] ?? []).length} EE committee action(s) due or overdue`,
    displayName: 'Committee action reminder',
    previewData: { items: [{ title: 'Finalise barriers analysis', due_date: '2026-10-07', status: 'In progress', owner: 'HR Manager', overdue: false }] },
    // Fixed recipient: internal reminders.
    to: 'sdm@ddhs.co.za',
  },
  'client-welcome': {
    component: ClientWelcomeEmail,
    subject: (data) => `Your ${data['company'] || 'DDHS'} workspace is ready`,
    displayName: 'Client login details',
    previewData: {
      contact_name: 'Thandi Nkosi',
      company: 'Example Manufacturing (Pty) Ltd',
      login_email: 'thandi@example.co.za',
      password: 'Kf7mQp2xRt9wLn4b',
      site_url: 'https://ddhs-wise-hub.lovable.app',
    },
    // No fixed recipient: this goes to the client's own address.
  },
}
