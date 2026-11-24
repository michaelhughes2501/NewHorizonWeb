// Applies neon/migrations/*.sql in name order, once each, to DATABASE_URL_UNPOOLED
// (or DATABASE_URL). Applied names are kept in public.app_migrations.
//   node --env-file=.env.server scripts/migrate-neon.mjs [--dry-run]
import { readdir, readFile } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'neon', 'migrations')
const dryRun = process.argv.includes('--dry-run')
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL
if (!url) {
  console.error('Set DATABASE_URL_UNPOOLED (or DATABASE_URL) first.')
  process.exit(1)
}

const client = new pg.Client({ connectionString: url })
await client.connect()
try {
  await client.query(`create table if not exists public.app_migrations (
    name text primary key, applied_at timestamptz not null default now())`)
  const { rows } = await client.query('select name from public.app_migrations')
  const done = new Set(rows.map((r) => r.name))
  const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort()
  for (const file of files) {
    if (done.has(file)) {
      console.log(`skip  ${file}`)
      continue
    }
    console.log(`${dryRun ? 'would apply' : 'apply'} ${file}`)
    if (dryRun) continue
    // Each migration file manages its own BEGIN/COMMIT.
    await client.query(await readFile(join(dir, file), 'utf8'))
    await client.query('insert into public.app_migrations (name) values ($1) on conflict do nothing', [file])
  }
} finally {
  await client.end()
}
