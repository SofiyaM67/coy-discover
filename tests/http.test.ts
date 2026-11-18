import { describe, expect, it } from "vitest";
import { handleFeed, handleMarkSeen, handleMatches, handleSwipe } from "@/server/http";
import { LIKED_ME, ME, NEVER_SWIPED_ME, setup } from "./helpers";

function post(body: unknown, raw = false) {
  return new Request("http://test/api/swipe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: raw ? (body as string) : JSON.stringify(body),
  });
}

describe("HTTP handlers", () => {
  it("GET /feed returns profiles and is not cached", async () => {
    const { service } = await setup();
    const res = await handleFeed(service, ME);
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    const body = await res.json();
    expect(Object.keys(body)).toEqual(["profiles"]);
    expect(body.profiles.length).toBeGreaterThanOrEqual(30);
  });

  it("POST /swipe returns { matched: true, match } on a mutual like", async () => {
    const { service } = await setup();
    const res = await handleSwipe(service, ME, post({ profileId: LIKED_ME[0], action: "like" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.matched).toBe(true);
    expect(body.match.profile.id).toBe(LIKED_ME[0]);
  });

  it("POST /swipe returns exactly { matched: false } otherwise", async () => {
    const { service } = await setup();
    for (const [profileId, action] of [
      [NEVER_SWIPED_ME[0], "like"],
      [LIKED_ME[0], "pass"],
    ]) {
      const res = await handleSwipe(service, ME, post({ profileId, action }));
      expect(await res.json()).toEqual({ matched: false });
    }
  });

  it("POST /swipe maps errors to status codes", async () => {
    const { service } = await setup();
    const cases: [Request, number, string][] = [
      [post("{not json", true), 400, "BAD_JSON"],
      [post({ profileId: LIKED_ME[0] }), 400, "INVALID_INPUT"],
      [post({ profileId: ME, action: "like" }), 400, "SELF_SWIPE"],
      [post({ profileId: "nobody", action: "like" }), 404, "NOT_FOUND"],
    ];
    for (const [req, status, code] of cases) {
      const res = await handleSwipe(service, ME, req);
      expect(res.status).toBe(status);
      expect((await res.json()).error.code).toBe(code);
    }

    await handleSwipe(service, ME, post({ profileId: LIKED_ME[1], action: "pass" }));
    const again = await handleSwipe(service, ME, post({ profileId: LIKED_ME[1], action: "like" }));
    expect(again.status).toBe(409);
  });

  it("maps a SwipeError from another bundle's copy of the class (Next bundles routes separately)", async () => {
    const { service } = await setup();
    const foreign = Object.assign(new Error("dup"), { name: "SwipeError", code: "ALREADY_SWIPED" });
    const throwing = {
      ...service,
      swipe: async () => {
        throw foreign;
      },
    };
    const res = await handleSwipe(throwing, ME, post({ profileId: LIKED_ME[0], action: "like" }));
    expect(res.status).toBe(409);
  });

  it("POST /matches/:id/seen returns 204 for a match and 404 for anything else", async () => {
    const { service } = await setup();
    await handleSwipe(service, ME, post({ profileId: LIKED_ME[0], action: "like" }));
    expect((await handleMarkSeen(service, ME, LIKED_ME[0])).status).toBe(204);
    expect((await handleMarkSeen(service, ME, LIKED_ME[1])).status).toBe(404);
    expect((await handleMarkSeen(service, ME, "nobody")).status).toBe(404);
  });

  it("GET /matches returns mutual matches only", async () => {
    const { service } = await setup();
    await handleSwipe(service, ME, post({ profileId: LIKED_ME[0], action: "like" }));
    await handleSwipe(service, ME, post({ profileId: NEVER_SWIPED_ME[0], action: "like" }));
    const body = await (await handleMatches(service, ME)).json();
    expect(body.matches.map((m: { profile: { id: string } }) => m.profile.id)).toEqual([LIKED_ME[0]]);
  });
});
