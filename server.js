import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadData, saveData } from './server/storage.js'
import { todayStr } from './src/lib/calc.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export function createApp({ dataPath, backupDir }) {
  const app = express()
  app.use(express.json({ limit: '10mb' }))

  app.get('/api/projects', (req, res) => {
    const { data, recoveredFrom } = loadData(dataPath, backupDir)
    res.json({ ...data, recoveredFrom })
  })

  app.put('/api/projects', (req, res) => {
    const { projects } = req.body
    if (!Array.isArray(projects)) {
      return res.status(400).json({ error: 'projects 배열이 필요합니다' })
    }
    try {
      saveData(dataPath, { projects }, backupDir, todayStr())
      res.status(204).end()
    } catch (err) {
      res.status(500).json({ error: err.message })
    }
  })

  app.use(express.static(path.join(__dirname, 'dist')))
  return app
}

// 직접 실행 시에만 서버 기동 (테스트에서 import하면 기동 안 함)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const app = createApp({
    dataPath: path.join(__dirname, 'data', 'projects.json'),
    backupDir: path.join(__dirname, 'data', 'backups'),
  })
  app.listen(3000, () => console.log('대시보드 실행 중: http://localhost:3000'))
}
