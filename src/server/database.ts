import postgres from "postgres";

type DatabaseClient = ReturnType<typeof postgres>;

const globalForDatabase = globalThis as typeof globalThis & {
  pccDatabase?: DatabaseClient;
};

export function getDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required for server persistence.");

  if (!globalForDatabase.pccDatabase) {
    globalForDatabase.pccDatabase = postgres(databaseUrl, {
      max: 5,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
    });
  }

  return globalForDatabase.pccDatabase;
}

export async function closeDatabase() {
  const database = globalForDatabase.pccDatabase;
  if (!database) return;
  globalForDatabase.pccDatabase = undefined;
  await database.end({ timeout: 5 });
}
