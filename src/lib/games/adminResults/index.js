// src/lib/games/adminResults/index.js
import DaytonaAdminResults from '$lib/games/daytona/AdminResults.svelte';
import MadnessAdminResults from '$lib/games/madness/AdminResults.svelte';
import MastersAdminResults from '$lib/games/masters/AdminResults.svelte';

export const ADMIN_RESULTS_BY_TYPE = {
  daytona: DaytonaAdminResults,
  madness: MadnessAdminResults,
  masters: MastersAdminResults
};

export function getAdminResultsComponent(type) {
  return ADMIN_RESULTS_BY_TYPE[type] || null;
}
