import { handleFeed } from "@/server/http";
import { CURRENT_USER_ID, getInstance } from "@/server/instance";

export const dynamic = "force-dynamic";

/** GET /api/feed (also served at /feed): profiles the user has not swiped on yet. */
export async function GET() {
  return handleFeed((await getInstance()).service, CURRENT_USER_ID);
}
