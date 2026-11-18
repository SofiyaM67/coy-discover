"use client";

import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { forwardRef, useImperativeHandle, useRef } from "react";
import type { PublicProfile, SwipeAction } from "@/lib/api";
import ProfilePhoto from "./ProfilePhoto";

export interface SwipeCardHandle {
  swipe: (action: SwipeAction) => void;
}

const DISTANCE_THRESHOLD = 110; // px of drag that counts as a decision
const VELOCITY_THRESHOLD = 650; // px/s flick that counts as a decision
const FLY_OUT = 640;

interface Props {
  profile: PublicProfile;
  /** Called once the card has fully left the screen. */
  onSwiped: (profile: PublicProfile, action: SwipeAction) => void;
}

const SwipeCard = forwardRef<SwipeCardHandle, Props>(function SwipeCard({ profile, onSwiped }, ref) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-300, 0, 300], [-16, 0, 16]);
  const likeOpacity = useTransform(x, [24, DISTANCE_THRESHOLD], [0, 1]);
  const passOpacity = useTransform(x, [-DISTANCE_THRESHOLD, -24], [1, 0]);
  const leaving = useRef(false);

  async function flyOut(action: SwipeAction) {
    if (leaving.current) return;
    leaving.current = true;
    navigator.vibrate?.(12);
    await Promise.all([
      animate(x, action === "like" ? FLY_OUT : -FLY_OUT, { duration: 0.32, ease: [0.4, 0, 0.6, 1] }),
      animate(y, y.get() + 40, { duration: 0.32 }),
    ]);
    onSwiped(profile, action);
  }

  useImperativeHandle(ref, () => ({ swipe: flyOut }));

  const place = profile.college ? `${profile.college} · ${profile.city}` : profile.city;

  return (
    <motion.article
      aria-label={`${profile.name}, ${profile.age}, ${place}`}
      className="chunky absolute inset-0 cursor-grab touch-none overflow-hidden rounded-[28px] bg-soft active:cursor-grabbing"
      style={{ x, y, rotate }}
      drag
      dragElastic={0.9}
      dragMomentum={false}
      onDragEnd={(_, info) => {
        const { offset, velocity } = info;
        if (offset.x > DISTANCE_THRESHOLD || velocity.x > VELOCITY_THRESHOLD) return flyOut("like");
        if (offset.x < -DISTANCE_THRESHOLD || velocity.x < -VELOCITY_THRESHOLD) return flyOut("pass");
        animate(x, 0, { type: "spring", stiffness: 500, damping: 32 });
        animate(y, 0, { type: "spring", stiffness: 500, damping: 32 });
      }}
      initial={{ scale: 0.95, opacity: 0.6 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <ProfilePhoto src={profile.photoUrl} name={profile.name} sizes="(max-width: 480px) 100vw, 480px" priority />

      <motion.div
        style={{ opacity: likeOpacity }}
        className="pointer-events-none absolute left-5 top-6 -rotate-12 rounded-xl border-4 border-[#2fbf71] bg-white/85 px-3 py-1 text-3xl font-black tracking-wider text-[#2fbf71]"
        aria-hidden
      >
        LIKE
      </motion.div>
      <motion.div
        style={{ opacity: passOpacity }}
        className="pointer-events-none absolute right-5 top-6 rotate-12 rounded-xl border-4 border-pink bg-white/85 px-3 py-1 text-3xl font-black tracking-wider text-pink"
        aria-hidden
      >
        NOPE
      </motion.div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-5 pb-5 pt-24 text-white">
        <h2 className="text-3xl font-extrabold tracking-tight">
          {profile.name} <span className="font-medium">{profile.age}</span>
        </h2>
        <p className="mt-0.5 flex items-center gap-1 text-sm text-white/85">
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="currentColor" aria-hidden>
            <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z" />
          </svg>
          {place}
        </p>
        <p className="mt-2 line-clamp-2 text-[15px] leading-snug">{profile.bio}</p>
        <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Interests">
          {profile.interests.map((interest) => (
            <li key={interest} className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold backdrop-blur">
              {interest}
            </li>
          ))}
        </ul>
      </div>
    </motion.article>
  );
});

export default SwipeCard;
