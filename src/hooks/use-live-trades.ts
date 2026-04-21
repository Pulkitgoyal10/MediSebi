import { useEffect, useState } from "react";
import { generateSampleTrades, type Trade } from "@/lib/sample-trades";

/**
 * Returns a fresh batch of sample trades that re-generates every `intervalMs`.
 * Used until the real ML model is wired up.
 */
export function useLiveTrades(days = 30, perDay = 8, intervalMs = 10_000) {
  const [trades, setTrades] = useState<Trade[]>(() => generateSampleTrades(days, perDay));
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setTrades(generateSampleTrades(days, perDay));
      setTick((t) => t + 1);
    }, intervalMs);
    return () => clearInterval(id);
  }, [days, perDay, intervalMs]);

  return { trades, tick };
}
