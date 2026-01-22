// src/lib/games/options.js
import { getOptions as getDaytonaOptions } from '$lib/games/daytona/options.js';
import { getOptions as getMadnessOptions } from '$lib/games/madness/options.js';
import { getOptions as getMastersOptions } from '$lib/games/masters/options.js';

const OPTIONS_BY_TYPE = {
  daytona: getDaytonaOptions,
  madness: getMadnessOptions,
  masters: getMastersOptions
};

export function hasOptionsProvider(type) {
  return Boolean(OPTIONS_BY_TYPE[type]);
}

export async function getOptionsForEvent({ db, event, fetchImpl }) {
  const fn = OPTIONS_BY_TYPE[event.type];
  if (!fn) {
    return {
      provider: null,
      cacheKey: null,
      options: [],
      mode: 'none',
      note: ''
    };
  }

  return fn({ db, event, fetchImpl });
}
