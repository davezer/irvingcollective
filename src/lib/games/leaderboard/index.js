// src/lib/games/leaderboard/index.js
import DaytonaBreakdown from '$lib/games/daytona/LeaderboardBreakdown.svelte';
import MadnessBreakdown from '$lib/games/madness/LeaderboardBreakdown.svelte';
import MastersBreakdown from '$lib/games/masters/LeaderboardBreakdown.svelte'

export const LEADERBOARD_BREAKDOWN_BY_TYPE = {
  daytona: DaytonaBreakdown,
  madness: MadnessBreakdown,
  masters: MastersBreakdown
};

export function getLeaderboardBreakdownComponent(type) {
  return LEADERBOARD_BREAKDOWN_BY_TYPE[type] || null;
}
