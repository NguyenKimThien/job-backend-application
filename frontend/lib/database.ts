import { Pool } from "pg";

declare global {
  var postgresPool: Pool | undefined;
}

function createPool() {
  if (!process.env.DATABASE_URL) {
    throw new Error("Chưa cấu hình DATABASE_URL trong file .env.local");
  }

  return new Pool({
    connectionString: process.env.DATABASE_URL,
  });
}

export function getDatabase() {
  const pool = global.postgresPool ?? createPool();
  if (process.env.NODE_ENV !== "production") {
    global.postgresPool = pool;
  }
  return pool;
}
