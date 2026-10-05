<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Agent rules
- AI calls go through streaming server routes under src/routes/api/ on the Lovable AI Gateway Responses API; keeps the key server-side and streams NDJSON to the page.
- Each AI tool (assess, plan, progress, review) has its own streaming route under src/routes/api/ sharing the same gateway pattern; keeps prompts isolated.
- Demo requests are stored in a Cloud table with insert-only public access; nobody can read submissions from the browser.
- Generated documents (plan PDF, EE Plan Word) are built in the browser with lazily imported libraries; no document data reaches the server except extracted plan text sent to /api/review.
- AI tool pages and the committee tracker live under src/routes/_authenticated/; each /api AI route verifies the bearer token via src/lib/require-user.server.ts and pages call it through authFetch; tools are signed-in only.
- Committee data (members, meetings, actions) is stored per user in Cloud tables with owner-only RLS; profiles auto-create on signup via trigger.
