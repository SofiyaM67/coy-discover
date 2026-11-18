"use client";

import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import type { Match } from "@/lib/api";
import ProfilePhoto from "./ProfilePhoto";

export default function MatchOverlay({
  match,
  onKeepSwiping,
  onSeeMatches,
}: {
  match: Match;
  onKeepSwiping: () => void;
  onSeeMatches: () => void;
}) {
  const primary = useRef<HTMLButtonElement>(null);
  const { profile } = match;

  useEffect(() => {
    primary.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onKeepSwiping();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onKeepSwiping]);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="match-title"
      className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-lilac/95 px-6 text-center backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="flex items-center"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 16, delay: 0.05 }}
      >
        <div className="chunky relative h-28 w-28 -rotate-6 overflow-hidden rounded-3xl bg-white">
          <ProfilePhoto src="" name="You" sizes="112px" initialClassName="text-3xl" />
        </div>
        <div className="chunky z-10 -mx-3 flex h-12 w-12 items-center justify-center rounded-full bg-pink text-2xl text-white">
          ♥
        </div>
        <div className="chunky relative h-28 w-28 rotate-6 overflow-hidden rounded-3xl bg-white">
          <ProfilePhoto src={profile.photoUrl} name={profile.name} sizes="112px" initialClassName="text-3xl" />
        </div>
      </motion.div>

      <motion.h2
        id="match-title"
        className="mt-8 text-4xl font-black tracking-tight"
        initial={{ y: 16, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
      >
        It&apos;s a match!
      </motion.h2>
      <p className="mt-2 max-w-xs text-muted">
        You and {profile.name} liked each other. Only the two of you can see this.
      </p>

      <div className="mt-8 flex w-full max-w-xs flex-col gap-3">
        <button
          ref={primary}
          onClick={onSeeMatches}
          className="chunky chunky-press rounded-full bg-pink py-3.5 font-bold text-white"
        >
          See your matches
        </button>
        <button onClick={onKeepSwiping} className="rounded-full py-3 font-semibold text-ink underline-offset-4 hover:underline">
          Keep swiping
        </button>
      </div>
    </motion.div>
  );
}
