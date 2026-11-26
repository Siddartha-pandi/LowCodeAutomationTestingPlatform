# Database Migrations — LowCodeAutomationTestingPlatform

## 1. Schema Management Policy

- **Production (`NODE_ENV=production`):** TypeORM `synchronize` is **unconditionally disabled** in `DatabaseModule` and rejected by `env.validation.ts` if `DB_SYNCHRONIZE=true`.
- **Migrations:** Versioned TypeORM migrations live in `backend/src/database/migrations/` and are tracked in `typeorm_migrations`.
- **Data Preservation:** `1732600000000-InitialSchema.ts` uses `CREATE TABLE IF NOT EXISTS` and `CREATE INDEX IF NOT EXISTS`, making it safe to run against both fresh databases and existing databases created during development.

## 2. Migration Commands

Run from `backend/`:

```bash
# Show pending/applied migrations
npm run migration:show

# Apply pending migrations
npm run migration:run

# Revert last migration
npm run migration:revert

# Generate a new migration after entity edits
npm run migration:generate -- src/database/migrations/MigrationName
```

In production containers, run `node ./node_modules/typeorm/cli.js -d dist/database/data-source.js migration:run` during deployment (or set `RUN_MIGRATIONS=true`).
