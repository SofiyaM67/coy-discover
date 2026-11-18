import { createHash } from "node:crypto";
import type { Row } from "@libsql/client";
import type { DB } from "./db";
import { type Match, type PublicProfile, SwipeError, type SwipeAction, type SwipeResult } from "./types";

/**
 * Maps a row to the public shape field by field. Never spread a row into a
 * response: anything added to the table later would leak by default.
 */
function toPublic(row: Row): PublicProfile {
  return {
    id: String(row.id),
    name: String(row.name),
    age: Number(row.age),
    photoUrl: String(row.photo_url),
    bio: String(row.bio),
    city: String(row.city),
    college: row.college == null ? null : String(row.college),
    interests: JSON.parse(String(row.interests)) as string[],
  };
}

/**
 * Feed order depends only on the viewer and the profile id. It must not
 * depend on swipes, or people who liked you would bunch up at the top and
 * the order itself would reveal them.
 */
function feedRank(viewerId: string, profileId: string): string {
  return createHash("sha256").update(`${viewerId}:${profileId}`).digest("hex");
}

const isAction = (a: unknown): a is SwipeAction => a === "like" || a === "pass";

const isConstraintError = (err: unknown) =>
  String((err as { code?: unknown })?.code ?? "").startsWith("SQLITE_CONSTRAINT");

/** Orders a pair the way the matches table stores it (user_a < user_b). */
const pair = (x: string, y: string): [string, string] => (x < y ? [x, y] : [y, x]);

export function createDiscoverService(db: DB, now: () => Date = () => new Date()) {
  /** Profiles the user has not swiped on yet, excluding themself. */
  async function getFeed(userId: string): Promise<PublicProfile[]> {
    const { rows } = await db.execute({
      sql: `SELECT p.* FROM profiles p
            WHERE p.id <> ?
              AND NOT EXISTS (SELECT 1 FROM swipes s WHERE s.swiper_id = ? AND s.target_id = p.id)`,
      args: [userId, userId],
    });
    return rows
      .map((row) => ({ row, rank: feedRank(userId, String(row.id)) }))
      .sort((a, b) => (a.rank < b.rank ? -1 : a.rank > b.rank ? 1 : 0))
      .map(({ row }) => toPublic(row));
  }

  /**
   * Records a like or pass. Returns a match only when this like completes a
   * mutual pair. A pass, and a like that is not (yet) mutual, return exactly
   * `{ matched: false }`, so the response never says whether the other person
   * liked the user.
   */
  async function swipe(userId: string, targetId: unknown, action: unknown): Promise<SwipeResult> {
    if (typeof targetId !== "string" || targetId.length === 0 || !isAction(action)) {
      throw new SwipeError("INVALID_INPUT", "Expected a profileId and an action of 'like' or 'pass'.");
    }
    if (targetId === userId) {
      throw new SwipeError("SELF_SWIPE", "You can't swipe on yourself.");
    }

    const target = (await db.execute({ sql: "SELECT * FROM profiles WHERE id = ?", args: [targetId] })).rows[0];
    if (!target) throw new SwipeError("NOT_FOUND", "That profile doesn't exist.");

    const at = now().toISOString();
    const [a, b] = pair(userId, targetId);

    // One atomic batch: record the swipe, create the match only if this is a
    // like and the other person already liked back, then read the match.
    // If the swipe already exists, the whole batch rolls back.
    let results;
    try {
      results = await db.batch(
        [
          {
            sql: `INSERT INTO swipes (swiper_id, target_id, action, created_at) VALUES (?, ?, ?, ?)`,
            args: [userId, targetId, action, at],
          },
          {
            sql: `INSERT OR IGNORE INTO matches (user_a, user_b, created_at)
                  SELECT ?, ?, ?
                  WHERE ? = 'like'
                    AND EXISTS (SELECT 1 FROM swipes WHERE swiper_id = ? AND target_id = ? AND action = 'like')`,
            args: [a, b, at, action, targetId, userId],
          },
          { sql: `SELECT created_at FROM matches WHERE user_a = ? AND user_b = ?`, args: [a, b] },
        ],
        "write",
      );
    } catch (err) {
      if (isConstraintError(err)) throw new SwipeError("ALREADY_SWIPED", "You've already swiped on this profile.");
      throw err;
    }

    const matchRow = results[2].rows[0];
    if (action !== "like" || !matchRow) return { matched: false };
    return {
      matched: true,
      match: { profile: toPublic(target), matchedAt: String(matchRow.created_at), seen: false },
    };
  }

  /** Mutual matches only, newest first. */
  async function getMatches(userId: string): Promise<Match[]> {
    const { rows } = await db.execute({
      sql: `SELECT p.*, m.created_at AS matched_at, (v.user_id IS NOT NULL) AS seen
            FROM matches m
            JOIN profiles p ON p.id = CASE WHEN m.user_a = ? THEN m.user_b ELSE m.user_a END
            LEFT JOIN match_views v ON v.user_id = ? AND v.other_id = p.id
            WHERE m.user_a = ? OR m.user_b = ?
            ORDER BY m.created_at DESC, p.id ASC`,
      args: [userId, userId, userId, userId],
    });
    return rows.map((row) => ({
      profile: toPublic(row),
      matchedAt: String(row.matched_at),
      seen: Number(row.seen) === 1,
    }));
  }

  /**
   * Marks a match as opened. Anything that isn't a mutual match, including
   * someone who liked the user one-sidedly, gets the same NOT_FOUND as an
   * unknown id, so this endpoint can't be used to probe for likes.
   */
  async function markMatchSeen(userId: string, otherId: unknown): Promise<void> {
    if (typeof otherId !== "string" || otherId.length === 0) {
      throw new SwipeError("INVALID_INPUT", "Expected a profile id.");
    }
    const [a, b] = pair(userId, otherId);
    const { rowsAffected } = await db.execute({
      sql: `INSERT OR IGNORE INTO match_views (user_id, other_id, seen_at)
            SELECT ?, ?, ? WHERE EXISTS (SELECT 1 FROM matches WHERE user_a = ? AND user_b = ?)`,
      args: [userId, otherId, now().toISOString(), a, b],
    });
    if (rowsAffected === 0) {
      const exists = await db.execute({ sql: "SELECT 1 FROM matches WHERE user_a = ? AND user_b = ?", args: [a, b] });
      if (exists.rows.length === 0) throw new SwipeError("NOT_FOUND", "No match with that profile.");
    }
  }

  return { getFeed, swipe, getMatches, markMatchSeen };
}

export type DiscoverService = ReturnType<typeof createDiscoverService>;
