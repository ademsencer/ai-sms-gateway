const API_BASE = '/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  timestamp: string;
}

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }
  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const opts: RequestInit = {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  };

  let res = await fetch(`${API_BASE}${path}`, opts);

  if (res.status === 401) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      res = await fetch(`${API_BASE}${path}`, opts);
    } else {
      window.location.href = '/login';
      throw new Error('Session expired');
    }
  }

  const json: ApiResponse<T> = await res.json();
  if (!json.success) throw new Error(json.message || 'API error');
  return json.data as T;
}

export function useApi() {
  async function get<T>(path: string): Promise<T> {
    return request<T>(path, { method: 'GET' });
  }

  async function post<T>(path: string, body: Record<string, unknown>): Promise<T> {
    return request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async function patch<T>(path: string, body: Record<string, unknown>): Promise<T> {
    return request<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  async function del<T>(path: string): Promise<T> {
    return request<T>(path, { method: 'DELETE' });
  }

  return { get, post, patch, del };
}
