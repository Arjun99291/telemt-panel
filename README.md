# TeleMT Panel

Web-панель для управления MTProto прокси (Telegram). Позволяет создавать, мониторить и управлять несколькими прокси-инстансами через браузер.

Работает поверх Docker-образа `telemt-proxy-v3` в режиме Fake TLS.

---

## Что умеет

- Создание прокси в один клик — поднимает Docker-контейнер с нужным конфигом
- Fake TLS (EE) — трафик маскируется под обычный HTTPS к популярным доменам
- Пул из 50 доменов (apple.com, google.com, cloudflare.com и т.д.) — каждый прокси получает уникальный
- Мониторинг — статус контейнера, трафик (RX/TX) в реальном времени
- Готовые ссылки `tg://proxy` — копируешь и отправляешь
- Управление — запуск, остановка, удаление
- Авторизация по JWT
- Тёмный интерфейс, адаптивный под мобилки

---

## Как это работает

```
Telegram-клиент
    -> подключается к SERVER_IP:PORT
    -> контейнер telemt-proxy-v3 (Fake TLS, уникальный домен)
    -> серверы Telegram
```

Каждый прокси получает свой внешний порт из диапазона 10000–20000 с прямым биндингом на хост.

### Формат секрета (Fake TLS)

```
ee + <32 hex символа: 16-байтный ключ> + <домен в hex>
```

Ключ из секрета совпадает с `user1` в конфиге контейнера. Домен определяет SNI для маскировки.

### Конфиг прокси (config.toml)

```toml
[general]
use_middle_proxy = true

[general.modes]
classic = false
secure = false
tls = true

[server]
port = 10001

[censorship]
tls_domain = "google.com"
mask = true

[access.users]
user1 = "<32 hex символа>"
```

---

## Установка

Требования: Ubuntu 20.04+ / Debian 11+, Docker, образ `telemt-proxy-v3` загружен на сервер.

```bash
git clone https://github.com/11kara11/telemt-panel.git
cd telemt-panel
chmod +x install.sh
sudo ./install.sh
```

Скрипт сам определит IP сервера, сгенерирует JWT-секрет, соберёт и запустит панель.

### Ручная установка

```bash
git clone https://github.com/11kara11/telemt-panel.git
cd telemt-panel
cp .env.example .env
nano .env  # указать SERVER_IP
docker compose build
docker compose up -d
```

---

## Настройка

Файл `.env`:

| Переменная | Описание | По умолчанию |
|---|---|---|
| `SERVER_IP` | Публичный IP сервера (подставляется в ссылки) | определяется автоматически |
| `JWT_SECRET` | Секрет для JWT-токенов | генерируется при установке |
| `PANEL_PORT` | Порт веб-панели | `8080` |

---

## Вход по умолчанию

Логин: `admin`, пароль: `admin`

Смените пароль после первого входа.

---

## Использование

1. Открыть `http://IP:8080`
2. Залогиниться
3. Ввести имя прокси, нажать **+ Create Proxy**
4. Кликнуть по ссылке — она скопируется
5. Отправить ссылку `tg://proxy?...` — открыть в Telegram для подключения

---

## Стек

| Компонент | Технология |
|---|---|
| Backend | Node.js, Express, TypeScript |
| Frontend | HTML / CSS / JS (без фреймворков) |
| БД | SQLite (better-sqlite3) |
| Контейнеры | Docker, Dockerode |
| Прокси | telemt-proxy-v3 |

---

## Структура проекта

```
telemt-panel/
├── src/
│   ├── index.ts        # точка входа Express
│   ├── auth.ts         # авторизация (JWT)
│   ├── db.ts           # SQLite
│   ├── docker.ts       # управление контейнерами
│   ├── proxy.ts        # API прокси (CRUD)
│   ├── secret.ts       # генерация Fake TLS секретов
│   └── domains.ts      # пул доменов
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── app.js
├── docker-compose.yml
├── Dockerfile
├── install.sh
├── .env.example
└── package.json
```

---

## Удаление

```bash
cd /opt/mtproto-panel
docker compose down
docker ps -a --format "{{.Names}}" | grep mtproto-proxy | xargs -r docker rm -f
rm -rf /opt/mtproto-panel
```

---

## Лицензия

MIT

## Дисклеймер

Проект предоставляется как есть, для легального использования. Ответственность за соблюдение законодательства и ToS Telegram лежит на пользователе.
