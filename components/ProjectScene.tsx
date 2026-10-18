"use client";

import { useEffect, useRef } from "react";
import { mountScene } from "@/lib/world/vignette-stage";

/** A project's painted scene: a box the engine in lib/world draws into and animates while it is on screen. */
export default function ProjectScene({ slug, label }: { slug: string; label: string }) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => mountScene(box.current, slug), [slug]);

  return <div ref={box} className="scene-cv" role="img" aria-label={label} />;
}
