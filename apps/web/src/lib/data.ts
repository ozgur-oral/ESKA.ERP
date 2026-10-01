export type Tone = "neutral" | "success" | "warning" | "danger" | "primary";

export const dashboardStats = [
  { label: "Toplam Satış", value: "₺ 12.450.000", meta: "+16%", tone: "primary" as Tone },
  { label: "Açık Teklif", value: "24", meta: "₺ 3.280.000", tone: "success" as Tone },
  { label: "Servisteki Cihaz", value: "12", meta: "3 gecikmiş", tone: "danger" as Tone },
  { label: "Aktif CORS", value: "1.842", meta: "+92 bu ay", tone: "success" as Tone },
];

export const customers = [
  { id: "abc-insaat", name: "ABC İnşaat A.Ş.", city: "Ankara", contact: "Ahmet Demir", phone: "+90 312 123 45 67", offers: 12, revenue: "₺ 4.280.000", cors: 7, status: "Aktif" },
  { id: "atlas-harita", name: "Atlas Harita Ltd.", city: "İstanbul", contact: "Burak Kaya", phone: "+90 212 555 14 10", offers: 8, revenue: "₺ 2.940.000", cors: 4, status: "Aktif" },
  { id: "nova-enerji", name: "Nova Enerji", city: "Konya", contact: "Ece Şahin", phone: "+90 332 555 22 18", offers: 5, revenue: "₺ 1.860.000", cors: 2, status: "Aktif" },
  { id: "mira-muhendislik", name: "Mira Mühendislik", city: "İzmir", contact: "Can Aksoy", phone: "+90 232 555 17 45", offers: 3, revenue: "₺ 980.000", cors: 1, status: "Takipte" },
];

export const offers = [
  { code: "TF-2026-0030", customer: "Mira Mühendislik", owner: "Özgür Oral", total: "₺ 320.000", validUntil: "20 Eyl 2026", status: "Onay Bekliyor" },
  { code: "TF-2026-0029", customer: "ABC İnşaat A.Ş.", owner: "Selim Aras", total: "₺ 1.450.000", validUntil: "18 Eyl 2026", status: "Gönderildi" },
  { code: "TF-2026-0028", customer: "Atlas Harita Ltd.", owner: "Özgür Oral", total: "₺ 785.000", validUntil: "25 Eyl 2026", status: "Taslak" },
  { code: "TF-2026-0027", customer: "Nova Enerji", owner: "Merve Koç", total: "₺ 545.000", validUntil: "17 Eyl 2026", status: "Onaylandı" },
];

export const stock = [
  { code: "GNSS-001", name: "Leica GS18", category: "GNSS", brand: "Leica", qty: 12, price: "₺ 645.000", status: "Aktif" },
  { code: "TS-001", name: "Leica TS16", category: "Total Station", brand: "Leica", qty: 8, price: "₺ 830.000", status: "Aktif" },
  { code: "ACC-001", name: "Karbon Pole", category: "Aksesuar", brand: "Leica", qty: 45, price: "₺ 12.500", status: "Aktif" },
  { code: "SOF-001", name: "Leica Infinity", category: "Yazılım", brand: "Leica", qty: 6, price: "₺ 65.000", status: "Kritik" },
];

export const services = [
  { id: "SRV-2026-0045", customer: "ABC İnşaat A.Ş.", device: "Leica GS18", serial: "5213456", complaint: "GPS sinyali alamıyor", status: "Parça Bekliyor", owner: "Ahmet Kaya", due: "20 Eyl" },
  { id: "SRV-2026-0044", customer: "Atlas Harita Ltd.", device: "Leica TS16", serial: "TS160884", complaint: "Açı okuması kararsız", status: "Testte", owner: "Mehmet Demir", due: "18 Eyl" },
  { id: "SRV-2026-0043", customer: "Nova Enerji", device: "Leica CS20", serial: "CS201741", complaint: "Ekran açılmıyor", status: "İnceleniyor", owner: "Ahmet Kaya", due: "17 Eyl" },
  { id: "SRV-2026-0042", customer: "Mira Mühendislik", device: "Leica GS16", serial: "GS160912", complaint: "Batarya soketi gevşek", status: "Hazır", owner: "Selim Aras", due: "16 Eyl" },
];

export const corsStations = [
  { code: "CORS-ANK-01", city: "Ankara · Merkez", status: "Aktif", uptime: "99.9%", users: 228, ip: "10.20.1.11", mount: "ANK01" },
  { code: "CORS-IST-01", city: "İstanbul · Çamlıca", status: "Aktif", uptime: "99.7%", users: 312, ip: "10.20.1.12", mount: "IST01" },
  { code: "CORS-IZM-01", city: "İzmir · Bornova", status: "Bakımda", uptime: "97.4%", users: 175, ip: "10.20.1.13", mount: "IZM01" },
  { code: "CORS-ANT-01", city: "Antalya · Kepez", status: "Aktif", uptime: "99.8%", users: 188, ip: "10.20.1.14", mount: "ANT01" },
  { code: "CORS-ORD-01", city: "Ordu · Altınordu", status: "Bağlantı", uptime: "91.2%", users: 92, ip: "10.20.1.15", mount: "ORD01" },
  { code: "CORS-TRB-01", city: "Trabzon · Ortahisar", status: "Aktif", uptime: "99.6%", users: 164, ip: "10.20.1.16", mount: "TRB01" },
];

export const projects = [
  { code: "GES-2026-014", name: "Konya Karapınar GES", customer: "Nova Enerji", power: "48 MWp", progress: 72, stage: "Saha Ölçümü", owner: "Proje Ekibi A" },
  { code: "GES-2026-011", name: "Ankara Polatlı GES", customer: "ABC İnşaat A.Ş.", power: "24 MWp", progress: 46, stage: "Haritalama", owner: "Proje Ekibi B" },
  { code: "PRJ-2026-038", name: "İstanbul Altyapı Ölçümü", customer: "Atlas Harita Ltd.", power: "—", progress: 88, stage: "Teslim Hazırlığı", owner: "Saha Operasyon" },
];
