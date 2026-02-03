"use client";

import { motion } from "framer-motion";
import { useMagnetic } from "@/hooks/useMagnetic";

export default function Magnetic({
  children,
  strength = 10,
  className,
}: {
  children: React.ReactNode;
  strength?: number;
  className?: string;
}) {
  const { ref, x, y, onPointerMove, onPointerLeave } = useMagnetic(strength);

  return (
    <motion.span
      ref={ref}
      className={className ?? "inline-block"}
      style={{ x, y }}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      {children}
    </motion.span>
  );
}
