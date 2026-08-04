# TanStack Start Template

A self-hostable full-stack React starter: TanStack Start + Router, a typed oRPC
API, Postgres via Drizzle, better-auth, BullMQ jobs, transactional email, and
S3-compatible uploads. Builds to a plain Node server via Nitro.

Everything runs locally in Docker, and `.env.local` is committed with matching
defaults — so a fresh clone is five commands from a working app.

## Contents

1. [Requirements](#requirements)
2. [Quick start](#quick-start)
3. [What you get](#what-you-get) — URLs and logins
4. [Commands](#commands)
5. [Project layout](#project-layout)
6. [How a feature fits together](#how-a-feature-fits-together)
7. [Adding a module](#adding-a-module)
8. [Environment](#environment)
9. [Services](#services)
10. [Deployment](#deployment)

## Requirements

- Node 22.21+ or 24.10+ (for `--env-file-if-exists`)
- pnpm 11+
- Docker, running

## Quick start

```bash
pnpm install
pnpm services:up      # Postgres, Redis, Mailpit, MinIO
pnpm db:migrate       # create the tables
pnpm db:seed          # admin + user accounts
pnpm dev              # http://localhost:3000
```

No environment setup — `.env.local` is committed and already points at the
containers.

> **Edited `docker-compose.yml`?** Run `docker compose up -d --force-recreate`.
> A plain `services:up` can leave old containers running with the old config,
> which shows up as a healthy service the app still can't reach.

## What you get

| Service            | URL                                      | Login                                 |
| ------------------ | ---------------------------------------- | ------------------------------------- |
| **App**            | http://localhost:3000                    | `admin@example.com` / `password12345` |
|                    |                                          | `user@example.com` / `password12345`  |
| **API reference**  | http://localhost:3000/api/docs           | signed-in session                     |
| **Mailpit** inbox  | http://localhost:8025                    | none                                  |
| **MinIO** console  | http://localhost:9001                    | `minioadmin` / `minioadmin`           |
| **Drizzle Studio** | `pnpm db:studio`                         | none                                  |
| **Email preview**  | `pnpm email:dev` → http://localhost:3005 | none                                  |

MinIO exposes **two** ports and they are not interchangeable: `9000` is the S3
API the app writes to, `9001` is the console you browse. Uploads land in the
`app` bucket, created automatically.

Nothing leaves your machine — Mailpit swallows all outgoing mail.

## Commands

```bash
# Develop
pnpm dev              # app on :3000
pnpm email:dev        # react-email preview on :3005

# Services
pnpm services:up      # start containers (detached)
pnpm services:logs    # tail them
pnpm services:down    # stop them

# Database
pnpm db:generate      # write a migration from schema changes
pnpm db:migrate       # apply migrations
pnpm db:push          # skip migrations, push schema (dev only)
pnpm db:seed          # admin + user accounts
pnpm db:studio        # browse data

# Quality — run both before committing
pnpm typecheck        # tsc --noEmit
pnpm check            # prettier --write + eslint --fix

# Ship
pnpm build            # → .output/server/index.mjs
pnpm start            # run that build
```

## Project layout

```
src/
  routes/               File-based routes; URL = file path
    (main)/             Public site + auth pages
    dashboard/          Signed-in area
      -components/      Route-local components (the - prefix excludes them)
    api/                Server handlers: rpc, auth, upload, docs
    files/              Streams stored media in production
  orpc/                 API procedures, one file per resource
  schema/               Zod schemas — inputs, outputs, filters
  db/
    schema.ts           Drizzle tables
    seed.ts             Seed accounts
  components/
    ui/                 Styled primitives (button, dialog, table, …)
    system/             Composite widgets (file uploader, …)
  lib/
    env.ts              Validated environment
    db.ts  redis.ts     Connections
    orpc.ts             Client + query integration
    better-auth/        Auth server and client
    media/              S3 and the media service
    mailer/             Templates and senders
    queues/  workers/   BullMQ producers and consumers
  hooks/  providers/    Shared React state
```

Import with the `#/*` alias — `#/lib/db`, never `../../lib/db`.

## How a feature fits together

Tracing one list page end to end, which is the shape every module follows:

```
src/schema/articleSchema.ts     zod: articleSchema, articleInputSchema, filters
        ↓ input/output contract
src/orpc/articles.ts            getArticles, createArticle, … (Drizzle queries)
        ↓ registered in
src/orpc/router.ts              { articles, categories, users }
        ↓ served at /api/rpc, typed client in
src/lib/orpc.ts                 orpc.articles.getArticles.queryOptions()
        ↓ consumed by
src/routes/dashboard/articles/index.tsx   loader + useSuspenseQuery + DataTable
```

The client is fully typed off the router — rename a field in the zod schema and
the page stops compiling. Mutations invalidate their resource automatically via
`experimental_defaults` in `src/lib/orpc.ts`, so components never call
`invalidateQueries`.

Background work is deliberately out of band: a procedure calls
`emailQueue.add(...)` and returns; the worker in `src/lib/workers` sends the mail
in the same Node process.

## Adding a module

Copy `categories` (dialog CRUD) or `articles` (dedicated pages) rather than
inventing a shape. In order:

1. **Table** — add it to `src/db/schema.ts`, then `pnpm db:generate && pnpm db:migrate`.
2. **Schemas** — `src/schema/<name>Schema.ts`: output, input, and filter schemas.
3. **Procedures** — `src/orpc/<name>.ts`, then add it to `src/orpc/router.ts`.
4. **Cache** — add the create/update/delete entries in `src/lib/orpc.ts`.
5. **Route** — `src/routes/dashboard/<name>/index.tsx`, with the standard header,
   table card and pagination.
6. `pnpm typecheck && pnpm check`.

Form size decides the UI: ~4–5 fields → dialog on the list page; more, or file
uploads → separate `add.tsx` and `edit/$id.tsx` sharing a form component.

**`CLAUDE.md` is the detailed spec** — procedure anatomy, the three error kinds,
pagination, media slots, comment style, UI rules. Read it before writing code.

## Environment

Two files, and **`.env` always wins**:

| File           | Committed | Purpose                                      |
| -------------- | --------- | -------------------------------------------- |
| `.env.local`   | yes       | Local defaults matching `docker-compose.yml` |
| `.env`         | no        | Your overrides and every real secret         |
| `.env.example` | yes       | Reference for the full set, for production   |

Override one value by creating a `.env` with just that line; everything else
still falls back to `.env.local`. Never put a real secret in `.env.local` — it's
in git, and the committed `BETTER_AUTH_SECRET` is a throwaway.

Variables are validated at startup in `src/lib/env.ts`, so a missing or malformed
one fails immediately with a list of what's wrong. Adding a variable means
updating `env.ts`, `.env.local` and `.env.example` together.

## Services

`docker-compose.yml` runs everything the app talks to.

| Service  | Port          | Purpose                                  |
| -------- | ------------- | ---------------------------------------- |
| Postgres | `5432`        | database `app`, user/password `postgres` |
| Redis    | `6379`        | BullMQ queues                            |
| Mailpit  | `1025`/`8025` | SMTP sink, then its inbox UI             |
| MinIO    | `9000`/`9001` | S3 API, then its console                 |

## Deployment

`pnpm build` emits a self-contained Node server at `.output/server/index.mjs`;
`pnpm start` runs it.

Assume a **long-lived process** — BullMQ workers, the pooled SMTP transport and
the S3 client all live inside it, so this does not target edge or serverless
runtimes.

To deploy: provide the environment (a real `.env` or injected variables), set
`BETTER_AUTH_URL` to your actual origin, run `pnpm db:migrate`, and point
Postgres, Redis and S3 at managed instances.

`BETTER_AUTH_URL` matters beyond auth — in production, uploads are served from
`{BETTER_AUTH_URL}/files/{key}`, while development reads them straight from the
bucket.
