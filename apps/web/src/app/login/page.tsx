"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { ApiError } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, login } = useAuth();
  const [identifier, setIdentifier] = useState("admin");
  const [password, setPassword] = useState("Admin123!");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { if (!loading && user) router.replace("/"); }, [loading, user, router]);

  async function submit(event: FormEvent) {
    event.preventDefault(); setSubmitting(true); setError("");
    try { await login(identifier, password); router.replace("/"); }
    catch (err) { setError(err instanceof ApiError ? err.message : "Giriş yapılamadı."); }
    finally { setSubmitting(false); }
  }

  return <main className="login-page"><section className="login-visual"><div className="login-brand"><div className="brand-mark">E</div><strong>ESKA.ERP</strong></div><div><span className="login-kicker">ESKA GRUP OPERASYON PLATFORMU</span><h1>Tüm operasyonlar.<br/>Tek merkez.</h1><p>Satıştan teknik servise, stoktan CORS altyapısına kadar tüm iş süreçlerini güvenli rol bazlı erişimle yönetin.</p></div><div className="login-footer">KAYA HARİTA · Daha doğru bir dünya için</div></section><section className="login-form-wrap"><form className="login-card" onSubmit={submit}><div><span className="eyebrow">GÜVENLİ GİRİŞ</span><h2>ESKA.ERP’ye Hoş Geldiniz</h2><p>Kurumsal hesabınızla devam edin.</p></div><label>Kullanıcı adı veya e-posta<input value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" /></label><label>Şifre<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></label>{error ? <div className="login-error">{error}</div> : null}<button className="btn btn-primary login-submit" disabled={submitting}>{submitting ? "Giriş yapılıyor…" : "Giriş Yap"}</button><div className="demo-accounts"><strong>Demo roller</strong><span>admin / Admin123!</span><span>satis / Satis123!</span><span>destek / Destek123!</span><span>servis / Servis123!</span><span>satinalma / SatinAlma123!</span></div></form></section></main>;
}
