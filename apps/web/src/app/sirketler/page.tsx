import type { Metadata } from "next";
import Link from "next/link";
import { Table } from "../../components/primitives.tsx";
import { api } from "../../lib/api.ts";
import { loadPreview } from "../../lib/preview.ts";

export const metadata: Metadata = { title: "Şirketler" };

/** Company list (#169). */
export default async function CompaniesPage() {
  const { data, error } = await loadPreview(() => api.companies());
  return (
    <div className="page-stack">
      <h1>Şirketler</h1>
      {error && <output>{error}</output>}
      {data?.items.length === 0 && <p>Şirket kaydı bulunamadı.</p>}
      {data && data.items.length > 0 && (
        <Table caption="Şirket listesi">
          <thead>
            <tr>
              <th scope="col">Kod</th>
              <th scope="col">Unvan</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map(({ code, title }) => (
              <tr key={code}>
                <td>
                  <Link href={`/sirketler/${encodeURIComponent(code)}`}>{code}</Link>
                </td>
                <td>{title ?? "Unvan bilgisi yok"}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
