import { readStore, writeStore } from '../server/db.js'
import { requireAuth } from './_auth.js'

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return

  if (req.method === 'GET') {
    try {
      const data = await readStore()
      return res.status(200).json({ projects: data.projects, recoveredFrom: null })
    } catch {
      return res.status(500).json({ error: 'internal' })
    }
  }

  if (req.method === 'PUT') {
    const { projects } = req.body ?? {}
    if (!Array.isArray(projects)) {
      return res.status(400).json({ error: 'projects 배열이 필요합니다' })
    }
    try {
      await writeStore({ projects })
      return res.status(204).end()
    } catch {
      return res.status(500).json({ error: 'internal' })
    }
  }

  res.status(405).end()
}
