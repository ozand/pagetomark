# YouTube Transcript Worker Setup

## Шаги для развертывания

1. **Создайте отдельный Worker в Cloudflare:**
   ```bash
   cd workers
   npx wrangler deploy youtube-proxy.js
   ```

2. **Получите URL вашего Worker** (например: `https://youtube-transcript-proxy.your-account.workers.dev`)

3. **Создайте файл `.env` в корне проекта:**
   ```
   VITE_YOUTUBE_PROXY_URL=https://youtube-transcript-proxy.your-account.workers.dev
   ```

4. **Перезапустите dev сервер:**
   ```bash
   npm run dev
   ```

## Альтернатива: Использование существующего публичного прокси

Если вы не хотите создавать свой Worker, можете использовать существующий публичный прокси для YouTube транскриптов. В файле [services/youtube.ts](../services/youtube.ts) измените:

```typescript
const workerUrl = 'https://your-public-proxy.com/api/youtube-transcript';
```

## Почему нужен Worker?

YouTube блокирует CORS запросы из браузера. Worker обходит эту проблему, действуя как серверный прокси, который:
- Получает доступ к YouTube API без CORS ограничений
- Извлекает caption tracks из HTML страницы видео
- Возвращает данные с правильными CORS заголовками для браузера
