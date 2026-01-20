// src/lib/games/daytona/adminResults.server.js
import { fail } from '@sveltejs/kit';
import { getResultsForEvent, upsertResultsForEvent } from '$lib/server/db/results.js';
import { getDriverOptionsForEvent } from '$lib/server/nascar/getDriverOptions.js';
import { loadEntriesWithScores } from '$lib/games/adminResults.server.js';

function buildDaytonaEntryDisplay(entryPayload) {
  const payload = entryPayload ?? {};

  const top10Snapshot = Array.isArray(payload.top10Snapshot) ? payload.top10Snapshot : [];
  const top10Ids = Array.isArray(payload.top10Ids) ? payload.top10Ids : [];

  const chaosSnap = payload.chaosCarSnapshot ?? null;
  const chaosId = payload.chaosCarId ?? null;

  const top10Display = Array.from({ length: 10 }, (_, i) => {
    const snap = top10Snapshot[i];
    if (snap?.id) return snap;
    const id = top10Ids[i] ?? null;
    return id ? { id, name: `Driver ${id}`, carNumber: '' } : null;
  }).filter(Boolean);

  const chaosDisplay = chaosSnap?.id
    ? chaosSnap
    : chaosId
      ? { id: chaosId, name: `Driver ${chaosId}`, carNumber: '' }
      : null;

  return { top10Display, chaosDisplay };
}

export async function load({ db, event, fetchImpl }) {
  const results = await getResultsForEvent(db, event.id);

  const opt = await getDriverOptionsForEvent({ event, fetch: fetchImpl });
  const driverOptions = opt.options || [];
  const optionsMode = opt.mode || '';
  const optionsNote = opt.note || '';

  const entries = await loadEntriesWithScores({ db, eventId: event.id });

  const entriesDecorated = entries.map((e) => {
    const { top10Display, chaosDisplay } = buildDaytonaEntryDisplay(e.payload);
    return { ...e, top10Display, chaosDisplay };
  });

  return {
    event,
    results,
    entries: entriesDecorated,
    driverOptions,
    optionsMode,
    optionsNote
  };
}

export async function publish({ db, event, form }) {
  const top10 = [];
  for (let i = 1; i <= 10; i++) {
    const v = (form.get(`pos${i}`) || '').toString().trim();
    if (!v) return fail(400, { ok: false, error: `Missing position ${i}` });
    top10.push(v);
  }

  const uniq = new Set(top10);
  if (uniq.size !== 10) {
    return fail(400, { ok: false, error: 'Top 10 must be unique.' });
  }

  const payload = { officialTop10Ids: top10 };

  await upsertResultsForEvent(db, event.id, payload);
  return { ok: true };
}
