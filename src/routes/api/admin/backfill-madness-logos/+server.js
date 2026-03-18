import { json } from '@sveltejs/kit';
import BRACKET from '$lib/games/madness/data/2026_ncaa_mens_tournament_seeds.json';
import { buildFromBracketJson, makeTeamId, slugify } from '$lib/games/madness/bracketUtils.js';

function safeJsonParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function normalizeName(name) {
  return String(name || '')
    .trim()
    .replace(/\s+/g, ' ');
}

function buildLookupMaps() {
  const built = buildFromBracketJson(BRACKET);
  const byId = new Map();
  const byName = new Map();
  const bySlug = new Map();

  for (const team of built.options || []) {
    const id = String(team?.id || '');
    const name = normalizeName(team?.name || '');
    const slug = slugify(name);

    if (id) byId.set(id, team);
    if (name) byName.set(name, team);
    if (slug) bySlug.set(slug, team);
  }

  return { built, byId, byName, bySlug };
}

function findMatch(snapshot, maps) {
  const snapId = String(snapshot?.id || '').trim();
  const snapName = normalizeName(snapshot?.name || '');
  const snapSlug = slugify(snapName);

  if (snapId && maps.byId.has(snapId)) return maps.byId.get(snapId);
  if (snapName && maps.byName.has(snapName)) return maps.byName.get(snapName);

  if (snapName) {
    const derivedId = makeTeamId(snapName);
    if (maps.byId.has(derivedId)) return maps.byId.get(derivedId);
  }

  if (snapSlug && maps.bySlug.has(snapSlug)) return maps.bySlug.get(snapSlug);

  return null;
}

function patchSnapshot(snapshot, matched) {
  if (!matched) {
    return { next: snapshot, changed: false, matched: false };
  }

  const currentLogo = String(snapshot?.logo || '').trim();
  const currentLogoUrl = String(snapshot?.logoUrl || '').trim();
  const nextLogoUrl = String(matched?.logoUrl || matched?.logo || '').trim();

  if (!nextLogoUrl) {
    return { next: snapshot, changed: false, matched: true };
  }

  const next = {
    ...snapshot,
    logo: currentLogo || nextLogoUrl,
    logoUrl: currentLogoUrl || nextLogoUrl
  };

  const changed =
    String(snapshot?.logo || '') !== String(next.logo || '') ||
    String(snapshot?.logoUrl || '') !== String(next.logoUrl || '');

  return { next, changed, matched: true };
}

export async function POST({ request, platform, locals }) {
  const db = platform?.env?.DB;
  if (!db) return json({ ok: false, error: 'DB binding missing' }, { status: 500 });

  if (!locals.user) return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  if (locals.user.role !== 'admin') return json({ ok: false, error: 'Forbidden' }, { status: 403 });

  const body = await request.json().catch(() => ({}));

  const eventSlug = String(body?.event_slug || 'march-madness').trim();
  const dryRun = Boolean(body?.dry_run ?? true);

  const event = await db
    .prepare(
      `SELECT id, slug, name, type
       FROM events
       WHERE slug = ?
       LIMIT 1`
    )
    .bind(eventSlug)
    .first();

  if (!event) {
    return json({ ok: false, error: `Event not found for slug "${eventSlug}"` }, { status: 404 });
  }

  if (event.type !== 'madness') {
    return json(
      { ok: false, error: `Event "${eventSlug}" is type "${event.type}", not "madness"` },
      { status: 400 }
    );
  }

  const rows = await db
    .prepare(
      `SELECT id, user_id, payload_json, submitted_at, updated_at
       FROM entries
       WHERE event_id = ?
       ORDER BY updated_at DESC`
    )
    .bind(event.id)
    .all();

  const entries = rows?.results || [];
  const maps = buildLookupMaps();

  let scanned = 0;
  let updated = 0;
  let unchanged = 0;
  let skippedNoPayload = 0;
  let skippedNoSnapshots = 0;
  let matchedSnapshots = 0;
  let changedSnapshots = 0;
  let unmatchedSnapshots = 0;

  const sample = [];

  for (const row of entries) {
    scanned += 1;

    const payload = safeJsonParse(row.payload_json);
    if (!payload || typeof payload !== 'object') {
      skippedNoPayload += 1;
      continue;
    }

    const snapshots = Array.isArray(payload?.teamSnapshots) ? payload.teamSnapshots : null;
    if (!snapshots || !snapshots.length) {
      skippedNoSnapshots += 1;
      continue;
    }

    let anyEntryChange = false;
    const nextSnapshots = [];

    for (const snap of snapshots) {
      const matched = findMatch(snap, maps);
      const result = patchSnapshot(snap, matched);

      if (result.matched) matchedSnapshots += 1;
      else unmatchedSnapshots += 1;

      if (result.changed) {
        changedSnapshots += 1;
        anyEntryChange = true;
      }

      nextSnapshots.push(result.next);

      if (sample.length < 12) {
        sample.push({
          user_id: row.user_id,
          entry_id: row.id,
          team: snap?.name || snap?.id || 'unknown',
          matched: Boolean(matched),
          before_logo: snap?.logo || '',
          before_logoUrl: snap?.logoUrl || '',
          after_logo: result.next?.logo || '',
          after_logoUrl: result.next?.logoUrl || '',
          changed: result.changed
        });
      }
    }

    if (!anyEntryChange) {
      unchanged += 1;
      continue;
    }

    if (!dryRun) {
      const nextPayload = {
        ...payload,
        teamSnapshots: nextSnapshots
      };

      await db
        .prepare(
          `UPDATE entries
           SET payload_json = ?, updated_at = ?
           WHERE id = ?`
        )
        .bind(JSON.stringify(nextPayload), Math.floor(Date.now() / 1000), row.id)
        .run();
    }

    updated += 1;
  }

  return json({
    ok: true,
    dry_run: dryRun,
    event: {
      id: event.id,
      slug: event.slug,
      name: event.name,
      type: event.type
    },
    summary: {
      entries_scanned: scanned,
      entries_updated_or_would_update: updated,
      entries_unchanged: unchanged,
      entries_skipped_no_payload: skippedNoPayload,
      entries_skipped_no_teamSnapshots: skippedNoSnapshots,
      snapshots_matched: matchedSnapshots,
      snapshots_changed: changedSnapshots,
      snapshots_unmatched: unmatchedSnapshots
    },
    sample
  });
}