# Coy · Discover

A swipe-based **Discover** tab for Coy, built as a standalone Next.js app. It has a tab bar with a blank **Home** tab (standing in for Coy's existing experience) and a **Discover** tab with all the functionality.

## Running it

Requires Node 20+.

```bash
npm install
npm run dev        # http://localhost:3000/discover
npm test           # backend tests (Vitest, 31 tests)
npm run db:reset   # wipe swipes and matches and re-seed
```

Locally, a SQLite file is created and seeded automatically on the first request at `data/coy.db`. Set `COY_DB_PATH` to put it elsewhere. The empty state also has a **Reset demo data** button.

## Deploying (Vercel + Turso)

Vercel's disk is temporary, so a SQLite file there would lose swipes between requests. In production the app uses [Turso](https://turso.tech), which is hosted SQLite, through the same libSQL client and the same SQL.

1. Create a Turso database and copy its URL (`libsql://…`) and an auth token.
2. Import this repo in Vercel and add two environment variables: `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` (see `.env.example`).
3. Deploy. The schema and seed data are created on the first request.

Everyone who opens the deployed link shares the same single demo user, as the brief specifies.

**Demo tip:** 9 of the 32 seeded profiles have already liked you, so liking a few people will produce an "It's a match!" screen. Who they are is not shown anywhere in the app.

## What's in it

- **Swipe deck:** one card at a time, with the next card peeking behind it. Drag on touch or with the mouse, use the ✕ / ♥ buttons, or press ← / → on a keyboard. The card shows **LIKE** / **NOPE** stamps as you drag, flies off when you let go past the threshold (or flick it), and a toast confirms each swipe.
- **Match screen:** shown only when a like completes a mutual pair.
- **Matches view:** all mutual matches, newest first. It's under the **Matches** toggle in the Discover header. Tap a match to see their full profile. The badge counts matches you haven't opened yet. Each new match has a "New" tag until you open it, and this is saved on the server, so it survives reloads.
- **Empty, loading and error states.** If a swipe fails to save, the card is put back.
- **Persistence:** swipes and matches live in SQLite, so they survive reloads and server restarts.

## API

All endpoints act as the single logged-in user. The user id is fixed on the server and never read from the request, so a client can't act as someone else. They live under `/api/*` and are also served at the bare paths the brief names.

| Method | Path | Response |
| --- | --- | --- |
| `GET` | `/feed` | `{ profiles: Profile[] }`: profiles the user hasn't swiped on |
| `POST` | `/swipe` | Body `{ profileId, action: "like" \| "pass" }` → `{ matched: false }` or `{ matched: true, match }` |
| `GET` | `/matches` | `{ matches: { profile, matchedAt, seen }[] }`: mutual matches only, newest first |
| `POST` | `/api/matches/:id/seen` | Marks a match as opened (drives the "new matches" badge). `404` for anything that isn't a mutual match |
| `POST` | `/api/reset` | Demo helper: clears swipes and matches and re-seeds |

`POST /swipe` errors: `400` for bad JSON, bad input or swiping on yourself; `404` for an unknown profile; `409` for a profile already swiped on (the first decision stands). All responses are `Cache-Control: no-store`.

## Privacy: never reveal who liked you unless it's mutual

This is Coy's core promise, so the backend is designed so the API can't leak it, not just the UI:

1. **No swipe data on profiles.** Profiles are mapped to a public shape field by field and never spread from a database row. If a column is added to the table later, it doesn't leak by default.
2. **The feed order doesn't depend on swipes.** The order is a hash of (viewer, profile id). If people who liked you were sorted first, or filtered differently, the order alone would give them away. A test checks that the feed is byte-for-byte identical whether or not anyone has liked you.
3. **Every response that isn't a match looks the same.** A pass, and a like that isn't mutual yet, both return exactly `{ matched: false }`. So passing on someone who liked you looks the same as passing on someone who didn't. This is tested.
4. **Matches are stored only when they're mutual**, and `/matches` reads only from that table. A one-sided like never appears in either person's matches.
5. **"Seen" can't be used to probe either.** Marking a profile as seen only works for a mutual match. A one-sided liker gets the same `404` as an unknown id. Seen state is private: the other person never learns that you opened their profile.
6. **No undo.** "Like → no match → undo" would let someone probe whether a person had liked them.
7. **The first swipe is final.** A unique key on `(swiper, target)` blocks a second swipe, including under concurrent requests, and each swipe and its match check run in one transaction.

What is still inherent to any mutual-match app: if you like someone and get no match, you learn they haven't liked you *yet*. That's the same trade-off Coy itself makes.

## Project structure

```
src/
  server/            backend logic, independent of Next.js
    db.ts            SQLite schema (profiles, swipes, matches)
    discover.ts      getFeed / swipe / getMatches
    http.ts          request → response handlers, error → status mapping
    seed-data.ts     32 mock profiles; 9 have liked the user, 4 have passed
    instance.ts      shared connection (Turso if configured, else local file)
  app/api/*/route.ts thin Next.js routes that call the handlers
  app/discover/      Discover page
  components/        TabBar, SwipeCard, MatchOverlay, MatchesList
tests/               service, privacy, persistence and HTTP tests
```

The backend logic is plain TypeScript working on a SQLite handle, so the tests run it against an in-memory database with no server needed.

## Notes and trade-offs

- **SQLite (via libSQL)** was chosen over a JSON file for atomic writes and unique constraints, which handle double swipes and races without any custom locking. Each swipe is one atomic batch: record the swipe, create the match only if the other person already liked back, and read it. The same code runs on a local file and on Turso.
- **Photos** are placeholder portraits from randomuser.me. If one fails to load, the card falls back to the person's initial.
- The single user is hardcoded (`"me"`), as the brief allows. To support real users, the user id would come from the session instead, and nothing else in the service would change.
