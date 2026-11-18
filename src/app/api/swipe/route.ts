import { handleSwipe } from "@/server/http";
import { CURRENT_USER_ID, getInstance } from "@/server/instance";

export const dynamic = "force-dynamic";

/** POST /api/swipe (also served at /swipe). Body: { profileId, action: "like" | "pass" }. */
export async function POST(request: Request) {
  return handleSwipe((await getInstance()).service, CURRENT_USER_ID, request);
}
