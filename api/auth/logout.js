export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  res.setHeader('Set-Cookie', 'auth_token=; HttpOnly; Secure; Path=/; Max-Age=0; SameSite=Lax')
  res.status(200).json({ ok: true })
}
