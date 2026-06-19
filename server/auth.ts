import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import type { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { eq } from "drizzle-orm";
import { db, pool } from "./db";
import { users } from "../shared/schema";
const scryptAsync = promisify(scrypt);
declare global {
  namespace Express {
    interface User {
      id: string;
      username: string;
      email?: string | null;
    }
  }
}
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${derived.toString("hex")}.${salt}`;
}
async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  if (!hashed || !salt) return false;
  const storedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, storedBuf.length)) as Buffer;
  if (storedBuf.length !== suppliedBuf.length) return false;
  return timingSafeEqual(storedBuf, suppliedBuf);
}
passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);
      if (!user || !(await comparePasswords(password, user.password))) {
        return done(null, false, { message: "Invalid username or password" });
      }
      return done(null, { id: user.id, username: user.username, email: user.email });
    } catch (err) {
      return done(err);
    }
  }),
);
passport.serializeUser((user, done) => {
  done(null, user.id);
});
passport.deserializeUser(async (id: string, done) => {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    if (!user) {
      return done(null, false);
    }
    return done(null, { id: user.id, username: user.username, email: user.email });
  } catch (err) {
    return done(err);
  }
});
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.isAuthenticated()) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  next();
}
function publicUser(user: Express.User) {
  return { id: user.id, username: user.username, email: user.email };
}
export function setupAuth(app: Express): void {
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    throw new Error("SESSION_SECRET environment variable is required but not set");
  }
  const PgSession = connectPgSimple(session);
  app.use(
    session({
      store: new PgSession({
        pool,
        tableName: "session",
        createTableIfMissing: true,
      }),
      secret: sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      },
    }),
  );
  app.use(passport.initialize());
  app.use(passport.session());
  const registerHandler = async (req: Request, res: Response): Promise<void> => {
    try {
      const { username, password, email } = req.body as {
        username?: string;
        password?: string;
        email?: string;
      };
      if (!username || username.trim().length < 3) {
        res.status(400).json({ message: "Username must be at least 3 characters" });
        return;
      }
      if (!password || password.length < 8) {
        res.status(400).json({ message: "Password must be at least 8 characters" });
        return;
      }
      const trimmedUsername = username.trim();
      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.username, trimmedUsername))
        .limit(1);
      if (existing) {
        res.status(409).json({ message: "Username already taken" });
        return;
      }
      const [newUser] = await db
        .insert(users)
        .values({
          username: trimmedUsername,
          password: await hashPassword(password),
          email: email?.trim() || null,
        })
        .returning();
      const userPayload: Express.User = {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
      };
      req.login(userPayload, (err) => {
        if (err) {
          res.status(500).json({ message: "Login after registration failed" });
          return;
        }
        res.status(201).json(publicUser(userPayload));
      });
    } catch (err) {
      console.error("Register error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  };
  const loginHandler = (req: Request, res: Response, next: NextFunction): void => {
    passport.authenticate(
      "local",
      (err: unknown, user: Express.User | false, info: { message?: string } | undefined) => {
        if (err) return next(err);
        if (!user) {
          res.status(401).json({ message: info?.message ?? "Invalid credentials" });
          return;
        }
        req.login(user, (loginErr) => {
          if (loginErr) return next(loginErr);
          res.json(publicUser(user));
        });
      },
    )(req, res, next);
  };
  const logoutHandler = (req: Request, res: Response, next: NextFunction): void => {
    req.logout((err) => {
      if (err) return next(err);
      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          res.status(500).json({ message: "Failed to destroy session" });
          return;
        }
        res.clearCookie("connect.sid");
        res.json({ success: true });
      });
    });
  };
  const meHandler = (req: Request, res: Response): void => {
    res.json(publicUser(req.user!));
  };
  app.post("/api/auth/register", registerHandler);
  app.post("/api/register", registerHandler);
  app.post("/api/auth/login", loginHandler);
  app.post("/api/login", loginHandler);
  app.post("/api/auth/logout", logoutHandler);
  app.post("/api/logout", logoutHandler);
  app.get("/api/auth/me", requireAuth, meHandler);
  app.get("/api/me", requireAuth, meHandler);
}
