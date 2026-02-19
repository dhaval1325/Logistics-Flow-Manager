
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

export const pool = connectionString
  ? new Pool({
      connectionString,
      ssl,
    })
  : null;
export const db = pool ? drizzle(pool, { schema }) : null;
