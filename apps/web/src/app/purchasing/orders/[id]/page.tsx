"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  AppShell,
  Badge,
  Panel,
} from "@/components/app-shell";
import { api, type PurchaseOrder } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type ReceiveLine = {
  orderItemId: number;
  quantity: number;
  serialNumbers: string;
};

const money = (v: string) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
  }).format(Number(v || 0));

export default function PurchaseOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();

  const [o, setO] = useState<PurchaseOrder | null>(null);
  const [lines, setLines] = useState<ReceiveLine[]>([]);
  const [note, setNote] = useState("");
  const [delivery, setDelivery] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      setError("");

      const x = await api.purchaseOrder(id);

      setO(x);

      setLines(
        (x.items || [])
          .filter(
            (i) =>
              Number(i.receivedQuantity) < Number(i.quantity)
          )
          .map((i) => ({
            orderItemId: i.id,
            quantity:
              Number(i.quantity) -
              Number(i.receivedQuantity),
            serialNumbers: "",
          }))
      );
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Sipariş yüklenemedi."
      );
    }
  }

  useEffect(() => {
    if (loading || !user || !id) return;

    load();
  }, [loading, user, id]);

  if (!o) {
    return (
      <AppShell
        title="Satın Alma Siparişi"
        subtitle="Sipariş yükleniyor…"
      >
        {error ? (
          <div className="inline-error">{error}</div>
        ) : null}
      </AppShell>
    );
  }

  async function receive() {
    setBusy(true);
    setError("");

    try {
      await api.receivePurchaseOrder(id, {
        deliveryNoteNo: delivery || null,
        notes: note || null,

        items: lines
          .filter((x) => x.quantity > 0)
          .map((x) => ({
            ...x,
            serialNumbers: x.serialNumbers
              .split(/[,\n;]/)
              .map((s) => s.trim())
              .filter(Boolean),
          })),
      });

      await load();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Mal kabul yapılamadı."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell
      title={o.orderNo}
      subtitle={`${o.supplierName} · Satın alma siparişi`}
      actions={
        <Link
          className="btn btn-secondary"
          href="/purchasing"
        >
          ← Satın Alma
        </Link>
      }
    >
      {error ? (
        <div className="inline-error">{error}</div>
      ) : null}

      <div className="stat-grid">
        <div className="stat-card">
          <span>Durum</span>
          <strong>{o.status}</strong>
        </div>

        <div className="stat-card">
          <span>Toplam</span>
          <strong>{money(o.grandTotal)}</strong>
        </div>

        <div className="stat-card">
          <span>Beklenen Teslim</span>
          <strong>
            {o.expectedAt
              ? new Date(o.expectedAt).toLocaleDateString(
                  "tr-TR"
                )
              : "—"}
          </strong>
        </div>

        <div className="stat-card">
          <span>Mal Kabul</span>
          <strong>{o.receipts?.length ?? 0}</strong>
        </div>
      </div>

      <Panel title="Sipariş Kalemleri">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>SKU</th>
                <th>Ürün</th>
                <th>Sipariş</th>
                <th>Kabul</th>
                <th>Kalan</th>
                <th>Birim Fiyat</th>
                <th>Takip</th>
              </tr>
            </thead>

            <tbody>
              {o.items?.map((i) => (
                <tr key={i.id}>
                  <td className="mono">{i.sku}</td>
                  <td>{i.productName}</td>
                  <td>{Number(i.quantity)}</td>
                  <td>{Number(i.receivedQuantity)}</td>

                  <td>
                    <strong>
                      {Number(i.quantity) -
                        Number(i.receivedQuantity)}
                    </strong>
                  </td>

                  <td>{money(i.unitPrice)}</td>

                  <td>
                    <Badge
                      tone={
                        i.isSerialized
                          ? "primary"
                          : "neutral"
                      }
                    >
                      {i.isSerialized
                        ? "Seri No"
                        : "Miktar"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {!["RECEIVED", "CANCELLED"].includes(o.status) ? (
        <Panel title="Mal Kabul">
          <div className="erp-form">
            <div className="form-grid">
              <label>
                <span>İrsaliye No</span>

                <input
                  value={delivery}
                  onChange={(e) =>
                    setDelivery(e.target.value)
                  }
                />
              </label>

              <label className="span-2">
                <span>Not</span>

                <input
                  value={note}
                  onChange={(e) =>
                    setNote(e.target.value)
                  }
                />
              </label>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Ürün</th>
                  <th>Kabul Miktarı</th>
                  <th>Seri Numaraları</th>
                </tr>
              </thead>

              <tbody>
                {lines.map((l, idx) => {
                  const item = o.items?.find(
                    (x) => x.id === l.orderItemId
                  );

                  return (
                    <tr key={l.orderItemId}>
                      <td>{item?.productName}</td>

                      <td>
                        <input
                          type="number"
                          min="0"
                          max={
                            Number(item?.quantity) -
                            Number(
                              item?.receivedQuantity
                            )
                          }
                          step="0.001"
                          value={l.quantity}
                          onChange={(e) =>
                            setLines((v) =>
                              v.map((x, n) =>
                                n === idx
                                  ? {
                                      ...x,
                                      quantity: Number(
                                        e.target.value
                                      ),
                                    }
                                  : x
                              )
                            )
                          }
                        />
                      </td>

                      <td>
                        {item?.isSerialized ? (
                          <textarea
                            rows={2}
                            placeholder="Her satıra veya virgülle seri no"
                            value={l.serialNumbers}
                            onChange={(e) =>
                              setLines((v) =>
                                v.map((x, n) =>
                                  n === idx
                                    ? {
                                        ...x,
                                        serialNumbers:
                                          e.target.value,
                                      }
                                    : x
                                )
                              )
                            }
                          />
                        ) : (
                          <span>
                            Seri numarası gerekmiyor
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="form-actions">
            <button
              className="btn btn-primary"
              disabled={busy}
              onClick={receive}
            >
              {busy
                ? "İşleniyor…"
                : "Mal Kabulü Tamamla & Stoğa Al"}
            </button>
          </div>
        </Panel>
      ) : null}

      <Panel title="Mal Kabul Geçmişi">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Mal Kabul No</th>
                <th>İrsaliye</th>
                <th>Tarih</th>
                <th>Not</th>
              </tr>
            </thead>

            <tbody>
              {o.receipts?.length ? (
                o.receipts.map((x) => (
                  <tr key={x.id}>
                    <td className="mono">
                      {x.receiptNo}
                    </td>

                    <td>
                      {x.deliveryNoteNo || "—"}
                    </td>

                    <td>
                      {new Date(
                        x.receivedAt
                      ).toLocaleString("tr-TR")}
                    </td>

                    <td>{x.notes || "—"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4}>
                    Henüz mal kabul yok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </AppShell>
  );
}