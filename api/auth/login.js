import { timingSafeEqual } from 'node:crypto'
import { createToken } from '../_auth.js'

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  if (!process.env.ACCESS_CODE || !process.env.SESSION_SECRET) {
    return res.status(500).json({ error: 'server misconfigured' })
  }

  const { password } = req.body ?? {}
  const a = Buffer.from(String(password ?? ''))
  const b = Buffer.from(process.env.ACCESS_CODE)
  const match = a.length === b.length && timingSafeEqual(a, b)
  if (!password || !match) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  const token = createToken(process.env.SESSION_SECRET)
  res.setHeader(
    'Set-Cookie',
    `auth_token=${token}; HttpOnly; Secure; Path=/; Max-Age=${30 * 24 * 3600}; SameSite=Lax`,
  )
  res.status(200).json({ ok: true })
}
