import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { "Content-Type": "application/json" },
});

const MAX_TRANSIENT_RETRIES = 3;
const RETRY_DELAYS_MS = [400, 1000, 2000];

let wakePromise: Promise<void> | null = null;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getBackendHealthUrl(): string | null {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) return null;
  try {
    const parsed = new URL(base);
    return `${parsed.origin}/health`;
  } catch {
    return null;
  }
}

async function wakeBackendOnce(): Promise<void> {
  if (typeof window === "undefined") return;
  if (wakePromise) return wakePromise;

  const healthUrl = getBackendHealthUrl();
  if (!healthUrl) return;

  wakePromise = (async () => {
    try {
      await fetch(healthUrl, { method: "GET", mode: "no-cors", cache: "no-store" });
    } catch {
      // Ignore warmup failures
    }
  })();

  await wakePromise;
}

// Attach JWT + API key on every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    void wakeBackendOnce();
  }
  const apiKey = process.env.NEXT_PUBLIC_API_KEY;
  if (apiKey) {
    config.headers["x-api-key"] = apiKey;
  }
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Retry on network/transient errors; redirect to /login on auth/me 401
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const config = error?.config as (Record<string, unknown> & { headers?: Record<string, string> }) | undefined;
    const status = error?.response?.status as number | undefined;
    const isNetworkError = !error?.response;
    const isTransientStatus = status === 502 || status === 503;

    if (config && (isNetworkError || isTransientStatus)) {
      const currentRetry = Number(config.__transientRetryCount ?? 0);
      if (currentRetry < MAX_TRANSIENT_RETRIES) {
        config.__transientRetryCount = currentRetry + 1;
        if (currentRetry === 0) {
          await wakeBackendOnce();
        }
        await sleep(RETRY_DELAYS_MS[currentRetry] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1]);
        return api.request(config);
      }
    }

    if (typeof window !== "undefined" && error.response?.status === 401) {
      const rawUrl = String(config?.url ?? "");
      let pathname = rawUrl;
      if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) {
        try {
          pathname = new URL(rawUrl).pathname;
        } catch {
          pathname = rawUrl;
        }
      }
      const isAuthMeEndpoint = /\/auth\/me(?:$|\?)/.test(pathname);
      if (isAuthMeEndpoint) {
        localStorage.removeItem("token");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default api;
