import { createToken } from '../_auth.js'

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { password } = req.body ?? {}
  if (!password || password !== process.env.ACCESS_CODE) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  const token = createToken(process.env.SESSION_SECRET)
  res.setHeader(
    'Set-Cookie',
    `auth_token=${token}; HttpOnly; Path=/; Max-Age=${30 * 24 * 3600}; SameSite=Lax`,
  )
  res.status(200).json({ ok: true })
}
