<!-- docs/deployment/01-prerequisites.md -->
# 01 — Требования к серверу

## Требования к железу

| Параметр | Минимум | Рекомендуется | >10 пользователей |
|----------|---------|---------------|-------------------|
| CPU | 2 cores | 4 cores | 4+ cores |
| RAM | 4 GB | 8 GB | 10+ GB (доп. 2 GB под PG) |
| Диск | 20 GB SSD | 50 GB SSD | 100+ GB SSD |
| Сеть | 10 Mbps | 100 Mbps | 100+ Mbps |

> ⚠️ **HDD не рекомендуется**: PostgreSQL и MinIO требуют быстрых random read/write операций.

## ПО на хосте

### Ubuntu 22.04

```bash
# 1. Обновление системы
sudo apt update && sudo apt upgrade -y

# 2. Установка базовых утилит
sudo apt install -y git curl jq htop ca-certificates gnupg

# 3. Установка Docker Engine (официальный скрипт)
curl -fsSL https://get.docker.com | sudo sh

# 4. Убедиться что Docker Compose v2 установлен (идёт как плагин)
docker compose version
# Ожидаемый вывод: Docker Compose version v2.20+ 
```

### Debian 12

```bash
# 1. Обновление системы
sudo apt update && sudo apt upgrade -y

# 2. Установка базовых утилит
sudo apt install -y git curl jq htop ca-certificates gnupg

# 3. Добавить Docker GPG ключ и репозиторий
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 4. Проверка
docker --version          # Docker version 24+
docker compose version    # v2.20+
```

### Проверочные команды

```bash
docker --version           # Docker version 24.0.0+
docker compose version     # Docker Compose version v2.20.0+
git --version              # git version 2.30+
curl --version             # curl 7.68+
jq --version               # jq-1.6+
```

## Права пользователя

```bash
# Добавить текущего пользователя в группу docker
sudo usermod -aG docker $USER

# Перелогиниться для применения
newgrp docker

# Проверка (без sudo)
docker ps
```

> ⚠️ **Не запускайте `docker compose` от root!**
> Это создаёт файлы с правами root в директории проекта,
> усложняет обновление, и является security anti-pattern.
> Docker daemon уже работает от root — этого достаточно.

## Сетевые требования

### Dev-режим (localhost)

Добавить в `/etc/hosts` (на машине, где открываете браузер):

```bash
# /etc/hosts
127.0.0.1 app.localhost
127.0.0.1 api.app.localhost
127.0.0.1 adminer.app.localhost
127.0.0.1 minio.app.localhost
127.0.0.1 traefik.app.localhost
```

Одной командой:

```bash
echo "127.0.0.1 app.localhost api.app.localhost adminer.app.localhost minio.app.localhost traefik.app.localhost" | sudo tee -a /etc/hosts
```

### Prod-режим (реальный домен)

Настроить DNS A-записи:

```
A  app.example.com          → <IP сервера>
A  api.app.example.com      → <IP сервера>
A  minio.app.example.com    → <IP сервера>
```

Открыть порты на файрволе:

```bash
# UFW (Ubuntu)
sudo ufw allow 80/tcp    # HTTP (+ ACME challenge)
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 22/tcp    # SSH
sudo ufw enable
```

> ⚠️ **Не открывайте порты 5432 (PostgreSQL), 6379 (Redis), 9000 (MinIO)** наружу.
> Эти сервисы доступны только внутри Docker-сети.

---

✓ **Проверка:** выполните `docker compose version` — вы должны увидеть `v2.20+`. Выполните `docker ps` без `sudo` — не должно быть ошибки Permission denied.
