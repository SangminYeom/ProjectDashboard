import { createHmac, timingSafeEqual } from 'node:crypto'

function sign(secret) {
  return createHmac('sha256', secret).update('auth').digest('base64url')
}

export function createToken(secret) {
  return sign(secret)
}

export function verifyToken(token, secret) {
  const expected = sign(secret)
  try {
    return timingSafeEqual(
      Buffer.from(token, 'base64url'),
      Buffer.from(expected, 'base64url'),
    )
  } catch {
    return false
  }
}

export function parseCookie(str) {
  if (!str) return {}
  return Object.fromEntries(
    str.split(';')
      .map((c) => c.trim().split('='))
      .filter((p) => p.length === 2)
      .map(([k, v]) => [k.trim(), decodeURIComponent(v.trim())]),
  )
}

export function requireAuth(req, res) {
  const cookies = parseCookie(req.headers.cookie)
  const token = cookies['auth_token']
  if (!token || !verifyToken(token, process.env.SESSION_SECRET)) {
    res.status(401).json({ error: 'unauthorized' })
    return false
  }
  return true
}
