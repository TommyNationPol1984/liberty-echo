import { getCurrentUser } from "./supabase";

/**
 * Authenticated fetch wrapper
 * Automatically includes JWT token in Authorization header
 * Returns 401 if user is not authenticated
 */

const API_BASE = "/api";

async function getAuthToken(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("User not authenticated");
  }

  const session = await getCurrentUser();
  if (!session) {
    throw new Error("No active session");
  }

  // In production: fetch fresh token from Supabase
  // For now: assume token is in localStorage (set by auth flow)
  const token = localStorage.getItem("supabase.auth.token");
  if (!token) {
    throw new Error("No authentication token found");
  }

  return token;
}

/**
 * Fetch with automatic JWT injection
 */
export async function apiFetch(
  path: string,
  options: RequestInit & { body?: unknown } = {}
): Promise<Response> {
  const token = await getAuthToken();

  const headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const body = options.body ? JSON.stringify(options.body) : undefined;

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    body,
  });

  if (response.status === 401) {
    throw new Error("Unauthorized: please sign in again");
  }

  return response;
}

/**
 * JSON API request (returns parsed JSON)
 */
export async function apiJson<T>(
  path: string,
  options: RequestInit & { body?: unknown } = {}
): Promise<T> {
  const response = await apiFetch(path, options);
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.message || `API error: ${response.status} ${response.statusText}`
    );
  }
  return response.json();
}

/**
 * Audio stream API request (returns Blob)
 */
export async function apiAudio(
  path: string,
  options: RequestInit & { body?: unknown } = {}
): Promise<Blob> {
  const response = await apiFetch(path, options);
  if (!response.ok) {
    throw new Error(
      `Audio request failed: ${response.status} ${response.statusText}`
    );
  }
  return response.blob();
}
