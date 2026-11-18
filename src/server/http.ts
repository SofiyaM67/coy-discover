import type { DiscoverService } from "./discover";
import { isSwipeError, type SwipeErrorCode } from "./types";

const NO_STORE = { "Cache-Control": "no-store" };

const STATUS: Record<SwipeErrorCode, number> = {
  INVALID_INPUT: 400,
  SELF_SWIPE: 400,
  NOT_FOUND: 404,
  ALREADY_SWIPED: 409,
};

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: NO_STORE });
}

function error(code: SwipeErrorCode | "BAD_JSON", message: string, status: number): Response {
  return json({ error: { code, message } }, status);
}

export async function handleFeed(service: DiscoverService, userId: string): Promise<Response> {
  return json({ profiles: await service.getFeed(userId) });
}

export async function handleMatches(service: DiscoverService, userId: string): Promise<Response> {
  return json({ matches: await service.getMatches(userId) });
}

export async function handleMarkSeen(service: DiscoverService, userId: string, otherId: string): Promise<Response> {
  try {
    await service.markMatchSeen(userId, otherId);
    return new Response(null, { status: 204, headers: NO_STORE });
  } catch (err) {
    if (isSwipeError(err)) return error(err.code, err.message, STATUS[err.code]);
    throw err;
  }
}

export async function handleSwipe(service: DiscoverService, userId: string, request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return error("BAD_JSON", "Request body must be JSON.", 400);
  }
  const { profileId, action } = (body ?? {}) as { profileId?: unknown; action?: unknown };

  try {
    return json(await service.swipe(userId, profileId, action));
  } catch (err) {
    if (isSwipeError(err)) return error(err.code, err.message, STATUS[err.code]);
    throw err;
  }
}
