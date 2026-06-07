import { describe, it, expect, beforeEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { loadData, saveData, DEFAULT_DATA } from '../server/storage.js'

let dir, dataPath, backupDir

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dash-'))
  dataPath = path.join(dir, 'projects.json')
  backupDir = path.join(dir, 'backups')
})

const sample = { projects: [{ id: 'p1', name: '테스트' }] }

describe('saveData', () => {
  it('JSON을 저장하고 다시 읽을 수 있다', () => {
    saveData(dataPath, sample, backupDir, '2026-06-07')
    expect(JSON.parse(fs.readFileSync(dataPath, 'utf8'))).toEqual(sample)
  })
  it('임시 파일을 남기지 않는다 (원자적 저장)', () => {
    saveData(dataPath, sample, backupDir, '2026-06-07')
    expect(fs.existsSync(dataPath + '.tmp')).toBe(false)
  })
  it('일자별 백업 파일을 만든다', () => {
    saveData(dataPath, sample, backupDir, '2026-06-07')
    expect(fs.existsSync(path.join(backupDir, '2026-06-07.json'))).toBe(true)
  })
  it('백업은 최근 7일치만 유지한다', () => {
    for (let d = 1; d <= 9; d++) {
      saveData(dataPath, sample, backupDir, `2026-06-0${d}`)
    }
    const files = fs.readdirSync(backupDir).sort()
    expect(files).toHaveLength(7)
    expect(files[0]).toBe('2026-06-03.json') // 01, 02는 삭제됨
  })
})

describe('loadData', () => {
  it('파일이 없으면 기본 데이터를 반환한다', () => {
    expect(loadData(dataPath, backupDir)).toEqual({ data: DEFAULT_DATA, recoveredFrom: null })
  })
  it('정상 파일을 읽는다', () => {
    saveData(dataPath, sample, backupDir, '2026-06-07')
    expect(loadData(dataPath, backupDir)).toEqual({ data: sample, recoveredFrom: null })
  })
  it('손상된 파일이면 최신 백업에서 복구한다', () => {
    saveData(dataPath, sample, backupDir, '2026-06-06')
    fs.writeFileSync(dataPath, '{ 깨진 JSON')
    const result = loadData(dataPath, backupDir)
    expect(result.data).toEqual(sample)
    expect(result.recoveredFrom).toBe('2026-06-06.json')
  })
  it('손상됐고 백업도 없으면 기본 데이터', () => {
    fs.writeFileSync(dataPath, '{ 깨진 JSON')
    expect(loadData(dataPath, backupDir)).toEqual({ data: DEFAULT_DATA, recoveredFrom: null })
  })
  it('백업도 손상이면 기본 데이터로 폴백한다', () => {
    fs.mkdirSync(backupDir, { recursive: true })
    fs.writeFileSync(path.join(backupDir, '2026-06-06.json'), '{ 깨진 백업')
    fs.writeFileSync(dataPath, '{ 깨진 JSON')
    expect(loadData(dataPath, backupDir)).toEqual({ data: DEFAULT_DATA, recoveredFrom: null })
  })
  it('날짜 형식이 아닌 json 파일은 백업으로 취급하지 않는다', () => {
    saveData(dataPath, sample, backupDir, '2026-06-06')
    fs.writeFileSync(path.join(backupDir, 'other.json'), '{"projects":[]}')
    fs.writeFileSync(dataPath, '{ 깨진 JSON')
    expect(loadData(dataPath, backupDir).recoveredFrom).toBe('2026-06-06.json')
  })
})
