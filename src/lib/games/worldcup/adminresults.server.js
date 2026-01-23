// src/lib/games/worldcup/adminResults.server.js
import { fail } from '@sveltejs/kit';
import { getResultsForEvent } from '$lib/server/db/results.js';
import { loadEntriesWithScores, mergeResultsPayload } from '$lib/games/adminResults.server.js';
import { getOptions } from './options.js';
import { WORLD_CUP_ROUNDS } from '$lib/scoring/worldCup.js';
// adding bullshit to make the commit go thru
//more bs trying again


function asStr(v) {
  return v == null ? '' : String(v).trim();
}

function safeObj(v) {
  return v && typeof v === 'object' ? v : {};
}

function uniq(arr) {
  const out = [];
  const seen = new Set();
  for (const x of arr || []) {
    const s = asStr(x);
    if (!s || seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}

function buildTeamMap(teams) {
  const m = new Map();
  for (const t of teams || []) {
    const id = asStr(t?.id);
    if (!id) continue;
    m.set(id, { id, name: asStr(t?.name) || id });
  }
  return m;
}

function nextRound(round) {
  const i = WORLD_CUP_ROUNDS.indexOf(round);
  if (i < 0) return 'group';
  return WORLD_CUP_ROUNDS[Math.min(i + 1, WORLD_CUP_ROUNDS.length - 1)];
}

function decorateEntry(e, teamMap) {
  const payload = safeObj(e?.payload);
  const picksByRound = safeObj(payload.picksByRound);
  const usedTeams = Array.isArray(payload.usedTeams) ? payload.usedTeams.map(asStr) : [];
  const eliminated = Boolean(payload.eliminated);
  const eliminatedRound = payload.eliminatedRound || null;

  const picks = WORLD_CUP_ROUNDS
    .map((r) => {
      const id = asStr(picksByRound[r]);
      if (!id) return null;
      const name = teamMap.get(id)?.name || id;
      return { round: r, teamId: id, teamName: name };
    })
    .filter(Boolean);

  return { ...e, picks, usedTeams, eliminated, eliminatedRound };
}

export async function load({ db, event, fetchImpl }) {
  const results = await getResultsForEvent(db, event.id);
  const resultsPayload = safeObj(results?.payload);

  const opts = await getOptions({ db, event, fetchImpl });
  const teams = safeObj(opts?.options)?.teams || [];
  const teamMap = buildTeamMap(teams);

  const entriesRaw = await loadEntriesWithScores({ db, eventId: event.id });
  const entries = (entriesRaw || []).map((e) => decorateEntry(e, teamMap));

  const currentRound = asStr(resultsPayload.currentRound) || 'group';
  const roundsPayload = safeObj(resultsPayload.rounds);

  return {
    event,
    results,
    entries,
    teams,
    currentRound,
    roundsPayload,
    suggestedNextRound: nextRound(currentRound),
    optionsMode: opts?.mode || '',
    optionsNote: opts?.note || ''
  };
}

export async function publish({ db, event, form }) {
  const now = Math.floor(Date.now() / 1000);

  const round = asStr(form.get('round'));
  if (!WORLD_CUP_ROUNDS.includes(round)) {
    return fail(400, { ok: false, error: 'Invalid round.' });
  }

  const advancedTeamIds = uniq(form.getAll('advancedTeamId'));
  if (!advancedTeamIds.length) {
    return fail(400, { ok: false, error: 'Select at least one advanced team for this round.' });
  }

  const current = await getResultsForEvent(db, event.id);
  const base = safeObj(current?.payload);
  const baseRounds = safeObj(base.rounds);

  const patch = {
    // keep currentRound unchanged here
    rounds: {
      ...baseRounds,
      [round]: { advancedTeamIds, completedAt: now }
    }
  };

  await mergeResultsPayload({
    db,
    eventId: event.id,
    now,
    patch,
    setPublishedAt: true
  });

  return { ok: true };
}

export async function advanceRound({ db, event }) {
  const now = Math.floor(Date.now() / 1000);

  const current = await getResultsForEvent(db, event.id);
  const base = safeObj(current?.payload);
  const roundsPayload = safeObj(base.rounds);

  const currentRound = asStr(base.currentRound) || 'group';
  const next = nextRound(currentRound);

  // Safety: don’t advance if the current round hasn’t been published
  const currentRoundPublished = Array.isArray(roundsPayload?.[currentRound]?.advancedTeamIds)
    && roundsPayload[currentRound].advancedTeamIds.length > 0;

  if (!currentRoundPublished) {
    return fail(400, { ok: false, error: 'Publish the current round results before advancing.' });
  }

  const patch = { currentRound: next };

  await mergeResultsPayload({
    db,
    eventId: event.id,
    now,
    patch,
    setPublishedAt: false
  });

  return { ok: true };
}

