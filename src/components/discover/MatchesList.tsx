"use client";

import type { Match } from "@/lib/api";
import ProfilePhoto from "./ProfilePhoto";

function timeAgo(iso: string, now = Date.now()) {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export default function MatchesList({
  matches,
  onDiscover,
  onOpen,
}: {
  matches: Match[];
  onDiscover: () => void;
  onOpen: (match: Match) => void;
}) {
  if (matches.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-8 text-center">
        <div className="text-5xl" aria-hidden>
          🤫
        </div>
        <h2 className="mt-4 text-2xl font-extrabold">No matches yet</h2>
        <p className="mt-2 text-muted">
          When someone you like likes you back, they show up here. Nobody sees your likes unless it&apos;s mutual.
        </p>
        <button
          onClick={onDiscover}
          className="chunky chunky-press mt-6 rounded-full bg-pink px-6 py-3 font-bold text-white"
        >
          Start swiping
        </button>
      </div>
    );
  }

  return (
    <ul className="grid grid-cols-2 gap-4 overflow-y-auto px-4 pb-6 pt-1" aria-label="Your matches">
      {matches.map((match) => {
        const { profile, matchedAt } = match;
        // Unseen matches get a "New" tag, and the name is announced as new.
        return (
          <li key={profile.id} className="chunky overflow-hidden rounded-2xl bg-white">
            <button
              onClick={() => onOpen(match)}
              aria-label={`View ${profile.name}'s profile${match.seen ? "" : " (new match)"}`}
              className="block w-full text-left transition-transform active:scale-[0.98]"
            >
              <div className="relative aspect-[4/5] bg-soft">
                <ProfilePhoto
                  src={profile.photoUrl}
                  name={profile.name}
                  sizes="(max-width: 480px) 50vw, 220px"
                  initialClassName="text-4xl"
                />
                {match.seen ? (
                  <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-ink">
                    {timeAgo(matchedAt)}
                  </span>
                ) : (
                  <span className="absolute left-2 top-2 rounded-full bg-pink px-2 py-0.5 text-[11px] font-bold text-white">
                    New
                  </span>
                )}
              </div>
              <div className="px-3 py-2.5">
                <p className="font-bold leading-tight">
                  {profile.name}, {profile.age}
                </p>
                <p className="truncate text-xs text-muted">{profile.college ?? profile.city}</p>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
