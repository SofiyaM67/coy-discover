import type { InStatement } from "@libsql/client";
import type { DB } from "./db";
import { CURRENT_USER, SEED_PROFILES } from "./seed-data";
import type { PublicProfile } from "./types";

// A fixed timestamp keeps seeded rows deterministic.
const SEEDED_AT = "2026-01-01T00:00:00.000Z";

function insertProfile(p: PublicProfile): InStatement {
  return {
    sql: `INSERT OR IGNORE INTO profiles (id, name, age, photo_url, bio, city, college, interests)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [p.id, p.name, p.age, p.photoUrl, p.bio, p.city, p.college, JSON.stringify(p.interests)],
  };
}

function seedStatements(): InStatement[] {
  const statements = [insertProfile(CURRENT_USER)];
  for (const { swipedMe, ...profile } of SEED_PROFILES) {
    statements.push(insertProfile(profile));
    if (swipedMe) {
      statements.push({
        sql: `INSERT OR IGNORE INTO swipes (swiper_id, target_id, action, created_at) VALUES (?, ?, ?, ?)`,
        args: [profile.id, CURRENT_USER.id, swipedMe, SEEDED_AT],
      });
    }
  }
  return statements;
}

/**
 * Seeds profiles and the swipes those profiles already made on the user.
 * Safe to run more than once, and from several server instances at once.
 */
export async function seedIfEmpty(db: DB): Promise<void> {
  const { rows } = await db.execute("SELECT COUNT(*) AS n FROM profiles");
  if (Number(rows[0].n) > 0) return;
  await db.batch(seedStatements(), "write");
}

/** Clears every swipe and match and re-seeds, atomically. Used by the demo reset. */
export async function resetDatabase(db: DB): Promise<void> {
  await db.batch(
    [
      "DELETE FROM match_views",
      "DELETE FROM matches",
      "DELETE FROM swipes",
      "DELETE FROM profiles",
      ...seedStatements(),
    ],
    "write",
  );
}
