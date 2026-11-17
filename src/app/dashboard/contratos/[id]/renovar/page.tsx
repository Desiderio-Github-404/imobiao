import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { renewLease } from "../../actions";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string }> };

function addOneDay(date: string) {
  const value = new Date(date + "T12:00:00");
  value.setDate(value.getDate() + 1);
  return value.toISOString().slice(0, 10);
}

function todayLocal() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export default async function RenewLeasePage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase.from("memberships")
    .select("organization_id").eq("user_id", user.id).in("role", ["owner", "manager"]).limit(1).maybeSingle();
  if (!membership) redirect("/dashboard/contratos");

  const { data: lease } = await supabase.from("leases")
    .select("id,start_date,end_date,monthly_rent,deposit_amount,due_day,status,notes,tenants(full_name),units(name)")
    .eq("id", id).eq("organization_id", membership.organization_id).maybeSingle();
  if (!lease) notFound();
  if (lease.status !== "active") redirect("/dashboard/contratos");

  const tenant = lease.tenants as unknown as { full_name: string } | null;
  const unit = lease.units as unknown as { name: string } | null;
  const earliestStart = addOneDay(lease.start_date);
  const today = todayLocal();
  const afterOldEnd = lease.end_date ? addOneDay(lease.end_date) : today;
  const suggestedStart = [earliestStart, today, afterOldEnd].sort().at(-1) ?? today;
  const errors: Record<string,string> = {
    "dados-invalidos": "Verifique as datas, os valores e o dia de vencimento.",
    "data-invalida": "A data de início da renovação deve ser posterior ao início do contrato atual.",
    "contrato-inactivo": "Este contrato já não está ativo e não pode ser renovado por este formulário.",
    "unidade-ocupada": "A unidade já possui outro contrato ativo.",
    "falha-renovacao": "Não foi possível renovar o contrato. Tente novamente.",
  };

  return <main className="dashboard-shell">
    <header className="dashboard-header">
      <div><Link className="brand" href="/dashboard">Imobi<span>AO</span></Link><p className="dashboard-subtitle">Gestão de património imobiliário</p></div>
      <Link href="/dashboard/contratos" className="back-link"><ArrowLeft size={16}/> Voltar aos contratos</Link>
    </header>
    <section className="dashboard-content form-page">
      <div className="form-page-title"><span className="form-title-icon"><RefreshCw size={22}/></span><div><p className="eyebrow">GESTÃO CONTRATUAL</p><h1>Renovar contrato</h1><p className="auth-description">{tenant?.full_name ?? "Inquilino"} · {unit?.name ?? "Unidade"}</p></div></div>
      {query.erro && <p className="form-error page-message">{errors[query.erro] ?? "Ocorreu um erro. Tente novamente."}</p>}
      <form action={renewLease} className="property-form">
        <input type="hidden" name="lease_id" value={lease.id}/>
        <div className="notice-box">Será criado um novo contrato ativo. O contrato atual será encerrado no dia anterior ao início da renovação (ou manterá a data de término anterior, se já tiver terminado). As cobranças e os pagamentos antigos serão preservados.</div>
        <div className="form-section-label">Novo período contratual</div>
        <div className="form-two-columns">
          <label>Início da renovação *<input name="start_date" type="date" required min={earliestStart} defaultValue={suggestedStart}/></label>
          <label>Fim da renovação<input name="end_date" type="date" min={suggestedStart}/></label>
        </div>
        <div className="form-section-label">Novas condições financeiras</div>
        <div className="form-two-columns">
          <label>Nova renda mensal (Kz) *<input name="monthly_rent" type="number" min="0" step="0.01" required defaultValue={Number(lease.monthly_rent)}/></label>
          <label>Nova caução (Kz)<input name="deposit_amount" type="number" min="0" step="0.01" defaultValue={Number(lease.deposit_amount)}/></label>
        </div>
        <label>Dia de vencimento mensal *<select name="due_day" defaultValue={lease.due_day}>{Array.from({length:28},(_,i)=><option key={i+1} value={i+1}>Dia {i+1}</option>)}</select></label>
        <label>Notas da renovação<textarea name="notes" rows={4} maxLength={2000} defaultValue={lease.notes ?? ""}/></label>
        <div className="form-actions"><Link href="/dashboard/contratos" className="secondary-button">Cancelar</Link><button type="submit" className="primary-button">Confirmar renovação</button></div>
      </form>
    </section>
  </main>;
}
