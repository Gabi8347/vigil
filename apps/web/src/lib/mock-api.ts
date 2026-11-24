import {
  type Company,
  type DownloadEvent,
  type DownloadRequest,
  ERROR_STATUS,
  type ErrorCode,
  type ErrorResponse,
  type FactVersionsResponse,
  type Finding,
  type GetRoutes,
  type ListResponse,
  type Settings,
  type SettingsUpdate,
  type Statement,
  type StatementName,
} from "@vigil/api-types";
import { Hono } from "hono";
import { companies, finding, findingDetail, meta, metrics, quality, reports, statements } from "./mock-fixtures.ts";
import { mockApiPath } from "./mock-mode.ts";

const app = new Hono().basePath(`${mockApiPath}/v1`);
const health: GetRoutes["/v1/health"] = { status: "ok" };

interface MockState {
  settings: Settings;
  downloadEvents: DownloadEvent[];
}

// Next can bundle the route handler and server components separately. Both use the same in-memory state.
const mockGlobal = globalThis as typeof globalThis & { vigilMockState?: MockState };
mockGlobal.vigilMockState ??= {
  settings: { data_dir: "./data", quarters: meta.quarters.map(({ quarter }) => quarter), llm: null },
  downloadEvents: [],
};
const state = mockGlobal.vigilMockState;

function error(code: ErrorCode, message: string, details: ErrorResponse["error"]["details"] = {}) {
  const body: ErrorResponse = { error: { code, message, details } };
  return Response.json(body, { status: ERROR_STATUS[code] });
}

function invalid(parameter: string) {
  return error("invalid_request", `${parameter} parametresi geçersiz.`, { parameter });
}

function missing(resource: string) {
  return error("not_found", `${resource} bulunamadı.`);
}

function searchKey(value: string) {
  return value.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/\p{M}/gu, "").replaceAll("ı", "i");
}

function findCompany(code: string) {
  return companies.find((company) => company.codes.some((ticker) => searchKey(ticker) === searchKey(code)));
}

function list<T>(items: T[], { limit, cursor }: Record<string, string>) {
  const size = limit === undefined ? 50 : Number(limit);
  if (!Number.isInteger(size) || size < 1 || size > 200) return invalid("limit");
  let start = 0;
  if (cursor !== undefined) {
    try {
      const decoded = atob(cursor);
      if (!/^\d+$/.test(decoded)) return invalid("cursor");
      start = Number(decoded);
    } catch {
      return invalid("cursor");
    }
    if (!Number.isSafeInteger(start) || start > items.length) return invalid("cursor");
  }
  const end = start + size;
  return Response.json({
    items: items.slice(start, end),
    next_cursor: end < items.length ? btoa(String(end)) : null,
    total: items.length,
  } satisfies ListResponse<T>);
}

app.use("*", async (context, next) => {
  await next();
  context.header("Vigil-Tier", "local");
});
app.notFound((context) => missing(context.req.path));
app.onError((cause) =>
  cause instanceof SyntaxError ? invalid("body") : error("internal", "Beklenmeyen bir hata oluştu."),
);
app.get("/health", (context) => context.json(health));
app.get("/ready", (context) => context.json(health));
app.get("/meta", (context) => context.json(meta));

app.get("/companies", (context) => {
  const query = context.req.query();
  const term = searchKey(query.q?.trim() ?? "");
  const items: Company[] = companies
    .filter(({ codes, title }) => [...codes, title ?? ""].some((value) => searchKey(value).includes(term)))
    .map(({ reports: _reports, ...company }) => company);
  if (query.sort === "-code") items.reverse();
  return list(items, query);
});
app.get("/companies/:code", (context) => {
  const company = findCompany(context.req.param("code"));
  return company ? context.json(company) : missing(context.req.param("code"));
});
app.get("/companies/:code/metrics", (context) => {
  const company = findCompany(context.req.param("code"));
  const result = company && metrics[company.code];
  if (!result) return missing(context.req.param("code"));
  const { period, version } = context.req.query();
  if (period && period !== result.period_end && period !== meta.quarters[0]?.quarter) return missing(period);
  if (
    version &&
    version !== "latest" &&
    version !== "first" &&
    version !== `report:${company.latest_report?.document_id}`
  ) {
    return missing(version);
  }
  return context.json(result);
});
app.get("/companies/:code/facts/:row/versions", (context) => {
  const { code, row } = context.req.param();
  const company = findCompany(code);
  const report = reports.find((item) => item.company_code === company?.code);
  if (!report) return missing(code);
  const { period_end, currency_part } = context.req.query();
  for (const statement of Object.values(statements[report.document_id] ?? {})) {
    if (!statement) continue;
    const fact = statement.rows.find((item) => item.row === row);
    if (!fact) continue;
    const column = statement.columns
      .filter(
        ({ comparative, period }) =>
          (period_end ? period.end === period_end : !comparative) &&
          (!currency_part || period.currency_part === currency_part),
      )
      .find(({ id }) => fact.values[id] !== undefined);
    const value = column && fact.values[column.id];
    if (!column || !value) continue;
    const { document_id, year, quarter, published_at } = report;
    return context.json({
      company_code: report.company_code,
      row,
      period: column.period,
      versions: [{ version_no: 1, value, report: { document_id, year, quarter, published_at } }],
    } satisfies FactVersionsResponse);
  }
  return missing(row);
});
app.get("/reports/:document_id", (context) => {
  const id = context.req.param("document_id");
  const report = reports.find(({ document_id }) => document_id === id);
  return report ? context.json(report) : missing(id);
});
const statementNames: readonly StatementName[] = [
  "balance_sheet",
  "income_statement",
  "comprehensive_income",
  "cash_flow",
  "equity_changes",
];
app.get("/reports/:document_id/statements/:statement", (context) => {
  const { document_id, statement: name } = context.req.param();
  const statement = statementNames.find((item) => item === name);
  if (!statement) return invalid("statement");
  const report = statements[document_id];
  if (!Object.hasOwn(statements, document_id) || !report) return missing(document_id);
  const view = context.req.query("view") ?? "cumulative";
  if (view !== "cumulative" && view !== "three_month") return invalid("view");
  const data = report[statement];
  const columns = data?.columns.filter(({ period }) => period.type === view || period.type === "point_in_time") ?? [];
  const rows =
    columns.length === 0
      ? []
      : (data?.rows ?? []).map((row) => ({
          ...row,
          values: Object.fromEntries(
            Object.entries(row.values).filter(([id]) => columns.some((column) => column.id === id)),
          ),
        }));
  return context.json({ document_id, statement, columns, rows } satisfies Statement);
});
app.get("/findings", (context) => {
  const query = context.req.query();
  const { rule, company, quarter, template } = query;
  const items: Finding[] = [finding].filter(
    (item) =>
      (!rule || item.rule === rule) &&
      (!company || item.company_code === findCompany(company)?.code) &&
      (!quarter || `${item.year}-${item.quarter}` === quarter) &&
      (!template || item.template === template),
  );
  return list(items, query);
});
app.get("/findings/:id", (context) => {
  const id = context.req.param("id");
  return id === findingDetail.id ? context.json(findingDetail) : missing(id);
});
app.get("/quality", (context) => {
  const filter = context.req.query("quarter");
  return context.json({
    quarters: quality.quarters.filter(({ quarter }) => !filter || quarter === filter),
  } satisfies GetRoutes["/v1/quality"]);
});

function validQuarters(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string" && /^\d{4}-[1-4]$/.test(item));
}

app.get("/settings", (context) => context.json(state.settings));
app.put("/settings", async (context) => {
  const update = await context.req.json<SettingsUpdate | null>();
  if (!update || typeof update !== "object" || Array.isArray(update)) return invalid("body");
  if (update.quarters !== undefined && !validQuarters(update.quarters)) return invalid("quarters");
  const llm = update.llm;
  const { settings } = state;
  let nextLlm = settings.llm;
  if (llm === null) nextLlm = null;
  if (llm !== undefined && llm !== null) {
    if (
      !["anthropic", "gemini", "openai_compatible", "ollama"].includes(llm.provider) ||
      typeof llm.model !== "string"
    ) {
      return invalid("llm");
    }
    if (llm.base_url != null && typeof llm.base_url !== "string") return invalid("llm.base_url");
    if (llm.api_key != null && typeof llm.api_key !== "string") return invalid("llm.api_key");
    const previous = settings.llm?.provider === llm.provider ? settings.llm : null;
    const baseUrl = llm.base_url === undefined ? previous?.base_url : llm.base_url;
    if (llm.provider === "openai_compatible" && !baseUrl) return invalid("llm.base_url");
    nextLlm = {
      provider: llm.provider,
      model: llm.model,
      base_url: baseUrl ?? (llm.provider === "ollama" ? "http://127.0.0.1:11434" : null),
      api_key_set: llm.api_key === undefined ? (previous?.api_key_set ?? false) : Boolean(llm.api_key),
    };
  }
  state.settings = { ...settings, quarters: update.quarters ?? settings.quarters, llm: nextLlm };
  return context.json(state.settings);
});
app.post("/downloads", async (context) => {
  const body = await context.req.json<DownloadRequest | null>();
  if (!validQuarters(body?.quarters) || body.quarters.length === 0) return invalid("quarters");
  const started = [...new Set(body.quarters)];
  state.downloadEvents = started.flatMap((quarter): DownloadEvent[] => {
    const total = meta.quarters.find((item) => item.quarter === quarter)?.files ?? 0;
    return [
      { type: "progress", quarter, done: total, total },
      { type: "done", quarter, stored: total, failed: 0 },
    ];
  });
  return context.json({ started });
});
app.get(
  "/downloads/events",
  () =>
    new Response(`: Vigil\n\n${state.downloadEvents.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("")}`, {
      headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache" },
    }),
);

// Enough of the OpenAPI document for clients to discover the mock operations.
const operations = {
  "/v1/health": ["get"],
  "/v1/ready": ["get"],
  "/v1/meta": ["get"],
  "/v1/companies": ["get"],
  "/v1/companies/{code}": ["get"],
  "/v1/companies/{code}/metrics": ["get"],
  "/v1/companies/{code}/facts/{row}/versions": ["get"],
  "/v1/reports/{document_id}": ["get"],
  "/v1/reports/{document_id}/statements/{statement}": ["get"],
  "/v1/findings": ["get"],
  "/v1/findings/{id}": ["get"],
  "/v1/quality": ["get"],
  "/v1/settings": ["get", "put"],
  "/v1/downloads": ["post"],
  "/v1/downloads/events": ["get"],
  "/v1/openapi.json": ["get"],
} satisfies Record<keyof GetRoutes | "/v1/downloads" | "/v1/downloads/events" | "/v1/openapi.json", string[]>;

app.get("/openapi.json", (context) =>
  context.json({
    openapi: "3.1.0",
    info: { title: "Vigil API (örnek veri)", version: "1.0.0" },
    servers: [{ url: mockApiPath }],
    paths: Object.fromEntries(
      Object.entries(operations).map(([path, methods]) => [
        path,
        {
          parameters: Array.from(path.matchAll(/\{(\w+)\}/g), ([, name]) => ({
            name,
            in: "path",
            required: true,
            schema: { type: "string" },
          })),
          ...Object.fromEntries(
            methods.map((method) => [method, { responses: { "200": { description: "Örnek yanıt" } } }]),
          ),
        },
      ]),
    ),
  }),
);

export const handleMockRequest = app.fetch;
