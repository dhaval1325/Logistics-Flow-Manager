
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

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

export const pool = connectionString
  ? new Pool({
      ...parseConnection(connectionString),
      ssl,
    })
  : null;
export const db = pool ? drizzle(pool, { schema }) : null;
