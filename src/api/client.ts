import { Platform } from 'react-native';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000/api';
// Só nativo (AuthContext.native): limite de tempo por pedido, para o arranque com sessão
// (H3) e os ecrãs não ficarem pendurados com a API inalcançável. A web não muda.
const IS_NATIVE = Platform.OS !== 'web';
const NATIVE_TIMEOUT_MS = 30_000;

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

  let timer: ReturnType<typeof setTimeout> | undefined;
  let signal = init.signal;
  if (IS_NATIVE && !signal) {
    const controller = new AbortController();
    timer = setTimeout(() => controller.abort(), NATIVE_TIMEOUT_MS);
    signal = controller.signal;
  }

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers,
      credentials: 'include',
      ...(signal ? { signal } : {}),
    });
  } catch {
    throw new NetworkError();
  } finally {
    if (timer) clearTimeout(timer);
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
    // Nativo: o refresher é single-flight (AuthContext.native), por isso pedidos 401
    // concorrentes esperam pela mesma renovação e repetem. Web: comportamento de sempre.
    if (IS_NATIVE && e instanceof ApiError && e.status === 401) {
      if (await tryRefreshToken()) return doRequest<T>(path, init);
      throw e;
    }
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
