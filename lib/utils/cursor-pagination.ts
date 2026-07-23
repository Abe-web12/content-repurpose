export interface CursorPaginationParams {
  cursor?: string;
  limit: number;
}

export interface CursorPaginationResult<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export function encodeCursor(value: string | Date): string {
  const dateStr = typeof value === "string" ? value : value.toISOString();
  return Buffer.from(dateStr).toString("base64url");
}

export function decodeCursor(cursor: string): string {
  return Buffer.from(cursor, "base64url").toString("utf-8");
}

export function buildCursorWhere(
  cursor: string | undefined,
  sortField: string,
  sortDir: "asc" | "desc"
): Record<string, unknown> | undefined {
  if (!cursor) return undefined;

  const decoded = decodeCursor(cursor);
  const date = new Date(decoded);
  const value = isNaN(date.getTime()) ? decoded : date;

  if (sortDir === "desc") {
    return { [sortField]: { lt: value } };
  }
  return { [sortField]: { gt: value } };
}

export function getNextCursor<T extends Record<string, unknown>>(
  items: T[],
  cursorField: string,
  limit: number
): string | null {
  if (items.length < limit) return null;
  const last = items[items.length - 1];
  const val = last[cursorField];
  if (!val) return null;
  return encodeCursor(val instanceof Date ? val : String(val));
}
