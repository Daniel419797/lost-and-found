export type LostMatchInput = {
  id: string;
  reporterUserId: string;
  itemTitle: string;
  category: string;
  color: string | null;
  brand: string | null;
  description: string | null;
  locationLost: string;
  dateLost: Date;
};

export type FoundMatchInput = {
  id: string;
  itemTitle: string;
  category: string;
  color: string | null;
  brand: string | null;
  description: string | null;
  locationFound: string;
  dateFound: Date;
};

function normalize(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value: string | null | undefined): Set<string> {
  return new Set(
    normalize(value)
      .split(" ")
      .filter((part) => part.length >= 2),
  );
}

function similarity(a: string | null | undefined, b: string | null | undefined): number {
  const left = tokens(a);
  const right = tokens(b);
  if (left.size === 0 || right.size === 0) return 0;

  let intersection = 0;
  for (const token of left) {
    if (right.has(token)) intersection += 1;
  }

  return intersection / (left.size + right.size - intersection);
}

function equalText(a: string | null | undefined, b: string | null | undefined): boolean {
  const left = normalize(a);
  const right = normalize(b);
  return Boolean(left && right && left === right);
}

function daysApart(a: Date, b: Date): number {
  return Math.abs(a.getTime() - b.getTime()) / 86_400_000;
}

export function scoreMatch(
  lost: LostMatchInput,
  found: FoundMatchInput,
): { score: number; factors: Record<string, number> } {
  const factors: Record<string, number> = {};

  factors.category = equalText(lost.category, found.category) ? 35 : 0;
  factors.title = Math.round(similarity(lost.itemTitle, found.itemTitle) * 25);
  factors.brand = equalText(lost.brand, found.brand) ? 12 : 0;
  factors.color = equalText(lost.color, found.color) ? 8 : 0;
  factors.location = Math.round(similarity(lost.locationLost, found.locationFound) * 8);

  const delta = daysApart(lost.dateLost, found.dateFound);
  factors.date = delta <= 1 ? 8 : delta <= 3 ? 6 : delta <= 7 ? 4 : delta <= 14 ? 2 : 0;
  factors.description = Math.round(similarity(lost.description, found.description) * 4);

  return {
    score: Math.min(100, Object.values(factors).reduce((sum, value) => sum + value, 0)),
    factors,
  };
}
