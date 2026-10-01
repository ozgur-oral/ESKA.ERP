"use client";
import {useEffect,useRef,useState} from "react";
import {useRouter} from "next/navigation";
import {api,type GlobalSearchResult} from "@/lib/api";
import {Icon} from "./icon";
const labels:Record<string,string>={CUSTOMER:"Müşteri",PRODUCT:"Ürün",DEVICE:"Cihaz",QUOTE:"Teklif",ORDER:"Sipariş",SERVICE:"Servis",TICKET:"Ticket",CORS:"CORS",PROJECT:"Proje",DOCUMENT:"Doküman"};
export function GlobalSearch(){const router=useRouter();const [q,setQ]=useState("");const [items,setItems]=useState<GlobalSearchResult[]>([]);const [open,setOpen]=useState(false);const [loading,setLoading]=useState(false);const box=useRef<HTMLDivElement>(null);
useEffect(()=>{const fn=(e:MouseEvent)=>{if(!box.current?.contains(e.target as Node))setOpen(false)};document.addEventListener("mousedown",fn);return()=>document.removeEventListener("mousedown",fn)},[]);
useEffect(()=>{if(q.trim().length<2){setItems([]);setOpen(false);return}const t=setTimeout(()=>{setLoading(true);api.globalSearch(q).then(x=>{setItems(x);setOpen(true)}).catch(()=>setItems([])).finally(()=>setLoading(false))},220);return()=>clearTimeout(t)},[q]);
const go=(x:GlobalSearchResult)=>{setOpen(false);setQ("");router.push(x.href)};
return <div className="global-search-wrap" ref={box}><label className="global-search"><Icon name="search" size={16}/><input value={q} onChange={e=>setQ(e.target.value)} onFocus={()=>items.length&&setOpen(true)} placeholder="Her yerde ara... (müşteri, ürün, seri no, teklif, servis, ticket...)" /></label>{open?<div className="global-search-results">{loading?<div className="search-empty">Aranıyor…</div>:items.length?items.map((x,i)=><button key={`${x.type}-${x.id}-${i}`} className="search-result" onClick={()=>go(x)}><span className="search-kind">{labels[x.type]??x.type}</span><span className="search-copy"><strong>{x.title}</strong><small>{x.subtitle}</small></span>{x.meta?<span className="search-meta">{x.meta}</span>:null}</button>):<div className="search-empty">Sonuç bulunamadı.</div>}<div className="search-hint">En az 2 karakter · Sonuçlar yalnız yetkili olduğunuz modüllerden gelir</div></div>:null}</div>}
