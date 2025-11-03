export type ApiUser = { userId: string; email: string; name?: string };

export function getApiBase(): string {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || '';
  return base.replace(/\/$/, '');
}

export async function fetchJson<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const base = getApiBase();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${base}${path}`, { ...options, headers });
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      if (data?.message) message = data.message;
    } catch {}
    throw new Error(message);
  }
  try {
    return (await res.json()) as T;
  } catch {
    return undefined as unknown as T;
  }
}


