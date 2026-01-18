// src/routes/(app)/leaderboard/+page.server.js
import { redirect } from "@sveltejs/kit";
import { getLeaderboardTotals } from "$lib/server/db/scores.js";

export const load = async ({ locals, platform }) => {
  if (!locals.user) throw redirect(302, "/login");

  const db = platform.env.DB;
  const rows = await getLeaderboardTotals(db);

  return { rows };
};
