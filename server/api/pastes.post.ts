import { z } from 'zod'
import { useDrizzle, tables, eq } from '~~/server/utils/drizzle'
import { newId } from '~~/server/utils/ids'
import { hashPassword } from '~~/server/utils/crypto'
import { getIP, ipHash } from '~~/server/utils/ip'
import { limit } from '~~/server/utils/rate-limit'

const Body = z.object({
  content: z.string().min(1),
  language: z.string().optional(),
  visibility: z.enum(['public','unlisted']).default('unlisted'),
  expiresIn: z.number().int().positive().optional(),
  password: z.string().min(1).optional(),
  burnAfterRead: z.boolean().optional()
})

export default eventHandler(async (event) => {
  if (!await limit(event, `create:${getIP(event)}`, 30, 3600)) {
    throw createError({ statusCode: 429, statusMessage: 'Rate limit exceeded' })
  }

  const { origin } = getRequestURL(event)

  console.log(await readBody(event));

  const data = Body.parse(await readBody(event))
  const id = newId()
  const now = new Date()
  const expiresAt = data.expiresIn ? new Date(now.getTime() + data.expiresIn * 1000) : null
  const pw = data.password ? await hashPassword(data.password) : null

  await useDrizzle().insert(tables.pastes).values({
    id,
    content: data.content,
    language: data.language,
    visibility: data.visibility,
    passwordHash: pw?.hash ?? null,
    salt: pw?.salt ?? null,
    burnAfterRead: !!data.burnAfterRead,
    createdAt: now,
    expiresAt,
    views: 0,
    ipHash: ipHash(getIP(event))
  }).run()

  return { id, url: `${origin}/${id}`, raw: `${origin}/raw/${id}` }
})
