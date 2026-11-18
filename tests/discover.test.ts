import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { openDatabase } from "@/server/db";
import { createDiscoverService } from "@/server/discover";
import { SEED_PROFILES } from "@/server/seed-data";
import { resetDatabase, seedIfEmpty } from "@/server/seed";
import { expectSwipeError, LIKED_ME, ME, NEVER_SWIPED_ME, PASSED_ME, setup } from "./helpers";

const PUBLIC_KEYS = ["age", "bio", "city", "college", "id", "interests", "name", "photoUrl"];
const ids = (list: { id: string }[]) => list.map((p) => p.id);
const matchIds = (list: { profile: { id: string } }[]) => list.map((m) => m.profile.id);

describe("seed data", () => {
  it("has at least 30 profiles with every required field", () => {
    expect(SEED_PROFILES.length).toBeGreaterThanOrEqual(30);
    for (const p of SEED_PROFILES) {
      expect(p.name).toBeTruthy();
      expect(p.age).toBeGreaterThanOrEqual(18);
      expect(p.photoUrl).toMatch(/^https:\/\//);
      expect(p.bio).toBeTruthy();
      expect(p.city || p.college).toBeTruthy();
      expect(p.interests.length).toBeGreaterThan(0);
    }
  });

  it("includes profiles that already liked the user, so a demo can produce matches", () => {
    expect(LIKED_ME.length).toBeGreaterThan(0);
    expect(PASSED_ME.length).toBeGreaterThan(0);
    expect(NEVER_SWIPED_ME.length).toBeGreaterThan(0);
  });

  it("seeding again or resetting does not duplicate anything", async () => {
    const { db, service } = await setup();
    await seedIfEmpty(db);
    await resetDatabase(db);
    await resetDatabase(db);
    expect(await service.getFeed(ME)).toHaveLength(SEED_PROFILES.length);
  });

  it("reset clears swipes, matches and seen state", async () => {
    const { db, service } = await setup();
    await service.swipe(ME, LIKED_ME[0], "like");
    await service.markMatchSeen(ME, LIKED_ME[0]);
    await resetDatabase(db);
    expect(await service.getMatches(ME)).toEqual([]);
    expect(await service.getFeed(ME)).toHaveLength(SEED_PROFILES.length);
    expect((await service.swipe(ME, LIKED_ME[0], "like")).matched).toBe(true);
  });
});

describe("GET feed", () => {
  it("returns every other profile before any swipes, never the user themself", async () => {
    const { service } = await setup();
    const feed = await service.getFeed(ME);
    expect(feed).toHaveLength(SEED_PROFILES.length);
    expect(ids(feed)).not.toContain(ME);
  });

  it("drops a profile once it has been swiped on, whether liked or passed", async () => {
    const { service } = await setup();
    const [a, b] = await service.getFeed(ME);
    await service.swipe(ME, a.id, "like");
    await service.swipe(ME, b.id, "pass");
    const feed = ids(await service.getFeed(ME));
    expect(feed).not.toContain(a.id);
    expect(feed).not.toContain(b.id);
    expect(feed).toHaveLength(SEED_PROFILES.length - 2);
  });

  it("is empty after swiping on everyone", async () => {
    const { service } = await setup();
    for (const p of await service.getFeed(ME)) await service.swipe(ME, p.id, "pass");
    expect(await service.getFeed(ME)).toEqual([]);
  });

  it("exposes only public profile fields", async () => {
    const { service } = await setup();
    for (const p of await service.getFeed(ME)) {
      expect(Object.keys(p).sort()).toEqual(PUBLIC_KEYS);
    }
  });
});

describe("POST swipe", () => {
  it("matches when liking someone who already liked the user", async () => {
    const { service } = await setup();
    const result = await service.swipe(ME, LIKED_ME[0], "like");
    expect(result.matched).toBe(true);
    if (!result.matched) return;
    expect(result.match.profile.id).toBe(LIKED_ME[0]);
    expect(Object.keys(result.match.profile).sort()).toEqual(PUBLIC_KEYS);
  });

  it("does not match when the other person passed or has not swiped", async () => {
    const { service } = await setup();
    expect(await service.swipe(ME, PASSED_ME[0], "like")).toEqual({ matched: false });
    expect(await service.swipe(ME, NEVER_SWIPED_ME[0], "like")).toEqual({ matched: false });
    expect(await service.getMatches(ME)).toEqual([]);
  });

  it("never matches on a pass, even if the other person liked the user", async () => {
    const { service } = await setup();
    expect(await service.swipe(ME, LIKED_ME[0], "pass")).toEqual({ matched: false });
    expect(await service.getMatches(ME)).toEqual([]);
  });

  it("matches later when the other person likes back after the user's like", async () => {
    const { service } = await setup();
    const other = NEVER_SWIPED_ME[0];
    expect(await service.swipe(ME, other, "like")).toEqual({ matched: false });
    expect(await service.getMatches(ME)).toEqual([]);

    expect((await service.swipe(other, ME, "like")).matched).toBe(true);
    expect(matchIds(await service.getMatches(ME))).toEqual([other]);
    expect(matchIds(await service.getMatches(other))).toEqual([ME]);
  });

  it("rejects a second swipe on the same profile and keeps the first decision", async () => {
    const { service } = await setup();
    await service.swipe(ME, LIKED_ME[0], "pass");
    await expectSwipeError(service.swipe(ME, LIKED_ME[0], "like"), "ALREADY_SWIPED");
    expect(await service.getMatches(ME)).toEqual([]);
  });

  it("handles two simultaneous swipes on the same profile: one wins, the other is rejected", async () => {
    const { service } = await setup();
    const results = await Promise.allSettled([
      service.swipe(ME, LIKED_ME[0], "like"),
      service.swipe(ME, LIKED_ME[0], "pass"),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
  });

  it("rejects unknown profiles, self-swipes and bad input", async () => {
    const { service } = await setup();
    await expectSwipeError(service.swipe(ME, "nobody", "like"), "NOT_FOUND");
    await expectSwipeError(service.swipe(ME, ME, "like"), "SELF_SWIPE");
    await expectSwipeError(service.swipe(ME, LIKED_ME[0], "superlike"), "INVALID_INPUT");
    await expectSwipeError(service.swipe(ME, 42, "like"), "INVALID_INPUT");
    await expectSwipeError(service.swipe(ME, "", "like"), "INVALID_INPUT");
    expect(await service.getFeed(ME)).toHaveLength(SEED_PROFILES.length);
  });
});

describe("GET matches", () => {
  it("lists only mutual matches, newest first", async () => {
    const { service } = await setup();
    await service.swipe(ME, LIKED_ME[0], "like");
    await service.swipe(ME, NEVER_SWIPED_ME[0], "like");
    await service.swipe(ME, LIKED_ME[1], "like");
    await service.swipe(ME, LIKED_ME[2], "pass");
    expect(matchIds(await service.getMatches(ME))).toEqual([LIKED_ME[1], LIKED_ME[0]]);
  });
});

describe("seen state for matches", () => {
  it("new matches start unseen and become seen once opened", async () => {
    const { service } = await setup();
    const result = await service.swipe(ME, LIKED_ME[0], "like");
    expect(result.matched && result.match.seen).toBe(false);
    expect((await service.getMatches(ME))[0].seen).toBe(false);

    await service.markMatchSeen(ME, LIKED_ME[0]);
    await service.markMatchSeen(ME, LIKED_ME[0]); // idempotent
    expect((await service.getMatches(ME))[0].seen).toBe(true);
  });

  it("is private to each person in the match", async () => {
    const { service } = await setup();
    await service.swipe(ME, LIKED_ME[0], "like");
    await service.markMatchSeen(ME, LIKED_ME[0]);
    expect((await service.getMatches(LIKED_ME[0]))[0].seen).toBe(false);
  });

  it("can't be used to probe likes: a one-sided liker looks the same as a stranger", async () => {
    const { service } = await setup();
    await expectSwipeError(service.markMatchSeen(ME, LIKED_ME[0]), "NOT_FOUND");
    await expectSwipeError(service.markMatchSeen(ME, NEVER_SWIPED_ME[0]), "NOT_FOUND");
    await expectSwipeError(service.markMatchSeen(ME, "nobody"), "NOT_FOUND");
  });
});

describe("privacy: never reveal who liked the user unless it is mutual", () => {
  // Two worlds that differ only in whether anyone liked the user.
  async function twoWorlds() {
    const liked = await setup();
    const notLiked = await setup();
    await notLiked.db.execute({ sql: "DELETE FROM swipes WHERE target_id = ?", args: [ME] });
    return { liked, notLiked };
  }

  it("the feed is identical, in content and order, whoever has liked the user", async () => {
    const { liked, notLiked } = await twoWorlds();
    expect(JSON.stringify(await liked.service.getFeed(ME))).toBe(JSON.stringify(await notLiked.service.getFeed(ME)));
  });

  it("people who liked the user are not grouped at the top of the feed", async () => {
    const { service } = await setup();
    const firstN = ids(await service.getFeed(ME)).slice(0, LIKED_ME.length);
    expect(firstN.every((id) => LIKED_ME.includes(id))).toBe(false);
  });

  it("a pass returns the same response whether or not the other person liked the user", async () => {
    const { liked, notLiked } = await twoWorlds();
    const target = LIKED_ME[0];
    expect(await liked.service.swipe(ME, target, "pass")).toEqual(await notLiked.service.swipe(ME, target, "pass"));
  });

  it("matches never include one-sided likes in either direction", async () => {
    const { service } = await setup();
    await service.swipe(ME, NEVER_SWIPED_ME[0], "like");
    expect(await service.getMatches(ME)).toEqual([]);
    expect(await service.getMatches(LIKED_ME[0])).toEqual([]);
  });
});

describe("persistence", () => {
  it("keeps swipes, matches and seen state after the database is closed and reopened", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "coy-"));
    const url = `file:${path.join(dir, "test.db")}`;
    try {
      const first = await setup(url);
      await first.service.swipe(ME, LIKED_ME[0], "like");
      await first.service.swipe(ME, NEVER_SWIPED_ME[0], "pass");
      await first.service.markMatchSeen(ME, LIKED_ME[0]);
      first.db.close();

      const db = await openDatabase(url);
      const service = createDiscoverService(db);
      const feed = ids(await service.getFeed(ME));
      expect(feed).not.toContain(LIKED_ME[0]);
      expect(feed).not.toContain(NEVER_SWIPED_ME[0]);
      const matches = await service.getMatches(ME);
      expect(matchIds(matches)).toEqual([LIKED_ME[0]]);
      expect(matches[0].seen).toBe(true);
      db.close();
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
