import { createHmac, timingSafeEqual } from 'node:crypto'

function sign(secret) {
  return createHmac('sha256', secret).update('auth').digest('base64url')
}

export function createToken(secret) {
  return sign(secret)
}

export function verifyToken(token, secret) {
  const expected = sign(secret)
  const a = Buffer.from(token, 'base64url')
  const b = Buffer.from(expected, 'base64url')
  if (a.length !== b.length) return false
  try {
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export function parseCookie(str) {
  if (!str) return {}
  return Object.fromEntries(
    str.split(';')
      .map((c) => c.trim().split(/=(.+)/))
      .filter((p) => p.length >= 2)
      .map(([k, v]) => [k.trim(), decodeURIComponent(v.trim())]),
  )
}

export function requireAuth(req, res) {
  if (!process.env.SESSION_SECRET) {
    res.status(401).json({ error: 'unauthorized' })
    return false
  }
  const cookies = parseCookie(req.headers.cookie)
  const token = cookies['auth_token']
  if (!token || !verifyToken(token, process.env.SESSION_SECRET)) {
    res.status(401).json({ error: 'unauthorized' })
    return false
  }
  return true
}
