import { createFileRoute } from '@tanstack/react-router'
import { timingSafeEqual } from 'crypto'

// Daily job (pg_cron): emails sdm@ddhs.co.za one digest of committee actions
// that are overdue or due within 3 days and haven't been reminded today.
export const Route = createFileRoute('/api/public/action-reminders')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
        const given = request.headers.get('x-cron-token') ?? ''
        const { data: tok } = await supabaseAdmin.from('cron_tokens').select('token').eq('name', 'reminders').single()
        const expected = tok?.token ?? ''
        if (!given || !expected || given.length !== expected.length || !timingSafeEqual(Buffer.from(given), Buffer.from(expected))) {
          return new Response('Unauthorized', { status: 401 })
        }
        const today = new Date().toISOString().slice(0, 10)
        const soon = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10)
        const { data: acts, error } = await supabaseAdmin
          .from('committee_actions').select('id,title,due_date,status,member_id,reminded_on')
          .neq('status', 'Done').not('due_date', 'is', null).lte('due_date', soon)
        if (error) { console.error(error); return Response.json({ error: 'query failed' }, { status: 500 }) }
        const due = (acts ?? []).filter((a) => a.reminded_on !== today)
        if (!due.length) return Response.json({ sent: 0 })
        const ids = [...new Set(due.map((a) => a.member_id).filter(Boolean))] as string[]
        const { data: mem } = ids.length ? await supabaseAdmin.from('committee_members').select('id,name').in('id', ids) : { data: [] }
        const owner = (id: string | null) => mem?.find((m) => m.id === id)?.name ?? 'Unassigned'
        const items = due.map((a) => ({ title: a.title, due_date: a.due_date as string, status: a.status, owner: owner(a.member_id), overdue: (a.due_date as string) < today }))
        const { sendTemplateEmail } = await import('@/lib/email-templates/send-email')
        try {
          await sendTemplateEmail('action-reminder', 'sdm@ddhs.co.za', { templateData: { items }, idempotencyKey: `action-reminder-${today}-${due.map((a) => a.id).join('').slice(0, 64)}` })
        } catch (e) { console.error('reminder send failed', e); return Response.json({ error: 'send failed' }, { status: 502 }) }
        await supabaseAdmin.from('committee_actions').update({ reminded_on: today }).in('id', due.map((a) => a.id))
        return Response.json({ sent: items.length })
      },
    },
  },
})
