import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, FileText, Plus, CalendarDays, Home, Pencil, RefreshCw, FileX2 } from "lucide-react";
import { getActiveOrganization } from "@/lib/organization";

type Lease = {
  id: string;
  start_date: string;
  end_date: string | null;
  monthly_rent: number;
  status: string;
  units: { name: string } | null;
  tenants: { full_name: string } | null;
};

const labels: Record<string, string> = { draft: "Rascunho", active: "Ativo", ended: "Terminado", terminated: "Rescindido" };

export default async function LeasesPage({ searchParams }: { searchParams: Promise<{ sucesso?: string; erro?: string }> }) {
  const { supabase, user, membership } = await getActiveOrganization();


  const [{ data, error }, params] = await Promise.all([
    supabase.from("leases")
      .select("id,start_date,end_date,monthly_rent,status,units(name),tenants(full_name)")
      .eq("organization_id", membership.organization_id)
      .order("created_at", { ascending: false }),
    searchParams,
  ]);

  return <main className="dashboard-shell">
    <header className="dashboard-header">
      <div><Link className="brand" href="/dashboard">Imobi<span>AO</span></Link><p className="dashboard-subtitle">Gestão de património imobiliário</p></div>
      <Link href="/dashboard" className="back-link"><ArrowLeft size={16}/> Painel principal</Link>
    </header>
    <section className="dashboard-content">
      <div className="page-heading">
        <div><p className="eyebrow">ARRENDAMENTO</p><h1>Contratos</h1><p className="auth-description">Associe inquilinos às unidades e defina as condições de arrendamento.</p></div>
        <Link href="/dashboard/contratos/novo" className="primary-link"><Plus size={17}/> Novo contrato</Link>
      </div>
      {params.sucesso === "criado" && <p className="form-success page-message">Contrato registado com sucesso.</p>}
      {params.sucesso === "actualizado" && <p className="form-success page-message">Contrato atualizado com sucesso.</p>}
      {params.sucesso === "renovado" && <p className="form-success page-message">Contrato renovado com sucesso. O contrato anterior foi preservado no histórico.</p>}
      {params.sucesso === "rescindido" && <p className="form-success page-message">Contrato rescindido. A unidade foi libertada e o histórico financeiro foi preservado.</p>}
      {params.erro && <p className="form-error page-message">Não foi possível concluir a operação. Verifique as permissões e os dados do contrato.</p>}
      {error && <p className="form-error page-message">Não foi possível carregar os contratos. Atualize a página.</p>}
      {!data?.length ? <section className="empty-panel">
        <div className="empty-icon"><FileText size={25}/></div><h2>Ainda não existem contratos</h2>
        <p>Crie o primeiro contrato para ligar um inquilino a uma unidade.</p>
        <Link href="/dashboard/contratos/novo" className="primary-link"><Plus size={16}/> Criar primeiro contrato</Link>
      </section> : <div className="property-grid">
        {(data as unknown as Lease[]).map((lease) => <article className="property-card" key={lease.id}>
          <div className="property-card-top"><span className={`lease-status lease-status-${lease.status}`}>{labels[lease.status] ?? lease.status}</span><span className="property-card-icon"><FileText size={20}/></span></div>
          <h2>{lease.tenants?.full_name ?? "Inquilino"}</h2>
          <p className="lease-detail"><Home size={14}/>{lease.units?.name ?? "Unidade"}</p>
          <p className="lease-detail"><CalendarDays size={14}/>{new Date(`${lease.start_date}T12:00:00`).toLocaleDateString("pt-AO")}{lease.end_date ? ` — ${new Date(`${lease.end_date}T12:00:00`).toLocaleDateString("pt-AO")}` : " — Sem data de término"}</p>
          <p className="unit-rent">{new Intl.NumberFormat("pt-AO").format(Number(lease.monthly_rent))} Kz/mês</p>
          <div className="dashboard-quick-links"><Link href={`/dashboard/contratos/${lease.id}/editar`}><Pencil size={14}/> Editar</Link>{lease.status === "active" && <><Link href={`/dashboard/contratos/${lease.id}/renovar`}><RefreshCw size={14}/> Renovar</Link><Link href={`/dashboard/contratos/${lease.id}/rescindir`}><FileX2 size={14}/> Rescindir</Link></>}</div>
        </article>)}
      </div>}
    </section>
  </main>;
}
