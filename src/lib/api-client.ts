export async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message || 'API error');
  return json.data as T;
}
