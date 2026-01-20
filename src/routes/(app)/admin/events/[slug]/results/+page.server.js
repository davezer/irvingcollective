// src/routes/(app)/admin/events/[slug]/results/+page.server.js
import { error, redirect, fail } from '@sveltejs/kit';
import {
  getEventBySlug,
  loadAdminResults,
  actionPublish,
  actionSyncSeeds
} from '$lib/games/adminResults.server.js';

export const load = async ({ locals, platform, params }) => {
  if (!locals.user) throw redirect(302, '/login');
  // if (!locals.user.is_admin) throw redirect(302, "/");

  const db = platform.env.DB;
  const event = await getEventBySlug(db, params.slug);
  if (!event) throw error(404, 'Event not found');

  return loadAdminResults({ db, event, fetchImpl: fetch });
};

export const actions = {
  syncSeeds: async ({ locals, platform, params, request }) => {
    if (!locals.user) throw redirect(302, '/login');
    // if (!locals.user.is_admin) throw redirect(302, "/");

    const db = platform.env.DB;
    const event = await getEventBySlug(db, params.slug);
    if (!event) return fail(404, { ok: false, error: 'Event not found' });

    return actionSyncSeeds({ db, event, request, fetchImpl: fetch });
  },

  publish: async ({ locals, platform, params, request }) => {
    if (!locals.user) throw redirect(302, '/login');
    // if (!locals.user.is_admin) throw redirect(302, "/");

    const db = platform.env.DB;
    const event = await getEventBySlug(db, params.slug);
    if (!event) return fail(404, { ok: false, error: 'Event not found' });

    return actionPublish({ db, event, request, fetchImpl: fetch });
  }
};
