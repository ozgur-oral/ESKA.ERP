"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AppShell, Badge, Panel } from "@/components/app-shell";
import { Icon } from "@/components/icon";
import { api, type Product, type ServiceRecord } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const labels:Record<string,string>={WAITING:"Bekliyor",EXAMINING:"İnceleniyor",WAITING_PART:"Parça Bekliyor",REPAIRING:"Onarımda",TESTING:"Testte",READY:"Hazır",DELIVERED:"Teslim Edildi",CANCELLED:"İptal"};
const flow=["WAITING","EXAMINING","WAITING_PART","REPAIRING","TESTING","READY","DELIVERED"];
const serviceTypeLabel:Record<string,string>={WARRANTY:"Garanti",PAID:"Ücretli",GOODWILL:"İyi Niyet"};
const opLabel:Record<string,string>={DIAGNOSTIC:"Arıza Tespiti",REPAIR:"Onarım",TEST:"Test",NOTE:"Not",LABOR:"İşçilik"};
const money=(value:string|number|null|undefined)=>new Intl.NumberFormat("tr-TR",{style:"currency",currency:"TRY"}).format(Number(value??0));

export default function ServiceDetail(){
  const {id}=useParams<{id:string}>();
  const {can}=useAuth();
  const [s,setS]=useState<ServiceRecord|null>(null);
  const [products,setProducts]=useState<Product[]>([]);
  const [error,setError]=useState("");
  const [saving,setSaving]=useState(false);
  const [statusNote,setStatusNote]=useState("");
  const [operation,setOperation]=useState({type:"REPAIR",description:"",laborMinutes:"0",amount:"0"});
  const [part,setPart]=useState({productId:"",quantity:"1",unitPrice:""});
  const [billing,setBilling]=useState({serviceType:"PAID",warrantyCovered:false,diagnosis:"",resolution:"",paymentStatus:"UNPAID"});

  const load=async()=>{try{const record=await api.service(id);setS(record);setBilling({serviceType:record.serviceType??"PAID",warrantyCovered:Boolean(record.warrantyCovered),diagnosis:record.diagnosis??"",resolution:record.resolution??"",paymentStatus:record.paymentStatus??"UNPAID"});setError("");}catch(e){setError(e instanceof Error?e.message:"Servis kaydı yüklenemedi.")}};
  useEffect(()=>{load(); if(can("service.manage")) api.products().then(setProducts).catch(()=>{})},[id,can]);
  const spareParts=useMemo(()=>products.filter(p=>!p.isSerialized&&p.status==="ACTIVE"),[products]);

  async function change(status:string){setSaving(true);try{await api.updateServiceStatus(id,status,statusNote||undefined);setStatusNote("");await load();}catch(e){setError(e instanceof Error?e.message:"Güncellenemedi")}finally{setSaving(false)}}
  async function addOperation(e:FormEvent){e.preventDefault();setSaving(true);try{await api.addServiceOperation(id,{type:operation.type,description:operation.description,laborMinutes:Number(operation.laborMinutes||0),amount:Number(operation.amount||0)});setOperation({type:"REPAIR",description:"",laborMinutes:"0",amount:"0"});await load();}catch(e){setError(e instanceof Error?e.message:"İşlem eklenemedi.")}finally{setSaving(false)}}
  async function addPart(e:FormEvent){e.preventDefault();setSaving(true);try{await api.addServicePart(id,{productId:Number(part.productId),quantity:Number(part.quantity),unitPrice:part.unitPrice?Number(part.unitPrice):undefined});setPart({productId:"",quantity:"1",unitPrice:""});await load();}catch(e){setError(e instanceof Error?e.message:"Parça eklenemedi.")}finally{setSaving(false)}}
  async function saveBilling(e:FormEvent){e.preventDefault();setSaving(true);try{await api.updateServiceBilling(id,billing);await load();}catch(e){setError(e instanceof Error?e.message:"Servis bilgileri kaydedilemedi.")}finally{setSaving(false)}}

  return <AppShell title="Servis Kaydı" subtitle="Teknik servis operasyonu, maliyetler ve cihaz geçmişi." actions={s?<Link href={`/service/${id}/form`} className="btn btn-secondary" target="_blank"><Icon name="file" size={14}/> Servis Formu</Link>:undefined}>
    {error?<div className="inline-error">{error}</div>:null}
    {s?<>
      <div className="breadcrumb"><Link href="/service">Teknik Servis</Link><Icon name="arrow" size={13}/><span>{s.serviceNo}</span></div>
      <div className="service-summary-strip">
        <div><span>Servis No</span><strong>{s.serviceNo}</strong></div>
        <div><span>Müşteri</span><strong>{s.customerName}</strong></div>
        <div><span>Cihaz</span><strong>{s.deviceName}</strong><small>{s.serialNumber||"Seri no yok"}</small></div>
        <div><span>Servis Tipi</span><Badge tone={s.serviceType==="WARRANTY"?"success":s.serviceType==="GOODWILL"?"primary":"warning"}>{serviceTypeLabel[s.serviceType]??s.serviceType}</Badge></div>
        <div><span>Toplam</span><strong>{money(s.grandTotal)}</strong><small>{s.paymentStatus==="PAID"?"Ödendi":s.paymentStatus==="NO_CHARGE"?"Ücretsiz":"Ödenmedi"}</small></div>
      </div>

      <div className="service-v8-grid">
        <div className="service-main-column">
          <Panel title="Servis Süreci">
            <div className="timeline compact-timeline">{flow.map((status,index)=>{const current=Math.max(flow.indexOf(s.status),0);const done=index<=current;return <div className={`timeline-row ${done?"done":""}`} key={status}><span>{done?<Icon name="check" size={13}/>:null}</span><div><strong>{labels[status]}</strong></div></div>})}</div>
            {can("service.manage")?<div className="status-control"><input placeholder="Durum değişikliği notu (opsiyonel)" value={statusNote} onChange={e=>setStatusNote(e.target.value)}/><div className="status-actions">{flow.map(status=><button key={status} className={`btn ${s.status===status?"btn-primary":"btn-secondary"}`} onClick={()=>change(status)} disabled={saving||s.status===status}>{labels[status]}</button>)}</div></div>:null}
          </Panel>

          <Panel title="Yapılan İşlemler" action={<span className="panel-meta">{s.operations?.length??0} kayıt</span>}>
            <div className="service-ledger">{s.operations?.length?s.operations.map(op=><div className="ledger-row" key={op.id}><div className="ledger-icon"><Icon name="wrench" size={14}/></div><div><div className="ledger-title"><strong>{opLabel[op.type]??op.type}</strong><span>{new Date(op.createdAt).toLocaleString("tr-TR")}</span></div><p>{op.description}</p><small>{op.performedByName||"Kullanıcı"}{op.laborMinutes?` • ${op.laborMinutes} dk`:""}</small></div><strong>{Number(op.amount)>0?money(op.amount):"—"}</strong></div>):<div className="empty-state">Henüz servis işlemi girilmedi.</div>}</div>
            {can("service.manage")?<form className="inline-service-form" onSubmit={addOperation}><select value={operation.type} onChange={e=>setOperation(v=>({...v,type:e.target.value}))}><option value="DIAGNOSTIC">Arıza Tespiti</option><option value="REPAIR">Onarım</option><option value="TEST">Test</option><option value="LABOR">İşçilik</option><option value="NOTE">Not</option></select><input required placeholder="Yapılan işlem / açıklama" value={operation.description} onChange={e=>setOperation(v=>({...v,description:e.target.value}))}/><input type="number" min="0" placeholder="Dakika" value={operation.laborMinutes} onChange={e=>setOperation(v=>({...v,laborMinutes:e.target.value}))}/><input type="number" min="0" step="0.01" placeholder="İşçilik ₺" value={operation.amount} onChange={e=>setOperation(v=>({...v,amount:e.target.value}))}/><button className="btn btn-primary" disabled={saving}>İşlem Ekle</button></form>:null}
          </Panel>

          <Panel title="Kullanılan Yedek Parçalar" action={<span className="panel-meta">Stoktan otomatik düşer</span>}>
            <div className="table-wrap"><table><thead><tr><th>SKU</th><th>Parça</th><th>Miktar</th><th>Birim Fiyat</th><th>Tutar</th></tr></thead><tbody>{s.parts?.length?s.parts.map(p=><tr key={p.id}><td className="mono">{p.sku}</td><td>{p.productName}</td><td>{Number(p.quantity).toLocaleString("tr-TR")}</td><td>{money(p.unitPrice)}</td><td><strong>{money(p.lineTotal)}</strong></td></tr>):<tr><td colSpan={5}><div className="empty-state">Yedek parça kullanılmadı.</div></td></tr>}</tbody></table></div>
            {can("service.manage")?<form className="inline-service-form part-form" onSubmit={addPart}><select required value={part.productId} onChange={e=>{const p=spareParts.find(x=>String(x.id)===e.target.value);setPart(v=>({...v,productId:e.target.value,unitPrice:p?.salePrice??""}))}}><option value="">Yedek parça seçin</option>{spareParts.map(p=><option key={p.id} value={p.id}>{p.sku} — {p.name} — stok {Number(p.stockQuantity).toLocaleString("tr-TR")}</option>)}</select><input required type="number" min="0.001" step="0.001" value={part.quantity} onChange={e=>setPart(v=>({...v,quantity:e.target.value}))}/><input type="number" min="0" step="0.01" placeholder="Birim fiyat" value={part.unitPrice} onChange={e=>setPart(v=>({...v,unitPrice:e.target.value}))}/><button className="btn btn-primary" disabled={saving}>Parça Kullan</button></form>:null}
          </Panel>
        </div>

        <div className="service-side-column">
          <Panel title="Servis Kabul Bilgileri"><div className="fact-list padded-facts"><div><span>Arıza / Şikayet</span><strong>{s.problem}</strong></div><div><span>Kabul Tarihi</span><strong>{new Date(s.receivedAt).toLocaleString("tr-TR")}</strong></div><div><span>Öncelik</span><strong>{s.priority}</strong></div><div><span>Not</span><strong>{s.notes||"—"}</strong></div></div></Panel>

          <Panel title="Teşhis, Sonuç ve Ücretlendirme">
            {can("service.manage")?<form className="billing-form" onSubmit={saveBilling}><label><span>Servis Tipi</span><select value={billing.serviceType} onChange={e=>setBilling(v=>({...v,serviceType:e.target.value}))}><option value="PAID">Ücretli Servis</option><option value="WARRANTY">Garanti</option><option value="GOODWILL">İyi Niyet / Ücretsiz</option></select></label><label className="check-line billing-check"><input type="checkbox" checked={billing.warrantyCovered} onChange={e=>setBilling(v=>({...v,warrantyCovered:e.target.checked}))}/><span>Garanti kapsamında</span></label><label><span>Arıza Teşhisi</span><textarea rows={4} value={billing.diagnosis} onChange={e=>setBilling(v=>({...v,diagnosis:e.target.value}))}/></label><label><span>Yapılan Onarım / Sonuç</span><textarea rows={4} value={billing.resolution} onChange={e=>setBilling(v=>({...v,resolution:e.target.value}))}/></label><label><span>Ödeme</span><select value={billing.paymentStatus} onChange={e=>setBilling(v=>({...v,paymentStatus:e.target.value}))}><option value="UNPAID">Ödenmedi</option><option value="PAID">Ödendi</option><option value="NO_CHARGE">Ücretsiz</option></select></label><button className="btn btn-primary" disabled={saving}>Bilgileri Kaydet</button></form>:<div className="record-block"><p><strong>Teşhis:</strong> {s.diagnosis||"—"}</p><p><strong>Sonuç:</strong> {s.resolution||"—"}</p></div>}
          </Panel>

          <Panel title="Servis Tutarı"><div className="service-totals"><div><span>İşçilik</span><strong>{money(s.laborTotal)}</strong></div><div><span>Yedek Parça</span><strong>{money(s.partsTotal)}</strong></div><div className="grand"><span>Genel Toplam</span><strong>{money(s.grandTotal)}</strong></div>{s.warrantyCovered||s.serviceType!=="PAID"?<small>Garanti / ücretsiz servis nedeniyle müşteriye yansıtılan toplam 0 ₺ olabilir; gerçek parça ve işçilik maliyetleri geçmişte tutulur.</small>:null}</div></Panel>

          <Panel title="Durum Geçmişi"><div className="status-history">{s.statusHistory?.length?s.statusHistory.map(h=><div key={h.id}><span className="history-dot"/><div><strong>{h.fromStatus?`${labels[h.fromStatus]??h.fromStatus} → `:""}{labels[h.toStatus]??h.toStatus}</strong><small>{new Date(h.createdAt).toLocaleString("tr-TR")} • {h.changedByName||"Sistem"}</small>{h.note?<p>{h.note}</p>:null}</div></div>):<div className="empty-state">Geçmiş kaydı yok.</div>}</div></Panel>
        </div>
      </div>
    </>:<div className="auth-loading">Servis kaydı yükleniyor…</div>}
  </AppShell>
}
