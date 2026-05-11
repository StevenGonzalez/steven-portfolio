"use client";

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";

export default function PageTransition({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const pathname = usePathname();
  return (
    <motion.main
      key={pathname}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.main>
  );
}
