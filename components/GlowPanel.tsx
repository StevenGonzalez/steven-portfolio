"use client";

import { motion, useMotionTemplate } from "framer-motion";
import { usePointerGlow } from "@/hooks/usePointerGlow";

export default function GlowPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { ref, glowX, glowY, glowOpacity } = usePointerGlow();

  const glow = useMotionTemplate`radial-gradient(circle 220px at ${glowX}% ${glowY}%, rgb(var(--accent-rgb) / 0.85), transparent 70%)`;

  return (
    <div ref={ref} className={className} style={{ position: "relative" }}>
      {children}
      <motion.span
        aria-hidden
        className="glow-ring pointer-events-none absolute inset-0 rounded-[inherit]"
        style={{ background: glow, opacity: glowOpacity }}
      />
    </div>
  );
}
