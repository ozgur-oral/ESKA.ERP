"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AppShell,
  Badge,
  Panel,
  toneFor,
} from "@/components/app-shell";
import { api, type StockMovement } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const labels: Record<string, string> = {
  IN: "Stok Girişi",
  OUT: "Stok Çıkışı",
  TRANSFER: "Transfer / Teslim",
  ADJUSTMENT: "Düzeltme",
  SERVICE_IN: "Servis Girişi",
  SERVICE_OUT: "Servis Çıkışı",
};

export default function MovementsPage() {
  const { user, loading } = useAuth();
  const [rows, setRows] = useState<StockMovement[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (loading || !user) return;

    setError("");

    api.stockMovements()
      .then((data) => {
        setRows(data);
        setError("");
      })
      .catch((e) => setError(e.message));
  }, [loading, user]);

  return (
    <AppShell
      title="Stok Hareketleri"
      subtitle="Cihaz ve ürünlerin denetlenebilir hareket geçmişi."
      actions={
        <Link className="btn btn-secondary" href="/stock">
          Stoklara Dön
        </Link>
      }
    >
      {error ? <div className="inline-error">{error}</div> : null}

      <Panel title="Son Hareketler">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tarih</th>
                <th>Hareket</th>
                <th>Ürün</th>
                <th>Seri No</th>
                <th>Miktar</th>
                <th>Referans</th>
                <th>İşlemi Yapan</th>
                <th>Açıklama</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>
                    {new Date(r.createdAt).toLocaleString("tr-TR")}
                  </td>

                  <td>
                    <Badge tone={toneFor(labels[r.type] || r.type)}>
                      {labels[r.type] || r.type}
                    </Badge>
                  </td>

                  <td>
                    {r.productName}
                    <small className="muted"> {r.sku}</small>
                  </td>

                  <td className="mono">
                    {r.serialNumber || "—"}
                  </td>

                  <td>{r.quantity}</td>

                  <td>
                    {r.referenceType
                      ? `${r.referenceType} #${r.referenceId ?? "—"}`
                      : "—"}
                  </td>

                  <td>
                    {r.createdByName ||
                      r.createdByUsername ||
                      "—"}
                  </td>

                  <td>{r.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </AppShell>
  );
}