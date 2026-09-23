import axios from "axios";

function normalizeApiBase(value: string | undefined): string {
  const base = (value || "").replace(/\/+$/, "");
  if (!base) return "/api/v1";
  return base.endsWith("/api/v1") ? base : `${base}/api/v1`;
}

const API_BASE = normalizeApiBase(process.env.NEXT_PUBLIC_API_URL);

const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

const MAX_TRANSIENT_RETRIES = 3;
const RETRY_DELAYS_MS = [400, 1000, 2000];

let wakePromise: Promise<void> | null = null;
let refreshPromise: Promise<string> | null = null;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getBackendHealthUrl(): string | null {
  try {
    if (!API_BASE.startsWith("http://") && !API_BASE.startsWith("https://")) return null;
    const parsed = new URL(API_BASE);
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
      // Best-effort warmup for hosts that may spin services down.
    } finally {
      setTimeout(() => {
        wakePromise = null;
      }, 5000);
    }
  })();

  await wakePromise;
}

async function refreshAccessToken(): Promise<string> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = axios
    .post<{ data: { token: string } }>(
      `${API_BASE}/auth/refresh`,
      {},
      { withCredentials: true, headers: { "Content-Type": "application/json" } },
    )
    .then((response) => {
      const token = response.data.data.token;
      if (typeof window !== "undefined") localStorage.setItem("token", token);
      return token;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") void wakeBackendOnce();

  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    delete config.headers["Content-Type"];
    delete config.headers["content-type"];
  }

  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const config = error?.config as
      | (Record<string, unknown> & {
          headers?: Record<string, string>;
          url?: string;
          __transientRetryCount?: number;
          __authRetry?: boolean;
        })
      | undefined;
    const status = error?.response?.status as number | undefined;
    const isNetworkError = !error?.response;
    const isTransientStatus = status === 502 || status === 503;

    if (config && (isNetworkError || isTransientStatus)) {
      const currentRetry = Number(config.__transientRetryCount ?? 0);
      if (currentRetry < MAX_TRANSIENT_RETRIES) {
        config.__transientRetryCount = currentRetry + 1;
        if (currentRetry === 0) await wakeBackendOnce();
        await sleep(RETRY_DELAYS_MS[currentRetry] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1]);
        return api.request(config);
      }
    }

    const rawUrl = String(config?.url ?? "");
    const authEndpoint = /\/auth\/(?:login|register|refresh)(?:$|\?)/.test(rawUrl);

    if (
      typeof window !== "undefined" &&
      status === 401 &&
      config &&
      !config.__authRetry &&
      !authEndpoint
    ) {
      config.__authRetry = true;
      try {
        const token = await refreshAccessToken();
        if (config.headers) config.headers.Authorization = `Bearer ${token}`;
        return api.request(config);
      } catch {
        localStorage.removeItem("token");
        if (window.location.pathname !== "/login") window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  },
);

export default api;
