"use client";

import * as React from "react";
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, type HTMLMotionProps, type Variants, AnimatePresence, useMotionValue, useTransform, animate } from "framer-motion";
import { cn } from "@/lib/utils";

export const springGame = { type: "spring" as const, stiffness: 320, damping: 26 };
const springSnappy = { type: "spring" as const, stiffness: 500, damping: 25 };

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { ...springGame, duration: 0.5 } },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.12 },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, x: -12, scale: 0.96 },
  visible: { opacity: 1, x: 0, scale: 1, transition: springGame },
};

export const hudSlideIn: Variants = {
  hidden: { opacity: 0, x: -30, filter: "blur(4px)" },
  visible: { opacity: 1, x: 0, filter: "blur(0px)", transition: { ...springGame, duration: 0.6 } },
};

/* ---------- Page Transition ---------- */

type PageTransitionProps = { children: React.ReactNode; className?: string };

export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      className={cn("min-h-0 w-full", className)}
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* ---------- Stagger Wrappers ---------- */

type StaggerContainerProps = HTMLMotionProps<"div"> & { children: React.ReactNode; className?: string };

export function StaggerContainer({ children, className, ...props }: StaggerContainerProps) {
  return (
    <motion.div className={className} variants={staggerContainer} initial="hidden" animate="visible" {...props}>
      {children}
    </motion.div>
  );
}

type StaggerItemProps = HTMLMotionProps<"div"> & { children: React.ReactNode; className?: string };

export function StaggerItem({ children, className, ...props }: StaggerItemProps) {
  return (
    <motion.div className={className} variants={staggerItem} {...props}>
      {children}
    </motion.div>
  );
}

/* ---------- XP Bar ---------- */

export function XpBar({ value, max, className }: { value: number; max: number; className?: string }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className={cn("relative h-3 w-full overflow-hidden rounded-sm bg-slate-deep border border-slate-border", className)}>
      <motion.div
        className="absolute inset-y-0 left-0 bg-gradient-to-r from-xp to-yellow-300 xp-glow rounded-sm"
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
      />
      <div className="absolute inset-0 flex items-center justify-center font-mono text-[9px] font-bold tracking-wider text-void mix-blend-difference">
        {Math.round(pct)}%
      </div>
    </div>
  );
}

/* ---------- CountUp – animated number counter ---------- */

export function CountUp({
  to,
  duration = 1.2,
  delay = 0,
  className,
}: {
  to: number;
  duration?: number;
  delay?: number;
  className?: string;
}) {
  const motionVal = useMotionValue(0);
  const rounded = useTransform(motionVal, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const controls = animate(motionVal, to, {
      duration,
      delay,
      ease: [0.22, 1, 0.36, 1],
    });
    const unsub = rounded.on("change", (v) => setDisplay(v));
    return () => { controls.stop(); unsub(); };
  }, [to, duration, delay, motionVal, rounded]);

  return <span className={className}>{display}</span>;
}

/* ---------- ParticleBurst – trigger-based explosion ---------- */

export function ParticleBurst({
  trigger,
  count = 10,
  colors = ["bg-neon", "bg-xp", "bg-plasma"],
  radius = 60,
  className,
}: {
  trigger: number;
  count?: number;
  colors?: string[];
  radius?: number;
  className?: string;
}) {
  const [key, setKey] = useState(0);
  const prevTrigger = useRef(trigger);

  useEffect(() => {
    if (trigger !== prevTrigger.current && trigger > 0) {
      setKey((k) => k + 1);
    }
    prevTrigger.current = trigger;
  }, [trigger]);

  if (key === 0) return null;

  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      {Array.from({ length: count }).map((_, i) => {
        const angle = (i / count) * 360;
        const rad = (angle * Math.PI) / 180;
        const dist = radius * (0.6 + ((i * 7 + 3) % 10) * 0.04);
        const color = colors[i % colors.length];
        return (
          <motion.div
            key={`${key}-${i}`}
            className={`absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full ${color}`}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{
              x: Math.cos(rad) * dist,
              y: Math.sin(rad) * dist,
              opacity: 0,
              scale: 0,
            }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            style={{ filter: "drop-shadow(0 0 3px currentColor)" }}
          />
        );
      })}
    </div>
  );
}

/* ---------- SuccessFlash – brief neon flash overlay ---------- */

export function SuccessFlash({ trigger, color = "neon" }: { trigger: number; color?: string }) {
  const [key, setKey] = useState(0);
  const prevTrigger = useRef(trigger);

  useEffect(() => {
    if (trigger !== prevTrigger.current && trigger > 0) setKey((k) => k + 1);
    prevTrigger.current = trigger;
  }, [trigger]);

  const bg = color === "xp" ? "bg-xp/15" : color === "hp" ? "bg-hp/15" : "bg-neon/15";

  return (
    <AnimatePresence>
      {key > 0 && (
        <motion.div
          key={key}
          className={`pointer-events-none absolute inset-0 z-20 ${bg} rounded-sm`}
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        />
      )}
    </AnimatePresence>
  );
}

/* ---------- PowerDown – full-screen shutdown animation ---------- */

export function PowerDown({ active, onComplete }: { active: boolean; onComplete: () => void }) {
  useEffect(() => {
    if (active) {
      const t = setTimeout(onComplete, 1200);
      return () => clearTimeout(t);
    }
  }, [active, onComplete]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-void"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {/* CRT shutdown line */}
          <motion.div
            className="absolute bg-neon/40"
            initial={{ width: "100%", height: "100%", opacity: 0.3 }}
            animate={{ width: "100%", height: "2px", opacity: [0.3, 1, 0.8] }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            style={{ boxShadow: "0 0 30px rgba(0,240,255,0.6)" }}
          />
          <motion.div
            className="absolute bg-neon/30"
            initial={{ width: "100%", height: "2px" }}
            animate={{ width: "0px", height: "2px", opacity: [1, 1, 0] }}
            transition={{ duration: 0.5, delay: 0.6, ease: [0.22, 1, 0.36, 1] }}
            style={{ boxShadow: "0 0 20px rgba(0,240,255,0.4)" }}
          />
          <motion.p
            className="absolute bottom-1/3 font-mono text-[10px] tracking-[0.3em] text-neon/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1, delay: 0.2 }}
          >
            SYSTEM SHUTDOWN
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------- XpPopup – floating +XP number ---------- */

export function XpPopup({ trigger, amount = 15 }: { trigger: number; amount?: number }) {
  const [key, setKey] = useState(0);
  const prevTrigger = useRef(trigger);

  useEffect(() => {
    if (trigger !== prevTrigger.current && trigger > 0) setKey((k) => k + 1);
    prevTrigger.current = trigger;
  }, [trigger]);

  return (
    <AnimatePresence>
      {key > 0 && (
        <motion.span
          key={key}
          className="pointer-events-none absolute -top-2 right-2 z-30 font-mono text-sm font-black tracking-wider text-xp"
          initial={{ opacity: 1, y: 0, scale: 0.5 }}
          animate={{ opacity: 0, y: -35, scale: 1.2 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          style={{ textShadow: "0 0 10px rgba(250,204,21,0.7)" }}
        >
          +{amount} XP
        </motion.span>
      )}
    </AnimatePresence>
  );
}

/* ---------- HoverGlowCard – wrapper with hover energy effect ---------- */

export function HoverGlowCard({
  children,
  className,
  glowColor = "neon",
}: {
  children: React.ReactNode;
  className?: string;
  glowColor?: "neon" | "xp" | "plasma";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [hovering, setHovering] = useState(false);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setMousePos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  }, []);

  const colors = {
    neon: "rgba(0,240,255,0.12)",
    xp: "rgba(250,204,21,0.12)",
    plasma: "rgba(168,85,247,0.12)",
  };

  return (
    <motion.div
      ref={ref}
      className={cn("relative", className)}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      whileHover={{ y: -4, scale: 1.015 }}
      transition={springSnappy}
    >
      {hovering && (
        <div
          className="pointer-events-none absolute inset-0 z-10 rounded-sm transition-opacity duration-300"
          style={{
            background: `radial-gradient(circle 120px at ${mousePos.x}% ${mousePos.y}%, ${colors[glowColor]}, transparent 70%)`,
          }}
        />
      )}
      {children}
    </motion.div>
  );
}
