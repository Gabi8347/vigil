import type { Metadata } from "next";
import Link from "next/link";
import { Popover } from "../../components/Popover.tsx";
import { Table } from "../../components/primitives.tsx";
import { api } from "../../lib/api.ts";
import { mockApiEnabled } from "../../lib/mock-mode.ts";
import { loadPreview } from "../../lib/preview.ts";

export const metadata: Metadata = { title: "Bulgular" };

/** Finding list preview. Filtering and sorting in the UI are handled in #81. */
export default async function FindingsPage() {
  const { data, error } = await loadPreview(() => api.findings());
  return (
    <div className="page-stack">
      <div className="page-heading">
        <h1>Bulgular</h1>
        {mockApiEnabled && (
          <Popover label="Veri kaynağı">
            <p>Bu görünüm, geliştirme için seçilmiş KAP bildirimlerinden örnek veriler gösterir.</p>
          </Popover>
        )}
      </div>
      {error && <output>{error}</output>}
      {data?.items.length === 0 && <p>Bu dönem için bulgu bulunamadı.</p>}
      {data && data.items.length > 0 && (
        <Table caption="Finansal bulgular">
          <thead>
            <tr>
              <th scope="col">Bulgu</th>
              <th scope="col">Şirket</th>
              <th scope="col">Dönem</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item) => (
              <tr key={item.id}>
                <td>
                  <Link href={`/bulgular/${encodeURIComponent(item.id)}`}>{item.title}</Link>
                  <p className="muted">{item.headline}</p>
                </td>
                <td>
                  <Link href={`/sirketler/${encodeURIComponent(item.company_code)}`}>{item.company_code}</Link>
                </td>
                <td>
                  {item.year} · {item.quarter}. çeyrek
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
