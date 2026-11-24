import type { Metadata } from "next";
import Link from "next/link";
import { api } from "../../../lib/api.ts";
import { loadPreview } from "../../../lib/preview.ts";

export const metadata: Metadata = { title: "Bulgu" };

/** Finding card (#83, #247). */
export default async function FindingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data, error } = await loadPreview(() => api.finding(id));
  const source = data?.calculation.steps.flatMap((step) => {
    if ("value" in step && "source" in step.value && step.value.source) return [step.value.source];
    return [];
  })[0];

  return (
    <div className="page-stack">
      <h1>{data?.title ?? `Bulgu ${id}`}</h1>
      {error && <output>{error}</output>}
      {data && (
        <>
          <p>{data.headline}</p>
          <p>
            <Link href={`/sirketler/${encodeURIComponent(data.company_code)}`}>{data.company_code}</Link> · {data.year}{" "}
            · {data.quarter}. çeyrek
          </p>
        </>
      )}
      {source && (
        <p>
          <a href={source.url}>KAP bildirimi · {source.document_id}</a>
        </p>
      )}
    </div>
  );
}
