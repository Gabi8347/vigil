import type { Quality } from "@vigil/api-types";
import type { Metadata } from "next";
import { Table } from "../../components/primitives.tsx";
import { QualityChart } from "../../components/QualityChart.tsx";
import { Tabs } from "../../components/Tabs.tsx";
import { api } from "../../lib/api.ts";
import { loadPreview } from "../../lib/preview.ts";

export const metadata: Metadata = { title: "Veri kalitesi" };

const labels: Record<Quality, string> = {
  pass: "Geçti",
  fail: "Geçemedi",
  known_error: "Bilinen hata",
  not_checked: "Kontrol edilmedi",
  parse_error: "Okunamadı",
  no_values: "Değer yok",
};

/** Quality overview preview (#171). */
export default async function QualityPage() {
  const { data, error } = await loadPreview(() => api.quality());
  const quarter = data?.quarters[0];
  const counts = (Object.keys(labels) as Quality[]).flatMap((status) => {
    const count = quarter?.counts[status];
    return count === undefined ? [] : [{ label: labels[status], count }];
  });

  return (
    <div className="page-stack">
      <div className="page-heading">
        <h1>Veri kalitesi</h1>
        {quarter && <p className="muted">{quarter.quarter.replace("-", " · ")}. çeyrek</p>}
      </div>
      {error && <output>{error}</output>}
      {data && !quarter && <p>Kontrol edilen rapor bulunamadı.</p>}
      {quarter && (
        <Tabs
          label="Veri kalitesi"
          tabs={[
            {
              id: "ozet",
              label: "Dönem özeti",
              content: (
                <>
                  <QualityChart data={counts} />
                  <ul className="sr-only" aria-label={`${quarter.quarter} rapor sayıları`}>
                    {counts.map(({ label, count }) => (
                      <li key={label}>
                        {label} · {count}
                      </li>
                    ))}
                  </ul>
                </>
              ),
            },
            {
              id: "dosyalar",
              label: "Dosya durumları",
              content:
                quarter.files.length === 0 ? (
                  <p>Bu dönemde listelenecek dosya yok.</p>
                ) : (
                  <Table caption="Kontrolü geçmemiş veya tamamlanmamış dosyalar">
                    <thead>
                      <tr>
                        <th scope="col">Dosya</th>
                        <th scope="col">Durum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quarter.files.map(({ file, status }) => (
                        <tr key={file}>
                          <td>{file}</td>
                          <td>{labels[status]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                ),
            },
          ]}
        />
      )}
    </div>
  );
}
