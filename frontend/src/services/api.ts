import { getAccessToken } from "./authToken";

const BASE_URL = import.meta.env.VITE_API_URL ?? "/api";

async function getToken(): Promise<string | null> {
  return getAccessToken();
}

function buildUrl(path: string, params?: Record<string, any>): string {
  if (!params) return `${BASE_URL}${path}`;
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) query.set(k, String(v));
  }
  const qs = query.toString();
  return `${BASE_URL}${path}${qs ? `?${qs}` : ""}`;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  params?: Record<string, any>
): Promise<{ data: T }> {
  const token = await getToken();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(buildUrl(path, params), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && window.location.pathname !== "/login") {
    window.location.href = "/login";
    throw new Error("Sesión expirada");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }

  if (res.status === 204) return { data: undefined as T };
  const data = await res.json();
  return { data };
}

const api = {
  get: <T = any>(path: string, config?: { params?: Record<string, any> }) =>
    request<T>("GET", path, undefined, config?.params),
  post: <T = any>(path: string, body?: unknown) => request<T>("POST", path, body),
  put: <T = any>(path: string, body?: unknown) => request<T>("PUT", path, body),
  delete: <T = any>(path: string) => request<T>("DELETE", path),
};

export default api;
