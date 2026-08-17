# SW Assist — Генератор персонажей Savage Worlds

Веб-приложение для создания персонажей по правилам Savage Worlds.

## Стек

| Слой | Технологии |
|------|-----------|
| Frontend | Vue 3, Vite, Pinia, Vue Router, Tailwind CSS |
| Backend | Node.js, Express, TypeScript, Prisma |
| БД | PostgreSQL 16 |
| Deploy | Docker Compose, Nginx |

## Быстрый старт (Docker)

```bash
docker-compose up --build -d
```

Приложение: http://localhost:8081

## Локальная разработка

### 1. PostgreSQL

```bash
docker run -d --name swassist-pg -e POSTGRES_USER=swassist -e POSTGRES_PASSWORD=swassist -e POSTGRES_DB=swassist -p 5432:5432 postgres:16-alpine
```

### 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run db:push
npm run dev
```

API: http://localhost:8787

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

UI: http://localhost:5173

## Переменные окружения

| Переменная | Локально | Docker |
|-----------|----------|--------|
| `DATABASE_URL` | localhost:5432 | postgres:5432 |
| `PORT` | 8787 | 3000 |
| `FRONTEND_URL` | http://localhost:5173 | http://localhost:8081 |

## API

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/health` | Проверка сервера |
| GET | `/api/flaws` | Изъяны |
| GET | `/api/skills` | Навыки |
| GET | `/api/traits` | Черты |
| GET | `/api/races` | Расы |
| GET | `/api/characters` | Список персонажей |
| POST | `/api/character` | Создать/сохранить |
| GET | `/api/character/:uuid` | Получить персонажа |
| PUT | `/api/character/:uuid` | Обновить персонажа |

## Структура

```
sw_assist/
├── backend/          # Express API + Prisma
├── frontend/         # Vue SPA
├── docker-compose.yml
└── README.md
```

Данные правил (навыки, черты, изъяны, расы) хранятся в `backend/data/*.json`. Персонажи — в PostgreSQL.
