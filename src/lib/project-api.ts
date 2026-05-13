function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function getConfiguredApiBase(): string {
  return trimTrailingSlash(process.env.NEXT_PUBLIC_API_URL || "");
}

export function getGatewayProjectId(): string | null {
  const match = getConfiguredApiBase().match(/\/api\/v1\/p\/([0-9a-fA-F-]+)$/);
  return match?.[1] ?? null;
}

export function getCoreApiBase(): string {
  const base = getConfiguredApiBase();
  if (!base) return "/api/v1";
  if (/\/api\/v1\/p\/[0-9a-fA-F-]+$/.test(base)) {
    return base.replace(/\/p\/[0-9a-fA-F-]+$/, "");
  }
  if (base.endsWith("/api/v1")) {
    return base;
  }
  return `${base}/api/v1`;
}

export function resolveProjectId(projectId?: string): string {
  return projectId || process.env.NEXT_PUBLIC_MODULE_PROJECT_ID || getGatewayProjectId() || "";
}

export function buildLostFoundUrl(path: string, projectId?: string): string {
  return `${getCoreApiBase()}/lost-found/${resolveProjectId(projectId)}${path}`;
}

export function buildTableUrl(tableName: string, path = "", projectId?: string): string {
  return `${getCoreApiBase()}/table/${resolveProjectId(projectId)}/${tableName}${path}`;
}

export function buildModuleUrl(moduleKey: string, path = "", projectId?: string): string {
  return `${getCoreApiBase()}/modules/${resolveProjectId(projectId)}/${moduleKey}${path}`;
}
