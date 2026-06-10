import { readStore, writeStore } from '../server/db.js'
import { requireAuth } from './_auth.js'

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return

  if (req.method === 'GET') {
    const data = await readStore()
    return res.status(200).json({ ...data, recoveredFrom: null })
  }

  if (req.method === 'PUT') {
    const { projects } = req.body ?? {}
    if (!Array.isArray(projects)) {
      return res.status(400).json({ error: 'projects 배열이 필요합니다' })
    }
    await writeStore({ projects })
    return res.status(204).end()
  }

  res.status(405).end()
}
