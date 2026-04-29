<!-- docs/deployment.md -->
# Развёртывание TaskManager

## Быстрый старт (dev, 5 минут)

```bash
# 1. Клонирование
git clone https://github.com/your-org/taskmanager.git
cd taskmanager

# 2. Настройка окружения
cp .env.example .env

# 3. Настройка DNS (Linux/macOS)
echo "127.0.0.1 app.localhost api.app.localhost adminer.app.localhost minio.app.localhost traefik.app.localhost" | sudo tee -a /etc/hosts

# 4. Запуск всех сервисов
docker compose up -d

# 5. Ожидание готовности (healthcheck PG + Redis)
docker compose logs -f api  # дождаться "Nest application successfully started"

# 6. Загрузка тестовых данных
docker compose exec api npm run seed

# 7. Открыть в браузере
# http://app.localhost          — веб-приложение
# http://api.app.localhost      — API
# Логин: admin@acme.com / password123
```

> ⚠️ **Windows**: используйте `C:\Windows\System32\drivers\etc\hosts` вместо `/etc/hosts`

## Быстрый старт (production)

Для production-развёртывания выполните разделы в порядке:

1. [Требования к серверу](deployment/01-prerequisites.md) — подготовка хоста
2. [Первое развёртывание](deployment/02-first-run.md) — от клонирования до первого запроса
3. [Конфигурация](deployment/03-configuration.md) — все переменные окружения
4. [SSL / HTTPS](deployment/04-ssl.md) — Let's Encrypt или mkcert

## Архитектура развёртывания

```
┌─────────────────────────────────────────────────────┐
│  Host: 192.168.1.100 (Ubuntu 22.04 / Debian 12)    │
│                                                     │
│  ┌──────────────────┐                               │
│  │  Traefik v3      │ :80 HTTP                      │
│  │  (reverse proxy) │ :8080 Dashboard (dev)         │
│  │  auto-discovery  │ :443 HTTPS (prod, optional)   │
│  └────────┬─────────┘                               │
│           │  Docker labels routing                  │
│  ┌────────▼────────────────────────────┐            │
│  │  jira-net (bridge network)          │            │
│  │                                     │            │
│  │  ┌─────┐  ┌─────┐  ┌──────────┐   │            │
│  │  │ api │  │ web │  │ adminer  │   │            │
│  │  │:3000│  │:5173│  │(dev only)│   │            │
│  │  └──┬──┘  └─────┘  └──────────┘   │            │
│  │     │                               │            │
│  │  ┌──▼────┐ ┌───────┐ ┌──────────┐ │            │
│  │  │  pg   │ │ redis │ │  minio   │ │            │
│  │  │ :5432 │ │ :6379 │ │:9000/:901│ │            │
│  │  └───────┘ └───────┘ └──────────┘ │            │
│  └─────────────────────────────────────┘            │
│                                                     │
│  Volumes: postgres-data, redis-data, minio-data     │
└─────────────────────────────────────────────────────┘
```

## Разделы документации

| # | Документ | Описание |
|---|----------|----------|
| 1 | [Требования](deployment/01-prerequisites.md) | Аппаратные и программные требования к серверу |
| 2 | [Первое развёртывание](deployment/02-first-run.md) | Пошаговая инструкция от clone до первого запроса |
| 3 | [Конфигурация](deployment/03-configuration.md) | Полная таблица всех .env переменных |
| 4 | [SSL / HTTPS](deployment/04-ssl.md) | Let's Encrypt, mkcert, Cloudflare Tunnel |
| 5 | [Резервное копирование](deployment/05-backup.md) | Бэкапы БД, Redis, MinIO + восстановление |
| 6 | [Обновление](deployment/06-update.md) | Обновление без downtime, миграции, откат |
| 7 | [Мониторинг](deployment/07-monitoring.md) | Логи, healthcheck, метрики, алерты |
| 8 | [Устранение неполадок](deployment/08-troubleshooting.md) | Частые проблемы и решения |
