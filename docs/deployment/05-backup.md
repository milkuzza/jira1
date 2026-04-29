<!-- docs/deployment/05-backup.md -->
# 05 — Резервное копирование

## PostgreSQL

### Скрипт бэкапа

Создайте `scripts/backup-db.sh`:

```bash
#!/bin/bash
# scripts/backup-db.sh — PostgreSQL backup via Docker
# Использование: ./scripts/backup-db.sh
# Cron: 0 3 * * * /path/to/taskmanager/scripts/backup-db.sh

set -euo pipefail

BACKUP_DIR="./backups/postgres"
RETENTION_DAYS=7
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="taskmanager_${TIMESTAMP}.sql.gz"

# Создать директорию если не существует
mkdir -p "${BACKUP_DIR}"

# Дамп через контейнер PostgreSQL
echo "[$(date)] Starting PostgreSQL backup..."
docker compose exec -T postgres pg_dump \
  -U "${POSTGRES_USER:-jira_user}" \
  -d "${POSTGRES_DB:-jira_db}" \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  | gzip > "${BACKUP_DIR}/${FILENAME}"

# Проверить что файл не пустой
if [ ! -s "${BACKUP_DIR}/${FILENAME}" ]; then
  echo "[$(date)] ERROR: Backup file is empty!" >&2
  rm -f "${BACKUP_DIR}/${FILENAME}"
  exit 1
fi

SIZE=$(du -h "${BACKUP_DIR}/${FILENAME}" | cut -f1)
echo "[$(date)] Backup created: ${FILENAME} (${SIZE})"

# Ротация: удалить бэкапы старше RETENTION_DAYS
echo "[$(date)] Cleaning backups older than ${RETENTION_DAYS} days..."
find "${BACKUP_DIR}" -name "taskmanager_*.sql.gz" -mtime +${RETENTION_DAYS} -delete

echo "[$(date)] Backup completed successfully."
```

```bash
# На хосте: сделать исполняемым
chmod +x scripts/backup-db.sh

# Тест
./scripts/backup-db.sh
```

### Автоматизация через cron

```bash
# На хосте:
crontab -e

# Добавить строку (бэкап каждый день в 3:00):
0 3 * * * cd /path/to/taskmanager && ./scripts/backup-db.sh >> backups/backup.log 2>&1
```

## Redis

Redis используется как кэш — потеря данных не критична.
Все refresh-токены можно пересоздать (пользователи перелогинятся).

Если нужно бэкапить:

```bash
# На хосте: принудительный snapshot
docker compose exec redis redis-cli BGSAVE

# Скопировать dump.rdb
docker cp $(docker compose ps -q redis):/data/dump.rdb backups/redis/dump_$(date +%Y%m%d).rdb
```

> Redis настроен на автоматическое RDB сохранение (по умолчанию каждые 5 минут при ≥1 изменении).

## MinIO (файлы)

### Вариант A: mc mirror (рекомендуется)

```bash
# На хосте: установить MinIO Client
curl -O https://dl.min.io/client/mc/release/linux-amd64/mc
chmod +x mc
sudo mv mc /usr/local/bin/

# Настроить alias
mc alias set local http://localhost:9000 ${MINIO_ROOT_USER} ${MINIO_ROOT_PASSWORD}

# Зеркалирование в локальную директорию
mc mirror local/attachments backups/minio/attachments/
mc mirror local/avatars backups/minio/avatars/
```

### Вариант B: копирование Docker volume

```bash
# На хосте:
docker run --rm \
  -v taskmanager_minio-data:/data \
  -v $(pwd)/backups/minio:/backup \
  alpine tar czf /backup/minio_$(date +%Y%m%d).tar.gz -C /data .
```

## Полное восстановление с нуля

Пошаговая инструкция восстановления на чистом сервере:

```bash
# На хосте — новый сервер:

# 1. Установить Docker (см. 01-prerequisites.md)
# 2. Клонировать проект
git clone https://github.com/your-org/taskmanager.git
cd taskmanager

# 3. Скопировать .env (из бэкапа или создать заново)
cp .env.example .env
# Отредактировать .env — ВАЖНО: использовать те же POSTGRES_PASSWORD и JWT_SECRET

# 4. Запустить инфраструктуру (без API пока)
docker compose up -d postgres redis minio

# 5. Дождаться готовности PostgreSQL
docker compose exec postgres pg_isready -U jira_user
# Ожидается: accepting connections

# 6. Восстановить БД
gunzip -c backups/postgres/taskmanager_20240115_030000.sql.gz | \
  docker compose exec -T postgres psql -U jira_user -d jira_db

# 7. Восстановить файлы MinIO (если есть)
mc alias set local http://localhost:9000 ${MINIO_ROOT_USER} ${MINIO_ROOT_PASSWORD}
mc mirror backups/minio/attachments/ local/attachments

# 8. Запустить все сервисы
docker compose up -d

# 9. Проверить
curl -s http://api.app.localhost/health | jq .
```

---

✓ **Проверка:** выполните `./scripts/backup-db.sh` — файл `backups/postgres/taskmanager_*.sql.gz` должен появиться и иметь размер > 0.
