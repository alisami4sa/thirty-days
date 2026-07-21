"use client";

import { useCallback, useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";

export function useSuccessBurst() {
  const reduce = useReducedMotion();
  const [burstKey, setBurstKey] = useState(0);

  const fire = useCallback(() => {
    setBurstKey((k) => k + 1);
    if (reduce) return;

    const colors = ["#1f6f5a", "#c45c26", "#1c2b24", "#e8dcc8"];
    confetti({
      particleCount: 48,
      spread: 62,
      startVelocity: 28,
      gravity: 0.9,
      ticks: 140,
      origin: { y: 0.72 },
      colors,
      disableForReducedMotion: true,
    });
  }, [reduce]);

  return { fire, burstKey };
}

export function SuccessBurst({ burstKey }: { burstKey: number }) {
  const reduce = useReducedMotion();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!burstKey) return;
    setVisible(true);
    const t = window.setTimeout(() => setVisible(false), reduce ? 400 : 900);
    return () => window.clearTimeout(t);
  }, [burstKey, reduce]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          aria-hidden
        >
          <motion.div
            className="flex h-24 w-24 items-center justify-center rounded-full bg-[var(--ok)] text-white shadow-lg"
            initial={reduce ? { scale: 1 } : { scale: 0.4, rotate: -20 }}
            animate={reduce ? { scale: 1 } : { scale: 1, rotate: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 22 }}
          >
            <Check className="h-12 w-12" strokeWidth={3} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
