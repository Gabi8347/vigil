import type { Metadata } from "next";
import { api } from "../../../lib/api.ts";
import { loadPreview } from "../../../lib/preview.ts";

export const metadata: Metadata = { title: "Şirket" };

/** Company page (#82, #243). */
export default async function CompanyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { data, error } = await loadPreview(() => api.company(code));
  const report = data?.latest_report;
  return (
    <div className="page-stack">
      <h1>{data?.code ?? code.toLocaleUpperCase("tr-TR")}</h1>
      {error && <output>{error}</output>}
      {data?.title && <p>{data.title}</p>}
      {report && (
        <p>
          Son rapor · {report.year} · {report.quarter}. çeyrek
        </p>
      )}
    </div>
  );
}
