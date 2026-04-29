<!-- docs/deployment/07-monitoring.md -->
# 07 — Мониторинг и алерты

## Базовый мониторинг (без доп. сервисов)

### Health-check скрипт

Создайте `scripts/healthcheck.sh`:

```bash
#!/bin/bash
# scripts/healthcheck.sh — проверка доступности API
# Cron: */5 * * * * /path/to/taskmanager/scripts/healthcheck.sh

set -euo pipefail

API_URL="http://api.app.localhost/health"
TIMEOUT=10

RESPONSE=$(curl -s -o /tmp/health_response.json -w "%{http_code}" \
  --connect-timeout ${TIMEOUT} \
  --max-time ${TIMEOUT} \
  "${API_URL}" 2>/dev/null || echo "000")

if [ "${RESPONSE}" != "200" ]; then
  TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
  MESSAGE="[${TIMESTAMP}] ALERT: API health check failed! HTTP ${RESPONSE}"
  echo "${MESSAGE}" | logger -t taskmanager-health
  echo "${MESSAGE}" >&2

  # Опционально: отправить webhook/email
  # curl -X POST "https://hooks.slack.com/services/..." -d '{"text":"'${MESSAGE}'"}'
  exit 1
fi
```

```bash
# На хосте:
chmod +x scripts/healthcheck.sh

# Добавить в cron (каждые 5 минут):
crontab -e
# */5 * * * * /path/to/taskmanager/scripts/healthcheck.sh
```

### Проверить работу

```bash
# На хосте:
./scripts/healthcheck.sh && echo "OK" || echo "FAIL"

# Проверить логи в syslog:
grep taskmanager-health /var/log/syslog | tail -5
```

## Логи

### Просмотр логов

```bash
# На хосте:

# Все сервисы
docker compose logs --tail=100

# Конкретный сервис
docker compose logs --tail=100 -f api

# За определённый период
docker compose logs --since="2024-01-15T00:00:00" api

# Только ошибки (NestJS пишет [Nest] ERROR)
docker compose logs api 2>&1 | grep -i "error\|exception\|fail"
```

### Ротация логов Docker

Настройте `/etc/docker/daemon.json`:

```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "50m",
    "max-file": "5"
  }
}
```

```bash
# На хосте:
sudo systemctl restart docker
```

> Это ограничит каждый контейнер 5 файлами по 50 MB = **~250 MB на контейнер**.

## Метрики ресурсов

### docker stats

```bash
# На хосте: реальное время
docker stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"
```

Ожидаемые значения при idle:

| Контейнер | CPU | RAM | Примечание |
|-----------|-----|-----|------------|
| postgres | <1% | 60–120 MB | Зависит от кэша |
| redis | <1% | 5–15 MB | Зависит от кол-ва ключей |
| api | <1% | 80–150 MB | Node.js базовый footprint |
| web | <1% | 30–60 MB | Vite dev server |
| traefik | <1% | 20–40 MB | Lightweight proxy |
| minio | <1% | 60–100 MB | Зависит от данных |

### Uptime Kuma (опционально)

Для полноценного мониторинга добавьте Uptime Kuma:

```yaml
# docker-compose.yml → добавить сервис:
  uptime-kuma:
    image: louislam/uptime-kuma:1
    profiles: ["monitoring"]
    volumes:
      - uptime-kuma-data:/app/data
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.uptime.rule=Host(`status.app.localhost`)"
      - "traefik.http.routers.uptime.entrypoints=web"
      - "traefik.http.services.uptime.loadbalancer.server.port=3001"
    networks:
      - jira-net

# volumes → добавить:
  uptime-kuma-data:
```

```bash
# На хосте: запустить с профилем monitoring
docker compose --profile monitoring up -d uptime-kuma

# Открыть http://status.app.localhost
# Добавить мониторы:
#   - HTTP: http://api:3000/health (внутренний адрес из Docker-сети)
#   - TCP: postgres:5432
#   - TCP: redis:6379
```

## Признаки проблем и диагностика

| Симптом | Первое место проверки | Команда |
|---------|----------------------|---------|
| API не отвечает | Контейнер упал | `docker compose ps api` |
| 502 Bad Gateway | API не стартовал | `docker compose logs --tail=50 api` |
| Медленные запросы | PostgreSQL locks | `docker compose exec postgres psql -U jira_user -c "SELECT * FROM pg_stat_activity WHERE state = 'active';"` |
| Высокое потребление RAM | Утечка памяти Node.js | `docker stats api` + перезапуск |
| Redis connection refused | Redis упал | `docker compose logs redis` |
| Диск заполнен | Логи или MinIO | `df -h` + `docker system df` |
| WebSocket отключается | Traefik таймаут | `docker compose logs traefik \| grep websocket` |

---

✓ **Проверка:** выполните `./scripts/healthcheck.sh` — скрипт должен завершиться с кодом 0. Проверьте `docker stats` — все контейнеры должны быть видны.
