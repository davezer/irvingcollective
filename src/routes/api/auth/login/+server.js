import { json, redirect } from '@sveltejs/kit';

const SESSION_TTL_DAYS = 30;

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

function isProd(event) {
  // Cloudflare Pages provides event.platform?.env in prod.
  // Locally, wrangler pages dev also provides it; secure cookies still work on localhost,
  // but it’s fine if you want secure only on https.
  const url = new URL(event.request.url);
  return url.protocol === 'https:';
}

export async function POST(event) {
  const { request, platform, cookies } = event;
  const db = platform?.env?.DB;

  if (!db) {
    return json({ ok: false, error: 'DB binding missing (platform.env.DB)' }, { status: 500 });
  }

  const form = await request.formData();
  const displayName = String(form.get('display_name') ?? '').trim();
  const code = String(form.get('invite_code') ?? '').trim();

  if (!displayName || !code) {
    return json({ ok: false, error: 'display_name and invite_code required' }, { status: 400 });
  }

  // Load invite code
  const invite = await db
    .prepare(
      `SELECT code, role, used_by_user_id, used_at, expires_at
       FROM invite_codes
       WHERE code = ?`
    )
    .bind(code)
    .first();

  if (!invite) {
    return json({ ok: false, error: 'Invalid invite code' }, { status: 401 });
  }

  if (invite.used_by_user_id) {
    return json({ ok: false, error: 'Invite code already used' }, { status: 401 });
  }

  const t = nowSec();
  if (invite.expires_at && Number(invite.expires_at) <= t) {
    return json({ ok: false, error: 'Invite code expired' }, { status: 401 });
  }

  const userId = crypto.randomUUID();
  const sessionId = crypto.randomUUID();
  const expiresAt = t + SESSION_TTL_DAYS * 24 * 60 * 60;

  // Do it as a small transaction-ish sequence.
  // D1 doesn’t support multi-statement transactions everywhere, so keep it simple + consistent.
  await db
    .prepare(`INSERT INTO users (id, display_name, role) VALUES (?, ?, ?)`)
    .bind(userId, displayName, invite.role || 'gm')
    .run();

  await db
    .prepare(`UPDATE invite_codes SET used_by_user_id = ?, used_at = ? WHERE code = ? AND used_by_user_id IS NULL`)
    .bind(userId, t, code)
    .run();

  await db
    .prepare(`INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)`)
    .bind(sessionId, userId, expiresAt)
    .run();

  cookies.set('auth_session', sessionId, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: isProd(event),
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60
  });

  throw redirect(303, '/');
}
