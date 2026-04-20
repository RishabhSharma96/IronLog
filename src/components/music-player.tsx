"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Music } from "lucide-react";

export function MusicPlayer() {
  const pathname = usePathname();
  if (pathname === "/music") return null;

  return (
    <Link href="/music" className="fixed bottom-4 right-4 z-50">
      <motion.div
        className="group relative flex h-12 w-12 items-center justify-center rounded-full border border-neon/30 bg-slate-deep/90 shadow-lg backdrop-blur-sm"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.15, boxShadow: "0 0 25px rgba(0,240,255,0.35)" }}
        whileTap={{ scale: 0.9 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        <Music className="h-5 w-5 text-neon/70 transition-colors group-hover:text-neon" />
        <motion.span
          className="absolute inset-0 rounded-full border border-neon/15"
          animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
        />
      </motion.div>
    </Link>
  );
}
