# 프로젝트 대시보드

여러 프로젝트의 KPI · 중점수행과제(간트·쟁점) · 운영업무를 관리하는 개인용 로컬 대시보드.

## 실행

```bash
npm install   # 최초 1회
npm start     # 빌드 + 서버 실행 → http://localhost:3000
```

## 개발

```bash
npm run serve   # API 서버 (포트 3000)
npm run dev     # Vite 개발 서버 (API는 3000으로 프록시)
npm test        # 테스트
```

## 데이터

- `data/projects.json` — 전체 데이터 (이 폴더는 OneDrive로 자동 동기화됨)
- `data/backups/` — 일자별 자동 백업, 최근 7일치 유지
