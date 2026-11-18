"use client";

import Image from "next/image";
import { useState } from "react";

const FALLBACK_COLORS = ["#e7e1fb", "#fde4ec", "#d9f5e6", "#fff1c9", "#dcecff"];

function colorFor(seed: string) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return FALLBACK_COLORS[h % FALLBACK_COLORS.length];
}

/** A photo that fills its parent and falls back to an initial when it can't load. */
export default function ProfilePhoto({
  src,
  name,
  sizes,
  priority,
  initialClassName = "text-6xl",
}: {
  src: string;
  name: string;
  sizes: string;
  priority?: boolean;
  initialClassName?: string;
}) {
  const [failed, setFailed] = useState(!src);

  if (failed) {
    return (
      <div
        className={`absolute inset-0 flex items-center justify-center font-bold text-ink/70 ${initialClassName}`}
        style={{ background: colorFor(name) }}
        aria-hidden
      >
        {name.charAt(0)}
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt=""
      fill
      sizes={sizes}
      priority={priority}
      draggable={false}
      onError={() => setFailed(true)}
      className="pointer-events-none select-none object-cover"
    />
  );
}
