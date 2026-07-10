import { supabase } from './supabase';

/**
 * Authenticated fetch wrapper.
 * Automatically injects JWT Bearer token from Supabase session.
 */
export async function apiFetch(path: string, options?: RequestInit) {
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;

  const headers = new Headers(options?.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  headers.set('Content-Type', 'application/json');

  return fetch(path, {
    ...options,
    headers,
  });
}

export async function apiJson<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await apiFetch(path, options);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function apiAudio(path: string): Promise<Blob> {
  const res = await apiFetch(path);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  return res.blob();
}
