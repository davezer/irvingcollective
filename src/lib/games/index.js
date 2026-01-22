// src/lib/games/index.js
import DaytonaGame from '$lib/games/daytona/Game.svelte';
import MadnessGame from '$lib/games/madness/Game.svelte';
import MastersGame from '$lib/games/masters/Game.svelte'

export const GAME_BY_TYPE = {
  daytona: DaytonaGame,
  madness: MadnessGame,
  masters: MastersGame
};

export function getGameComponent(type) {
  return GAME_BY_TYPE[type] || null;
}

export function gameNeedsOptions(type) {
  return type === 'daytona' || type === 'madness' || type === 'masters';
}
