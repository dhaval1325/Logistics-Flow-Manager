import "dotenv/config";
import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

const connectionString = process.env.DATABASE_URL;
const sslRequired =
  process.env.PG_SSL === "true" ||
  (connectionString ? connectionString.includes("sslmode=require") : false);
const sslInsecure = process.env.PG_SSL_INSECURE === "true";
const ssl = sslRequired ? { rejectUnauthorized: !sslInsecure } : undefined;

if (sslInsecure) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

function parseConnection(url: string) {
  const parsed = new URL(url);
  const database = parsed.pathname.replace("/", "");
  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 5432,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database,
  };
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    ...parseConnection(connectionString),
    ssl,
  },
});
