<!-- docs/deployment/03-configuration.md -->
# 03 — Конфигурация (все переменные .env)

Все переменные считываются из файла `.env` в корне проекта.
Docker Compose подставляет их в сервисы через `${VAR}` синтаксис.

## Database (PostgreSQL)

| Переменная | Обязательна | По умолчанию | Описание |
|------------|:-----------:|:------------:|----------|
| `POSTGRES_HOST` | да | `postgres` | Hostname PostgreSQL. В Docker = имя сервиса |
| `POSTGRES_PORT` | да | `5432` | Порт PostgreSQL |
| `POSTGRES_USER` | да | `jira_user` | Имя пользователя БД |
| `POSTGRES_PASSWORD` | **да** | — | Пароль БД. Генерация: `openssl rand -hex 16` |
| `POSTGRES_DB` | да | `jira_db` | Имя базы данных |

> ⚠️ `POSTGRES_PASSWORD` — **обязательно смените** при production-развёртывании.

## Redis

| Переменная | Обязательна | По умолчанию | Описание |
|------------|:-----------:|:------------:|----------|
| `REDIS_HOST` | да | `redis` | Hostname Redis. В Docker = имя сервиса |
| `REDIS_PORT` | да | `6379` | Порт Redis |

Redis используется для:
- Refresh-токены JWT (`refresh:{userId}:{tokenId}`)
- Кэш лимитов плана (`plan:count:{tenantId}:{resource}`)
- Недавно просмотренные задачи (`user:recent:{userId}`)
- Кэш слагов тенантов (`tenant:slug:{slug}`)

## JWT (Аутентификация)

| Переменная | Обязательна | По умолчанию | Описание |
|------------|:-----------:|:------------:|----------|
| `JWT_SECRET` | **да** | `change-me-in-production` | Секрет подписи access-токенов. Генерация: `openssl rand -base64 32` |
| `JWT_EXPIRES_IN` | нет | `7d` | TTL access-токена (формат: `15m`, `1h`, `7d`) |

> ⚠️ **В production**: установите `JWT_EXPIRES_IN=15m` и используйте refresh-токены.
> Секрет `JWT_SECRET` должен содержать минимум 32 символа.

## MinIO (S3-совместимое хранилище)

| Переменная | Обязательна | По умолчанию | Описание |
|------------|:-----------:|:------------:|----------|
| `MINIO_ROOT_USER` | да | `minio_admin` | Логин MinIO |
| `MINIO_ROOT_PASSWORD` | **да** | — | Пароль MinIO. Генерация: `openssl rand -hex 16` |
| `MINIO_ENDPOINT` | да | `http://minio:9000` | Внутренний URL MinIO (из Docker-сети) |
| `MINIO_BUCKET` | да | `attachments` | Имя основного бакета для вложений |

> ⚠️ `MINIO_ENDPOINT` — это адрес **внутри Docker-сети**, не внешний URL.
> Для presigned URL браузеру нужен публичный адрес — настраивается отдельно.

## Application (NestJS API)

| Переменная | Обязательна | По умолчанию | Описание |
|------------|:-----------:|:------------:|----------|
| `API_PORT` | нет | `3000` | Порт API-сервера внутри контейнера |
| `APP_DOMAIN` | да | `app.localhost` | Базовый домен для subdomain-роутинга тенантов |
| `NODE_ENV` | нет | `development` | Окружение: `development` / `production` |

Значения `NODE_ENV`:
- `development` — подробные ошибки, email-стубы в консоль, Swagger UI
- `production` — минимальные ошибки, реальная отправка email, без Swagger

## Email (SMTP)

| Переменная | Обязательна | По умолчанию | Описание |
|------------|:-----------:|:------------:|----------|
| `SMTP_HOST` | нет | — | SMTP-сервер (например: `smtp.gmail.com`) |
| `SMTP_PORT` | нет | `587` | Порт SMTP (587 для STARTTLS, 465 для SSL) |
| `SMTP_USER` | нет | — | Логин SMTP |
| `SMTP_PASS` | нет | — | Пароль или App Password для SMTP |
| `SMTP_FROM` | нет | `noreply@app.localhost` | Адрес отправителя |

> В `development` режиме email не отправляется — логируется в консоль.
> Для Gmail: создайте [App Password](https://myaccount.google.com/apppasswords).

## OAuth (будущее)

| Переменная | Обязательна | По умолчанию | Описание |
|------------|:-----------:|:------------:|----------|
| `GOOGLE_CLIENT_ID` | нет | — | Client ID из Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | нет | — | Client Secret |
| `GOOGLE_CALLBACK_URL` | нет | — | Callback URL: `https://api.app.example.com/auth/google/callback` |

> OAuth не реализован в текущей итерации — подготовлен для будущего.

## Traefik (Reverse Proxy)

| Переменная | Обязательна | По умолчанию | Описание |
|------------|:-----------:|:------------:|----------|
| `TRAEFIK_DASHBOARD` | нет | `true` | Включить Traefik Dashboard на :8080 |

> ⚠️ **В production**: установите `TRAEFIK_DASHBOARD=false` или защитите Basic Auth.

## Plan Limits (SaaS)

Лимиты планов жёстко заданы в `apps/api/src/constants/index.ts`:

| План | Проекты | Пользователи | Задачи |
|------|---------|--------------|--------|
| FREE | 3 | 5 | 100 |
| PRO | 20 | 50 | ∞ |
| ENTERPRISE | ∞ | ∞ | ∞ |

Для изменения лимитов без перекомпиляции — можно добавить переменные:

| Переменная | Описание |
|------------|----------|
| `PLAN_FREE_PROJECTS` | Лимит проектов для FREE плана |
| `PLAN_FREE_USERS` | Лимит пользователей для FREE плана |
| `PLAN_FREE_ISSUES` | Лимит задач для FREE плана |
| `PLAN_PRO_PROJECTS` | Лимит проектов для PRO плана |
| `PLAN_PRO_USERS` | Лимит пользователей для PRO плана |

> На данный момент значения берутся из констант. Для env-based конфигурации
> потребуется обновить `PlanLimitsService`.

## Ручное изменение плана тенанта (dev)

```sql
-- Подключиться через Adminer или psql:
UPDATE tenants SET plan = 'PRO' WHERE slug = 'acme';
```

---

✓ **Проверка:** выполните `docker compose config` — все переменные должны быть подставлены без ошибок `variable is not set`.
