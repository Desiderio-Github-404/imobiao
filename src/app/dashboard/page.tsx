import { redirect } from "next/navigation";
import Link from "next/link";
import { LogOut, Building2, Users, Wallet, Plus, Home, UserRoundPlus, FileText, Bell, Activity, FileBarChart } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrganization } from "@/lib/organization";
import FinanceChart from "./finance-chart";

export default async function DashboardPage() {
  const { supabase, membership } = await getActiveOrganization();
  const relation = membership.organizations as unknown as { name: string } | { name: string }[] | null;
  const org = Array.isArray(relation) ? relation[0] : relation;
  const organizationId = membership.organization_id;

  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setUTCMonth(twelveMonthsAgo.getUTCMonth() - 11);
  twelveMonthsAgo.setUTCDate(1);
  const fromDate = twelveMonthsAgo.toISOString().slice(0,10);

  const [propertiesResult, tenantsResult, unitsResult, chargesResult, paymentsResult] = organizationId
    ? await Promise.all([
        supabase.from("properties").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
        supabase.from("tenants").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
        supabase.from("units").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
        supabase.from("rent_charges").select("amount_due, amount_paid, period_start, status").eq("organization_id", organizationId).gte("period_start", fromDate),
        supabase.from("payments").select("amount, payment_date").eq("organization_id", organizationId).gte("payment_date", fromDate),
      ])
    : [null, null, null, null, null];

  const outstanding = chargesResult?.data?.reduce((sum, charge) => sum + Number(charge.amount_due) - Number(charge.amount_paid), 0) ?? 0;
  const stats = [
    { label: "Imóveis", value: propertiesResult?.count ?? 0, icon: Building2 },
    { label: "Unidades", value: unitsResult?.count ?? 0, icon: Home },
    { label: "Inquilinos", value: tenantsResult?.count ?? 0, icon: Users },
    { label: "Por receber", value: `${new Intl.NumberFormat("pt-AO").format(outstanding)} Kz`, icon: Wallet },
  ];

  const statusCounts = { paid:0, partially_paid:0, pending:0, overdue:0 };
  chargesResult?.data?.forEach(charge=>{ const key=charge.status as keyof typeof statusCounts; if(key in statusCounts) statusCounts[key]++; });
  const monthly = new Map<string,{month:string;label:string;billed:number;received:number}>();
  const now = new Date();
  for(let i=11;i>=0;i--){
    const date = new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-i,1));
    const key = date.toISOString().slice(0,7);
    const label = new Intl.DateTimeFormat("pt-AO",{month:"short",timeZone:"UTC"}).format(date);
    monthly.set(key,{month:key,label:label.charAt(0).toUpperCase()+label.slice(1),billed:0,received:0});
  }
  chargesResult?.data?.forEach(charge=>{
    const key=String(charge.period_start).slice(0,7);
    const point=monthly.get(key);
    if(point) point.billed+=Number(charge.amount_due);
  });
  paymentsResult?.data?.forEach(payment=>{
    const key=String(payment.payment_date).slice(0,7);
    const point=monthly.get(key);
    if(point) point.received+=Number(payment.amount);
  });

  async function signOut() {
    "use server";
    const client = await createClient();
    await client.auth.signOut();
    redirect("/login");
  }

  return <main className="dashboard-shell">
    <header className="dashboard-header">
      <div><Link className="brand" href="/dashboard">Imobi<span>AO</span></Link><p className="dashboard-subtitle">{org?.name ?? "A sua organização"}</p></div>
      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}><Link href="/dashboard/organizacoes" className="secondary-button">Trocar organização</Link><form action={signOut}><button className="logout-button"><LogOut size={16}/> Terminar sessão</button></form></div>
    </header>
    <section className="dashboard-content">
      <div className="dashboard-welcome"><div><p className="eyebrow">PAINEL DE CONTROLO</p><h1>O seu património, sob controlo.</h1><p className="auth-description">Resumo atualizado com os dados registados na sua organização.</p></div><Link href="/dashboard/imoveis/novo" className="primary-link"><Plus size={17}/> Adicionar imóvel</Link></div>
      
      <div className="stats-grid">{stats.map(({label,value,icon:Icon})=><article className="stat-card" key={label}><span className="stat-icon"><Icon size={20}/></span><p>{label}</p><strong>{value}</strong></article>)}</div>
      {organizationId && <FinanceChart data={Array.from(monthly.values())} statuses={statusCounts}/>}
      {(propertiesResult?.count ?? 0) === 0 ? <section className="empty-panel"><div className="empty-icon"><Building2 size={25}/></div><h2>Comece por registar o seu primeiro imóvel</h2><p>Depois poderá adicionar unidades, inquilinos, contratos e acompanhar as rendas.</p><Link href="/dashboard/imoveis/novo" className="primary-link"><Plus size={16}/> Registar primeiro imóvel</Link></section> : <section className="empty-panel"><div className="empty-icon"><Building2 size={25}/></div><h2>Os seus imóveis estão organizados</h2><p>Consulte a carteira de imóveis e continue a gerir o seu património.</p><Link href="/dashboard/imoveis" className="primary-link">Ver todos os imóveis</Link></section>}
      <div className="dashboard-quick-links"><Link href="/dashboard/imoveis"><Building2 size={17}/> Imóveis</Link><Link href="/dashboard/unidades"><Home size={17}/> Unidades</Link><Link href="/dashboard/inquilinos"><UserRoundPlus size={17}/> Inquilinos</Link><Link href="/dashboard/contratos"><FileText size={17}/> Contratos</Link><Link href="/dashboard/rendas"><Wallet size={17}/> Rendas e pagamentos</Link><Link href="/dashboard/notificacoes"><Bell size={17}/> Notificações</Link><Link href="/dashboard/atividades"><Activity size={17}/> Histórico de atividades</Link><Link href="/dashboard/relatorios"><FileBarChart size={17}/> Relatórios financeiros</Link><Link href="/dashboard/equipa"><Users size={17}/> Equipa e permissões</Link></div><p className="dashboard-footnote">Os indicadores apresentados são calculados a partir dos registos reais da sua conta.</p>
    </section>
  </main>;
}
