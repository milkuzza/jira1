<!-- docs/deployment/04-ssl.md -->
# 04 — SSL / HTTPS

## Вариант A: Let's Encrypt (реальный домен)

> Требования: реальный домен, открытый порт 80 для ACME challenge.

### 1. Добавить ACME resolver в docker-compose.yml

Обновите команды Traefik:

```yaml
# docker-compose.yml → traefik → command
services:
  traefik:
    command:
      - "--api.dashboard=true"
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entryPoints.web.address=:80"
      - "--entryPoints.websecure.address=:443"
      # Let's Encrypt
      - "--certificatesResolvers.letsencrypt.acme.email=admin@example.com"
      - "--certificatesResolvers.letsencrypt.acme.storage=/acme/acme.json"
      - "--certificatesResolvers.letsencrypt.acme.httpChallenge.entryPoint=web"
      # HTTP → HTTPS redirect
      - "--entryPoints.web.http.redirections.entryPoint.to=websecure"
    ports:
      - "80:80"
      - "443:443"
      - "8080:8080"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - acme-data:/acme
```

### 2. Обновить labels сервисов

```yaml
# docker-compose.yml → api → labels
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.api.rule=Host(`api.app.example.com`)"
  - "traefik.http.routers.api.entrypoints=websecure"
  - "traefik.http.routers.api.tls.certresolver=letsencrypt"
  - "traefik.http.services.api.loadbalancer.server.port=3000"

# docker-compose.yml → web → labels
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.web.rule=Host(`app.example.com`)"
  - "traefik.http.routers.web.entrypoints=websecure"
  - "traefik.http.routers.web.tls.certresolver=letsencrypt"
  - "traefik.http.services.web.loadbalancer.server.port=5173"
```

### 3. Добавить volume для ACME

```yaml
volumes:
  acme-data:
```

### 4. Проверка

```bash
# На хосте:
docker compose up -d
# Подождать ~30 секунд для получения сертификата

curl -v https://app.example.com 2>&1 | grep "SSL certificate"
# Ожидается: * SSL certificate verify ok

# Проверить сертификат
openssl s_client -connect app.example.com:443 -servername app.example.com < /dev/null 2>/dev/null | openssl x509 -text | head -20
```

---

## Вариант B: mkcert (самоподписанный, dev/LAN)

> Для dev-окружения или доступа в LAN без интернета.

### 1. Установка mkcert

```bash
# На хосте (Ubuntu/Debian):
sudo apt install -y libnss3-tools
curl -JLO "https://dl.filippo.io/mkcert/latest?for=linux/amd64"
chmod +x mkcert-*-linux-amd64
sudo mv mkcert-*-linux-amd64 /usr/local/bin/mkcert

# Установить корневой CA
mkcert -install
```

### 2. Сгенерировать сертификат

```bash
# На хосте:
mkdir -p infrastructure/traefik/certs

mkcert -cert-file infrastructure/traefik/certs/cert.pem \
       -key-file infrastructure/traefik/certs/key.pem \
       "app.localhost" "*.app.localhost"
```

### 3. Настроить Traefik

Создайте `infrastructure/traefik/dynamic.yml`:

```yaml
tls:
  certificates:
    - certFile: /certs/cert.pem
      keyFile: /certs/key.pem
```

Обновите docker-compose.yml:

```yaml
traefik:
  command:
    # ... существующие команды ...
    - "--entryPoints.websecure.address=:443"
    - "--providers.file.filename=/etc/traefik/dynamic.yml"
  ports:
    - "443:443"
  volumes:
    - ./infrastructure/traefik/certs:/certs:ro
    - ./infrastructure/traefik/dynamic.yml:/etc/traefik/dynamic.yml:ro
```

### 4. Добавить CA в браузер

```bash
# Linux (Chrome/Chromium): автоматически через mkcert -install
# Firefox: Настройки → Сертификаты → Импорт → $(mkcert -CAROOT)/rootCA.pem

# Файл CA:
echo "CA location: $(mkcert -CAROOT)/rootCA.pem"
```

> **Windows:** скопируйте `rootCA.pem` на Windows-машину, двойной клик → "Установить сертификат" → Trusted Root Certification Authorities.

> **macOS:** `sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain $(mkcert -CAROOT)/rootCA.pem`

---

## Вариант C: Cloudflare Tunnel (без открытых портов)

> Для случаев когда провайдер блокирует 80/443 или нет статического IP.

### 1. Установка cloudflared

```bash
# На хосте:
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb
```

### 2. Создание туннеля

```bash
# На хосте:
cloudflared tunnel login
# Откроется браузер → авторизация в Cloudflare → выбор домена

cloudflared tunnel create taskmanager
# Запомните TUNNEL_ID из вывода
```

### 3. Настройка ingress rules

Создайте `~/.cloudflared/config.yml`:

```yaml
tunnel: <TUNNEL_ID>
credentials-file: /home/<user>/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: app.example.com
    service: http://localhost:80
  - hostname: api.app.example.com
    service: http://localhost:80
  - hostname: minio.app.example.com
    service: http://localhost:80
  - service: http_status:404
```

### 4. Добавить DNS-записи

```bash
# На хосте:
cloudflared tunnel route dns taskmanager app.example.com
cloudflared tunnel route dns taskmanager api.app.example.com
```

### 5. Запуск как systemd-сервис

```bash
# На хосте:
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

> ⚠️ При использовании Cloudflare Tunnel WebSocket должен работать автоматически.
> SSL терминируется на стороне Cloudflare.

---

✓ **Проверка:** откройте `https://app.example.com` (или `https://app.localhost` для mkcert) — браузер не должен показывать предупреждение о сертификате (кроме самоподписанных без установленного CA).
