// src/routes/api/events/[slug]/options/+server.js
import { json } from '@sveltejs/kit';
import { getOptionsCache, setOptionsCache } from '$lib/server/db/optionsCache.js';
import { fetchCupDrivers } from '$lib/server/providers/nascar.js';
import { findCupRaceId, fetchRaceEntryList } from '$lib/server/providers/nascarRaceEntry.js';
import { fetchPrelimEntryList } from '$lib/server/providers/nascarPrelimEntry.js';

const MAX_AGE_SECONDS = 60 * 60 * 6; // 6 hours

function pickCarNumber(raw) {
	return (
		raw?.carNumber ??
		raw?.car_number ??
		raw?.vehicleNumber ??
		raw?.vehicle_number ??
		raw?.number ??
		raw?.carNo ??
		raw?.car ??
		raw?.vehicle?.number ??
		raw?.vehicle?.carNumber ??
		raw?.competitor?.vehicleNumber ??
		raw?.competitor?.carNumber ??
		null
	);
}

function normalizeOption(raw) {
	const id =
		raw?.id != null
			? String(raw.id)
			: raw?.driverId != null
				? String(raw.driverId)
				: raw?.driver_id != null
					? String(raw.driver_id)
					: '';

	const name =
		raw?.name ||
		[raw?.firstName, raw?.lastName].filter(Boolean).join(' ') ||
		raw?.fullName ||
		id;

	const car = pickCarNumber(raw);

	return {
		id,
		name,
		carNumber: car != null && String(car).trim() ? String(car).trim() : null
	};
}

function normalizeOptions(list) {
	if (!Array.isArray(list)) return [];
	const normalized = list
		.map(normalizeOption)
		.filter((o) => o.id && o.name);

	// de-dupe by id
	const seen = new Set();
	return normalized.filter((o) => {
		if (seen.has(o.id)) return false;
		seen.add(o.id);
		return true;
	});
}

export async function GET({ params, platform }) {
	const db = platform?.env?.DB;
	if (!db) return json({ error: 'Database not available' }, { status: 500 });

	const slug = params.slug;

	const event = await db
		.prepare(`SELECT id, slug, type, start_at, name FROM events WHERE slug = ? LIMIT 1`)
		.bind(slug)
		.first();

	if (!event) return json({ error: 'Event not found' }, { status: 404 });

	if (event.type !== 'daytona') {
		return json({ provider: null, cacheKey: null, options: [] });
	}

	const seasonYear = new Date(Number(event.start_at) * 1000).getUTCFullYear() || 2026;

	// 1) Try cached entrants first
	const provider = 'nascar';
	const cacheKey = `daytona-entrants:${seasonYear}:v1`;

	const cached = await getOptionsCache({
		db,
		eventId: event.id,
		provider,
		cacheKey,
		maxAgeSeconds: MAX_AGE_SECONDS
	});

	if (cached && Array.isArray(cached) && cached.length) {
		// Cache might contain older/raw shapes; normalize anyway.
		return json({ provider, cacheKey, options: normalizeOptions(cached), mode: 'entrants:cache' });
	}

	// 2) Find race_id for Daytona 500 (Cup series_1)
	let raceId = null;
	try {
		raceId = await findCupRaceId({
			fetchImpl: fetch,
			seasonYear,
			raceName: 'DAYTONA 500'
		});
	} catch (e) {
		// If race lookup fails, fallback to drivers list
		const fallback = await fetchCupDrivers(fetch);
		return json({
			provider,
			cacheKey,
			options: normalizeOptions(fallback),
			mode: 'fallback:drivers',
			note: `Race ID lookup failed: ${e?.message || e}`
		});
	}

	// 2.5) Prelim entry list (often available earlier than full entrants)
	const prelim = await fetchPrelimEntryList({ fetchImpl: fetch, raceId });

	if (prelim?.ok) {
		const normalized = normalizeOptions(prelim.options);
		if (normalized.length) {
			const fetchedAt = Math.floor(Date.now() / 1000);
			await setOptionsCache({
				db,
				eventId: event.id,
				provider,
				cacheKey,
				payload: normalized,
				fetchedAt
			});

			return json({
				provider,
				cacheKey,
				options: normalized,
				mode: 'entrants:prelim',
				raceId
			});
		}
	}

	// 3) Fetch entrants for that race
	const entry = await fetchRaceEntryList({
		fetchImpl: fetch,
		seasonYear,
		seriesId: 1,
		raceId
	});

	const normalizedEntrants = normalizeOptions(entry?.options);

	if (normalizedEntrants.length) {
		const fetchedAt = Math.floor(Date.now() / 1000);
		await setOptionsCache({
			db,
			eventId: event.id,
			provider,
			cacheKey,
			payload: normalizedEntrants,
			fetchedAt
		});

		return json({
			provider,
			cacheKey,
			options: normalizedEntrants,
			mode: 'entrants',
			raceId,
			sourceUrl: entry?.sourceUrl
		});
	}

	// 4) If entrants not available yet (common before race week), fallback to drivers list
	const fallback = await fetchCupDrivers(fetch);
	return json({
		provider,
		cacheKey,
		options: normalizeOptions(fallback),
		mode: 'fallback:drivers',
		raceId,
		note: entry?.error || 'Entrants feed not available yet'
	});
}
