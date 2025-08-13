const te = new TextEncoder()

const b64 = (buf: ArrayBuffer | Uint8Array) =>
  (typeof Buffer !== 'undefined'
    ? Buffer.from(buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf).toString('base64')
    : btoa(String.fromCharCode(...(buf instanceof ArrayBuffer ? new Uint8Array(buf) : buf))))

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const data = new Uint8Array(salt.length + te.encode(password).length)
  data.set(salt); data.set(te.encode(password), salt.length)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return { salt: b64(salt), hash: b64(digest) }
}

export async function verifyPassword(password: string, saltB64: string, hashB64: string) {
  const salt = typeof Buffer !== 'undefined' ? Buffer.from(saltB64, 'base64') : Uint8Array.from(atob(saltB64), c => c.charCodeAt(0))
  const data = new Uint8Array(salt.length + te.encode(password).length)
  data.set(salt); data.set(te.encode(password), salt.length)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return b64(digest) === hashB64
}
