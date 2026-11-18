import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Plus, Search, Users, MessageCircle, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type Tenant = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  whatsapp_phone: string | null;
  whatsapp_notifications_enabled: boolean;
  created_at: string;
};

export default async function TenantsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sucesso?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase.from("memberships")
    .select("organization_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (!membership) redirect("/dashboard");

  const params = await searchParams;
  const query = (params.q ?? "").trim().slice(0, 60).replace(/[,%()]/g, "");
  let tenantsQuery = supabase.from("tenants")
    .select("id, full_name, phone, email, whatsapp_phone, whatsapp_notifications_enabled, created_at")
    .eq("organization_id", membership.organization_id)
    .order("created_at", { ascending: false });
  if (query) tenantsQuery = tenantsQuery.or(`full_name.ilike.%${query}%,phone.ilike.%${query}%`);
  const { data, error } = await tenantsQuery;
  const tenants = (data ?? []) as Tenant[];

  return <main className="dashboard-shell">
    <header className="dashboard-header">
      <div><Link className="brand" href="/dashboard">Imobi<span>AO</span></Link><p className="dashboard-subtitle">Gestão de património imobiliário</p></div>
      <Link href="/dashboard" className="back-link"><ArrowLeft size={16}/> Painel principal</Link>
    </header>
    <section className="dashboard-content">
      <div className="page-heading">
        <div><p className="eyebrow">RELACIONAMENTO</p><h1>Inquilinos</h1><p className="auth-description">Mantenha os contactos e dados dos inquilinos organizados num só lugar.</p></div>
        <Link href="/dashboard/inquilinos/novo" className="primary-link"><Plus size={17}/> Adicionar inquilino</Link>
      </div>
      {params.sucesso === "criado" && <p className="form-success page-message">Inquilino registado com sucesso.</p>}
      {error && <p className="form-error page-message">Não foi possível carregar os inquilinos. Atualize a página.</p>}
      <form className="tenant-search" action="/dashboard/inquilinos" method="get">
        <Search size={17}/><input name="q" defaultValue={query} placeholder="Pesquisar por nome ou telefone..." aria-label="Pesquisar inquilinos"/><button type="submit">Pesquisar</button>
        {query && <Link href="/dashboard/inquilinos">Limpar</Link>}
      </form>
      {!tenants.length ? <section className="empty-panel">
        <div className="empty-icon"><Users size={25}/></div><h2>{query ? "Nenhum resultado encontrado" : "Ainda não tem inquilinos"}</h2>
        <p>{query ? "Experimente pesquisar por outro nome ou número de telefone." : "Registe os seus inquilinos para depois os associar aos contratos de arrendamento."}</p>
        {!query && <Link href="/dashboard/inquilinos/novo" className="primary-link"><Plus size={16}/> Registar primeiro inquilino</Link>}
      </section> : <div className="property-grid">
        {tenants.map((tenant) => <article className="property-card" key={tenant.id}>
          <div className="property-card-top"><span className="property-type">Inquilino</span><span className="property-card-icon"><Users size={20}/></span></div>
          <h2>{tenant.full_name}</h2>
          {tenant.phone && <p className="tenant-contact">{tenant.phone}</p>}
          {tenant.email && <p className="tenant-contact">{tenant.email}</p>}
          <div className="dashboard-quick-links"><Link href={`/dashboard/inquilinos/${tenant.id}`}><FileText size={14}/> Ver ficha e contratos</Link></div>
          <div className="tenant-whatsapp">
            <MessageCircle size={15}/>
            <span>{tenant.whatsapp_phone || "WhatsApp não indicado"}</span>
            {tenant.whatsapp_notifications_enabled && <small>Notificações autorizadas</small>}
          </div>
        </article>)}
      </div>}
    </section>
  </main>;
}
