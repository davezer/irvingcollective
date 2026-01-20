// src/lib/games/leaderboard/index.js
import DaytonaBreakdown from '$lib/games/daytona/LeaderboardBreakdown.svelte';
import MadnessBreakdown from '$lib/games/madness/LeaderboardBreakdown.svelte';

export const LEADERBOARD_BREAKDOWN_BY_TYPE = {
  daytona: DaytonaBreakdown,
  madness: MadnessBreakdown
};

export function getLeaderboardBreakdownComponent(type) {
  return LEADERBOARD_BREAKDOWN_BY_TYPE[type] || null;
}
