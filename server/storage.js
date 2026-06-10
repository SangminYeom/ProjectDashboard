import fs from 'node:fs'
import path from 'node:path'

export const DEFAULT_DATA = { projects: [] }

const BACKUP_PATTERN = /^\d{4}-\d{2}-\d{2}\.json$/

export function loadData(dataPath, backupDir) {
  if (!fs.existsSync(dataPath)) {
    return { data: structuredClone(DEFAULT_DATA), recoveredFrom: null }
  }
  try {
    return { data: JSON.parse(fs.readFileSync(dataPath, 'utf8')), recoveredFrom: null }
  } catch {
    const latest = latestBackup(backupDir)
    if (latest) {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(backupDir, latest), 'utf8'))
        return { data, recoveredFrom: latest }
      } catch {
        // 백업도 손상 — 기본값으로 폴백
      }
    }
    return { data: structuredClone(DEFAULT_DATA), recoveredFrom: null }
  }
}

function latestBackup(backupDir) {
  if (!backupDir || !fs.existsSync(backupDir)) return null
  const files = fs.readdirSync(backupDir).filter((f) => BACKUP_PATTERN.test(f)).sort()
  return files.at(-1) ?? null
}

export function saveData(dataPath, data, backupDir, today) {
  const json = JSON.stringify(data, null, 2)
  const tmp = dataPath + '.tmp'
  fs.mkdirSync(path.dirname(dataPath), { recursive: true })
  fs.writeFileSync(tmp, json)
  fs.renameSync(tmp, dataPath) // 원자적 교체 — 쓰기 중 중단돼도 원본 보존
  writeBackup(backupDir, json, today)
}

function writeBackup(backupDir, json, today) {
  fs.mkdirSync(backupDir, { recursive: true })
  fs.writeFileSync(path.join(backupDir, `${today}.json`), json)
  const files = fs.readdirSync(backupDir).filter((f) => BACKUP_PATTERN.test(f)).sort()
  for (const f of files.slice(0, Math.max(0, files.length - 7))) {
    fs.unlinkSync(path.join(backupDir, f))
  }
}

export function migrateData(data) {
  data.projects?.forEach((p) => {
    p.initiatives?.forEach((i) => {
      if (!i.milestones) i.milestones = []
    })
  })
  return data
}
