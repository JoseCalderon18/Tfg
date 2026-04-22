const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? "";

function buildHeaders(headers?: HeadersInit) {
  const merged = new Headers(headers ?? {});
  if (SUPABASE_ANON_KEY) {
    merged.set("apikey", SUPABASE_ANON_KEY);
    merged.set("Authorization", `Bearer ${SUPABASE_ANON_KEY}`);
  }
  return merged;
}

export function hasSupabaseConfig() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export async function supabaseRestFetch(path: string, options: RequestInit = {}) {
  if (!hasSupabaseConfig()) {
    throw new Error("Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en el panel web.");
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return fetch(`${SUPABASE_URL}/rest/v1${normalizedPath}`, {
    ...options,
    headers: buildHeaders(options.headers),
  });
}
