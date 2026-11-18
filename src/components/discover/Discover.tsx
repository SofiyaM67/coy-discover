"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, type Match, type PublicProfile, type SwipeAction } from "@/lib/api";
import MatchesList from "./MatchesList";
import MatchOverlay from "./MatchOverlay";
import ProfilePhoto from "./ProfilePhoto";
import ProfileSheet from "./ProfileSheet";
import SwipeCard, { type SwipeCardHandle } from "./SwipeCard";

type View = "discover" | "matches";
type Status = "loading" | "ready" | "error";

export default function Discover() {
  const [status, setStatus] = useState<Status>("loading");
  const [deck, setDeck] = useState<PublicProfile[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [view, setView] = useState<View>("discover");
  const [newMatch, setNewMatch] = useState<Match | null>(null);
  const [openProfile, setOpenProfile] = useState<Match | null>(null);
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null);
  const topCard = useRef<SwipeCardHandle>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    try {
      const [profiles, matchList] = await Promise.all([api.feed(), api.matches()]);
      setDeck(profiles);
      setMatches(matchList);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const showToast = useCallback((text: string) => setToast({ id: Date.now(), text }), []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 1600);
    return () => clearTimeout(t);
  }, [toast]);

  const handleSwiped = useCallback(
    async (profile: PublicProfile, action: SwipeAction) => {
      setDeck((d) => d.filter((p) => p.id !== profile.id));
      showToast(action === "like" ? `You liked ${profile.name}` : `Passed on ${profile.name}`);
      try {
        const result = await api.swipe(profile.id, action);
        if (result.matched) {
          setMatches((m) => [result.match, ...m.filter((x) => x.profile.id !== profile.id)]);
          setNewMatch(result.match);
        }
      } catch (err) {
        // Already recorded (e.g. a double submit): the card is gone either way.
        if (err instanceof ApiError && err.code === "ALREADY_SWIPED") return;
        setDeck((d) => [profile, ...d.filter((p) => p.id !== profile.id)]);
        showToast("Couldn't save that swipe. Try again.");
      }
    },
    [showToast],
  );

  const unseenCount = matches.filter((m) => !m.seen).length;

  const openMatch = useCallback((match: Match) => {
    setOpenProfile(match);
    if (match.seen) return;
    const id = match.profile.id;
    setMatches((list) => list.map((m) => (m.profile.id === id ? { ...m, seen: true } : m)));
    // Badge state only: if saving fails, the match shows as new again next load.
    api.markSeen(id).catch(() => {});
  }, []);

  const swipeTop = useCallback((action: SwipeAction) => topCard.current?.swipe(action), []);

  useEffect(() => {
    if (view !== "discover" || newMatch) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") swipeTop("pass");
      if (e.key === "ArrowRight") swipeTop("like");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view, newMatch, swipeTop]);

  async function startOver() {
    await api.reset();
    setView("discover");
    await load();
  }

  const [top, next] = deck;

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between px-5 pb-3 pt-5">
        <h1 className="text-[28px] font-black tracking-tight">Discover</h1>
        <div role="tablist" aria-label="Discover views" className="flex rounded-full bg-soft p-1 text-sm font-semibold">
          {(["discover", "matches"] as const).map((v) => (
            <button
              key={v}
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 transition-colors ${
                view === v ? "bg-ink text-white" : "text-muted hover:text-ink"
              }`}
            >
              {v === "discover" ? "For you" : "Matches"}
              {v === "matches" && unseenCount > 0 && (
                <span
                  aria-label={`${unseenCount} new`}
                  className="min-w-5 rounded-full bg-pink px-1.5 text-center text-xs text-white"
                >
                  {unseenCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        {status === "loading" && (
          <div className="flex h-full flex-col px-4 pb-4">
            <div className="flex-1 animate-pulse rounded-[28px] bg-soft" />
          </div>
        )}

        {status === "error" && (
          <CenterMessage emoji="😵" title="Something went wrong" body="We couldn't load profiles.">
            <button onClick={load} className="chunky chunky-press rounded-full bg-pink px-6 py-3 font-bold text-white">
              Try again
            </button>
          </CenterMessage>
        )}

        {status === "ready" && view === "matches" && (
          <MatchesList matches={matches} onDiscover={() => setView("discover")} onOpen={openMatch} />
        )}

        {status === "ready" && view === "discover" && (
          <div className="flex h-full flex-col">
            {top ? (
              <>
                <div className="relative mx-4 min-h-[380px] flex-1">
                  {next && (
                    <div
                      key={next.id}
                      className="chunky absolute inset-0 scale-[0.95] overflow-hidden rounded-[28px] bg-soft opacity-70"
                      aria-hidden
                    >
                      <ProfilePhoto src={next.photoUrl} name={next.name} sizes="(max-width: 480px) 100vw, 480px" />
                    </div>
                  )}
                  <SwipeCard key={top.id} ref={topCard} profile={top} onSwiped={handleSwiped} />
                </div>
                <div className="flex items-center justify-center gap-8 py-4">
                  <ActionButton
                    label={`Pass on ${top.name}`}
                    onClick={() => swipeTop("pass")}
                    className="bg-white text-pink"
                  >
                    <path d="M7 7l10 10M17 7 7 17" strokeWidth={3} strokeLinecap="round" />
                  </ActionButton>
                  <ActionButton
                    label={`Like ${top.name}`}
                    onClick={() => swipeTop("like")}
                    className="bg-pink text-white"
                    filled
                  >
                    <path d="M12 20s-7-4.4-7-9.6A4 4 0 0 1 12 8a4 4 0 0 1 7 2.4C19 15.6 12 20 12 20Z" />
                  </ActionButton>
                </div>
              </>
            ) : (
              <CenterMessage
                emoji="✨"
                title="You're all caught up"
                body="You've seen everyone for now. New people show up here as they join."
              >
                <button
                  onClick={() => setView("matches")}
                  className="chunky chunky-press rounded-full bg-pink px-6 py-3 font-bold text-white"
                >
                  See your matches{matches.length ? ` (${matches.length})` : ""}
                </button>
                <button
                  onClick={startOver}
                  className="mt-3 text-sm font-semibold text-muted underline underline-offset-4"
                >
                  Reset demo data
                </button>
              </CenterMessage>
            )}
          </div>
        )}

        <AnimatePresence>
          {toast && !newMatch && (
            <motion.div
              key={toast.id}
              role="status"
              className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <span className="rounded-full bg-ink px-4 py-2 text-sm font-semibold text-white shadow-lg">
                {toast.text}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {newMatch && (
          <MatchOverlay
            match={newMatch}
            onKeepSwiping={() => setNewMatch(null)}
            onSeeMatches={() => {
              setNewMatch(null);
              setView("matches");
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {openProfile && <ProfileSheet match={openProfile} onClose={() => setOpenProfile(null)} />}
      </AnimatePresence>
    </div>
  );
}

function ActionButton({
  label,
  onClick,
  className,
  filled,
  children,
}: {
  label: string;
  onClick: () => void;
  className: string;
  filled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`chunky chunky-press flex h-16 w-16 items-center justify-center rounded-full ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-8 w-8"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        aria-hidden
      >
        {children}
      </svg>
    </button>
  );
}

function CenterMessage({
  emoji,
  title,
  body,
  children,
}: {
  emoji: string;
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <div className="text-5xl" aria-hidden>
        {emoji}
      </div>
      <h2 className="mt-4 text-2xl font-extrabold">{title}</h2>
      <p className="mt-2 text-muted">{body}</p>
      <div className="mt-6 flex flex-col items-center">{children}</div>
    </div>
  );
}
