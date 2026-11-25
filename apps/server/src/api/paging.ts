/**
 * Paging and sorting for list endpoints (#215, docs/API.md "Lists").
 *
 * `parseListQuery` reads `limit` (default 50, maximum 200), the opaque `cursor` and `sort` (a field name, `-` prefix
 * for descending); `pageSql` turns them into ORDER BY / LIMIT / OFFSET for a DuckDB query, and `listResponse` builds
 * `{ items, next_cursor, total }`. The cursor holds the offset of the next page; clients only pass it back.
 */
import type { ListResponse } from "@vigil/api-types";
import type { Context } from "hono";
import { invalidRequest, parseOptionalIntParam } from "./validation.ts";

export const DEFAULT_LIMIT = 50;
export const MAX_LIMIT = 200;

export interface ListQuery<F extends string> {
  limit: number;
  offset: number;
  sort: F;
  descending: boolean;
}

export function encodeCursor(offset: number): string {
  return Buffer.from(JSON.stringify({ offset })).toString("base64url");
}

/** The offset in a cursor; 0 when there is none. A cursor the server did not make is a 400. */
export function decodeCursor(raw: string | undefined): number {
  if (raw === undefined || raw === "") return 0;
  let offset: unknown;
  try {
    offset = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")).offset;
  } catch {
    offset = undefined;
  }
  if (!Number.isSafeInteger(offset) || (offset as number) < 0) {
    invalidRequest("cursor", "Geçersiz cursor.");
  }
  return offset as number;
}

/** Read `limit`, `cursor` and `sort`. `sort` must name one of `sortFields`; without it `defaultSort` is used. */
export function parseListQuery<F extends string>(
  c: Context,
  sortFields: readonly F[],
  defaultSort: F | `-${F}`,
): ListQuery<F> {
  const limit = parseOptionalIntParam(c.req.query("limit"), "limit", { min: 1, max: MAX_LIMIT }) ?? DEFAULT_LIMIT;
  const offset = decodeCursor(c.req.query("cursor"));
  const raw = c.req.query("sort") || defaultSort;
  const descending = raw.startsWith("-");
  const field = descending ? raw.slice(1) : raw;
  if (!(sortFields as readonly string[]).includes(field)) {
    invalidRequest("sort", `Geçersiz sıralama: ${raw}.`, { allowed: [...sortFields] });
  }
  return { limit, offset, sort: field as F, descending };
}

/**
 * ORDER BY, LIMIT and OFFSET for a DuckDB query. `columns` maps each sort field to its SQL expression, so the `sort`
 * text never reaches the SQL; `tiebreak` (a unique column) keeps the pages stable when sorted values are equal.
 */
export function pageSql<F extends string>(query: ListQuery<F>, columns: Record<F, string>, tiebreak: string): string {
  const direction = query.descending ? "DESC" : "ASC";
  return `ORDER BY ${columns[query.sort]} ${direction} NULLS LAST, ${tiebreak} LIMIT ${query.limit} OFFSET ${query.offset}`;
}

/** The list body for one page: `items` is that page, `total` counts every matching row. */
export function listResponse<T>(items: T[], total: number, query: ListQuery<string>): ListResponse<T> {
  const next = query.offset + items.length;
  return { items, next_cursor: items.length > 0 && next < total ? encodeCursor(next) : null, total };
}
