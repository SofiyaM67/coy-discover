import { expect } from "vitest";
import { openDatabase } from "@/server/db";
import { createDiscoverService } from "@/server/discover";
import { seedIfEmpty } from "@/server/seed";
import { CURRENT_USER_ID, SEED_PROFILES } from "@/server/seed-data";
import { SwipeError } from "@/server/types";

export const ME = CURRENT_USER_ID;

/** Seeded profiles grouped by how they already swiped on the logged-in user. */
export const LIKED_ME = SEED_PROFILES.filter((p) => p.swipedMe === "like").map((p) => p.id);
export const PASSED_ME = SEED_PROFILES.filter((p) => p.swipedMe === "pass").map((p) => p.id);
export const NEVER_SWIPED_ME = SEED_PROFILES.filter((p) => !p.swipedMe).map((p) => p.id);

/** A fresh seeded database (in memory by default) with a controllable clock. */
export async function setup(url = ":memory:") {
  const db = await openDatabase(url);
  await seedIfEmpty(db);
  let t = Date.parse("2026-11-18T10:00:00.000Z");
  const clock = () => new Date((t += 1000));
  return { db, service: createDiscoverService(db, clock) };
}

export async function expectSwipeError(promise: Promise<unknown>, code: SwipeError["code"]) {
  const err = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(err, `expected SwipeError ${code}`).toBeInstanceOf(SwipeError);
  expect((err as SwipeError).code).toBe(code);
}
