# Doable Backend — Deployment Instructions

## Prerequisites

- Node.js 20+
- PostgreSQL 15+
- PM2 (`npm install -g pm2`)
- Git

---

## 1. Clone the repository

```bash
git clone https://github.com/RanokRaihan/doable-backend.git
cd doable-backend
```

## 2. Install dependencies

```bash
npm install
```

## 3. Configure environment variables

```bash
cp .env.sample .env.production
nano .env.production
```

Fill in all values:

| Variable | Description |
|---|---|
| `PORT` | Port to listen on (e.g. `8000`) |
| `NODE_ENV` | Set to `production` |
| `APP_URL` | Public API URL |
| `FRONTEND_URL` | Frontend URL (for CORS) |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Strong random secret |
| `JWT_REFRESH_SECRET` | Strong random secret (different from access) |
| `JWT_EXPIRES_IN` | e.g. `1h` |
| `JWT_REFRESH_EXPIRES_IN` | e.g. `7d` |
| `SMTP_HOST` | SMTP server host |
| `SMTP_PORT` | SMTP port |
| `SMTP_SECURE` | `true` for port 465 |
| `SMTP_USER` | SMTP email address |
| `SMTP_PASS` | SMTP password / app password |
| `STORE_ID` | SSLCommerz store ID |
| `STORE_PASSWORD` | SSLCommerz store password |
| `GATEWAY_BASE_URL` | SSLCommerz gateway URL (live) |
| `VALIDATION_API_URL` | SSLCommerz validation URL (live) |
| `COMMISSION_RATE` | Platform commission rate (e.g. `0.15`) |

## 4. Run database migrations

```bash
NODE_ENV=production npx prisma migrate deploy
npx prisma generate
```

## 5. Build

```bash
npm run build
```

## 6. Start with PM2

```bash
pm2 start dist/server.js --name doable-backend --env production
pm2 save
pm2 startup   # follow the printed command to enable auto-start on reboot
```

---

## Useful PM2 commands

```bash
pm2 status                        # check running processes
pm2 logs doable-backend           # stream logs
pm2 restart doable-backend        # restart the app
pm2 stop doable-backend           # stop the app
pm2 delete doable-backend         # remove from PM2
```

---

## Updating a running deployment

```bash
git pull origin main
npm install
npm run build
npx prisma migrate deploy
npx prisma generate
pm2 restart doable-backend
```

---

## Notes

- The app reads env vars from `src/config/index.ts` — ensure `.env.production` is present and `NODE_ENV=production` is set before starting.
- For SSLCommerz live payments, replace the sandbox URLs in `.env.production` with the live gateway and validation URLs.
- Logs are streamed via PM2; use `pm2 logs` or check `~/.pm2/logs/`.
