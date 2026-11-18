import { handleMarkSeen } from "@/server/http";
import { CURRENT_USER_ID, getInstance } from "@/server/instance";

export const dynamic = "force-dynamic";

/** POST /api/matches/:id/seen: marks a mutual match as opened by the user. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handleMarkSeen((await getInstance()).service, CURRENT_USER_ID, id);
}
