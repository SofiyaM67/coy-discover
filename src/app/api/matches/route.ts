import { handleMatches } from "@/server/http";
import { CURRENT_USER_ID, getInstance } from "@/server/instance";

export const dynamic = "force-dynamic";

/** GET /api/matches (also served at /matches): the user's mutual matches. */
export async function GET() {
  return handleMatches((await getInstance()).service, CURRENT_USER_ID);
}
