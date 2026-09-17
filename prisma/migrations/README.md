# Prisma migrations

Create and apply development migrations against the external PostgreSQL configured by `DATABASE_URL`.

Production uses `bun run db:migrate` and never starts a local database container.
