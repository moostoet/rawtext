
export async function limit(event: any, key: string, limit = 30, windowSec = 3600) {
  const kv = hubKV()
  const now = Math.floor(Date.now()/1000)
  const bucket = Math.floor(now / windowSec)
  const k = `rl:${key}:${bucket}`
  const count = (await kv.get<number>(k)) ?? 0
  if (count >= limit) return false
  await kv.set(k, count + 1, { ttl: windowSec })
  return true
}
