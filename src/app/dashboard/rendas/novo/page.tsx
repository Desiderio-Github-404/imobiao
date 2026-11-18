import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Wallet } from "lucide-react";
import { getActiveOrganization } from "@/lib/organization";
import { createRentCharge } from "../actions";

export default async function NewChargePage({searchParams}:{searchParams:Promise<{erro?:string}>}) {
 const { supabase, user, membership } = await getActiveOrganization();
 if (!["owner", "manager", "finance"].includes(membership.role)) redirect("/dashboard/rendas?erro=sem-permissao");
 const [{data:leases},params]=await Promise.all([
  supabase.from("leases").select("id,monthly_rent,due_day,start_date,end_date,units(name),tenants(full_name)")
   .eq("organization_id",membership.organization_id).eq("status","active").order("created_at",{ascending:false}),
  searchParams
 ]);
 const errors:Record<string,string>={"dados-invalidos":"Selecione um contrato e um mês válido.","sem-permissao":"Não tem permissão para gerar cobranças.","contrato-invalido":"O contrato não está ativo ou não foi encontrado.","periodo-invalido":"O mês escolhido está fora da duração do contrato.","duplicada":"Já existe uma cobrança para esse contrato e mês.","falha-registo":"Não foi possível gerar a cobrança."};
 const now=new Date(); const month=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`;
 return <main className="dashboard-shell">
  <header className="dashboard-header"><div><Link className="brand" href="/dashboard">Imobi<span>AO</span></Link><p className="dashboard-subtitle">Gestão de património imobiliário</p></div><Link href="/dashboard/rendas" className="back-link"><ArrowLeft size={16}/> Voltar às rendas</Link></header>
  <section className="dashboard-content form-page">
   <div className="form-page-title"><span className="form-title-icon"><Wallet size={22}/></span><div><p className="eyebrow">NOVA COBRANÇA</p><h1>Gerar renda mensal</h1><p className="auth-description">Crie uma cobrança para um contrato ativo.</p></div></div>
   {params.erro&&<p className="form-error page-message">{errors[params.erro]??"Ocorreu um erro."}</p>}
   {!leases?.length?<section className="empty-panel"><h2>Não há contratos ativos</h2><p>Ative um contrato antes de gerar cobranças.</p><Link href="/dashboard/contratos" className="primary-link">Ver contratos</Link></section>:
   <form action={createRentCharge} className="property-form">
    <div className="form-section-label">Contrato e período</div>
    <label>Contrato ativo *<select name="lease_id" required defaultValue=""><option value="" disabled>Selecione o contrato</option>{leases.map(l=>{const t=l.tenants as unknown as {full_name:string}|null;const u=l.units as unknown as {name:string}|null;return <option key={l.id} value={l.id}>{t?.full_name??"Inquilino"} — {u?.name??"Unidade"} · {new Intl.NumberFormat("pt-AO").format(Number(l.monthly_rent))} Kz/mês</option>;})}</select></label>
    <label>Mês da renda *<input type="month" name="period" required defaultValue={month}/></label>
    <div className="notice-box">O valor será preenchido automaticamente com a renda definida no contrato. O sistema calcula a data de vencimento e impede cobranças duplicadas para o mesmo mês.</div>
    <div className="form-actions"><Link href="/dashboard/rendas" className="secondary-button">Cancelar</Link><button type="submit" className="primary-button">Criar cobrança</button></div>
   </form>}
  </section>
 </main>;
}
