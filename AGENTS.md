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
- AI calls go through a streaming server route (src/routes/api/assess.ts) on the Lovable AI Gateway Responses API; keeps the key server-side and streams NDJSON to the page.
- Demo requests are stored in a Cloud table with insert-only public access; nobody can read submissions from the browser.
