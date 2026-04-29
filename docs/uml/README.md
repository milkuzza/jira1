# UML Diagrams — TaskManager SaaS

> Диаграммы соответствуют коду на момент **итерации 4**.
> При изменении схемы БД — обновить `01-erd.mmd`.
> При изменении архитектуры — обновить `02-class.mmd` и `08-component.puml`.

## Список диаграмм

| # | Файл | Тип | Формат | Описание | Аудитория |
|---|------|-----|--------|----------|-----------|
| 1 | `01-erd.mmd` | ERD | Mermaid | Полная схема БД: 12 таблиц, все поля, типы, FK, enum'ы | Разработчики, DBA |
| 2 | `02-class.mmd` | Class | Mermaid | NestJS архитектура: модули, сервисы, контроллеры, зависимости | Backend-разработчики |
| 3 | `03-seq-auth.puml` | Sequence | PlantUML | Login + refresh token rotation + RLS-запрос | Security, backend |
| 4 | `04-seq-dragdrop.puml` | Sequence | PlantUML | Drag&Drop с оптимистичным обновлением + WS broadcast + rollback | Full-stack |
| 5 | `05-seq-upload.puml` | Sequence | PlantUML | Загрузка файла: presigned URL → direct upload → confirm | Full-stack |
| 6 | `06-usecase.puml` | Use Case | PlantUML | Все функции системы с минимальными ролями и include/extends | Аналитики, PM |
| 7 | `07-activity-issue.puml` | Activity | PlantUML | Жизненный цикл задачи: swimlanes DEVELOPER/PM/SYSTEM | PM, разработчики |
| 8 | `08-component.puml` | Component | PlantUML | Все компоненты, протоколы, внешние системы | Архитекторы, DevOps |
| 9 | `09-deployment.puml` | Deployment | PlantUML | Docker-контейнеры, сети, тома, порты | DevOps, онбординг |

## Рендеринг

### Mermaid (.mmd)

Файлы `.mmd` рендерятся автоматически в GitHub/GitLab.
Для локального рендеринга в SVG:

```bash
npx -y @mermaid-js/mermaid-cli -i docs/uml/01-erd.mmd -o docs/uml/01-erd.svg
npx -y @mermaid-js/mermaid-cli -i docs/uml/02-class.mmd -o docs/uml/02-class.svg
```

### PlantUML (.puml)

Для рендеринга всех PlantUML диаграмм в SVG:

```bash
# Через Docker (рекомендуется):
docker run --rm -v $(pwd):/data plantuml/plantuml -tsvg /data/docs/uml/*.puml

# Или через Java:
java -jar plantuml.jar -tsvg docs/uml/*.puml
```

Результат: `.svg` файлы рядом с `.puml` (в той же директории).

## Описание каждой диаграммы

### 1. ERD (`01-erd.mmd`)
Полная ER-диаграмма со всеми 12 таблицами из `init.sql`. Включает все поля с типами (uuid, varchar, text, int, bool, timestamp, jsonb, tsvector), все FK-связи с кардинальностью, и enum-значения в комментариях.

### 2. Class Diagram (`02-class.mmd`)
Архитектура NestJS-бэкенда: все модули, сервисы, контроллеры, guard'ы и gateway сгруппированы по namespace. Показывает ключевые публичные методы и зависимости между компонентами.

### 3. Auth Sequence (`03-seq-auth.puml`)
Три сценария: (1) логин с bcrypt + JWT + Redis, (2) refresh token rotation с reuse detection (угнанный токен уничтожает все сессии), (3) защищённый запрос с RLS (TenantMiddleware → SET app.tenant_id → автофильтрация).

### 4. Drag & Drop Sequence (`04-seq-dragdrop.puml`)
Полный флоу перетаскивания: optimistic update → PATCH order → changelog → float-rebalance проверка → Socket.IO broadcast → ошибка с rollback и refetch.

### 5. File Upload Sequence (`05-seq-upload.puml`)
Трёхшаговая загрузка: (1) API генерирует presigned URL, (2) браузер загружает напрямую в MinIO, (3) подтверждение через API. PlanGuard проверяет лимиты.

### 6. Use Case (`06-usecase.puml`)
Все функции системы, сгруппированные по доменным границам. Акторы с наследованием ролей (VIEWER → DEVELOPER → PM → ADMIN). include/extends связи для PlanGuard и changelog.

### 7. Issue Lifecycle (`07-activity-issue.puml`)
Жизненный цикл задачи в swimlanes (DEVELOPER, PM, SYSTEM). Все переходы статусов, условия, changelog-записи и WebSocket-события на каждом шаге.

### 8. Component Diagram (`08-component.puml`)
Полная системная архитектура: React SPA → Traefik → NestJS (middleware chain, модули, gateway, billing) → PostgreSQL/Redis/MinIO/SMTP. Протоколы на каждой связи.

### 9. Deployment Diagram (`09-deployment.puml`)
Docker Compose инфраструктура: 3 сети (traefik_net, app_net, data_net), контейнеры с портами и volumes, правила видимости сетей, dev-only профиль для Adminer.
