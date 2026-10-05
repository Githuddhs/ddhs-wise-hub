import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'
import { createClient } from '@supabase/supabase-js'
import { sendTemplateEmail } from '@/lib/email-templates/send-email'

const schema = z.object({
  full_name: z.string().trim().min(2).max(100),
  work_email: z.string().trim().email().max(255),
  phone: z.string().trim().max(30).regex(/^[+\d\s()-]*$/).optional().nullable(),
  company: z.string().trim().min(2).max(150),
  job_title: z.string().trim().max(100).optional().nullable(),
  company_size: z.string().trim().min(1).max(20),
  message: z.string().trim().max(1000).optional().nullable(),
  popia_consent: z.literal(true),
})

export const Route = createFileRoute('/api/demo-request')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown
        try {
          body = await request.json()
        } catch {
          return Response.json({ error: 'Invalid request' }, { status: 400 })
        }

        const parsed = schema.safeParse(body)
        if (!parsed.success) {
          return Response.json({ error: 'Validation failed' }, { status: 422 })
        }
        const d = parsed.data

        const SUPABASE_URL = process.env['SUPABASE_URL']
        const SUPABASE_KEY = process.env['SUPABASE_PUBLISHABLE_KEY']
        if (!SUPABASE_URL || !SUPABASE_KEY) {
          console.error('[demo-request] Missing Supabase environment variables')
          return Response.json({ error: 'Server configuration error' }, { status: 500 })
        }

        // Publishable client: the insert-only RLS policy on demo_requests
        // still applies, so this write can never read submissions back.
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
        const { error } = await supabase.from('demo_requests').insert({
          full_name: d.full_name,
          work_email: d.work_email,
          phone: d.phone || null,
          company: d.company,
          job_title: d.job_title || null,
          company_size: d.company_size,
          message: d.message || null,
          popia_consent: d.popia_consent,
        })
        if (error) {
          console.error('[demo-request] insert failed', error)
          return Response.json({ error: 'Could not store your request' }, { status: 500 })
        }

        // Stored successfully — notify the team. A failed notification must
        // not fail the submission, but it is logged for diagnosis.
        try {
          await sendTemplateEmail('demo-request', 'sdm@ddhs.co.za', {
            templateData: d,
            idempotencyKey: crypto.randomUUID(),
          })
        } catch (err) {
          console.error('[demo-request] notification email failed', err)
          return Response.json({ ok: true, notified: false })
        }

        return Response.json({ ok: true, notified: true })
      },
    },
  },
})
