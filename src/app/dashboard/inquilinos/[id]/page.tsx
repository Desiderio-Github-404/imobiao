import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, FileText, Home, CalendarDays } from "lucide-react";
import { getActiveOrganization } from "@/lib/organization";

type Lease = {
  id: string;
  start_date: string;
  end_date: string | null;
  monthly_rent: number;
  status: string;
  termination_reason: string | null;
  units: { name: string } | null;
};

const statusLabels: Record<string, string> = {
  draft: "Rascunho", active: "Ativo", ended: "Terminado", terminated: "Rescindido",
};

export default async function TenantDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, membership } = await getActiveOrganization();


  const [{ data: tenant }, { data: leases, error }] = await Promise.all([
    supabase.from("tenants").select("id,full_name,phone,email,identity_document,notes,whatsapp_phone,whatsapp_notifications_enabled")
      .eq("id", id).eq("organization_id", membership.organization_id).maybeSingle(),
    supabase.from("leases")
      .select("id,start_date,end_date,monthly_rent,status,termination_reason,units(name)")
      .eq("tenant_id", id).eq("organization_id", membership.organization_id)
      .order("created_at", { ascending: false }),
  ]);
  if (!tenant) notFound();

  const history = (leases ?? []) as unknown as Lease[];
  const money = (value: number) => new Intl.NumberFormat("pt-AO").format(Number(value));
  return <main className="dashboard-shell">
    <header className="dashboard-header">
      <div><Link className="brand" href="/dashboard">Imobi<span>AO</span></Link><p className="dashboard-subtitle">Gestão de património imobiliário</p></div>
      <Link href="/dashboard/inquilinos" className="back-link"><ArrowLeft size={16}/> Voltar aos inquilinos</Link>
    </header>
    <section className="dashboard-content">
      <div className="page-heading"><div><p className="eyebrow">FICHA DO INQUILINO</p><h1>{tenant.full_name}</h1><p className="auth-description">Dados pessoais e histórico completo de arrendamento.</p></div></div>
      <section className="detail-summary">
        <div><span>Telefone</span><strong>{tenant.phone || "Não indicado"}</strong></div>
        <div><span>Email</span><strong>{tenant.email || "Não indicado"}</strong></div>
        <div><span>BI / Passaporte</span><strong>{tenant.identity_document || "Não indicado"}</strong></div>
        <div><span>WhatsApp</span><strong>{tenant.whatsapp_phone || "Não indicado"}</strong></div>
        <div><span>Notificações WhatsApp</span><strong>{tenant.whatsapp_notifications_enabled ? "Autorizadas" : "Não autorizadas"}</strong></div>
      </section>
      {tenant.notes && <div className="notice-box">{tenant.notes}</div>}
      <div className="history-heading"><div><p className="eyebrow">REGISTO CONTRATUAL</p><h2>Histórico de contratos</h2></div><span>{history.length} contrato(s)</span></div>
      {error && <p className="form-error page-message">Não foi possível carregar o histórico contratual.</p>}
      {!history.length ? <section className="empty-panel"><div className="empty-icon"><FileText size={25}/></div><h2>Sem contratos registados</h2><p>Os contratos associados a este inquilino aparecerão aqui.</p></section> :
        <div className="history-list">{history.map((lease) => <article className="history-card" key={lease.id}>
          <div className="history-card-top"><span className={`lease-status lease-status-${lease.status}`}>{statusLabels[lease.status] ?? lease.status}</span><strong>{money(lease.monthly_rent)} Kz/mês</strong></div>
          <p><Home size={15}/>{lease.units?.name ?? "Unidade"}</p>
          <p><CalendarDays size={15}/>{new Date(lease.start_date+"T12:00:00").toLocaleDateString("pt-AO")} — {lease.end_date ? new Date(lease.end_date+"T12:00:00").toLocaleDateString("pt-AO") : "Sem data de término"}</p>
          {lease.termination_reason && <small>Motivo da rescisão: {lease.termination_reason}</small>}
          <Link href="/dashboard/contratos">Consultar contratos</Link>
        </article>)}</div>}
    </section>
  </main>;
}
