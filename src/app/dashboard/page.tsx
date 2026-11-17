import { redirect } from "next/navigation";
import { LogOut, Building2, Users, FileText, Wallet, Plus, Home } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: memberships } = await supabase
    .from("memberships")
    .select("organization_id, role, organizations(name)")
    .eq("user_id", user.id)
    .limit(1);
  const membership = memberships?.[0];
  const org = membership?.organizations as unknown as { name: string } | null;
  const organizationId = membership?.organization_id;

  const [propertiesResult, tenantsResult, unitsResult, chargesResult] = organizationId
    ? await Promise.all([
        supabase.from("properties").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
        supabase.from("tenants").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
        supabase.from("units").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
        supabase.from("rent_charges").select("amount_due, amount_paid, status").eq("organization_id", organizationId),
      ])
    : [null, null, null, null];

  const outstanding = chargesResult?.data?.reduce((sum, charge) => sum + Number(charge.amount_due) - Number(charge.amount_paid), 0) ?? 0;
  const stats = [
    { label: "Imóveis", value: propertiesResult?.count ?? 0, icon: Building2 },
    { label: "Unidades", value: unitsResult?.count ?? 0, icon: Home },
    { label: "Inquilinos", value: tenantsResult?.count ?? 0, icon: Users },
    { label: "Por receber", value: `${new Intl.NumberFormat("pt-AO").format(outstanding)} Kz`, icon: Wallet },
  ];

  async function signOut() {
    "use server";
    const client = await createClient();
    await client.auth.signOut();
    redirect("/login");
  }

  return <main className="dashboard-shell">
    <header className="dashboard-header">
      <div><a className="brand" href="/dashboard">Imobi<span>AO</span></a><p className="dashboard-subtitle">{org?.name ?? "A sua organização"}</p></div>
      <form action={signOut}><button className="logout-button"><LogOut size={16}/> Terminar sessão</button></form>
    </header>
    <section className="dashboard-content">
      <div className="dashboard-welcome"><div><p className="eyebrow">PAINEL DE CONTROLO</p><h1>O seu património, sob controlo.</h1><p className="auth-description">Resumo atualizado com os dados registados na sua organização.</p></div><a href="/dashboard/imoveis/novo" className="primary-link"><Plus size={17}/> Adicionar imóvel</a></div>
      {!membership && <div className="notice-box">A sua conta ainda não está associada a uma organização. Termine o registo ou contacte o suporte para concluir a configuração.</div>}
      <div className="stats-grid">{stats.map(({label,value,icon:Icon})=><article className="stat-card" key={label}><span className="stat-icon"><Icon size={20}/></span><p>{label}</p><strong>{value}</strong></article>)}</div>
      <section className="empty-panel"><div className="empty-icon"><Building2 size={25}/></div><h2>Comece por registar o seu primeiro imóvel</h2><p>Depois poderá adicionar unidades, inquilinos, contratos e acompanhar as rendas.</p><a href="/dashboard/imoveis/novo" className="primary-link"><Plus size={16}/> Registar primeiro imóvel</a></section>
      <p className="dashboard-footnote">Os indicadores apresentados são calculados a partir dos registos reais da sua conta.</p>
    </section>
  </main>;
}
