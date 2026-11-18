import { createClient, type Client } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";

export type DB = Client;

const SCHEMA = `
CREATE TABLE IF NOT EXISTS profiles (
  id         TEXT PRIMARY KEY,
  name       TEXT    NOT NULL,
  age        INTEGER NOT NULL,
  photo_url  TEXT    NOT NULL,
  bio        TEXT    NOT NULL,
  city       TEXT    NOT NULL,
  college    TEXT,
  interests  TEXT    NOT NULL -- JSON array of strings
);

-- One row per (swiper, target). The primary key makes a second swipe on
-- the same person impossible, even under concurrent requests.
CREATE TABLE IF NOT EXISTS swipes (
  swiper_id  TEXT NOT NULL REFERENCES profiles(id),
  target_id  TEXT NOT NULL REFERENCES profiles(id),
  action     TEXT NOT NULL CHECK (action IN ('like', 'pass')),
  created_at TEXT NOT NULL,
  PRIMARY KEY (swiper_id, target_id),
  CHECK (swiper_id <> target_id)
);

-- A match is stored once per pair, with user_a < user_b.
CREATE TABLE IF NOT EXISTS matches (
  user_a     TEXT NOT NULL REFERENCES profiles(id),
  user_b     TEXT NOT NULL REFERENCES profiles(id),
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_a, user_b),
  CHECK (user_a < user_b)
);

-- When a user first opened a match's profile. Private to that user; drives
-- the "new matches" badge.
CREATE TABLE IF NOT EXISTS match_views (
  user_id    TEXT NOT NULL REFERENCES profiles(id),
  other_id   TEXT NOT NULL REFERENCES profiles(id),
  seen_at    TEXT NOT NULL,
  PRIMARY KEY (user_id, other_id)
);

CREATE INDEX IF NOT EXISTS swipes_by_target ON swipes(target_id, swiper_id);
`;

/** Creates any missing tables. Idempotent. */
export async function ensureSchema(db: DB): Promise<void> {
  await db.executeMultiple(SCHEMA);
}

/**
 * Connects to a database. `url` is a libSQL URL: `file:path/to.db` locally,
 * `:memory:` in tests, or `libsql://…` for a hosted Turso database.
 */
export async function openDatabase(url: string, authToken?: string): Promise<DB> {
  if (url.startsWith("file:")) {
    fs.mkdirSync(path.dirname(url.slice("file:".length)), { recursive: true });
  }
  const db = createClient({ url, authToken });
  await ensureSchema(db);
  return db;
}
