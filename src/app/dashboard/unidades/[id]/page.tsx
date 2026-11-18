import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, FileText, Users, CalendarDays } from "lucide-react";
import { getActiveOrganization } from "@/lib/organization";

type Lease = {
  id: string;
  start_date: string;
  end_date: string | null;
  monthly_rent: number;
  status: string;
  termination_reason: string | null;
  tenants: { full_name: string } | null;
};

const statusLabels: Record<string, string> = {
  draft: "Rascunho", active: "Ativo", ended: "Terminado", terminated: "Rescindido",
};

export default async function UnitDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, membership } = await getActiveOrganization();


  const [{ data: unit }, { data: leases, error }] = await Promise.all([
    supabase.from("units").select("id,name,floor,monthly_rent,status,properties(name)")
      .eq("id", id).eq("organization_id", membership.organization_id).maybeSingle(),
    supabase.from("leases")
      .select("id,start_date,end_date,monthly_rent,status,termination_reason,tenants(full_name)")
      .eq("unit_id", id).eq("organization_id", membership.organization_id)
      .order("created_at", { ascending: false }),
  ]);
  if (!unit) notFound();

  const property = unit.properties as unknown as { name: string } | null;
  const history = (leases ?? []) as unknown as Lease[];
  const money = (value: number) => new Intl.NumberFormat("pt-AO").format(Number(value));
  return <main className="dashboard-shell">
    <header className="dashboard-header">
      <div><Link className="brand" href="/dashboard">Imobi<span>AO</span></Link><p className="dashboard-subtitle">Gestão de património imobiliário</p></div>
      <Link href="/dashboard/unidades" className="back-link"><ArrowLeft size={16}/> Voltar às unidades</Link>
    </header>
    <section className="dashboard-content">
      <div className="page-heading"><div><p className="eyebrow">FICHA DA UNIDADE</p><h1>{unit.name}</h1><p className="auth-description">{property?.name ?? "Imóvel"} · {unit.floor || "Piso não indicado"}</p></div><span className={`lease-status lease-status-${unit.status === "occupied" ? "active" : "draft"}`}>{unit.status === "occupied" ? "Ocupada" : unit.status === "available" ? "Disponível" : unit.status}</span></div>
      <div className="detail-summary">
        <div><span>Imóvel</span><strong>{property?.name ?? "Não indicado"}</strong></div>
        <div><span>Renda de referência</span><strong>{money(Number(unit.monthly_rent))} Kz/mês</strong></div>
        <div><span>Estado atual</span><strong>{unit.status === "occupied" ? "Ocupada" : unit.status === "available" ? "Disponível" : unit.status}</strong></div>
      </div>
      <div className="history-heading"><div><p className="eyebrow">REGISTO CONTRATUAL</p><h2>Histórico de arrendamento</h2></div><span>{history.length} contrato(s)</span></div>
      {error && <p className="form-error page-message">Não foi possível carregar o histórico contratual.</p>}
      {!history.length ? <section className="empty-panel"><div className="empty-icon"><FileText size={25}/></div><h2>Sem contratos registados</h2><p>O histórico de arrendamento desta unidade aparecerá aqui.</p></section> :
        <div className="history-list">{history.map((lease) => <article className="history-card" key={lease.id}>
          <div className="history-card-top"><span className={`lease-status lease-status-${lease.status}`}>{statusLabels[lease.status] ?? lease.status}</span><strong>{money(lease.monthly_rent)} Kz/mês</strong></div>
          <p><Users size={15}/>{lease.tenants?.full_name ?? "Inquilino"}</p>
          <p><CalendarDays size={15}/>{new Date(lease.start_date+"T12:00:00").toLocaleDateString("pt-AO")} — {lease.end_date ? new Date(lease.end_date+"T12:00:00").toLocaleDateString("pt-AO") : "Sem data de término"}</p>
          {lease.termination_reason && <small>Motivo da rescisão: {lease.termination_reason}</small>}
          <Link href="/dashboard/contratos">Consultar contratos</Link>
        </article>)}</div>}
    </section>
  </main>;
}
