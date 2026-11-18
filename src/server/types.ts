export type SwipeAction = "like" | "pass";

/**
 * The only shape of a profile that ever leaves the server.
 * It deliberately has no field describing how this person swiped on anyone.
 */
export interface PublicProfile {
  id: string;
  name: string;
  age: number;
  photoUrl: string;
  bio: string;
  city: string;
  college: string | null;
  interests: string[];
}

export interface Match {
  profile: PublicProfile;
  matchedAt: string;
  /** Whether this user has opened the match yet. Never shown to the other person. */
  seen: boolean;
}

export type SwipeResult = { matched: false } | { matched: true; match: Match };

export type SwipeErrorCode = "INVALID_INPUT" | "NOT_FOUND" | "SELF_SWIPE" | "ALREADY_SWIPED";

const CODES: readonly SwipeErrorCode[] = ["INVALID_INPUT", "NOT_FOUND", "SELF_SWIPE", "ALREADY_SWIPED"];

/** Structural check, so it still works if the class was loaded from another bundle. */
export function isSwipeError(err: unknown): err is SwipeError {
  return (
    err instanceof Error &&
    err.name === "SwipeError" &&
    CODES.includes((err as { code?: unknown }).code as SwipeErrorCode)
  );
}

export class SwipeError extends Error {
  constructor(
    public readonly code: SwipeErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "SwipeError";
  }
}
