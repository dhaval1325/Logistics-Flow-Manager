import type { Express, RequestHandler } from "express";
import session from "express-session";
import memorystore from "memorystore";
import connectPgSimple from "connect-pg-simple";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import crypto from "crypto";
import { storage } from "./storage";
import { pool } from "./db";
import type { User } from "@shared/schema";

const MemoryStore = memorystore(session);
const PgSession = connectPgSimple(session);

const SESSION_SECRET = process.env.SESSION_SECRET || "dev-session-secret";
const PASSWORD_KEY_LENGTH = 64;

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, PASSWORD_KEY_LENGTH).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string) {
  const [salt, storedHash] = stored.split(":");
  if (!salt || !storedHash) {
    return false;
  }

  const hashed = crypto.scryptSync(password, salt, PASSWORD_KEY_LENGTH);
  const storedBuffer = Buffer.from(storedHash, "hex");
  if (hashed.length !== storedBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(hashed, storedBuffer);
}

export function sanitizeUser(user: User) {
  return { id: user.id, username: user.username, role: user.role };
}

export const requireAuth: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
};

export function setupAuth(app: Express) {
  if (!process.env.SESSION_SECRET) {
    console.warn("SESSION_SECRET is not set. Using a default development secret.");
  }

  const store = pool
    ? new PgSession({
        pool,
        createTableIfMissing: true,
      })
    : new MemoryStore({
        checkPeriod: 24 * 60 * 60 * 1000,
      });

  app.use(
    session({
      secret: SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      proxy: true,
      store,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      },
    }),
  );

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Invalid username or password" });
        }
        if (!verifyPassword(password, user.password)) {
          return done(null, false, { message: "Invalid username or password" });
        }
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    done(null, (user as User).id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUserById(Number(id));
      done(null, user || null);
    } catch (error) {
      done(error);
    }
  });
}
