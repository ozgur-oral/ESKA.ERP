"use client";
import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
import {AppShell,Badge,Panel} from "@/components/app-shell";
import {api,type FinanceAccount,type FinanceDocument,type FinanceSummary,type FinanceTransaction} from "@/lib/api";

const money=(v:string|number)=>new Intl.NumberFormat("tr-TR",{style:"currency",currency:"TRY"}).format(Number(v||0));
const label=(v:string)=>({RECEIVABLE:"Müşteri Alacağı",PAYABLE:"Tedarikçi Borcu",OPEN:"Açık",PARTIAL:"Kısmi",PAID:"Kapandı",SALES_ORDER:"Satış",SERVICE:"Servis",CORS_SUBSCRIPTION:"CORS",CORS_RENEWAL:"CORS Yenileme",PURCHASE_ORDER:"Satın Alma"}[v]||v);

export default function FinancePage(){
  const[summary,setSummary]=useState<FinanceSummary|null>(null);
  const[docs,setDocs]=useState<FinanceDocument[]>([]);
  const[accounts,setAccounts]=useState<FinanceAccount[]>([]);
  const[tx,setTx]=useState<FinanceTransaction[]>([]);
  const[error,setError]=useState("");
  const[direction,setDirection]=useState("");
  const[settling,setSettling]=useState<FinanceDocument|null>(null);
  const[amount,setAmount]=useState("");
  const[accountId,setAccountId]=useState("");
  const[busy,setBusy]=useState(false);

  async function load(){
    try{
      const[s,d,a,t]=await Promise.all([api.financeSummary(),api.financeDocuments(),api.financeAccounts(),api.financeTransactions()]);
      setSummary(s);setDocs(d);setAccounts(a);setTx(t);if(!accountId&&a[0])setAccountId(String(a[0].id));
    }catch(e){setError(e instanceof Error?e.message:"Finans verileri yüklenemedi.")}
  }
  useEffect(()=>{void load()},[]);
  const visible=useMemo(()=>direction?docs.filter(x=>x.direction===direction):docs,[docs,direction]);

  async function settle(){
    if(!settling||!accountId||!amount)return;
    setBusy(true);setError("");
    try{await api.settleFinanceDocument(String(settling.id),{accountId:Number(accountId),amount:Number(amount)});setSettling(null);setAmount("");await load()}
    catch(e){setError(e instanceof Error?e.message:"İşlem kaydedilemedi.")}
    finally{setBusy(false)}
  }

  return <AppShell title="Finans & Cari" subtitle="Müşteri alacakları, tedarikçi borçları, tahsilat/ödeme ve kasa-banka görünümü" actions={<><Link className="btn btn-secondary" href="/finance/ledger">Cari Ekstre</Link><Link className="btn btn-secondary" href="/finance/aging">Alacak Yaşlandırma</Link><Link className="btn btn-secondary" href="/finance/invoices">Faturalar</Link><Link className="btn btn-secondary" href="/finance/reports">KDV & e-Belge</Link><Link className="btn btn-secondary" href="/finance/parasut">Paraşüt</Link><button className="btn btn-secondary" onClick={async()=>{await api.syncFinance();await load()}}>Kaynakları Eşitle</button></>}>
    {error?<div className="inline-error">{error}</div>:null}
    <div className="stat-grid">
      <div className="stat-card"><span>Toplam Alacak</span><strong>{money(summary?.totalReceivable||0)}</strong><small>Müşterilerden beklenen</small></div>
      <div className="stat-card"><span>Toplam Borç</span><strong>{money(summary?.totalPayable||0)}</strong><small>Tedarikçilere ödenecek</small></div>
      <div className="stat-card"><span>Vadesi Geçmiş</span><strong>{money(summary?.overdueReceivable||0)}</strong><small>Geciken müşteri alacağı</small></div>
      <div className="stat-card"><span>Açık Belge</span><strong>{summary?.openDocuments||0}</strong><small>Açık + kısmi</small></div>
    </div>

    <Panel title="Kasa & Banka Hesapları">
      <div className="table-wrap"><table><thead><tr><th>Kod</th><th>Hesap</th><th>Tür</th><th>Para Birimi</th><th>Bakiye</th></tr></thead><tbody>
      {(summary?.accounts||[]).map(a=><tr key={a.id}><td className="mono">{a.code}</td><td><strong>{a.name}</strong></td><td>{a.type==="CASH"?"Kasa":"Banka"}</td><td>{a.currency}</td><td><strong>{money(a.balance||0)}</strong></td></tr>)}
      </tbody></table></div>
    </Panel>

    <Panel title="Cari Belgeler" action={<select value={direction} onChange={e=>setDirection(e.target.value)}><option value="">Tümü</option><option value="RECEIVABLE">Müşteri Alacakları</option><option value="PAYABLE">Tedarikçi Borçları</option></select>}>
      <div className="table-wrap"><table><thead><tr><th>Belge</th><th>Cari</th><th>Kaynak</th><th>Vade</th><th>Tutar</th><th>Ödenen</th><th>Kalan</th><th>Durum</th><th></th></tr></thead><tbody>
      {visible.map(d=><tr key={d.id}><td className="mono">{d.documentNo}</td><td><strong>{d.customerName||d.supplierName||"—"}</strong><br/><small>{label(d.direction)}</small></td><td>{label(d.sourceType)}</td><td>{d.dueDate?new Date(d.dueDate).toLocaleDateString("tr-TR"):"—"}</td><td>{money(d.amount)}</td><td>{money(d.paidAmount)}</td><td><strong>{money(d.balance)}</strong></td><td><Badge tone={d.status==="PAID"?"success":d.status==="PARTIAL"?"warning":"primary"}>{label(d.status)}</Badge></td><td>{d.status!=="PAID"&&d.status!=="CANCELLED"?<button className="btn btn-secondary" onClick={()=>{setSettling(d);setAmount(String(d.balance))}}>{d.direction==="RECEIVABLE"?"Tahsilat":"Ödeme"}</button>:null}</td></tr>)}
      {!visible.length?<tr><td colSpan={9}>Finans belgesi bulunmuyor.</td></tr>:null}
      </tbody></table></div>
    </Panel>

    {settling?<Panel title={`${settling.direction==="RECEIVABLE"?"Tahsilat":"Ödeme"} Kaydı`}>
      <div className="erp-form"><div className="form-grid">
        <label><span>Cari</span><input value={settling.customerName||settling.supplierName||""} disabled/></label>
        <label><span>Kalan Tutar</span><input value={money(settling.balance)} disabled/></label>
        <label><span>Kasa / Banka</span><select value={accountId} onChange={e=>setAccountId(e.target.value)}>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
        <label><span>İşlem Tutarı</span><input type="number" min="0.01" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)}/></label>
      </div><div className="form-actions"><button className="btn btn-secondary" onClick={()=>setSettling(null)}>Vazgeç</button><button className="btn btn-primary" disabled={busy} onClick={settle}>{busy?"Kaydediliyor…":"Kaydet"}</button></div></div>
    </Panel>:null}

    <Panel title="Son Finans Hareketleri">
      <div className="table-wrap"><table><thead><tr><th>İşlem No</th><th>Tarih</th><th>Tür</th><th>Cari</th><th>Hesap</th><th>Tutar</th><th>Açıklama</th></tr></thead><tbody>
      {tx.slice(0,30).map(x=><tr key={x.id}><td className="mono">{x.transactionNo}</td><td>{new Date(x.transactionDate).toLocaleDateString("tr-TR")}</td><td><Badge tone={x.type==="RECEIPT"?"success":"warning"}>{x.type==="RECEIPT"?"Tahsilat":"Ödeme"}</Badge></td><td>{x.customerName||x.supplierName||"—"}</td><td>{x.accountName}</td><td><strong>{money(x.amount)}</strong></td><td>{x.description||"—"}</td></tr>)}
      {!tx.length?<tr><td colSpan={7}>Henüz finans hareketi yok.</td></tr>:null}
      </tbody></table></div>
    </Panel>
  </AppShell>
}
