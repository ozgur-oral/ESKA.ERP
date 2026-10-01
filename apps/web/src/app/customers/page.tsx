"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell, Badge, Panel } from "@/components/app-shell";
import { Icon } from "@/components/icon";
import { api, type Customer } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function CustomersPage(){
 const {can}=useAuth(); const [items,setItems]=useState<Customer[]>([]); const [q,setQ]=useState(""); const [loading,setLoading]=useState(true); const [error,setError]=useState("");
 useEffect(()=>{let live=true;setLoading(true);api.customers().then(v=>live&&setItems(v)).catch(e=>live&&setError(e.message)).finally(()=>live&&setLoading(false));return()=>{live=false}},[]);
 const filtered=useMemo(()=>{const x=q.toLocaleLowerCase("tr-TR").trim();if(!x)return items;return items.filter(c=>[c.name,c.code,c.city??"",c.contactName??"",c.phone??""].some(v=>v.toLocaleLowerCase("tr-TR").includes(x)))},[items,q]);
 return <AppShell title="Müşteriler" subtitle="Firma, kişi ve müşteri ilişkilerini gerçek veritabanı üzerinden yönetin." actions={can("customer.manage")?<Link className="btn btn-primary" href="/customers/new"><Icon name="plus" size={15}/> Yeni Müşteri</Link>:undefined}>
  <div className="module-stats"><div className="mini-stat"><span>Toplam Müşteri</span><strong>{items.length}</strong><small>veritabanı kaydı</small></div><div className="mini-stat"><span>Aktif</span><strong>{items.filter(x=>x.status==="ACTIVE").length}</strong><small>aktif cari</small></div><div className="mini-stat"><span>Firma</span><strong>{items.filter(x=>x.type==="COMPANY").length}</strong><small>kurumsal kayıt</small></div><div className="mini-stat"><span>Kişi</span><strong>{items.filter(x=>x.type==="PERSON").length}</strong><small>bireysel kayıt</small></div></div>
  {error?<div className="inline-error">{error}</div>:null}
  <Panel title={loading?"Müşteri Listesi · yükleniyor…":"Müşteri Listesi"} action={<label className="table-search"><Icon name="search" size={14}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Müşteri ara..."/></label>}>
   <div className="table-wrap"><table><thead><tr><th>Kod</th><th>Firma / Kişi</th><th>Şehir</th><th>Yetkili</th><th>Telefon</th><th>E-posta</th><th>Durum</th><th></th></tr></thead><tbody>{filtered.map(c=><tr key={c.id}><td className="mono">{c.code}</td><td><Link className="strong-link" href={`/customers/${c.id}`}>{c.name}</Link></td><td>{c.city||"—"}</td><td>{c.contactName||"—"}</td><td>{c.phone||"—"}</td><td>{c.email||"—"}</td><td><Badge tone={c.status==="ACTIVE"?"success":"neutral"}>{c.status==="ACTIVE"?"Aktif":"Pasif"}</Badge></td><td><Link className="row-link" href={`/customers/${c.id}`}><Icon name="arrow" size={15}/></Link></td></tr>)}</tbody></table>{!loading&&!filtered.length?<div className="empty-state">Henüz müşteri kaydı yok.</div>:null}</div>
  </Panel>
 </AppShell>
}
