# DDHS Equity Intelligence

DDHS Equity Intelligence (Pty) Ltd is a South African B2B SaaS platform for Employment Equity compliance, workforce transformation and governance.

**Fully self-hosted** — the app runs on your own server with its own PostgreSQL database, session-cookie authentication, on-disk file storage and SMTP email. No third-party backend services.

## Stack

- **Frontend/SSR**: TanStack Start (React 19, Vite, Tailwind CSS 4)
- **Database**: PostgreSQL (plain SQL migrations in `server/migrations/`)
- **Auth**: own `users`/`sessions` tables — bcrypt password hashes, httpOnly session cookies, staff roles in `user_roles`, staff "view as client" impersonation
- **Files**: evidence uploads stored on disk (`UPLOADS_DIR`), served through time-limited signed URLs
- **Email**: SMTP via nodemailer (`mail.ddhs.co.za`)
- **AI tools**: OpenAI Responses API, streamed server-side (`OPENAI_API_KEY`)

## Getting started

Requirements: Node.js 20+, PostgreSQL 14+.

```sh
# 1. Install dependencies
npm install

# 2. Create a database and user (example)
sudo -u postgres psql -c "CREATE ROLE ddhs LOGIN PASSWORD 'change-me' CREATEDB;"
sudo -u postgres createdb -O ddhs ddhs

# 3. Configure the environment
cp .env.example .env     # then edit DATABASE_URL, APP_SECRET, SMTP_PASS, OPENAI_API_KEY

# 4. Apply the schema
npm run db:migrate

# 5. Create your first DDHS staff (admin) account
npm run db:make-admin -- you@ddhs.co.za 'a-strong-password'

# 6. Run it
npm run dev              # development on http://localhost:8080
```

## Production

```sh
npm run build            # builds a standalone Node server into .output/
node .output/server/index.mjs
```

Run it behind a reverse proxy (Caddy or nginx) that terminates TLS, set `PORT` as needed, and keep `.env` values exported in the service environment (e.g. a systemd unit). Remember to back up both PostgreSQL and the `uploads/` directory.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `APP_SECRET` | Signs storage URLs — long random value (`openssl rand -hex 32`) |
| `UPLOADS_DIR` | Directory for uploaded evidence files (default `./uploads`) |
| `PUBLIC_BASE_URL` | Public https address of the app (PayFast callbacks) |
| `SMTP_HOST/PORT/USER/PASS/FROM` | Transactional email (SSL on port 465) |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | AI assessment/planning tools |

## Useful scripts

- `npm run db:migrate` — applies pending SQL migrations from `server/migrations/`
- `npm run db:make-admin -- <email> [password]` — grants staff access (creates the account when a password is given)
- `npm test`, `npm run lint`, `npm run format`
