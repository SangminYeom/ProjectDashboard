import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createApp } from '../server.js'

let app

beforeEach(() => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dash-srv-'))
  app = createApp({
    dataPath: path.join(dir, 'projects.json'),
    backupDir: path.join(dir, 'backups'),
  })
})

describe('GET /api/projects', () => {
  it('초기 상태: 빈 프로젝트 목록', async () => {
    const res = await request(app).get('/api/projects')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ projects: [], recoveredFrom: null })
  })
})

describe('PUT /api/projects', () => {
  it('저장 후 GET으로 동일 데이터 반환', async () => {
    const projects = [{ id: 'p1', name: '테스트 프로젝트' }]
    const put = await request(app).put('/api/projects').send({ projects })
    expect(put.status).toBe(204)
    const res = await request(app).get('/api/projects')
    expect(res.body.projects).toEqual(projects)
  })
  it('projects가 배열이 아니면 400', async () => {
    const res = await request(app).put('/api/projects').send({ projects: '엉뚱한 값' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('projects 배열이 필요합니다')
  })
})
