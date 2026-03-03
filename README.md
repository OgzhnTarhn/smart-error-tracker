# Smart Error Tracker

Smart Error Tracker, uygulama hatalarını toplayıp işlemek, gruplayıp görüntülemek ve SDK'lar aracılığıyla farklı ortamlardan ingest etmek için tasarlanmış bir örnek/ürün prototipidir.

## Özet
- Backend: `apps/api` — NestJS + Prisma (Postgres)
- Frontend: `apps/web` — React + Vite
- SDK'lar: `packages/sdk-node`, `packages/sdk-browser`
- Monorepo yönetimi: `pnpm` workspace

Bu repo hem bir öğrenme/prototip projesi hem de portfolyo gösterimi amacıyla üretim-benzeri özellikleri barındırır: SDK'lar, ingest pipeline, deduplication/transport mantığı ve basit UI.

---

## Repo yapısı (kısa)
- `apps/api` — NestJS backend, Prisma schema ve migrationlar, e2e/unit testler
- `apps/web` — React uygulaması (Vite)
- `apps/demo-api`, `apps/demo-web` — küçük demo projeler (örnek entegrasyonlar)
- `packages/sdk-node`, `packages/sdk-browser` — SDK paketleri (tsup ile build ediliyor)
- `infra/docker-compose.yml` — development için Postgres servisi

---

## Hızlı Başlangıç (lokal geliştirme)

1. Kök dizinde bağımlılıkları kurun:

```bash
pnpm install
```

2. Postgres başlatın (infra):

```bash
docker compose -f infra/docker-compose.yml up -d
```

3. API için Prisma hazırlığı:

```bash
cd apps/api
pnpm install
npx prisma generate
# Geliştirme sırasında migrate yerine db push tercih edilebilir:
npx prisma migrate deploy   # production/migrate şemasını uygulamak için
# veya geliştirme için
npx prisma db push
```

4. (Opsiyonel) Seed verisi yükleyin (var ise):

```bash
pnpm exec ts-node -r tsconfig-paths/register scripts/seed.ts
```

5. API'yi geliştirme modunda çalıştırın:

```bash
pnpm --filter api run start:dev
```

6. Web uygulamasını çalıştırın (ayrı terminal):

```bash
pnpm --filter web run dev
```

7. SDK'ları build etmek için:

```bash
pnpm --filter @smart-error-tracker/node run build
pnpm --filter @smart-error-tracker/browser run build
```

8. Testleri çalıştırma (API):

```bash
pnpm --filter api run test
```

---

## SDK Kullanımı — Örnekler

Node (Express) örnek:

```ts
import express from 'express'
import { initTracker } from '@smart-error-tracker/node'

const app = express()
initTracker({ dsn: 'http://localhost:3000/ingest' })
// middleware veya manuel capture kullanımı

app.listen(3001)
```

Browser örnek (basit):

```html
<script type="module">
  import { init } from '@smart-error-tracker/browser'
  init({ dsn: 'https://your-api/ingest' })
  // otomatik hata yakalama ve gönderme
</script>
```

Detaylı API/SDK kullanım örnekleri ve konfigurasyon seçenekleri için `packages/*/README.md` dosyalarını ve `apps/demo-*` dizinlerini kullanın.

---

## Geliştirme Notları & Öneriler
- Kök `README.md` ile birlikte `DEVELOPMENT.md` ekleyip ortam değişkenleri, nasıl migrate/seed yapılacağı daha ayrıntılı yazılmalı.
- CI: GitHub Actions ile `install`, `build`, `test`, `lint` adımlarını ekleyin.
- Observability: basit log formatı, `/metrics` endpoint ve Prometheus/Grafana örneği eklenebilir.
- Güvenlik: `env.example`, dependabot veya Renovate, secret yönetimi.

---

## Deploy önerileri
- Frontend: Vercel / Netlify (Vite destekli)
- Backend: Docker image + küçük host (DigitalOcean App Platform / Heroku / AWS ECS) veya serverless tercihleri
- DB: Managed Postgres (Supabase, RDS) ve migrationları CI ile koordine edin

---

## Roadmap (kısa)
1. README & docs tamamlanması
2. CI ve test coverage badge
3. SDK örnekleri ve demo entegrasyonlar genişletme
4. Dedupe, batching, retry stratejileri ile sağlamlaştırma
5. Observability + production deploy örneği

---

## Katkıda bulunma
1. Fork -> feature branch -> PR
2. Kod tarzı: Prettier + ESLint kuralları repo içinde uygulanmıştır
3. Yeni feature eklerken test ve dokümantasyon ekleyin

Teşekkürler — isterseniz bu `README.md`'yi daha kısa bir versiyonla ana GitHub sayfasında kullanılacak hale getireyim veya aynı anda `.github/workflows/ci.yml` ekleyip CI kurulumunu tamamlayayım.
