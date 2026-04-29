<!-- docs/deployment/08-troubleshooting.md -->
# 08 — Устранение неполадок

## API не стартует: ошибка подключения к БД

### Симптом
```
[Nest] ERROR [TypeOrmModule] Unable to connect to the database.
Error: connect ECONNREFUSED 172.x.x.x:5432
```

**Причина:** PostgreSQL ещё не готов или POSTGRES_HOST указан неверно.

**Диагностика:**
```bash
# На хосте:
docker compose ps postgres
# STATUS должен быть "Up (healthy)"

docker compose logs --tail=20 postgres
# Искать: "database system is ready to accept connections"
```

**Решение:**
```bash
# 1. Убедиться что PG запущен и healthy
docker compose up -d postgres
docker compose exec postgres pg_isready -U jira_user

# 2. Проверить .env
grep POSTGRES .env
# POSTGRES_HOST должен быть "postgres" (имя сервиса Docker)

# 3. Перезапустить API
docker compose restart api
```

---

## RLS ошибка: "app.tenant_id not set"

### Симптом
```
ERROR: current_setting('app.tenant_id') must not be empty
```

**Причина:** TenantMiddleware не применился к запросу. Запрос идёт напрямую к PostgreSQL без `SET app.tenant_id`.

**Диагностика:**
```bash
# На хосте:
docker compose logs api | grep -i "tenant"
```

**Решение:**
```bash
# 1. Убедиться что запрос идёт через API (не напрямую к PG)
# 2. Проверить что JWT содержит tenantId:
echo "eyJ..." | base64 -d  # декодировать JWT payload

# 3. Для ручных SQL-запросов через Adminer:
SELECT set_config('app.tenant_id', '<tenant-uuid>', true);
SELECT * FROM projects;  -- теперь RLS работает
```

---

## MinIO presigned URL не работает

### Симптом
Браузер получает presigned URL, но загрузка файла возвращает `Connection refused` или `ERR_NAME_NOT_RESOLVED`.

**Причина:** `MINIO_ENDPOINT` в `.env` указан как внутренний Docker-адрес (`http://minio:9000`), который недоступен из браузера.

**Диагностика:**
```bash
# На хосте:
grep MINIO_ENDPOINT .env
# Проблема если: http://minio:9000 (Docker-internal hostname)
```

**Решение:**
```bash
# Для dev: MinIO доступен через Traefik
# В .env для presigned URL на фронте использовать публичный адрес:
MINIO_PUBLIC_ENDPOINT=http://minio.app.localhost

# Для production:
MINIO_PUBLIC_ENDPOINT=https://minio.app.example.com
```

> ⚠️ `MINIO_ENDPOINT` (для API → MinIO внутри Docker) и `MINIO_PUBLIC_ENDPOINT` (для presigned URL браузеру) — это **разные** переменные.

---

## WebSocket не подключается

### Симптом
`useProjectSocket` выдаёт таймаут. В DevTools Network: WebSocket connection `101 Switching Protocols` не происходит.

**Причина:** Traefik не передаёт заголовки `Connection: Upgrade` и `Upgrade: websocket`.

**Диагностика:**
```bash
# На хосте:
docker compose logs traefik | grep -i "websocket\|upgrade"
```

**Решение:**
Добавить middleware для WebSocket в docker-compose.yml labels API:

```yaml
# docker-compose.yml → api → labels (добавить):
  - "traefik.http.middlewares.ws-headers.headers.customRequestHeaders.Connection=Upgrade"
  - "traefik.http.middlewares.ws-headers.headers.customRequestHeaders.Upgrade=websocket"
  - "traefik.http.routers.api.middlewares=ws-headers"
```

```bash
# На хосте:
docker compose up -d traefik
```

> **Альтернатива:** Traefik v3 обычно передаёт WebSocket автоматически. Если не работает — проверьте что клиент подключается через `/ws` namespace.

---

## Subdomain не резолвится

### Симптом
`curl: (6) Could not resolve host: api.app.localhost`

**Причина:** DNS не настроен для wildcard `*.app.localhost`.

**Диагностика:**
```bash
# На хосте:
cat /etc/hosts | grep app.localhost
nslookup api.app.localhost
```

**Решение (вариант A — /etc/hosts):**
```bash
echo "127.0.0.1 app.localhost api.app.localhost adminer.app.localhost minio.app.localhost" | sudo tee -a /etc/hosts
```

**Решение (вариант B — dnsmasq для wildcard):**
```bash
# На хосте (Ubuntu):
sudo apt install -y dnsmasq

# /etc/dnsmasq.d/app.localhost.conf
echo "address=/app.localhost/127.0.0.1" | sudo tee /etc/dnsmasq.d/app.localhost.conf

sudo systemctl restart dnsmasq
```

> dnsmasq автоматически резолвит **любой** поддомен `*.app.localhost` → `127.0.0.1`.

---

## JWT истёк: race condition на фронте

### Симптом
Запрос уходит с валидным токеном, но возвращается 401. В логах API: `jwt expired`.

**Причина:** Access-токен истёк между проверкой на фронте и получением ответа API (сетевая задержка).

**Решение:**
```typescript
// На фронте: в api/client.ts
// Добавить interceptor, который при 401 пытается refresh перед повторным запросом:
if (response.status === 401 && !retried) {
  await refreshToken();
  return apiFetch(url, options, true); // retry=true
}
```

> **Prevention:** установите `JWT_EXPIRES_IN=15m` (не слишком коротко), и refresh-токен на 30 дней.

---

## Превышены лимиты плана (402 Payment Required)

### Симптом
```json
{
  "statusCode": 402,
  "message": "Plan limit exceeded",
  "resource": "projects",
  "current": 3,
  "limit": 3,
  "upgradeUrl": "https://app.localhost/billing/upgrade"
}
```

**Причина:** Тенант на FREE плане исчерпал лимиты.

**Решение (dev — ручное изменение в БД):**
```bash
# На хосте:
docker compose exec postgres psql -U jira_user -d jira_db -c \
  "UPDATE tenants SET plan = 'PRO' WHERE slug = 'acme';"

# Сбросить Redis-кэш лимитов
docker compose exec redis redis-cli KEYS "plan:count:*"
docker compose exec redis redis-cli DEL "plan:count:<tenant-id>:projects"
```

**Решение (production):** Реализовать страницу биллинга или подключить Stripe.

---

## docker compose up падает OOM (Out of Memory)

### Симптом
Контейнер убит ядром: `Killed` в логах, `docker compose ps` показывает Exit 137.

**Причина:** Недостаточно RAM на хосте.

**Диагностика:**
```bash
# На хосте:
dmesg | grep -i "oom\|killed" | tail -5
docker compose ps  # Exit 137 = OOM kill
free -h             # Проверить доступную RAM
```

**Решение — ограничить потребление в docker-compose.yml:**
```yaml
services:
  api:
    deploy:
      resources:
        limits:
          memory: 512M
  postgres:
    deploy:
      resources:
        limits:
          memory: 1G
    # PostgreSQL: также ограничить shared_buffers
    command: postgres -c shared_buffers=256MB -c work_mem=16MB
  redis:
    deploy:
      resources:
        limits:
          memory: 128M
    command: redis-server --maxmemory 100mb --maxmemory-policy allkeys-lru
```

```bash
docker compose up -d
docker stats  # Проверить лимиты
```

---

## init.sql не выполнился

### Симптом
Таблицы не созданы, API возвращает ошибки о несуществующих таблицах.

**Причина:** init.sql выполняется только при **первом создании** тома `postgres-data`. Если том уже существовал — скрипт игнорируется.

**Решение:**
```bash
# На хосте: ⚠️ УДАЛИТ ВСЕ ДАННЫЕ!
docker compose down
docker volume rm taskmanager_postgres-data
docker compose up -d
```

> Для применения изменений в init.sql без удаления данных — используйте миграции TypeORM.

---

✓ **Проверка:** прочитайте решения для вашей конкретной проблемы и выполните диагностические команды. После исправления проверьте `curl http://api.app.localhost/health`.
