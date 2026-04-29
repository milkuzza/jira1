<!-- docs/deployment/02-first-run.md -->
# 02 — Первое развёртывание

## Клонирование и структура

```bash
# На хосте:
git clone https://github.com/your-org/taskmanager.git
cd taskmanager
```

Структура после клонирования:

```
taskmanager/
├── apps/
│   ├── api/              # NestJS API + Dockerfile
│   └── web/              # React + Vite + Dockerfile
├── packages/
│   ├── shared-types/     # Zod schemas
│   └── ui/               # Reusable components
├── infrastructure/
│   └── postgres/init.sql # DDL + RLS
├── docs/                 # Документация
├── docker-compose.yml
├── .env.example
└── package.json
```

## Настройка .env

```bash
# На хосте:
cp .env.example .env
```

Отредактируйте `.env`. Обязательные переменные для первого запуска:

```bash
# .env — минимум для первого запуска

# ─── Обязательные ─────────────────────────
POSTGRES_USER=jira_user
POSTGRES_PASSWORD=CHANGE_ME_$(openssl rand -hex 16)
POSTGRES_DB=jira_db

JWT_SECRET=$(openssl rand -base64 32)

MINIO_ROOT_USER=minio_admin
MINIO_ROOT_PASSWORD=CHANGE_ME_$(openssl rand -hex 16)

# ─── Можно оставить по умолчанию ──────────
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
REDIS_HOST=redis
REDIS_PORT=6379
MINIO_ENDPOINT=http://minio:9000
MINIO_BUCKET=attachments
API_PORT=3000
APP_DOMAIN=app.localhost
JWT_EXPIRES_IN=7d
TRAEFIK_DASHBOARD=true
NODE_ENV=development
```

Генерация секретов одной командой:

```bash
# На хосте:
echo "JWT_SECRET=$(openssl rand -base64 32)"
echo "POSTGRES_PASSWORD=$(openssl rand -hex 16)"
echo "MINIO_ROOT_PASSWORD=$(openssl rand -hex 16)"
```

> ⚠️ **Никогда не коммитьте `.env` в Git!** Файл уже в `.gitignore`.

## Первый запуск

```bash
# На хосте:
docker compose up -d
```

### Порядок старта (управляется `depends_on` + `healthcheck`)

```
1. postgres  — стартует первым, healthcheck: pg_isready (5s interval, 5 retries)
2. redis     — стартует параллельно с PG, healthcheck: redis-cli ping
3. minio     — стартует параллельно, не зависит от PG/Redis
4. traefik   — стартует параллельно, не зависит от данных
5. api       — ждёт PG (healthy) + Redis (healthy), затем стартует
6. web       — стартует параллельно с api (static SPA)
7. adminer   — стартует сразу (dev tool)
```

### Мониторинг запуска

```bash
# На хосте: следить за логами API (самый информативный)
docker compose logs -f api

# Дождаться строки:
# [Nest] LOG [NestApplication] Nest application successfully started on port 3000
```

Проверить статус всех контейнеров:

```bash
docker compose ps
```

Ожидаемый вывод:

```
NAME                STATUS              PORTS
taskmanager-api-1   Up (healthy)        3000/tcp
taskmanager-web-1   Up                  5173/tcp
taskmanager-postgres-1  Up (healthy)    0.0.0.0:5432->5432/tcp
taskmanager-redis-1     Up (healthy)    6379/tcp
taskmanager-minio-1     Up              9000/tcp, 9001/tcp
taskmanager-traefik-1   Up              0.0.0.0:80->80/tcp, 0.0.0.0:8080->8080/tcp
taskmanager-adminer-1   Up              8080/tcp
```

## Проверка работоспособности

```bash
# На хосте: чеклист проверки

# 1. Health endpoint
curl -s http://api.app.localhost/health | jq .
# Ожидается: { "status": "ok", "database": "connected", "redis": "connected" }

# 2. Swagger документация
curl -s -o /dev/null -w "%{http_code}" http://api.app.localhost/api/docs
# Ожидается: 200

# 3. Web-приложение
curl -s -o /dev/null -w "%{http_code}" http://app.localhost
# Ожидается: 200

# 4. MinIO Console
curl -s -o /dev/null -w "%{http_code}" http://minio.app.localhost
# Ожидается: 200 или 301
```

## Загрузка тестовых данных

```bash
# На хосте (через контейнер API):
docker compose exec api npm run seed
```

Результат seed-скрипта:

```
✓ Created tenant: Acme Corp (slug: acme)
✓ Created 5 users
✓ Created 2 projects (WEB, MOBILE)
✓ Created 20 issues with labels
✓ Created 3 sprints
```

### Тестовые учётные записи

Все пользователи имеют пароль: **`password123`**

| Email | Роль | Описание |
|-------|------|----------|
| `admin@acme.com` | ADMIN | Полный доступ |
| `pm@acme.com` | PROJECT_MANAGER | Управление проектами и спринтами |
| `dev1@acme.com` | DEVELOPER | Создание и обновление задач |
| `dev2@acme.com` | DEVELOPER | Создание и обновление задач |
| `viewer@acme.com` | VIEWER | Только просмотр |

## Dev-инструменты

| Инструмент | URL | Назначение |
|------------|-----|------------|
| **Adminer** | http://adminer.app.localhost | GUI для PostgreSQL. Server: `postgres`, User: из `.env`, DB: из `.env` |
| **MinIO Console** | http://minio.app.localhost | Управление файловым хранилищем. Логин из `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` |
| **Traefik Dashboard** | http://localhost:8080 | Мониторинг reverse proxy, маршрутов, middlewares |
| **Swagger API Docs** | http://api.app.localhost/api/docs | Интерактивная документация API |

---

✓ **Проверка:** откройте http://app.localhost в браузере — вы увидите Kanban-доску. Залогиньтесь как `admin@acme.com` / `password123`.
