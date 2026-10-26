const configuredUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ncefkoudoelzwgulonos.supabase.co';
const configuredKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable___1uHFfjgZirdB4eJwh17Q_eKyWATGW';

export const supabaseUrl = configuredUrl.replace(/\/+$/, '');
export const supabaseAnonKey = configuredKey;
export const supabase = Boolean(supabaseUrl && supabaseAnonKey);

export interface SupabaseRestError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
  status?: number;
}

export async function requestSupabase<T>(
  resource: string,
  init: RequestInit = {},
): Promise<{ data: T | null; error: SupabaseRestError | null }> {
  if (!supabase) return { data: null, error: { message: 'Supabase is not configured.' } };

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/${resource}`, {
      ...init,
      headers: {
        apikey: supabaseAnonKey,
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
    });

    const text = await response.text();
    let body: unknown = null;
    if (text) {
      try { body = JSON.parse(text); }
      catch { body = text; }
    }

    if (!response.ok) {
      const details = body && typeof body === 'object' ? body as Partial<SupabaseRestError> : null;
      return {
        data: null,
        error: {
          message: details?.message ?? `Supabase request failed (${response.status}).`,
          code: details?.code,
          details: details?.details,
          hint: details?.hint,
          status: response.status,
        },
      };
    }

    return { data: body as T | null, error: null };
  } catch (error) {
    return {
      data: null,
      error: { message: error instanceof Error ? error.message : 'Supabase request failed.' },
    };
  }
}
