const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface FetchOptions {
  table: string;
  query?: string;
  headers?: Record<string, string>;
}

export async function supabaseFetch<T = any[]>({ table, query = '' }: FetchOptions): Promise<T> {
  const url = `${SUPABASE_URL}/rest/v1/${table}${query ? `?${query}` : ''}`;
  const res = await fetch(url, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase fetch error: ${res.status} ${text}`);
  }
  return res.json();
}

export async function supabaseFetchCount(table: string, query = ''): Promise<number> {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${query}&select=id`;
  const res = await fetch(url, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': 'count=exact',
      'Range': '0-0',
    },
  });
  if (!res.ok) return 0;
  const range = res.headers.get('content-range');
  if (range) {
    const total = range.split('/')[1];
    return total === '*' ? 0 : parseInt(total, 10);
  }
  return 0;
}

export async function supabaseAuthFetch<T = any[]>(
  table: string,
  query: string,
  token: string
): Promise<T> {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${query}`;
  const res = await fetch(url, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase fetch error: ${res.status} ${text}`);
  }
  return res.json();
}

export async function supabaseAuthCount(
  table: string,
  query: string,
  token: string
): Promise<number> {
  const url = `${SUPABASE_URL}/rest/v1/${table}?${query}&select=id`;
  const res = await fetch(url, {
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${token}`,
      'Prefer': 'count=exact',
      'Range': '0-0',
    },
  });
  if (!res.ok) return 0;
  const range = res.headers.get('content-range');
  if (range) {
    const total = range.split('/')[1];
    return total === '*' ? 0 : parseInt(total, 10);
  }
  return 0;
}
