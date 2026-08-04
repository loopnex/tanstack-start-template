# CLAUDE.md

Conventions for this repo. Follow them exactly — consistency is the point. When a
task matches a pattern below, copy the existing shape rather than inventing one.

## What this is

A self-hostable TanStack Start app (full-stack React) that builds to a **Node
server via Nitro** — `pnpm build` emits `.output/server/index.mjs`, run with
`pnpm start`. It is **not** deployed to an edge/serverless runtime; assume a
long-lived Node process (this is why BullMQ workers, a pooled SMTP transport, and
an S3 client living in-process are all fine).

### Tech stack

- **Framework:** TanStack Start + Router (file-based routes), React 19, Vite, Nitro (Node).
- **Data/API:** oRPC (`@orpc/server`) over `/api/rpc`, OpenAPI reference at `/api/docs`. TanStack Query for client cache.
- **DB:** PostgreSQL via Drizzle ORM (`pg` driver). Schema in `src/db/schema.ts`. IDs are ULIDs.
- **Auth:** better-auth (`src/lib/better-auth`).
- **Jobs:** BullMQ + ioredis (`src/lib/queues`, `src/lib/workers`).
- **Email:** react-email templates + nodemailer (`src/lib/mailer`).
- **Storage:** S3-compatible (R2/MinIO/AWS) via presigned uploads (`src/lib/media`).
- **Forms/validation:** react-hook-form + zod (`@hookform/resolvers`). All schemas in `src/schema`.
  - **Email fields:** zod v4 deprecated `z.string().email()` — use `z.email({ error: ({ input }) => (!input ? 'Email is required' : 'Invalid email') })` instead (see `src/schema/authSchema.ts`).
- **UI:** Tailwind v4, base-ui primitives wrapped in `src/components/ui`, lucide icons, sonner toasts. Exception: `dropdown.tsx` and `drawer.tsx` wrap `@headlessui/react` — base-ui has no equivalent menu yet. Everything else is base-ui.
- **Env:** validated once in `src/lib/env.ts` (zod). Server modules import `env` from there — never read `process.env` directly outside that file.
- **Env files:** `.env.local` is **committed** with the Docker defaults so a clone runs with no setup; `.env` is gitignored and **takes priority** over it. Adding a variable means updating `env.ts`, `.env.local` and `.env.example` together. Never put a real secret in `.env.local`.
- **Local services:** `docker-compose.yml` runs Postgres, Redis, Mailpit (SMTP sink) and MinIO.
- **Import alias:** `#/*` → `src/*`. Always use it.

### Commands

- `pnpm services:up` / `services:down` / `services:logs` — Docker services.
- `pnpm dev` — app on :3000.
- `pnpm email:dev` — react-email preview on :3005 (run alongside `dev` when touching templates).
- `pnpm db:generate` / `db:migrate` / `db:push` / `db:studio` — Drizzle.
- `pnpm db:seed` — admin@example.com + user@example.com, password `password12345`.
- `pnpm typecheck` — run after changes.
- `pnpm check` — prettier + eslint --fix.

There are no tests and no test runner in this repo. Do not add test files.

## Never suppress lint or type errors

**Suppression comments are banned. There is no acceptable use.** Not one, not
"temporarily", not with a justification attached:

```ts
// ✗ every one of these is forbidden
// eslint-disable
// eslint-disable-line
// eslint-disable-next-line some-rule
/* eslint-disable some-rule */
// @ts-ignore
// @ts-expect-error
// @ts-nocheck
```

`any` and `as unknown as X` to escape a type error count as the same thing.

**Turning a rule off in `eslint.config.js` is not the workaround either.** That
file is the project's policy and only its owner changes it. Never edit it, and
never widen an existing `'off'`, to make your own code pass.

A rule firing means the code is wrong, or the types are wrong. Fix the cause:
restructure the code, narrow the type, add the missing guard. If you genuinely
believe a rule is misfiring, **stop and ask** — report the rule, the file, and
why you think it's a false positive, and let the user decide. Never decide it
yourself and move on.

Leaving a warning unfixed and reporting it honestly is always better than
silencing it.

The single exception is **generated files** — `src/routeTree.gen.ts` ships with
its own suppressions and is already in the ignore list. Never hand-edit it.

## Comments

Two forms only. There is no third.

1. **One line → `//`.** A short label saying what the code does. No second `//` line.
2. **Needs more than one line → JSDoc `/** \*/`.\*\* Two or three lines maximum.

Write them for someone who has never seen the file. State what the thing is or
does, in plain words.

**Never:**

- A `//` comment wrapped across two or more lines. If it doesn't fit on one, it's JSDoc.
- Addressing the reader ("note that…", "you can…", "we do this because…").
- Justifying the decision, comparing it to an alternative, or recording what the
  code used to do.
- Cross-references like "see users.deleteUser" or "matches the X in Y".
- Restating the identifier — `// Get user` above `getUser` says nothing.

```ts
// ✓ one line, says what it is
const slug = slugify(input.title)

// ✓ JSDoc when one line genuinely isn't enough
/**
 * One schema for create+edit — password is only required in 'create' mode.
 */
const userFormSchema = (mode: 'create' | 'edit') => ...

// ✗ two-line inline comment — must be JSDoc
// Clear media before the article rows cascade away, otherwise the S3
// objects are orphaned with nothing pointing at them
await mediaService.deleteForIds('article', ids)

// ✗ explaining a decision to the reader
// We keep this here rather than in the handler because it's cleaner and
// the middleware already ran, so there's no need to check again
```

## oRPC procedures

One file per resource in `src/orpc/<resource>.ts`. Builders live in
`src/orpc/index.ts`: `os` (base, has `{ headers }` context) and `authorized`
(adds `{ user, session }`, throws `UNAUTHORIZED` if no session). Compose every
resource into `src/orpc/router.ts`.

### Anatomy of a procedure

Every procedure is `builder.route(...).input(...).output(...).handler(...)`, and
each method file reads top-to-bottom as `getXs → getX → createX → updateX →
deleteX`. **Prefix every procedure with a one-line comment** so methods are easy
to scan in a big file: `// Get Articles (Paginated)`, `// Create Article`, etc.

- **Builder = auth boundary.** Use `authorized` for anything needing a logged-in user (`context.user`/`context.session`); use `os` only for genuinely public endpoints. There's no general RBAC — the one exception is `adminOnly` (`src/orpc/index.ts`), which extends `authorized` with a single `context.user.role === 'admin'` check, used only by user management (`src/orpc/users.ts`). Don't reach for a broader permission system without a real second use case.
- **`.route()` is mandatory (OpenAPI).** `{ method, path, summary, tags }` with REST-ish paths — collection `/articles`, item `/articles/{id}`. `tags` groups the resource in `/api/docs`.
- **`.input()` / `.output()` are always zod schemas** from `src/schema`. The output schema is the public contract — keep it exact. Single-arg item ops inline `z.object({ id: z.string() })`; update spreads `{ id, ...inputSchema.shape }`.
- **Naming:** verb-first, resource-suffixed — `getArticles`, `getArticle`, `createArticle`, `updateArticle`, `deleteArticle`. **Export** grouped: `export const articles = { getArticles, ... }`. Never `articlesRouter`.
- **One action, one procedure.** If a resource needs a second write behavior that isn't a plain field edit (e.g. banning/suspending, publishing), give it its own procedure and its own confirm UI — don't fold it into `updateX` just because it's the same resource (see `users.updateUser` vs `users.banUser`).

### Response shape (match the output schema exactly)

- **Paginated list** → `{ data, meta }`. `.output(paginated(itemSchema))`, `.input(filterSchema)` (spreads `paginationSchema.shape`). Derive paging with `getPaginationQuery(input)`, fetch rows + total with `Promise.all`, count via `db.$count(table, where)`. See Pagination.
- **Single resource** → return the resource itself, shaped to the output schema (e.g. with its resolved `thumbnail`/`image`). Never `{ success: true }`.
- **Delete** → returns the deleted resource, not a status flag.
- Slugs: always `slugify()` on the server regardless of client input.
- Multi-table writes use `db.transaction`; independent reads use `Promise.all`.
- **Reads that need related rows use the Drizzle relational API** — `db.query.articles.findFirst({ where, with: { categories: { columns: { categoryId: true } } } })` — not a hand-written join. The exception is **media**: it's polymorphic (no FK relation), so resolve it through `mediaService` (`findOne`/`findForIds`). The relational API is read-only — join-table writes (insert/delete into `article_categories`) stay explicit inside the transaction.
- **A table owned by another library still reads through plain Drizzle** (e.g. `users`, managed by better-auth) — same as any other resource. But route its _privileged writes_ through that library's own API (e.g. `auth.api.setRole`/`banUser`/`createUser` instead of a raw insert/update) — it carries write-side invariants (password hashing, session/account cleanup) a bypassed SQL write would silently break.

```ts
// Get Articles (Paginated)
const getArticles = authorized
  .route({
    method: 'GET',
    path: '/articles',
    summary: 'List articles',
    tags: ['Articles'],
  })
  .input(articleFilterSchema)
  .output(paginated(articleSchema))
  .handler(async ({ input }) => {
    const { skip, take, page, limit } = getPaginationQuery(input)
    const [rows, total] = await Promise.all([
      db.select().from(articlesTable).where(where).limit(take).offset(skip),
      db.$count(articlesTable, where),
    ])
    return { data: rows, meta: { page, limit, total } }
  })
```

### Errors (three kinds — never a fourth, never `try/catch`)

Handlers have **no `try/catch`**: pre-check and throw explicit errors, and let
everything else propagate.

1. **Validation** — oRPC validates `.input()` and **auto-throws** `BAD_REQUEST` with `data.issues` (`{ path, message }[]`) on failure. You write nothing; just keep input schemas accurate with good messages (`z.string().nonempty('Name is required')`). The client maps each issue onto its field.
2. **Explicit** — a business rule the handler enforces: `throw new ORPCError('CONFLICT', { message: 'Name already taken' })`, `'NOT_FOUND'`, etc. The `message` is user-facing. Detect with **pre-check queries** (existence / name- or title-taken), **never** by catching pg errors.
3. **Unknown** — any other throw (real DB failure, bug). oRPC masks it to a `500` at the boundary; the client shows a generic message. Letting it throw is correct.

Uniqueness is checked on the **human field** (`name`/`title`), not the slug — the
slug is derived from it and unique follows automatically (slug input is disabled).

```ts
// pre-check, then throw — no try/catch
const [taken] = await db
  .select({ id: t.id })
  .from(t)
  .where(eq(t.name, input.name)) // on update: and(eq(t.name, input.name), not(eq(t.id, id)))
  .limit(1)
if (taken) throw new ORPCError('CONFLICT', { message: 'Name already taken' })
```

Client side, route **every** mutation error through one helper —
`handleErrorResponse(error, setError?)` (`src/lib/error-handler.ts`): pass
`setError` from a form and validation issues land inline on the right fields;
omit it (e.g. a list-row delete) and everything becomes a toast.

```ts
mutation.mutate(values, {
  onSuccess: () => {
    /* toast, close dialog, navigate */
  },
  onError: (error) => handleErrorResponse(error, form.setError), // omit setError for toast-only
})
```

## Pagination

`src/schema/paginationSchema.ts` is the single source: `paginationSchema`
(`page`/`limit` optional, limit 10–100), `metaSchema`, and `paginated(itemSchema)`
which wraps to `{ data: T[], meta: { page, limit, total } }`. `getPaginationQuery`
(`src/lib/pagination.ts`) turns params into `{ skip, take, page, limit }`. A list
filter schema spreads pagination: `{ search?, ...paginationSchema.shape }`.

## Data fetching (oRPC + TanStack Query integration)

`src/lib/orpc.ts` exports `orpc = createTanstackQueryUtils(client, {...})`
(`@orpc/tanstack-query`). Never hand-write a `queryOptions({queryKey, queryFn})`
wrapper — call `orpc.<resource>.<procedure>.queryOptions({ input })` directly;
the key is derived automatically from the router path + input, so it's
consistent everywhere the same procedure is used (no more re-declaring the same
query in multiple files). A thin local function is still fine when a route
reuses the same input shape in both its loader and component (see
`articlesQuery` below) — it's just calling `.queryOptions()`, not building a key.

```ts
const articlesQuery = (filters: ArticleFilterSchemaType) =>
  orpc.articles.getArticles.queryOptions({ input: filters })

export const Route = createFileRoute('/dashboard/articles/')({
  validateSearch: (s) => articleFilterSchema.parse(s), // when the list is filterable via URL
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) =>
    ensureQueryData(context.queryClient, articlesQuery(deps)),
  component: ArticlesPage,
})
// in component: const { data: articles } = useSuspenseQuery(articlesQuery(search))
//               <DataTable data={articles.data} .../>
//               <Pagination meta={articles.meta} {...paginationHandlers(navigate)} />
```

- **Every list read — paginated or not — uses `useSuspenseQuery`.** The loader already `ensureQueryData`s before the route commits, and no route in this app configures a `pendingComponent`, so a same-route search/page change blocks silently (the old page just stays put) until the loader resolves — by the time the component re-renders with new params, the data's already cached. So `useSuspenseQuery` never visibly re-suspends here: no `placeholderData`/`isPlaceholderData` dimming needed, and no `data!`/`isSuccess` narrowing guard either — `data` comes back guaranteed.
- **Wire `<Pagination>` with `paginationHandlers(navigate)`** (`src/lib/pagination.ts`) instead of writing `onPageChange`/`onLimitChange` inline: `<Pagination meta={x.meta} {...paginationHandlers(navigate)} />`.
- **Loaders call `ensureQueryData(context.queryClient, …)`** from `#/lib/orpc`, never `queryClient.ensureQueryData` directly. The wrapper turns a `NOT_FOUND` into TanStack Router's `notFound()`, so a bad id renders the 404 page instead of an error boundary.
- **Never `mutateAsync` and never try/catch.** Use `mutation.mutate(input, { onSuccess, onError })`. `onError` routes through `handleErrorResponse` — pass `form.setError` for inline field errors, omit it for a toast. `onSuccess` does UI only: toast, close the dialog, navigate.
- **Invalidate where the mutation is declared**, by passing `onSuccess` to `mutationOptions`: `orpc.users.createUser.mutationOptions({ onSuccess: invalidate })` where `invalidate = () => queryClient.invalidateQueries({ queryKey: orpc.users.key() })`. `orpc.<resource>.key()` partial-matches every query under that resource, including option lists like `getCategoryOptions`. Keep cache concerns there and UI concerns in the `.mutate()` callbacks.
- **A form's loading state is the mutation's `isPending`**, not `form.formState.isSubmitting` — `mutate` returns immediately, so `isSubmitting` is already false while the request is in flight. A shared form component takes it as an `isPending` prop.
- Search: debounce with `useDebounceCallback(fn, 600)` and `navigate({ search })`, resetting `page` to `undefined`.
- After delete on a list: if it was the last row on a page > 1, navigate back a page — the resource invalidation (and thus the refetch) already happened via the mutation's default `onSuccess`.
- **Delete confirmations** tie `AlertDialogAction`'s `isLoading`/`disabled` and `AlertDialogCancel`'s `disabled` to the delete mutation's `isPending` — same loading feel as the create/edit form's `FieldSet disabled={form.formState.isSubmitting}`, just wired explicitly since the alert dialog's buttons aren't in a fieldset.
- **Full list for a `<Select>`/combobox:** never reuse the table's URL-driven key or a `{ limit: 100 }` hack (it collides and is capped). Add a dedicated **unpaginated** procedure returning a slim shape (`getCategoryOptions` → `{ id, name }[]`) — call `orpc.categories.getCategoryOptions.queryOptions()` directly wherever it's needed; it shares one auto-generated key everywhere, and is invalidated for free alongside the rest of `categories.*`.

## Dashboard pages

**Comment every named handler and section in a page component.** One line, verb-first, before the `const` or `function`. The goal is fast scanning in a long file — not explanation.

```tsx
// Search (debounced)
const debouncedSearch = useDebounceCallback(...)
// Delete handler
const handleDelete = async () => { ... }
// Open edit dialog
const openEdit = (item: T) => { ... }
// Table columns
const columns: ColumnDef<T>[] = [...]
```

**Every page starts with the same header row** — back button, title, and a
one-line description. List pages add their primary action on the right; form
pages stop after the description. Titles are always `text-xl font-semibold`.

```tsx
<div className="mb-6 flex items-center justify-between gap-4">
  <div className="flex items-center gap-3">
    {/* Back button (icon-only outline link). NO class on the icon — see UI rules */}
    <Link
      to="/dashboard"
      className={cn(buttonVariants({ variant: 'outline', size: 'icon' }))}
    >
      <ArrowLeft />
    </Link>
    <div>
      <h1 className="text-xl font-semibold">Categories</h1>
      <p className="text-sm text-muted-foreground">
        Organize articles into categories
      </p>
    </div>
  </div>
  <Button onClick={openCreate}>
    <Plus />
    <span>Add Category</span>
  </Button>
</div>
```

The back link points one level up — `/dashboard` from a list page, the list from
an add/edit page.

**List = table card** with this exact structure: a `rounded-xl border bg-card`
wrapper → optional search row (`p-6`) → `<DataTable columns data emptyMessage />`
→ `<Pagination meta {...paginationHandlers(navigate)} />`. Columns are
`ColumnDef<T>[]`; the last column is an actions `Dropdown`.

**CRUD location — decide by form size, not preference.** When a new
page/module is added:

- **Few fields (≈4–5 inputs) and a small/simple dataset:** do create+edit in a **dialog** on the list page — no separate routes (see `categories/index.tsx`).
- **More fields, or the UX needs room (sections, rich inputs, file uploads, pagination/search):** dedicated **`add.tsx` and `edit/$id.tsx` pages** sharing a `-components/<resource>-form.tsx` (see `articles/`).

## UI rules

- **Never put a className on an icon inside a Button/`buttonVariant`.** The button
  styles its svg via `[&_svg]`. Outside a button, size icons with the `.icon`
  class.
  ```tsx
  <Button><Plus /> <span>Add</span></Button>                 // ✓ no icon class
  <Link className={cn(buttonVariants())}><Plus /> Add</Link>  // ✓ link styled as button
  <DropdownItem><Pencil className="icon" /> Edit</DropdownItem> // ✓ icon class outside a button
  <Button><Plus className="size-4" /></Button>               // ✗ never
  ```
- Use `cn(buttonVariants({ variant, size }))` to style `Link`/`Dropdown` triggers as buttons.
- **`isLoading` already disables the button.** Never pass `disabled` alongside it — one prop, one source of truth. `AlertDialogAction` takes `Button`'s props, so it works there too. A plain `disabled` is still right on buttons with no loading state of their own, like `AlertDialogCancel` during a delete.
- **Select inputs:** plain `Select` for a simple single choice; use `Combobox` when it's **multi-select** or a **single select that needs in-list search**.
- **Dates/time:** there is no default — **ask whether the field should show date only or date+time** before rendering, then use `formatDate` or `formatDateTime` from `#/lib/utils`. Never hand-roll date formatting; reuse what's in `utils.ts`.

## File uploads (decoupled from auth)

**Flow:** `<FileUploader>` → `/api/upload/sign` (presigned URL) → browser PUTs
bytes **straight to S3** (single PUT, or multipart above 100 MB) →
`/api/upload/complete` reads the authoritative size/type back from storage,
inserts a `media` row, and returns an `UploadResult`. In **dev**, `objectPublicUrl`
returns a direct S3 URL (Nitro's dev middleware skips `<img>` requests so a server
route can't serve them). In **prod**, reads go through `/files/{key}`
(`src/routes/files/$.ts`) which streams from storage — clean domain URL, bucket
can stay private, and Vite is gone so there's no interception.

Invariants (don't break these):

- The endpoint (`src/routes/api/upload/$.ts`) is **deliberately unauthenticated**, so public upload forms work without a session. There is no request middleware in this repo — don't claim otherwise. `media.userId` is written **null**; to attribute to a user, insert from an `authorized` procedure and pass `context.user.id`.
- Because it's public, **`delete` only removes rows that are still unattached** (`modelId` null). Once a procedure claims a row via `mediaService.sync`, clearing it is that resource's job. The uploader mirrors this: removing an `initialFiles` row only drops it from the form.
- **`media` has no `url` column.** URLs are always derived from the key via `objectPublicUrl`, because dev and prod serve the same key from different bases. Never store one.
- Keys are **server-built** `{collection}/{slug}-{ulid}` — **extensionless** so the dev static handler never intercepts the read URL (a trailing `.jpg`/`.png` gets grabbed before server routes run); Content-Type comes from the stored object. Client input is never a raw path. The `{collection}` is the storage folder, **not** a file-type scope.
- Size/type come from storage (`headObject`), never the client. Default **100 MB** ceiling; `<FileUploader maxSize>` overrides it (sent on both `sign` and `complete`).
- Media is **polymorphic** (`media.modelType` / `modelId` / `collection`), never a column on the parent. `userId` is nullable (`onDelete: 'set null'`).
- URLs: dev → direct S3/MinIO URL (Nitro dev middleware can't route `<img>` requests to server handlers); prod → `{BETTER_AUTH_URL}/files/{key}` served by `src/routes/files/$.ts`. `objectPublicUrl(key)` in `s3.ts` is the single place that picks the right base. No extra env needed — derives from `S3_ENDPOINT`/`S3_BUCKET`/`S3_REGION` in dev, `BETTER_AUTH_URL` in prod.

### Attached to a resource (inside a form)

The form holds a transient `<x>MediaId`; the uploader sets it on complete and
seeds existing files on edit. Output exposes the _resolved_ media, input carries
the _transient_ id:

```ts
// articleSchema: thumbnail: mediaSchema.nullable()   (output)
//                thumbnailMediaId: z.string().optional() (input)
```

The media shape is defined **once** in `mediaSchema` (`src/schema/mediaSchema.ts`).
`mediaService.toResult` returns `MediaSchemaType` and the uploader's `UploadResult`
is an alias of it — never redeclare those fields anywhere.

```tsx
<FileUploader
  collection="thumbnail" // slot name (matches the backend COLLECTION)
  fileTypes={['images']}
  maxSize={5 * 1000 * 1000} // decimal MB — matches formatBytes' base-1000 display
  initialFiles={article.thumbnail ? [article.thumbnail] : undefined} // edit pages
  onUploadComplete={(r) => form.setValue('thumbnailMediaId', r.mediaId)}
/>
```

Backend — use `mediaService`. `sync` attaches the uploaded row to the slot and
returns it (no follow-up `findOne`); `deleteAll` before deleting the parent;
lists batch-resolve with `findForIds` (no N+1):

The `COLLECTION` is the **slot name**, never the resource name — `'thumbnail'`,
`'image'`, `'gallery'`. It doubles as the storage folder.

```ts
const MODEL = 'article'
const COLLECTION = 'thumbnail'
const thumb = await mediaService.sync(
  MODEL,
  article.id,
  COLLECTION,
  input.thumbnailMediaId,
)
return { ...article, thumbnail: thumb ? mediaService.toResult(thumb) : null }
// delete:  await mediaService.deleteAll(MODEL, id)  // before db.delete(...)
// list:    const map = await mediaService.findForIds(MODEL, ids, COLLECTION)
// cascade: await mediaService.deleteForIds(MODEL, ids)  // parent rows cascade
```

### Multi-file slots (galleries)

Same shape, plural methods: `findMany` reads the slot, `syncMany` takes the full
list of ids and deletes whatever is missing from it. The input schema carries
`z.array(z.string())`, and `<FileUploader multiple>` keeps it in sync via
`onUploadComplete` (add) and `onFileRemove` (remove).

```ts
const images = await mediaService.syncMany(MODEL, id, 'gallery', input.imageIds)
return { ...row, images: images.map(mediaService.toResult) }
```

### Standalone (no resource)

Drop the model wiring — just collect the `UploadResult` (it carries `url`, `key`,
`mediaId`). The row persists unattached (`modelType`/`modelId` null) and is served
straight from storage:

```tsx
<FileUploader collection="uploads" onUploadComplete={(r) => setUrl(r.url)} />
```

## Email

1. **Template:** `src/lib/mailer/templates/<name>.tsx` (a react-email default-export component). Preview with `pnpm email:dev`.
2. **Send method:** add a function in `src/lib/mailer/index.tsx` that `render`s the template, `toPlainText`s it, and calls `sendEmail({ to, subject, html, text })`.
3. **Trigger asynchronously** via the queue — never send inline in a request handler: `emailQueue.add('welcome', { to, name })`.
4. **Handle the job** by name in `emailWorker.ts`.

SMTP transport and `BRAND_NAME` live in `src/lib/mailer/config.ts` (pooled;
`maxConnections` stays in sync with the worker concurrency).

## Queues & workers

Long-running/retryable work goes through BullMQ, not inline:

1. **Queue:** `src/lib/queues/<name>Queue.ts` — export `const <NAME>_QUEUE` and the `new Queue(...)` with sane `defaultJobOptions` (attempts, backoff, removeOn\*).
2. **Worker:** `src/lib/workers/<name>Worker.ts` — `new Worker(QUEUE, async (job) => switch (job.name) {...})`, `default export` it. One worker per **kind** of process; set `concurrency` to match downstream limits.
3. **Register:** add the worker to the array in `src/lib/workers/index.ts` (handles graceful shutdown).

Workers are bootstrapped by the import `#/lib/workers` at the top of
`src/server.ts`, so they run inside the Node server process.

## Security / safety defaults

- `.env` is gitignored — never commit secrets.
- No general role/permission checks exist; `authorized` only proves a session. The only exception is `adminOnly` (see oRPC procedures → Builder = auth boundary). Don't assume RBAC beyond that one case.
- **An `adminOnly` procedure needs a matching route guard.** The procedure returns `FORBIDDEN`, which lands in the error boundary — add a `beforeLoad` redirect and mark the sidebar entry `adminOnly` so it's never offered (`src/routes/dashboard/users/index.tsx`).
- Trust storage/server over the client for sizes, types, and slugs.
- `/api/docs` executes real procedures, so its CORS origin is pinned to `BETTER_AUTH_URL`. Never reflect the caller's origin.
