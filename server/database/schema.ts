import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'

export const pastes = sqliteTable('pastes', {
  id: text('id').primaryKey(),
  content: text('content').notNull(),
  language: text('language'),
  title: text('title'),
  visibility: text('visibility', { enum: ['public', 'unlisted'] })
    .notNull().default('unlisted'),
  passwordHash: text('password_hash'),
  salt: text('salt'),
  burnAfterRead: integer('burn_after_read', { mode: 'boolean' })
    .notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }),
  views: integer('views').notNull().default(0),
  ipHash: text('ip_hash'),
}, (t) => [
  index('pastes_expires_idx').on(t.expiresAt),
  index('pastes_created_idx').on(t.createdAt),
  index('pastes_visibility_idx').on(t.visibility),
])