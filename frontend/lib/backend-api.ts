export const BACKEND_API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export const ACCESS_TOKEN_KEY = "jobconnect_access_token";
export const ACCOUNT_KEY = "jobconnect_account";

export function getAccessToken() {
  return typeof window === "undefined"
    ? null
    : window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getAuthHeaders(): HeadersInit {
  const token = getAccessToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function getApiMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const value = payload as {
    message?: string | string[];
    error?: { message?: string | string[] };
  };
  const message = value.message ?? value.error?.message;
  return Array.isArray(message) ? message.join(" ") : message ?? fallback;
}
