// src/lib/server/nascar/getDriverOptions.js
export async function getDriverOptionsForEvent({ event, fetch }) {
  // Only Daytona currently
  if (!event || event.type !== "daytona") {
    return { options: [], mode: "", note: "" };
  }

  // Use the same endpoint logic, but via fetch that SvelteKit provides (keeps cookies/headers)
  try {
    const res = await fetch(`/api/events/${event.slug}/options`);
    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        options: [],
        mode: "error",
        note: body?.error || `Failed to load options (${res.status})`
      };
    }

    return {
      options: body.options || [],
      mode: body.mode || "",
      note: body.note || ""
    };
  } catch (err) {
    return {
      options: [],
      mode: "error",
      note: err?.message || "Failed to load options"
    };
  }
}
