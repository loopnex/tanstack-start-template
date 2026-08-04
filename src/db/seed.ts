import { accounts, users } from '#/db/schema'
import { db } from '#/lib/db'
import { hashPassword } from 'better-auth/crypto'
import { eq } from 'drizzle-orm'

const PASSWORD = 'password12345'

const SEED_USERS = [
  { name: 'Admin', email: 'admin@example.com', role: 'admin' as const },
  { name: 'User', email: 'user@example.com', role: 'user' as const },
]

/**
 * Creates a user plus the credential account better-auth signs in against.
 */
async function seedUser(entry: (typeof SEED_USERS)[number]) {
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, entry.email))
    .limit(1)

  if (existing) {
    console.log(`- ${entry.email} already exists, skipped`)
    return
  }

  await db.transaction(async (tx) => {
    const [user] = await tx
      .insert(users)
      .values({
        name: entry.name,
        email: entry.email,
        emailVerified: true,
        role: entry.role,
      })
      .returning()

    if (!user) throw new Error(`Failed to create ${entry.email}`)

    await tx.insert(accounts).values({
      accountId: user.id,
      providerId: 'credential',
      userId: user.id,
      password: await hashPassword(PASSWORD),
    })
  })

  console.log(`- ${entry.email} created (${entry.role})`)
}

async function seed() {
  console.log('Seeding…')
  for (const user of SEED_USERS) await seedUser(user)
  console.log(`Done. Password for both accounts: ${PASSWORD}`)
}

// The pg pool keeps the event loop alive, so exit explicitly
seed().then(
  () => process.exit(0),
  (error: unknown) => {
    console.error(error)
    process.exit(1)
  },
)
