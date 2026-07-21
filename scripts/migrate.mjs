import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required to run migrations.");

const migrationsDirectory = path.join(process.cwd(), "db", "migrations");
const sql = postgres(databaseUrl, {
  max: 1,
  connect_timeout: 15,
  idle_timeout: 5,
  prepare: false,
});

try {
  await sql`
    create table if not exists schema_migrations (
      id text primary key,
      applied_at timestamptz not null default now()
    )
  `;

  const migrationFiles = (await readdir(migrationsDirectory))
    .filter((filename) => filename.endsWith(".sql"))
    .sort();

  for (const filename of migrationFiles) {
    const [existing] = await sql`
      select id
      from schema_migrations
      where id = ${filename}
    `;
    if (existing) continue;

    const migration = await readFile(path.join(migrationsDirectory, filename), "utf8");
    await sql.begin(async (transaction) => {
      await transaction.unsafe(migration);
      await transaction`
        insert into schema_migrations (id)
        values (${filename})
      `;
    });

    console.log(`Applied migration ${filename}`);
  }
} finally {
  await sql.end({ timeout: 5 });
}
