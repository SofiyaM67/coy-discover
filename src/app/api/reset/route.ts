import { getInstance } from "@/server/instance";
import { resetDatabase } from "@/server/seed";

export const dynamic = "force-dynamic";

/** POST /api/reset: demo helper that clears swipes and matches and re-seeds. */
export async function POST() {
  await resetDatabase((await getInstance()).db);
  return new Response(null, { status: 204 });
}
