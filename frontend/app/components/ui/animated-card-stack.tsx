"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { ReactNode } from "react";

// Generic animated stack primitive — ported from the shadcn/21st.dev
// "animate-card-animation" pattern (framer-motion spring transitions,
// front card slides down and out on exit). Content is supplied via
// renderCard, not hardcoded demo cards/images, so any list of real data
// can use this.
export function AnimatedCardStack<T extends { id: string | number }>({
  items,
  renderCard,
  maxVisible = 3,
  cardWidth = 320,
  cardHeight = 96,
}: {
  items: T[];
  renderCard: (item: T, isFront: boolean) => ReactNode;
  maxVisible?: number;
  cardWidth?: number;
  cardHeight?: number;
}) {
  const visible = items.slice(0, maxVisible);

  return (
    <div className="relative" style={{ width: cardWidth, height: cardHeight + (maxVisible - 1) * 10 }}>
      <AnimatePresence initial={false}>
        {visible.map((item, index) => {
          const isFront = index === 0;
          return (
            <motion.div
              key={item.id}
              initial={index === maxVisible - 1 ? { y: -(index + 1) * 10, scale: 1 - (index + 1) * 0.04, opacity: 0 } : false}
              animate={{ y: -index * 10, scale: 1 - index * 0.04, opacity: 1 }}
              exit={isFront ? { y: cardHeight + 60, opacity: 0 } : undefined}
              transition={{ type: "spring", duration: 0.5, bounce: 0.15 }}
              style={{
                zIndex: visible.length - index,
                left: 0,
                right: 0,
                bottom: 0,
                width: cardWidth,
                height: cardHeight,
              }}
              className="absolute rounded-2xl bg-white border border-black/[0.07] will-change-transform"
            >
              {isFront && renderCard(item, isFront)}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
