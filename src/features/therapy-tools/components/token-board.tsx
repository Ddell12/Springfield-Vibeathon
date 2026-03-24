"use client";

import { AnimatePresence, motion } from "motion/react";
import { useLayoutEffect } from "react";

import { MaterialIcon } from "@/shared/components/material-icon";

import { useTokenBoardStore } from "../stores/token-board-store";
import type { TokenBoardConfig } from "../types/tool-configs";

export function TokenBoard({ config }: { config: TokenBoardConfig }) {
  const { earnedTokens, earnToken, reset, init } = useTokenBoardStore();

  // useLayoutEffect runs synchronously after DOM mutations — ensures store is
  // initialized before any test assertions or clicks happen.
  useLayoutEffect(() => {
    init(config.totalTokens, config.earnedTokens);
  }, [config.totalTokens, config.earnedTokens, init]);

  const earned = earnedTokens;
  const remaining = config.totalTokens - earned;
  const percentage = Math.round((earned / config.totalTokens) * 100);
  const allEarned = earned >= config.totalTokens;

  return (
    <div className="space-y-10">
      {/* Hero Header */}
      <section className="text-center space-y-4">
        <h1 className="font-headline text-3xl md:text-4xl font-bold text-primary">
          {config.title}
        </h1>
        <div className="inline-flex items-center gap-2 bg-secondary-container text-on-secondary-container px-4 py-1.5 rounded-full text-sm font-medium">
          <MaterialIcon icon={config.reinforcers[0]?.icon ?? "redeem"} size="sm" />
          <span>
            Earn {config.totalTokens} stars to get:{" "}
            {config.reinforcers[0]?.label ?? "a reward"}
          </span>
        </div>
      </section>

      {/* Star Slots Grid */}
      <section className="bg-surface-container-lowest p-10 rounded-[2rem] sanctuary-shadow flex flex-wrap justify-center gap-4 md:gap-6">
        {Array.from({ length: config.totalTokens }, (_, i) => {
          const isFilled = i < earned;
          return (
            <motion.div
              key={i}
              animate={isFilled ? { scale: [1, 1.15, 1] } : {}}
              transition={{ duration: 0.3 }}
              className={
                isFilled
                  ? "w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary-fixed flex items-center justify-center transition-transform hover:scale-105"
                  : "w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-dashed border-outline-variant bg-surface-container-low flex items-center justify-center opacity-60"
              }
            >
              <MaterialIcon
                icon={isFilled ? "stars" : "grade"}
                filled={isFilled}
                className={
                  isFilled
                    ? "text-primary text-4xl md:text-5xl"
                    : "text-outline-variant text-4xl md:text-5xl"
                }
              />
            </motion.div>
          );
        })}
      </section>

      {/* Progress Section */}
      <section className="bg-surface-container-low p-6 md:p-8 rounded-3xl space-y-4">
        <div className="flex justify-between items-end">
          <div className="space-y-1">
            <p className="font-headline font-bold text-2xl text-on-surface">
              {earned} of {config.totalTokens} stars earned
            </p>
            <p className="text-on-surface-variant font-medium">Keep it up!</p>
          </div>
          <span className="font-headline font-extrabold text-primary text-3xl">
            {percentage}%
          </span>
        </div>
        <div className="h-3 rounded-full bg-surface-container-highest overflow-hidden">
          <motion.div
            className="h-full bg-primary-gradient rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </section>

      {/* Earn Star Button + Reset */}
      <section className="flex justify-center gap-4 py-4 flex-wrap">
        <button
          onClick={earnToken}
          disabled={allEarned}
          className="bg-primary-gradient text-white px-8 py-4 rounded-2xl text-lg font-semibold font-headline flex items-center gap-3 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
        >
          <MaterialIcon icon="add_circle" className="text-3xl" />
          Earn Star
        </button>
        <button
          onClick={reset}
          className="border border-outline-variant text-on-surface px-6 py-4 rounded-2xl text-lg font-semibold font-headline flex items-center gap-3 transition-all hover:scale-105 active:scale-95"
        >
          <MaterialIcon icon="restart_alt" className="text-2xl" />
          Reset
        </button>
      </section>

      {/* Celebration / Reward Hint */}
      <AnimatePresence>
        <motion.section
          key={allEarned ? "celebration" : "progress"}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className="bg-tertiary-fixed border-l-8 border-tertiary-container rounded-[1.5rem] p-6 flex items-center gap-6"
        >
          <div className="bg-tertiary-container p-4 rounded-xl text-on-tertiary-container">
            <MaterialIcon icon="redeem" filled className="text-4xl" />
          </div>
          <div>
            <p className="font-headline font-bold text-xl text-on-tertiary-fixed">
              {allEarned ? "You did it!" : "Keep going!"}
            </p>
            <p className="text-on-tertiary-fixed-variant font-medium text-lg">
              {allEarned
                ? `Time for your reward: ${config.reinforcers[0]?.label ?? "a reward"}!`
                : `${remaining} more star${remaining === 1 ? "" : "s"} to go!`}
            </p>
          </div>
        </motion.section>
      </AnimatePresence>
    </div>
  );
}
