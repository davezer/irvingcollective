export async function getDaytonaOptions({ eventSlug, fetch }) {
  // use internal fetch but return a safe shape
  const res = await fetch(`/api/events/${eventSlug}/options`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    return { options: [], mode: 'error', note: body?.error || `Failed (${res.status})` };
  }
  const body = await res.json().catch(() => ({}));
  return {
    options: body.options || [],
    mode: body.mode || '',
    note: body.note || ''
  };
}
