const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000/api';

type TokenGetter = () => string | null;
type TokenRefresher = () => Promise<boolean>;

let getToken: TokenGetter = () => null;
let tryRefreshToken: TokenRefresher = () => Promise.resolve(false);

export function setTokenGetter(fn: TokenGetter): void {
  getToken = fn;
}

export function setTokenRefresher(fn: TokenRefresher): void {
  tryRefreshToken = fn;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends Error {
  constructor(message = 'Sem ligação ao servidor. Verifica a tua ligação à internet.') {
    super(message);
    this.name = 'NetworkError';
  }
}

let isRefreshing = false;

async function doRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();

  const isFormData = init.body instanceof FormData;
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(init.headers as Record<string, string>),
  };

  if (token) headers['Authorization'] = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers,
      credentials: 'include',
    });
  } catch {
    throw new NetworkError();
  }

  if (!response.ok) {
    let message = response.statusText || 'Ocorreu um erro.';
    let fieldErrors: Record<string, string[]> | undefined;
    try {
      const body = await response.json();
      fieldErrors = body.errors;
      if (body.detail) message = body.detail;
      else if (!fieldErrors && body.title) message = body.title;
    } catch {
      // ignore parse errors
    }
    throw new ApiError(response.status, message, fieldErrors);
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  try {
    return await doRequest<T>(path, init);
  } catch (e) {
    if (e instanceof ApiError && e.status === 401 && !isRefreshing) {
      isRefreshing = true;
      try {
        const refreshed = await tryRefreshToken();
        if (refreshed) return doRequest<T>(path, init);
      } finally {
        isRefreshing = false;
      }
    }
    throw e;
  }
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  postMultipart: <T>(path: string, formData: FormData) =>
    request<T>(path, { method: 'POST', body: formData }),
};
