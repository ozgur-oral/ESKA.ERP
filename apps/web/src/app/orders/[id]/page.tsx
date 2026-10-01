"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import {
  AppShell,
  Badge,
  Panel,
  toneFor,
} from "@/components/app-shell";
import { Icon } from "@/components/icon";
import {
  api,
  type InventoryDevice,
  type SalesOrder,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";

const money = (v: string) =>
  new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
  }).format(Number(v));

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { can } = useAuth();

  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [availableDevices, setAvailableDevices] = useState<
    Record<number, InventoryDevice[]>
  >({});
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [warranty, setWarranty] = useState("24");
  const [note, setNote] = useState("");

  async function load() {
    try {
      setError("");

      const currentOrder = await api.order(id);

      setOrder(currentOrder);
      setNote(currentOrder.deliveryNote ?? "");

      if (currentOrder.status === "DELIVERED") {
        setAvailableDevices({});
        setSelectedDeviceIds([]);
        return;
      }

      const serializedItems = (currentOrder.items ?? []).filter(
        (item) => item.productId && item.isSerialized
      );

      if (!serializedItems.length) {
        setAvailableDevices({});
        setSelectedDeviceIds([]);
        return;
      }

      setLoadingDevices(true);

      const productIds = [
        ...new Set(
          serializedItems
            .map((item) => item.productId)
            .filter((productId): productId is number => productId !== null)
        ),
      ];

      const deviceResults = await Promise.all(
        productIds.map(async (productId) => {
          const devices = await api.devices(String(productId));

          return [
            productId,
            devices.filter((device) => device.status === "IN_STOCK"),
          ] as const;
        })
      );

      const nextAvailableDevices: Record<number, InventoryDevice[]> = {};

      for (const [productId, devices] of deviceResults) {
        nextAvailableDevices[productId] = devices;
      }

      setAvailableDevices(nextAvailableDevices);
      setSelectedDeviceIds([]);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Sipariş yüklenemedi."
      );
    } finally {
      setLoadingDevices(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  function requiredQuantity(productId: number) {
    return (order?.items ?? [])
      .filter(
        (item) =>
          item.isSerialized &&
          Number(item.productId) === productId
      )
      .reduce(
        (total, item) => total + Number(item.quantity),
        0
      );
  }

  function selectedQuantity(productId: number) {
    const devices = availableDevices[productId] ?? [];

    return selectedDeviceIds.filter((deviceId) =>
      devices.some((device) => device.id === deviceId)
    ).length;
  }

  function toggleDevice(
    device: InventoryDevice,
    checked: boolean
  ) {
    const productId = Number(device.productId);

    setError("");

    setSelectedDeviceIds((current) => {
      if (!checked) {
        return current.filter((id) => id !== device.id);
      }

      if (current.includes(device.id)) {
        return current;
      }

      const required = requiredQuantity(productId);

      const currentlySelected = current.filter((deviceId) =>
        (availableDevices[productId] ?? []).some(
          (candidate) => candidate.id === deviceId
        )
      ).length;

      if (currentlySelected >= required) {
        setError(
          `Bu ürün için en fazla ${required} adet seri numaralı cihaz seçebilirsiniz.`
        );

        return current;
      }

      return [...current, device.id];
    });
  }

  async function deliver(e: FormEvent) {
    e.preventDefault();

    if (!order) {
      return;
    }

    setError("");

    const serializedItems = (order.items ?? []).filter(
      (item) => item.productId && item.isSerialized
    );

    for (const item of serializedItems) {
      const productId = Number(item.productId);
      const required = requiredQuantity(productId);
      const selected = selectedQuantity(productId);

      if (selected !== required) {
        setError(
          `${item.productName ?? item.description} için ${required} adet seri numaralı cihaz seçmelisiniz.`
        );
        return;
      }
    }

    setSaving(true);

    try {
      const deliveredOrder = await api.deliverOrder(id, {
        deliveryNote: note,
        warrantyMonths: Number(warranty),
        deviceIds: selectedDeviceIds,
      });

      setOrder(deliveredOrder);
      setAvailableDevices({});
      setSelectedDeviceIds([]);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Teslimat tamamlanamadı."
      );
    } finally {
      setSaving(false);
    }
  }

  const serializedProductIds = order
    ? [
        ...new Set(
          (order.items ?? [])
            .filter(
              (item) => item.productId && item.isSerialized
            )
            .map((item) => Number(item.productId))
        ),
      ]
    : [];

  return (
    <AppShell
      title="Sipariş Detayı"
      subtitle="Teslimat, cihaz ataması ve garanti başlangıcı."
    >
      {error ? (
        <div className="inline-error">{error}</div>
      ) : null}

      {order ? (
        <>
          <div className="breadcrumb">
            <Link href="/sales">Satış</Link>
            <Icon name="arrow" size={13} />
            <span>{order.orderNo}</span>
          </div>

          <section className="entity-header">
            <div className="entity-icon">
              <Icon name="cart" />
            </div>

            <div>
              <div className="entity-title">
                <h2>{order.orderNo}</h2>
                <Badge tone={toneFor(order.status)}>
                  {order.status}
                </Badge>
              </div>

              <div className="entity-tags">
                <Badge tone="primary">
                  {order.customerName}
                </Badge>
                <Badge>{money(order.grandTotal)}</Badge>
              </div>
            </div>
          </section>

          <div className="detail-facts">
            <div>
              <span>Oluşturma</span>
              <strong>
                {new Date(order.createdAt).toLocaleString(
                  "tr-TR"
                )}
              </strong>
            </div>

            <div>
              <span>Teslim</span>
              <strong>
                {order.deliveredAt
                  ? new Date(
                      order.deliveredAt
                    ).toLocaleString("tr-TR")
                  : "Henüz teslim edilmedi"}
              </strong>
            </div>

            <div>
              <span>Ara Toplam</span>
              <strong>{money(order.subtotal)}</strong>
            </div>

            <div>
              <span>KDV</span>
              <strong>{money(order.vatTotal)}</strong>
            </div>

            <div>
              <span>Genel Toplam</span>
              <strong>{money(order.grandTotal)}</strong>
            </div>
          </div>

          <div className="detail-grid">
            <Panel title="Sipariş Kalemleri">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Ürün</th>
                      <th>Miktar</th>
                      <th>Birim</th>
                      <th>Toplam</th>
                    </tr>
                  </thead>

                  <tbody>
                    {order.items?.map((item) => (
                      <tr key={item.id}>
                        <td>{item.description}</td>
                        <td>{item.quantity}</td>
                        <td>{money(item.unitPrice)}</td>
                        <td>{money(item.lineTotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>

            <Panel title="Seri Numaralı Cihazlar">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Seri No</th>
                      <th>Ürün</th>
                      <th>Garanti</th>
                    </tr>
                  </thead>

                  <tbody>
                    {order.devices?.length ? (
                      order.devices.map((device) => (
                        <tr key={device.id}>
                          <td className="mono">
                            {device.serialNumber}
                          </td>
                          <td>{device.productName}</td>
                          <td>
                            {device.warrantyEndAt
                              ? new Date(
                                  device.warrantyEndAt
                                ).toLocaleDateString("tr-TR")
                              : "Teslimatta başlar"}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3}>
                          Henüz bu siparişe cihaz atanmadı.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Panel>
          </div>

          {order.status !== "DELIVERED" &&
          can("sales.manage") ? (
            <Panel title="Teslimatı Tamamla">
              <form
                className="erp-form"
                onSubmit={deliver}
              >
                {serializedProductIds.length > 0 ? (
                  <div className="record-block">
                    <h3>Seri Numarası Seçimi</h3>

                    {loadingDevices ? (
                      <p>Stoktaki cihazlar yükleniyor…</p>
                    ) : (
                      serializedProductIds.map(
                        (productId) => {
                          const item = (
                            order.items ?? []
                          ).find(
                            (candidate) =>
                              Number(
                                candidate.productId
                              ) === productId
                          );

                          const devices =
                            availableDevices[productId] ?? [];

                          const required =
                            requiredQuantity(productId);

                          const selected =
                            selectedQuantity(productId);

                          return (
                            <div
                              className="record-block"
                              key={productId}
                            >
                              <p>
                                <strong>
                                  {item?.productName ??
                                    item?.description ??
                                    `Ürün #${productId}`}
                                </strong>
                                {" — "}
                                {required} adet gerekli,{" "}
                                {selected} adet seçildi.
                              </p>

                              {devices.length ? (
                                <div className="table-wrap">
                                  <table>
                                    <thead>
                                      <tr>
                                        <th>Seç</th>
                                        <th>Seri No</th>
                                        <th>Durum</th>
                                      </tr>
                                    </thead>

                                    <tbody>
                                      {devices.map(
                                        (device) => (
                                          <tr
                                            key={device.id}
                                          >
                                            <td>
                                              <input
                                                type="checkbox"
                                                checked={selectedDeviceIds.includes(
                                                  device.id
                                                )}
                                                onChange={(
                                                  e
                                                ) =>
                                                  toggleDevice(
                                                    device,
                                                    e.target
                                                      .checked
                                                  )
                                                }
                                              />
                                            </td>

                                            <td className="mono">
                                              {
                                                device.serialNumber
                                              }
                                            </td>

                                            <td>
                                              <Badge
                                                tone={toneFor(
                                                  device.status
                                                )}
                                              >
                                                {
                                                  device.status
                                                }
                                              </Badge>
                                            </td>
                                          </tr>
                                        )
                                      )}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <div className="inline-error">
                                  Bu ürün için stokta
                                  teslim edilebilir seri
                                  numaralı cihaz bulunmuyor.
                                </div>
                              )}
                            </div>
                          );
                        }
                      )
                    )}
                  </div>
                ) : null}

                <div className="form-grid">
                  <label>
                    <span>Garanti Süresi (Ay)</span>
                    <input
                      type="number"
                      min="0"
                      max="120"
                      value={warranty}
                      onChange={(e) =>
                        setWarranty(e.target.value)
                      }
                    />
                  </label>

                  <label className="span-2">
                    <span>Teslimat Notu</span>
                    <input
                      value={note}
                      onChange={(e) =>
                        setNote(e.target.value)
                      }
                      placeholder="Teslim alan kişi, kargo bilgisi vb."
                    />
                  </label>
                </div>

                <div className="record-block">
                  <p>
                    Teslimat tamamlandığında seçilen seri
                    numaralı cihazlar müşteriye atanır, stok
                    çıkışı oluşturulur ve garanti başlangıç /
                    bitiş tarihleri otomatik hesaplanır.
                  </p>
                </div>

                <div className="form-actions">
                  <button
                    className="btn btn-primary"
                    disabled={
                      saving || loadingDevices
                    }
                  >
                    {saving
                      ? "Teslim ediliyor…"
                      : "Teslimatı Tamamla & Garantiyi Başlat"}
                  </button>
                </div>
              </form>
            </Panel>
          ) : (
            <Panel title="Teslimat Bilgisi">
              <p>
                {order.deliveryNote ||
                  "Teslimat notu bulunmuyor."}
              </p>
            </Panel>
          )}
        </>
      ) : (
        <div className="auth-loading">
          Sipariş yükleniyor…
        </div>
      )}
    </AppShell>
  );
}