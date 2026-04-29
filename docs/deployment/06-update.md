<!-- docs/deployment/06-update.md -->
# 06 — Обновление без downtime

## Обновление приложения (rolling strategy)

```bash
# На хосте:

# 1. Перейти в директорию проекта
cd /path/to/taskmanager

# 2. Забрать изменения
git fetch origin
git log --oneline HEAD..origin/main  # Посмотреть коммиты

# 3. Проверить CHANGELOG на breaking changes
git diff HEAD..origin/main -- CHANGELOG.md

# 4. Применить изменения
git pull origin main

# 5. Сделать бэкап БД перед обновлением
./scripts/backup-db.sh

# 6. Собрать новые образы (только изменившиеся)
docker compose build api web

# 7. Обновить API (сначала API — он обрабатывает миграции)
docker compose up -d --no-deps api

# 8. Проверить health
sleep 5
curl -s http://api.app.localhost/health | jq .
# Ожидается: { "status": "ok" }

# 9. Запустить миграции (если есть)
docker compose exec api npm run migration:run

# 10. Обновить Web
docker compose up -d --no-deps web

# 11. Финальная проверка
curl -s http://app.localhost -o /dev/null -w "%{http_code}"
# Ожидается: 200
```

> ⚠️ Флаг `--no-deps` обновляет **только** указанный сервис, не трогая PG/Redis/MinIO.

## Миграции базы данных (TypeORM)

### Создание миграции

```bash
# В контейнере API:
docker compose exec api npm run migration:generate -- -n MigrationName
```

### Запуск миграций

```bash
# В контейнере API:
docker compose exec api npm run migration:run
```

### Откат миграции

```bash
# В контейнере API:
docker compose exec api npm run migration:revert
```

### Правило совместимости

> ⚠️ **Миграции должны быть backward compatible!**
>
> Порядок действий при изменении схемы:
> 1. Создайте миграцию, которая **добавляет** новые колонки/таблицы (не удаляет старые)
> 2. Примените миграцию: `npm run migration:run`
> 3. Обновите код API (который использует новые колонки)
> 4. Через неделю (после подтверждения стабильности) — удалите старые колонки

## Обновление инфраструктуры (PG, Redis, MinIO)

```bash
# На хосте:

# 1. Бэкап всего
./scripts/backup-db.sh

# 2. Обновить версии в docker-compose.yml
# Например: postgres:16 → postgres:17

# 3. Остановить и пересоздать только инфраструктуру
docker compose up -d --no-deps postgres
# PostgreSQL сам прогонит upgrade при смене минорной версии

# 4. Проверить
docker compose exec postgres psql -U jira_user -d jira_db -c "SELECT version();"
```

> ⚠️ **Major upgrade PostgreSQL** (15→16→17) требует `pg_upgrade`. 
> [Инструкция](https://www.postgresql.org/docs/current/pgupgrade.html).

## Откат обновления

```bash
# На хосте:

# 1. Откатить код
git checkout HEAD~1  # или конкретный коммит

# 2. Пересобрать и перезапустить
docker compose build api web
docker compose up -d --no-deps api web

# 3. Откатить миграцию (если применялась)
docker compose exec api npm run migration:revert

# 4. Проверить
curl -s http://api.app.localhost/health | jq .
```

---

✓ **Проверка:** после обновления выполните `curl http://api.app.localhost/health` — должен вернуть `{"status":"ok"}`. Проверьте логи: `docker compose logs --tail=50 api`.
