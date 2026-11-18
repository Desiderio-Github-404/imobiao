import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, FileBarChart, TrendingUp, Wallet, AlertCircle, Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import ReportsActions from "./reports-actions";

type ReportCharge = {
  id: string;
  period_start: string;
  due_date: string;
  amount_due: number;
  amount_paid: number;
  status: string;
  leases: {
    monthly_rent: number;
    units: { name: string; property_id: string; properties: { name: string } | null } | null;
    tenants: { full_name: string } | null;
  } | null;
  payments: { amount: number; payment_date: string; payment_method: string }[];
};

const money = (value: number) => new Intl.NumberFormat("pt-AO", { maximumFractionDigits: 2 }).format(value) + " Kz";
const dateValue = (value: string) => new Date(value + "T12:00:00").toLocaleDateString("pt-AO");

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ inicio?: string; fim?: string; imovel?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase.from("memberships")
    .select("organization_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (!membership) redirect("/dashboard");

  const params = await searchParams;
  const today = new Date();
  const firstDay = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)).toISOString().slice(0, 10);
  const start = /^\d{4}-\d{2}-\d{2}$/.test(params.inicio ?? "") ? params.inicio! : firstDay.slice(0, 4) + "-01-01";
  const end = /^\d{4}-\d{2}-\d{2}$/.test(params.fim ?? "") ? params.fim! : today.toISOString().slice(0, 10);

  const [{ data: properties }, { data: charges, error }] = await Promise.all([
    supabase.from("properties").select("id,name").eq("organization_id", membership.organization_id).order("name"),
    supabase.from("rent_charges")
      .select("id,period_start,due_date,amount_due,amount_paid,status,leases(monthly_rent,units(name,property_id,properties(name)),tenants(full_name)),payments(amount,payment_date,payment_method)")
      .eq("organization_id", membership.organization_id)
      .gte("period_start", start).lte("period_start", end)
      .order("period_start", { ascending: false }),
  ]);

  const allCharges = (charges ?? []) as unknown as ReportCharge[];
  const filtered = allCharges.filter((charge) => !params.imovel || charge.leases?.units?.property_id === params.imovel);
  const totalBilled = filtered.reduce((sum, item) => sum + Number(item.amount_due), 0);
  const totalReceived = filtered.reduce((sum, item) => sum + Number(item.amount_paid), 0);
  const totalDebt = filtered.reduce((sum, item) => sum + Math.max(0, Number(item.amount_due) - Number(item.amount_paid)), 0);
  const overdue = filtered.filter((item) => Number(item.amount_due) > Number(item.amount_paid) && item.due_date < today.toISOString().slice(0, 10));
  const overdueBalance = overdue.reduce((sum, item) => sum + Number(item.amount_due) - Number(item.amount_paid), 0);

  const propertyTotals = new Map<string, { name: string; billed: number; received: number; debt: number; count: number }>();
  filtered.forEach((item) => {
    const name = item.leases?.units?.properties?.name ?? "Imóvel não identificado";
    const current = propertyTotals.get(name) ?? { name, billed: 0, received: 0, debt: 0, count: 0 };
    current.billed += Number(item.amount_due);
    current.received += Number(item.amount_paid);
    current.debt += Math.max(0, Number(item.amount_due) - Number(item.amount_paid));
    current.count++;
    propertyTotals.set(name, current);
  });

  const exportRows = filtered.map((item) => ({
    periodo: item.period_start,
    vencimento: item.due_date,
    imovel: item.leases?.units?.properties?.name ?? "",
    unidade: item.leases?.units?.name ?? "",
    inquilino: item.leases?.tenants?.full_name ?? "",
    cobrado: Number(item.amount_due),
    recebido: Number(item.amount_paid),
    em_divida: Math.max(0, Number(item.amount_due) - Number(item.amount_paid)),
    estado: item.status,
  }));

  return <main className="dashboard-shell">
    <header className="dashboard-header"><div><Link className="brand" href="/dashboard">Imobi<span>AO</span></Link><p className="dashboard-subtitle">Gestão de património imobiliário</p></div><Link href="/dashboard" className="back-link"><ArrowLeft size={16}/> Painel principal</Link></header>
    <section className="dashboard-content report-content">
      <div className="page-heading"><div><p className="eyebrow">ANÁLISE E CONTROLO</p><h1>Relatórios financeiros</h1><p className="auth-description">Acompanhe cobranças, recebimentos e dívidas com base nos registos da sua organização.</p></div></div>
      <form className="report-filters" method="get">
        <label>Data inicial<input type="date" name="inicio" defaultValue={start}/></label>
        <label>Data final<input type="date" name="fim" defaultValue={end}/></label>
        <label>Imóvel<select name="imovel" defaultValue={params.imovel ?? ""}><option value="">Todos os imóveis</option>{(properties ?? []).map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}</select></label>
        <button className="primary-button" type="submit">Aplicar filtros</button>
      </form>
      {error && <p className="form-error page-message">Não foi possível carregar os dados financeiros. Atualize a página.</p>}
      <div className="report-stats">
        <article className="report-stat"><span><FileBarChart size={18}/></span><p>Total cobrado</p><strong>{money(totalBilled)}</strong><small>{filtered.length} cobranças no período</small></article>
        <article className="report-stat"><span><TrendingUp size={18}/></span><p>Total recebido</p><strong>{money(totalReceived)}</strong><small>Pagamentos associados às cobranças</small></article>
        <article className="report-stat"><span><Wallet size={18}/></span><p>Saldo por receber</p><strong>{money(totalDebt)}</strong><small>Cobranças ainda não liquidadas</small></article>
        <article className="report-stat report-stat-warning"><span><AlertCircle size={18}/></span><p>Dívida vencida</p><strong>{money(overdueBalance)}</strong><small>{overdue.length} cobranças vencidas</small></article>
      </div>
      <section className="report-panel">
        <div className="report-panel-heading"><div><h2>Desempenho por imóvel</h2><p>Comparação entre valores cobrados, recebidos e em dívida.</p></div></div>
        {propertyTotals.size === 0 ? <div className="chart-empty">Não existem cobranças para os filtros selecionados.</div> : <div className="report-table-wrap"><table className="report-table"><thead><tr><th>Imóvel</th><th>Cobrado</th><th>Recebido</th><th>Em dívida</th><th>Cobranças</th></tr></thead><tbody>{Array.from(propertyTotals.values()).map((item) => <tr key={item.name}><td><span className="report-property"><Building2 size={15}/>{item.name}</span></td><td>{money(item.billed)}</td><td className="report-positive">{money(item.received)}</td><td className="report-negative">{money(item.debt)}</td><td>{item.count}</td></tr>)}</tbody></table></div>}
      </section>
      <section className="report-panel">
        <div className="report-panel-heading"><div><h2>Detalhe das cobranças</h2><p>Valores por inquilino, unidade e período.</p></div><ReportsActions rows={exportRows}/></div>
        {filtered.length === 0 ? <div className="chart-empty">Nenhuma cobrança encontrada neste período.</div> : <div className="report-table-wrap"><table className="report-table"><thead><tr><th>Período</th><th>Inquilino</th><th>Imóvel / Unidade</th><th>Cobrado</th><th>Pago</th><th>Em falta</th><th>Estado</th></tr></thead><tbody>{filtered.map((item) => { const balance = Math.max(0, Number(item.amount_due) - Number(item.amount_paid)); const status = balance === 0 ? "Paga" : item.due_date < today.toISOString().slice(0, 10) ? "Em atraso" : item.status === "partially_paid" ? "Parcial" : "Pendente"; return <tr key={item.id}><td>{dateValue(item.period_start)}</td><td>{item.leases?.tenants?.full_name ?? "—"}</td><td>{item.leases?.units?.properties?.name ?? "—"}<small>{item.leases?.units?.name ?? ""}</small></td><td>{money(Number(item.amount_due))}</td><td className="report-positive">{money(Number(item.amount_paid))}</td><td className={balance > 0 ? "report-negative" : ""}>{money(balance)}</td><td><span className="report-status">{status}</span></td></tr>; })}</tbody></table></div>}
      </section>
      <p className="dashboard-footnote">Os relatórios consideram as cobranças pela data do período de renda. Valores recebidos são os pagamentos registados nessas cobranças; não representam confirmação automática bancária ou do Multicaixa Express.</p>
    </section>
  </main>;
}
