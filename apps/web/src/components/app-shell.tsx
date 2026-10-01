"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Icon, type IconName } from "./icon";
import { GlobalSearch } from "./global-search";

const nav: { href: string; label: string; icon: IconName; group?: string; permission: string }[] = [
  { href: "/", label: "Dashboard", icon: "home", permission: "dashboard.view" },
  { href: "/tasks", label: "Görevlerim", icon: "briefcase", group: "ÇALIŞMA", permission: "task.view" },
  { href: "/customers", label: "Müşteriler", icon: "users", group: "CRM", permission: "customer.view" },
  { href: "/crm", label: "CRM & İletişim", icon: "users", permission: "crm.view" },
  { href: "/communications", label: "İletişim Kuyruğu", icon: "bell", permission: "communication.view" },
  { href: "/sales", label: "Satış & Teklifler", icon: "cart", group: "TİCARİ", permission: "sales.view" },
  { href: "/stock", label: "Ürün & Stok", icon: "box", permission: "stock.view" },
  { href: "/purchasing", label: "Satın Alma", icon: "cart", permission: "purchase.view" },
  { href: "/rentals", label: "Kiralama & Demo", icon: "box", permission: "rental.view" },
  { href: "/maintenance", label: "Bakım & Kalibrasyon", icon: "wrench", permission: "maintenance.view" },
  { href: "/documents", label: "Dokümanlar", icon: "briefcase", permission: "document.view" },
  { href: "/finance", label: "Finans & Cari", icon: "chart", permission: "finance.view" },
  { href: "/service", label: "Teknik Servis", icon: "wrench", group: "TEKNİK", permission: "service.view" },
  { href: "/support", label: "Destek / Ticket", icon: "help", permission: "support.view" },
  { href: "/cors", label: "CORS", icon: "signal", group: "OPERASYON", permission: "cors.view" },
  { href: "/projects", label: "Projeler & GES", icon: "briefcase", permission: "project.view" },
  { href: "/reports", label: "Raporlar", icon: "chart", group: "YÖNETİM", permission: "report.view" },
  { href: "/organization", label: "Personel & Organizasyon", icon: "users", group: "YÖNETİM", permission: "organization.view" },
  { href: "/organization/hr", label: "İK Operasyonları", icon: "calendar", permission: "organization.view" },
  { href: "/users", label: "Kullanıcı & Yetki", icon: "shield", permission: "user.view" },
  { href: "/audit", label: "Sistem Hareketleri", icon: "shield", permission: "audit.view" },
  { href: "/settings", label: "Ayarlar", icon: "gear", permission: "settings.manage" },
];

function active(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ title, subtitle, children, actions }: { title: string; subtitle: string; children: ReactNode; actions?: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, can, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => { if (!loading && !user) router.replace("/login"); }, [loading, user, router]);
  useEffect(() => { if (user) api.notificationSummary().then((x) => setNotificationCount(x.unread)).catch(() => {}); }, [user, pathname]);

  if (loading || !user) return <div className="auth-loading"><div className="brand-mark">E</div><strong>ESKA.ERP yükleniyor…</strong></div>;
  const visibleNav = nav.filter((item) => can(item.permission));
  const currentNav = nav.find((item) => active(pathname, item.href));
  const initials = `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toLocaleUpperCase("tr-TR");

  if (currentNav && !can(currentNav.permission)) {
    return <div className="auth-loading"><div><strong>403 · Yetkisiz erişim</strong><p>Bu modülü görüntülemek için gerekli rol/yetkiye sahip değilsiniz.</p><button className="btn btn-primary" onClick={() => router.replace("/")}>Dashboard’a dön</button></div></div>;
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        <div className="brand-row"><div className="brand-mark">E</div><div className="brand-copy"><strong>ESKA.ERP</strong><span>Operasyon Platformu</span></div><button className="sidebar-close" onClick={() => setMobileOpen(false)} aria-label="Menüyü kapat"><Icon name="close" /></button></div>
        <nav className="nav-list">
          {visibleNav.map((item, index) => {
            const previousGroup = index > 0 ? visibleNav[index - 1].group : undefined;
            const showGroup = item.group && item.group !== previousGroup;
            return <div key={item.href}>{showGroup ? <div className="nav-group">{item.group}</div> : null}<Link className={`nav-item ${active(pathname, item.href) ? "nav-active" : ""}`} href={item.href} onClick={() => setMobileOpen(false)}><Icon name={item.icon} size={17} /><span>{item.label}</span></Link></div>;
          })}
        </nav>
        <div className="sidebar-footer"><strong>KAYA HARİTA</strong><span>Daha doğru bir dünya için</span></div>
      </aside>
      {mobileOpen ? <button className="sidebar-backdrop" aria-label="Menüyü kapat" onClick={() => setMobileOpen(false)} /> : null}
      <main className="main-column">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Menüyü aç"><Icon name="menu" /></button>
          <GlobalSearch />
          <div className="top-actions"><Link className="top-icon" href="/notifications" aria-label="Bildirimler"><Icon name="bell" size={17}/>{notificationCount > 0 ? <b>{notificationCount > 99 ? "99+" : notificationCount}</b> : null}</Link><div className="profile"><div className="avatar">{initials}</div><div><strong>{user.firstName} {user.lastName}</strong><span>{user.department}</span></div></div><button className="logout-button" onClick={logout} title="Çıkış yap">Çıkış</button></div>
        </header>
        <div className="page-content"><div className="page-head"><div><p className="eyebrow">ESKA.ERP</p><h1>{title}</h1><span>{subtitle}</span></div>{actions ? <div className="head-actions">{actions}</div> : null}</div>{children}</div>
      </main>
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "warning" | "danger" | "primary" }) { return <span className={`badge badge-${tone}`}>{children}</span>; }
export function Panel({ title, action, children, className = "" }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) { return <section className={`panel ${className}`}><div className="panel-head"><h3>{title}</h3>{action}</div>{children}</section>; }
export function PrimaryButton({ children }: { children: ReactNode }) { return <button className="btn btn-primary">{children}</button>; }
export function SecondaryButton({ children }: { children: ReactNode }) { return <button className="btn btn-secondary">{children}</button>; }
export function toneFor(value: string) { const success = ["Aktif", "Hazır", "Onaylandı", "Çözüldü", "Tamamlandı"]; const warning = ["Takipte", "Testte", "Bakımda", "Gönderildi", "İnceleniyor", "Onay Bekliyor"]; const danger = ["Kritik", "Parça Bekliyor", "Bağlantı", "Gecikmiş", "İptal"]; if (success.includes(value)) return "success" as const; if (warning.includes(value)) return "warning" as const; if (danger.includes(value)) return "danger" as const; return "neutral" as const; }
