export const customers = [
  { id: "abc-insaat", name: "ABC İnşaat A.Ş.", city: "Ankara", contact: "Ahmet Demir", phone: "+90 312 123 45 67", offers: 12, revenue: 4280000, cors: 7, status: "Aktif" },
  { id: "atlas-harita", name: "Atlas Harita Ltd.", city: "İstanbul", contact: "Burak Kaya", phone: "+90 212 555 14 10", offers: 8, revenue: 2940000, cors: 4, status: "Aktif" },
  { id: "nova-enerji", name: "Nova Enerji", city: "Konya", contact: "Ece Şahin", phone: "+90 332 555 22 18", offers: 5, revenue: 1860000, cors: 2, status: "Aktif" },
  { id: "mira-muhendislik", name: "Mira Mühendislik", city: "İzmir", contact: "Can Aksoy", phone: "+90 232 555 17 45", offers: 3, revenue: 980000, cors: 1, status: "Takipte" }
];

export const serviceRecords = [
  { id: "SRV-2026-0045", customer: "ABC İnşaat A.Ş.", device: "Leica GS18", serial: "5213456", complaint: "GPS sinyali alamıyor", status: "Parça Bekliyor", owner: "Ahmet Kaya", due: "2026-09-20" },
  { id: "SRV-2026-0044", customer: "Atlas Harita Ltd.", device: "Leica TS16", serial: "TS160884", complaint: "Açı okuması kararsız", status: "Testte", owner: "Mehmet Demir", due: "2026-09-18" },
  { id: "SRV-2026-0043", customer: "Nova Enerji", device: "Leica CS20", serial: "CS201741", complaint: "Ekran açılmıyor", status: "İnceleniyor", owner: "Ahmet Kaya", due: "2026-09-17" },
  { id: "SRV-2026-0042", customer: "Mira Mühendislik", device: "Leica GS16", serial: "GS160912", complaint: "Batarya soketi gevşek", status: "Hazır", owner: "Selim Aras", due: "2026-09-16" }
];

export const corsStations = [
  { code: "CORS-ANK-01", city: "Ankara", district: "Merkez", status: "Aktif", uptime: 99.9, users: 228, ip: "10.20.1.11", port: 2101, mountpoint: "ANK01", firmware: "4.20" },
  { code: "CORS-IST-01", city: "İstanbul", district: "Çamlıca", status: "Aktif", uptime: 99.7, users: 312, ip: "10.20.1.12", port: 2101, mountpoint: "IST01", firmware: "4.20" },
  { code: "CORS-IZM-01", city: "İzmir", district: "Bornova", status: "Bakımda", uptime: 97.4, users: 175, ip: "10.20.1.13", port: 2101, mountpoint: "IZM01", firmware: "4.18" },
  { code: "CORS-ORD-01", city: "Ordu", district: "Altınordu", status: "Bağlantı", uptime: 91.2, users: 92, ip: "10.20.1.15", port: 2101, mountpoint: "ORD01", firmware: "4.17" }
];

export const offers = [
  { code: "TF-2026-0030", customer: "Mira Mühendislik", owner: "Özgür Oral", total: 320000, validUntil: "2026-09-20", status: "Onay Bekliyor" },
  { code: "TF-2026-0029", customer: "ABC İnşaat A.Ş.", owner: "Selim Aras", total: 1450000, validUntil: "2026-09-18", status: "Gönderildi" },
  { code: "TF-2026-0028", customer: "Atlas Harita Ltd.", owner: "Özgür Oral", total: 785000, validUntil: "2026-09-25", status: "Taslak" },
  { code: "TF-2026-0027", customer: "Nova Enerji", owner: "Merve Koç", total: 545000, validUntil: "2026-09-17", status: "Onaylandı" }
];
