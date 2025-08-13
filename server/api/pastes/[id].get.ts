import { useDrizzle, tables, eq } from '~~/server/utils/drizzle'
import { verifyPassword } from '~~/server/utils/crypto'

export default eventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const password = getQuery(event).password as string | undefined

  console.log(password);

  const db = useDrizzle()
  const paste = await db.select().from(tables.pastes).where(eq(tables.pastes.id, id)).get()
  if (!paste) throw createError({ statusCode: 404 })

  if (paste.expiresAt && paste.expiresAt < new Date()) {
    await db.delete(tables.pastes).where(eq(tables.pastes.id, id)).run()
    throw createError({ statusCode: 410, statusMessage: 'Expired' })
  }

  if (paste.passwordHash) {
    const ok = password && await verifyPassword(password, paste.salt!, paste.passwordHash)

    if (!ok) throw createError({ statusCode: 401, statusMessage: 'Password required' })
  }

  event.waitUntil(db.update(tables.pastes)
    .set({ views: (paste.views ?? 0) + 1 })
    .where(eq(tables.pastes.id, id)).run())

  if (paste.burnAfterRead) {
    event.waitUntil(db.delete(tables.pastes).where(eq(tables.pastes.id, id)).run())
  }

  if (paste.passwordHash || paste.burnAfterRead) {
    setHeader(event, 'Cache-Control', 'no-store')
  }

  return {
    id: paste.id,
    language: paste.language,
    visibility: paste.visibility,
    createdAt: paste.createdAt,
    expiresAt: paste.expiresAt,
    content: paste.content
  }
})
