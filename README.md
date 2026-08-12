# AtosBaby

Foosball league tracker — ELO rankings, match logging, and stats. Next.js +
Neon Postgres.

## Development

```bash
npm install
npm run dev
```

Requires a `.env.local` with `DATABASE_URL` pointing at a Neon Postgres
database (see `src/lib/db.ts`), plus `ADMIN_PASSWORD` and `CRON_SECRET`.

## E2E tests

See [`e2e/README.md`](./e2e/README.md).
