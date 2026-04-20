// Rank Tier System - Trophy based ranking
// Diamond (4000+) > Platinum (2000-3999) > Gold (1000-1999) > Silver (500-999) > Bronze (0-499)

export interface RankInfo {
  tier: string;
  emoji: string;
  color: string;
  bgColor: string;
  borderColor: string;
  minTrophy: number;
  maxTrophy: number;
  nextTierName?: string;
  nextTierTrophy?: number;
}

const RANK_TIERS: Record<string, RankInfo> = {
  BRONZE: {
    tier: "BRONZE",
    emoji: "🥉",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    borderColor: "border-orange-300",
    minTrophy: 0,
    maxTrophy: 499,
    nextTierName: "SILVER",
    nextTierTrophy: 500,
  },
  SILVER: {
    tier: "SILVER",
    emoji: "🥈",
    color: "text-gray-400",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-300",
    minTrophy: 500,
    maxTrophy: 999,
    nextTierName: "GOLD",
    nextTierTrophy: 1000,
  },
  GOLD: {
    tier: "GOLD",
    emoji: "🥇",
    color: "text-yellow-500",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-300",
    minTrophy: 1000,
    maxTrophy: 1999,
    nextTierName: "PLATINUM",
    nextTierTrophy: 2000,
  },
  PLATINUM: {
    tier: "PLATINUM",
    emoji: "💎",
    color: "text-purple-500",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-300",
    minTrophy: 2000,
    maxTrophy: 3999,
    nextTierName: "DIAMOND",
    nextTierTrophy: 4000,
  },
  DIAMOND: {
    tier: "DIAMOND",
    emoji: "👑",
    color: "text-blue-500",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-300",
    minTrophy: 4000,
    maxTrophy: Infinity,
    nextTierName: undefined,
    nextTierTrophy: undefined,
  },
};

/**
 * Get rank tier from trophy count
 * @param trophy Trophy count
 * @returns Rank tier name (BRONZE, SILVER, GOLD, PLATINUM, DIAMOND)
 */
export function getRank(trophy: number): string {
  if (trophy >= 4000) return "DIAMOND";
  if (trophy >= 2000) return "PLATINUM";
  if (trophy >= 1000) return "GOLD";
  if (trophy >= 500) return "SILVER";
  return "BRONZE";
}

/**
 * Get detailed rank information
 * @param trophy Trophy count
 * @returns RankInfo object with tier details
 */
export function getRankInfo(trophy: number): RankInfo {
  const tier = getRank(trophy);
  return RANK_TIERS[tier];
}

/**
 * Get next rank info
 * @param currentTrophy Current trophy count
 * @returns Next rank info or undefined if already Diamond
 */
export function getNextRankInfo(currentTrophy: number): RankInfo | undefined {
  const currentRank = getRank(currentTrophy);
  const currentTierInfo = RANK_TIERS[currentRank];

  if (!currentTierInfo.nextTierName) return undefined;

  return RANK_TIERS[currentTierInfo.nextTierName];
}

/**
 * Calculate trophy progress in current tier
 * @param trophy Trophy count
 * @returns { current, max, percentage }
 */
export function getTrophyProgress(trophy: number): {
  current: number;
  max: number;
  percentage: number;
} {
  const rankInfo = getRankInfo(trophy);

  const current = Math.max(0, trophy - rankInfo.minTrophy);
  const max = rankInfo.maxTrophy - rankInfo.minTrophy;
  const percentage = Math.min(100, Math.round((current / max) * 100));

  return { current, max, percentage };
}

/**
 * Get trophy needed to reach next rank
 * @param trophy Trophy count
 * @returns Trophy needed or undefined if already Diamond
 */
export function getTrophyToNextRank(trophy: number): number | undefined {
  const nextRankInfo = getNextRankInfo(trophy);
  if (!nextRankInfo) return undefined;
  return Math.max(0, nextRankInfo.minTrophy - trophy);
}

/**
 * Check if rank will change after trophy update
 * @param currentTrophy Current trophy count
 * @param newTrophy New trophy count
 * @returns { changed: boolean, oldRank: string, newRank: string }
 */
export function checkRankChange(currentTrophy: number, newTrophy: number): {
  changed: boolean;
  oldRank: string;
  newRank: string;
} {
  const oldRank = getRank(currentTrophy);
  const newRank = getRank(newTrophy);

  return {
    changed: oldRank !== newRank,
    oldRank,
    newRank,
  };
}

/**
 * Get all rank tiers in order
 */
export function getAllRanks(): string[] {
  return ["BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND"];
}

/**
 * Get rank display string (emoji + tier name)
 * @param trophy Trophy count
 * @returns Display string (e.g., "🥉 BRONZE")
 */
export function getRankDisplay(trophy: number): string {
  const rankInfo = getRankInfo(trophy);
  return `${rankInfo.emoji} ${rankInfo.tier}`;
}
