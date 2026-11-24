import type {
  Calculation,
  CompanyDetail,
  Finding,
  FindingDetail,
  Meta,
  MetricsResponse,
  Period,
  QualityQuarter,
  QualityResponse,
  Report,
  Source,
  Statement,
  StatementColumn,
  StatementName,
  StatementRow,
  Value,
} from "@vigil/api-types";

// The filing values come from tests/golden/2026_2. The S1 calculation is the worked example in docs/API.md.
const katmrReport: Report = {
  document_id: "1651411",
  company_code: "KATMR",
  year: 2026,
  quarter: 2,
  consolidation: "consolidated",
  template: "general",
  scale: "TL",
  published_at: "2026-08-17T16:05:18Z",
  quality: "pass",
  checks: [],
  url: "https://www.kap.org.tr/tr/Bildirim/1651411",
};

const akbankReport: Report = {
  document_id: "1637884",
  company_code: "AKBNK",
  year: 2026,
  quarter: 2,
  consolidation: "consolidated",
  template: "banks",
  scale: "1.000.000 TL",
  published_at: null,
  quality: "not_checked",
  checks: [],
  url: "https://www.kap.org.tr/tr/Bildirim/1637884",
};

function company(report: Report, title: string | null): CompanyDetail {
  const { document_id, company_code, year, quarter, quality, consolidation, published_at, template } = report;
  const ref = { document_id, year, quarter, quality };
  return {
    code: company_code,
    codes: [company_code],
    title,
    template,
    sector: null,
    member_id: null,
    latest_report: ref,
    reports: [{ ...ref, consolidation, published_at, corrects: null }],
  };
}

export const reports = [katmrReport, akbankReport];
export const companies = [
  company(akbankReport, null),
  company(katmrReport, "KATMERCİLER ARAÇ ÜSTÜ EKİPMAN SANAYİ VE TİCARET A.Ş."),
];

function column(
  number: number,
  start: string | null,
  end: string,
  type: Period["type"],
  label: string,
  comparative = false,
): StatementColumn {
  return { id: `col-order-class-${number}`, period: { start, end, type, label, currency_part: "total" }, comparative };
}

const balance = column(4, null, "2026-06-30", "point_in_time", "Cari Dönem 30.06.2026");
const bankBalance = column(6, null, "2026-06-30", "point_in_time", "Cari Dönem 30.06.2026 (Toplam)");
const cumulative = column(4, "2026-01-01", "2026-06-30", "cumulative", "Cari Dönem 01.01.2026 - 30.06.2026");
const priorCumulative = column(
  5,
  "2025-01-01",
  "2025-06-30",
  "cumulative",
  "Önceki Dönem 01.01.2025 - 30.06.2025",
  true,
);
const quarter = column(6, "2026-04-01", "2026-06-30", "three_month", "Cari Dönem 3 Aylık 01.04.2026 - 30.06.2026");
const priorQuarter = column(
  7,
  "2025-04-01",
  "2025-06-30",
  "three_month",
  "Önceki Dönem 3 Aylık 01.04.2025 - 30.06.2025",
  true,
);
const displayInteger = new Intl.NumberFormat("tr-TR");

function filedRow(
  report: Report,
  row: string,
  label: string,
  cells: [column: StatementColumn, amount: string | null, asFiled?: string][],
  subtotal = false,
): StatementRow {
  const values = Object.fromEntries(
    cells.map(([{ id, period }, amount, asFiled]) => {
      const source: Source = {
        system: "KAP",
        document_id: report.document_id,
        company_code: report.company_code,
        report: { year: report.year, quarter: report.quarter, consolidation: report.consolidation },
        table: row.split("-row-")[0] ?? row,
        row,
        row_label: label,
        column: id,
        period_label: period.label,
        shown_value: asFiled ?? (amount === null ? "" : displayInteger.format(BigInt(amount))),
        scale: report.scale,
        published_at: report.published_at,
        url: report.url,
      };
      const value: Value =
        amount === null
          ? { value: null, status: "not_reported", period, unit: "TRY", source }
          : { value: amount, status: "ok", period, unit: "TRY", source };
      return [id, value];
    }),
  );
  return { row, label, level: 0, subtotal, values };
}

const assets = filedRow(
  katmrReport,
  "general_role_210015-row-129",
  "TOPLAM VARLIKLAR",
  [[balance, "14795418421"]],
  true,
);
const liabilities = filedRow(
  katmrReport,
  "general_role_210015-row-297",
  "TOPLAM KAYNAKLAR",
  [[balance, "14795418421"]],
  true,
);
const revenue = filedRow(katmrReport, "general_role_310003-row-3", "Hasılat", [
  [cumulative, "1558895376"],
  [priorCumulative, "1434008001"],
  [quarter, "879599263"],
  [priorQuarter, "694991758"],
]);
const grossProfit = filedRow(
  katmrReport,
  "general_role_310003-row-5",
  "TİCARİ FAALİYETLERDEN BRÜT KAR (ZARAR)",
  [
    [cumulative, "518267459"],
    [priorCumulative, "662081978"],
    [quarter, "189492068"],
    [priorQuarter, "330145727"],
  ],
  true,
);
const investmentExpenses = filedRow(katmrReport, "general_role_310003-row-42", "Yatırım Faaliyetlerinden Giderler", [
  [cumulative, null],
  [priorCumulative, "-36464628"],
  [quarter, null],
  [priorQuarter, "-36464628"],
]);
const cashFlow = filedRow(
  katmrReport,
  "general_role_520003-row-2",
  "İŞLETME FAALİYETLERİNDEN NAKİT AKIŞLARI",
  [
    [cumulative, "-40878967"],
    [priorCumulative, "-957022643"],
  ],
  true,
);
const bankAssets = filedRow(akbankReport, "banks_role_210011-row-4", "FİNANSAL VARLIKLAR (Net)", [
  [bankBalance, "1351403000000", "1.351.403"],
]);

function cell(row: StatementRow, column: StatementColumn): Value {
  const value = row.values[column.id];
  if (value === undefined) throw new Error(`Missing fixture cell: ${row.row} / ${column.id}`);
  return value;
}

katmrReport.checks = [
  {
    name: "balance_sheet_total",
    group: "balance",
    severity: "blocking",
    status: "pass",
    left: cell(assets, balance),
    right: cell(liabilities, balance),
    tolerance: "5",
    known_error: null,
  },
];

export const statements: Record<string, Partial<Record<StatementName, Pick<Statement, "columns" | "rows">>>> = {
  [katmrReport.document_id]: {
    balance_sheet: { columns: [balance], rows: [assets, liabilities] },
    income_statement: {
      columns: [cumulative, priorCumulative, quarter, priorQuarter],
      rows: [revenue, grossProfit, investmentExpenses],
    },
    cash_flow: { columns: [cumulative, priorCumulative], rows: [cashFlow] },
  },
  [akbankReport.document_id]: {
    balance_sheet: { columns: [bankBalance], rows: [bankAssets] },
  },
};

const definition = { id: "gross_margin", version: "2026-11-01", url: "/methodology/gross_margin" };
const currentMargin: Calculation = {
  formula: "gross_profit_q / revenue_q",
  definition,
  steps: [
    { id: "gross_profit_q", label: "Brüt kâr, 3 aylık, 2026", value: cell(grossProfit, quarter) },
    { id: "revenue_q", label: "Hasılat, 3 aylık, 2026", value: cell(revenue, quarter) },
    { id: "margin_q", label: "Brüt marj, 2026 Ç2", formula: "gross_profit_q / revenue_q", result: "0.215430" },
  ],
};

export const finding: Finding = {
  id: "2026-2-KATMR-gross_margin_change",
  rule: "gross_margin_change",
  title: "Brüt kâr marjında çeyreklik değişim",
  company_code: katmrReport.company_code,
  document_id: katmrReport.document_id,
  year: 2026,
  quarter: 2,
  template: "general",
  size: { value: "-2596", unit: "bps", status: "ok" },
  headline: "3 aylık brüt marj %47,50'den %21,54'e geriledi.",
  config_version: definition.version,
  created_at: "2026-11-01T12:00:00Z",
};

export const findingDetail: FindingDetail = {
  ...finding,
  thresholds: { min_revenue_try: "100000000", min_abs_change_bps: 1000 },
  methodology_url: definition.url,
  calculation: {
    formula: "(gross_profit_q / revenue_q - gross_profit_q_prior / revenue_q_prior) * 10000",
    definition,
    steps: [
      ...currentMargin.steps,
      {
        id: "gross_profit_q_prior",
        label: "Brüt kâr, 3 aylık, 2025 (yeniden düzenlenmiş)",
        value: cell(grossProfit, priorQuarter),
      },
      {
        id: "revenue_q_prior",
        label: "Hasılat, 3 aylık, 2025 (yeniden düzenlenmiş)",
        value: cell(revenue, priorQuarter),
      },
      {
        id: "margin_q_prior",
        label: "Brüt marj, 2025 Ç2",
        formula: "gross_profit_q_prior / revenue_q_prior",
        result: "0.475035",
      },
      {
        id: "change_bps",
        label: "Değişim (baz puan)",
        formula: "(margin_q - margin_q_prior) * 10000",
        result: "-2596",
      },
    ],
  },
};

export const metrics: Record<string, MetricsResponse> = {
  KATMR: {
    company_code: "KATMR",
    period_end: quarter.period.end,
    metrics: [
      {
        id: definition.id,
        label: "Brüt kâr marjı",
        value: { value: "0.215430", unit: "ratio", status: "ok", period: quarter.period, calculation: currentMargin },
      },
    ],
  },
  AKBNK: {
    company_code: "AKBNK",
    period_end: bankBalance.period.end,
    metrics: [
      {
        id: definition.id,
        label: "Brüt kâr marjı",
        value: {
          value: null,
          unit: "ratio",
          status: "not_computable",
          reason: { code: "not_applicable", message: "Brüt kâr marjı banka şablonuna uygulanmaz.", needs: [] },
        },
      },
    ],
  },
};

const counts: QualityQuarter["counts"] = {};
for (const report of reports) counts[report.quality] = (counts[report.quality] ?? 0) + 1;
const loadedQuarter = `${katmrReport.year}-${katmrReport.quarter}`;

export const quality: QualityResponse = {
  quarters: [
    {
      quarter: loadedQuarter,
      counts,
      files: reports
        .filter((report) => report.quality !== "pass")
        .map((report) => ({
          file: `${report.company_code}_${report.document_id}_${report.year}_${report.quarter}.xls`,
          status: report.quality,
          reason: null,
        })),
    },
  ],
};
export const meta: Meta = {
  app_version: "0.1.0",
  config_version: definition.version,
  quarters: [{ quarter: loadedQuarter, files: reports.length, quality: counts }],
};
