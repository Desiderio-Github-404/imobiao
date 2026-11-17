import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { updateLease } from "../../actions";

type EditLeasePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
};

export default async function EditLeasePage({ params, searchParams }: EditLeasePageProps) {
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

  const tenant = lease.tenants as unknown as { full_name: string } | null;
  const unit = lease.units as unknown as { name: string } | null;
  const errors: Record<string, string> = {
    "dados-invalidos": "Verifique as datas, os valores e o dia de vencimento.",
    "unidade-ocupada": "Não é possível ativar este contrato porque a unidade já tem outro contrato ativo.",
    "falha-actualizacao": "Não foi possível guardar as alterações. Tente novamente.",
  };

  return <main className="dashboard-shell">
    <header className="dashboard-header">
      <div><Link className="brand" href="/dashboard">Imobi<span>AO</span></Link><p className="dashboard-subtitle">Gestão de património imobiliário</p></div>
      <Link href="/dashboard/contratos" className="back-link"><ArrowLeft size={16}/> Voltar aos contratos</Link>
    </header>
    <section className="dashboard-content form-page">
      <div className="form-page-title"><span className="form-title-icon"><Pencil size={22}/></span><div><p className="eyebrow">GESTÃO CONTRATUAL</p><h1>Editar contrato</h1><p className="auth-description">{tenant?.full_name ?? "Inquilino"} · {unit?.name ?? "Unidade"}</p></div></div>
      {query.erro && <p className="form-error page-message">{errors[query.erro] ?? "Ocorreu um erro. Tente novamente."}</p>}
      <form action={updateLease} className="property-form">
        <input type="hidden" name="lease_id" value={lease.id}/>
        <div className="form-section-label">Condições financeiras</div>
        <div className="form-two-columns">
          <label>Renda mensal (Kz) *<input name="monthly_rent" type="number" min="0" step="0.01" required defaultValue={Number(lease.monthly_rent)}/></label>
          <label>Caução (Kz)<input name="deposit_amount" type="number" min="0" step="0.01" defaultValue={Number(lease.deposit_amount)}/></label>
        </div>
        <label>Dia de vencimento mensal *<select name="due_day" defaultValue={lease.due_day}>{Array.from({length:28},(_,i)=><option key={i+1} value={i+1}>Dia {i+1}</option>)}</select></label>
        <div className="form-section-label">Duração e estado</div>
        <div className="form-two-columns">
          <label>Data de início *<input name="start_date" type="date" required defaultValue={lease.start_date}/></label>
          <label>Data de término<input name="end_date" type="date" defaultValue={lease.end_date ?? ""}/></label>
        </div>
        <label>Estado do contrato<select name="status" defaultValue={lease.status}>
          <option value="draft">Rascunho</option><option value="active">Ativo</option><option value="ended">Terminado</option><option value="terminated">Rescindido</option>
        </select></label>
        <label>Notas<textarea name="notes" rows={4} maxLength={2000} defaultValue={lease.notes ?? ""}/></label>
        <div className="notice-box">As cobranças e os pagamentos já registados não serão alterados. A nova renda será considerada nas cobranças futuras ainda não criadas. A alteração do estado pode libertar ou ocupar a unidade automaticamente.</div>
        <div className="form-actions"><Link href="/dashboard/contratos" className="secondary-button">Cancelar</Link><button type="submit" className="primary-button">Guardar alterações</button></div>
      </form>
    </section>
  </main>;
}
