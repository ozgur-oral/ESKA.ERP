"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell, Panel } from "@/components/app-shell";
import { api, type CustomerInput } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function NewCustomerPage(){
 const router=useRouter();const {can}=useAuth();const [saving,setSaving]=useState(false);const [error,setError]=useState("");
 const [form,setForm]=useState<CustomerInput>({name:"",type:"COMPANY",status:"ACTIVE",contactName:"",phone:"",email:"",city:"",district:"",taxOffice:"",taxNumber:"",address:"",notes:"",creditLimit:"0",riskPolicy:"WARN",paymentTermDays:30,riskNotes:""});
 if(!can("customer.manage"))return <AppShell title="Yeni Müşteri" subtitle="Yetki gerekli"><div className="inline-error">Müşteri oluşturma yetkiniz bulunmuyor.</div></AppShell>;
 const set=(key:keyof CustomerInput,value:string)=>setForm(v=>({...v,[key]:value}));
 async function submit(e:FormEvent){e.preventDefault();setSaving(true);setError("");try{const created=await api.createCustomer(form);router.push(`/customers/${created.id}`)}catch(err){setError(err instanceof Error?err.message:"Kayıt oluşturulamadı.")}finally{setSaving(false)}}
 return <AppShell title="Yeni Müşteri" subtitle="Yeni firma veya kişi cari kartı oluşturun." actions={<Link className="btn btn-secondary" href="/customers">Vazgeç</Link>}>
  <Panel title="Müşteri Bilgileri"><form className="erp-form" onSubmit={submit}><div className="form-grid">
   <label><span>Müşteri Türü</span><select value={form.type} onChange={e=>set("type",e.target.value)}><option value="COMPANY">Firma</option><option value="PERSON">Kişi</option></select></label>
   <label className="span-2"><span>Firma / Kişi Adı *</span><input required value={form.name} onChange={e=>set("name",e.target.value)} /></label>
   <label><span>Yetkili</span><input value={form.contactName??""} onChange={e=>set("contactName",e.target.value)}/></label><label><span>Telefon</span><input value={form.phone??""} onChange={e=>set("phone",e.target.value)}/></label><label><span>E-posta</span><input type="email" value={form.email??""} onChange={e=>set("email",e.target.value)}/></label>
   <label><span>Şehir</span><input value={form.city??""} onChange={e=>set("city",e.target.value)}/></label><label><span>İlçe</span><input value={form.district??""} onChange={e=>set("district",e.target.value)}/></label><label><span>Durum</span><select value={form.status} onChange={e=>set("status",e.target.value)}><option value="ACTIVE">Aktif</option><option value="PASSIVE">Pasif</option></select></label>
   <label><span>Vergi Dairesi</span><input value={form.taxOffice??""} onChange={e=>set("taxOffice",e.target.value)}/></label><label><span>Vergi / T.C. No</span><input value={form.taxNumber??""} onChange={e=>set("taxNumber",e.target.value)}/></label><label><span>Kredi / Risk Limiti (TL)</span><input type="number" min="0" step="0.01" value={form.creditLimit??"0"} onChange={e=>setForm(v=>({...v,creditLimit:e.target.value}))}/></label><label><span>Risk Politikası</span><select value={form.riskPolicy??"WARN"} onChange={e=>setForm(v=>({...v,riskPolicy:e.target.value as "WARN"|"BLOCK"}))}><option value="WARN">Uyar, devam et</option><option value="BLOCK">Limit aşımında bloke et</option></select></label><label><span>Standart Vade (gün)</span><input type="number" min="0" max="365" value={form.paymentTermDays??30} onChange={e=>setForm(v=>({...v,paymentTermDays:Number(e.target.value)}))}/></label><label className="span-3"><span>Risk Notu</span><textarea rows={2} value={form.riskNotes??""} onChange={e=>setForm(v=>({...v,riskNotes:e.target.value}))}/></label><label className="span-3"><span>Adres</span><textarea rows={3} value={form.address??""} onChange={e=>set("address",e.target.value)}/></label><label className="span-3"><span>Not</span><textarea rows={3} value={form.notes??""} onChange={e=>set("notes",e.target.value)}/></label>
  </div>{error?<div className="inline-error">{error}</div>:null}<div className="form-actions"><Link className="btn btn-secondary" href="/customers">İptal</Link><button className="btn btn-primary" disabled={saving}>{saving?"Kaydediliyor…":"Müşteriyi Kaydet"}</button></div></form></Panel>
 </AppShell>
}
