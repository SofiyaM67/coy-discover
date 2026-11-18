"use client";

import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import type { Match } from "@/lib/api";
import ProfilePhoto from "./ProfilePhoto";

/** Full profile of a mutual match, shown as a bottom sheet. */
export default function ProfileSheet({ match, onClose }: { match: Match; onClose: () => void }) {
  const { profile, matchedAt } = match;
  const closeBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const matchedOn = new Date(matchedAt).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    // Fixed to the viewport, not nested in the page's scroll container. The
    // animated (transformed) layer and the scrolling layer are separate
    // elements, because Safari won't scroll an element while it's transformed.
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-full max-w-[480px]"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 380, damping: 36 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-sheet-title"
          className="max-h-[90dvh] overflow-y-auto overscroll-contain rounded-t-[28px] border-2 border-b-0 border-ink bg-paper [-webkit-overflow-scrolling:touch]"
        >
          <div className="relative aspect-[4/5] max-h-[55vh] w-full bg-soft">
            <ProfilePhoto src={profile.photoUrl} name={profile.name} sizes="(max-width: 480px) 100vw, 480px" />
            <button
              ref={closeBtn}
              onClick={onClose}
              aria-label="Close profile"
              className="chunky chunky-press absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg font-bold"
            >
              ✕
            </button>
            <span className="absolute left-4 top-4 rounded-full bg-pink px-3 py-1 text-xs font-bold text-white">
              ♥ Matched {matchedOn}
            </span>
          </div>

          <div className="px-5 pb-8 pt-5">
            <h2 id="profile-sheet-title" className="text-3xl font-black tracking-tight">
              {profile.name} <span className="font-medium">{profile.age}</span>
            </h2>

            <dl className="mt-3 space-y-1.5 text-[15px]">
              {profile.college && (
                <div className="flex gap-2">
                  <dt aria-label="College">🎓</dt>
                  <dd>{profile.college}</dd>
                </div>
              )}
              <div className="flex gap-2">
                <dt aria-label="City">📍</dt>
                <dd>{profile.city}</dd>
              </div>
            </dl>

            <h3 className="mt-5 text-xs font-bold uppercase tracking-wider text-muted">About</h3>
            <p className="mt-1.5 text-[15px] leading-relaxed">{profile.bio}</p>

            <h3 className="mt-5 text-xs font-bold uppercase tracking-wider text-muted">Interests</h3>
            <ul className="mt-2 flex flex-wrap gap-2">
              {profile.interests.map((interest) => (
                <li
                  key={interest}
                  className="rounded-full border-2 border-ink bg-lilac px-3 py-1 text-sm font-semibold"
                >
                  {interest}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
