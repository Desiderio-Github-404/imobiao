import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createLease } from "../actions";

export default async function NewLeasePage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: membership } = await supabase.from("memberships")
    .select("organization_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (!membership) redirect("/dashboard");

  const [{ data: units }, { data: tenants }, params] = await Promise.all([
    supabase.from("units").select("id,name,monthly_rent,properties(name)")
      .eq("organization_id", membership.organization_id).eq("status", "available").order("name"),
    supabase.from("tenants").select("id,full_name")
      .eq("organization_id", membership.organization_id).order("full_name"),
    searchParams,
  ]);

  const errors: Record<string,string> = {
    "dados-invalidos": "Verifique os campos. A renda, a data de início e o dia de vencimento são obrigatórios.",
    "sem-permissao": "A sua conta não tem permissão para criar contratos.",
    "relacoes-invalidas": "Selecione uma unidade disponível e um inquilino válido da sua organização.",
    "unidade-ocupada": "Esta unidade já tem um contrato ativo. Atualize a página e escolha outra unidade.",
    "falha-registo": "Não foi possível guardar o contrato. Confirme os dados e tente novamente.",
  };

  return <main className="dashboard-shell">
    <header className="dashboard-header">
      <div><Link className="brand" href="/dashboard">Imobi<span>AO</span></Link><p className="dashboard-subtitle">Gestão de património imobiliário</p></div>
      <Link href="/dashboard/contratos" className="back-link"><ArrowLeft size={16}/> Voltar aos contratos</Link>
    </header>
    <section className="dashboard-content form-page">
      <div className="form-page-title"><span className="form-title-icon"><FileText size={22}/></span><div><p className="eyebrow">NOVO REGISTO</p><h1>Criar contrato</h1><p className="auth-description">Escolha o inquilino e a unidade e defina as condições do arrendamento.</p></div></div>
      {params.erro && <p className="form-error page-message">{errors[params.erro] ?? "Ocorreu um erro. Tente novamente."}</p>}
      {!units?.length || !tenants?.length ? <section className="empty-panel">
        <h2>Faltam dados para criar o contrato</h2>
        <p>{!units?.length ? "Precisa de ter pelo menos uma unidade disponível." : "Precisa de registar pelo menos um inquilino."}</p>
        {!units?.length ? <Link href="/dashboard/unidades/novo" className="primary-link">Adicionar unidade</Link> : <Link href="/dashboard/inquilinos/novo" className="primary-link">Adicionar inquilino</Link>}
      </section> : <form action={createLease} className="property-form">
        <div className="form-section-label">Partes do contrato</div>
        <label>Inquilino *<select name="tenant_id" required defaultValue=""><option value="" disabled>Selecione o inquilino</option>{tenants.map(t=><option key={t.id} value={t.id}>{t.full_name}</option>)}</select></label>
        <label>Unidade disponível *<select name="unit_id" required defaultValue=""><option value="" disabled>Selecione a unidade</option>{units.map(u=>{const property=u.properties as unknown as {name:string}|null; return <option key={u.id} value={u.id}>{property?.name ? property.name+" — " : ""}{u.name} · {new Intl.NumberFormat("pt-AO").format(Number(u.monthly_rent))} Kz/mês</option>;})}</select></label>
        <div className="form-section-label">Condições financeiras</div>
        <div className="form-two-columns">
          <label>Renda mensal (Kz) *<input name="monthly_rent" type="number" required min="0" step="0.01" placeholder="Ex.: 150000"/></label>
          <label>Caução (Kz)<input name="deposit_amount" type="number" min="0" step="0.01" defaultValue="0"/></label>
        </div>
        <label>Dia de vencimento mensal *<select name="due_day" defaultValue="1">{Array.from({length:28},(_,i)=><option key={i+1} value={i+1}>Dia {i+1}</option>)}</select></label>
        <div className="form-section-label">Duração e estado</div>
        <div className="form-two-columns">
          <label>Data de início *<input name="start_date" type="date" required/></label>
          <label>Data de término<input name="end_date" type="date"/></label>
        </div>
        <label>Estado inicial<select name="status" defaultValue="draft"><option value="draft">Rascunho (não ocupa a unidade)</option><option value="active">Ativo (marca a unidade como ocupada)</option></select></label>
        <label>Notas<textarea name="notes" rows={3} maxLength={2000} placeholder="Condições especiais ou observações..."/></label>
        <div className="notice-box">Ao ativar o contrato, a unidade passa automaticamente para “Ocupada”. Uma unidade não pode ter dois contratos ativos simultaneamente.</div>
        <div className="form-actions"><Link href="/dashboard/contratos" className="secondary-button">Cancelar</Link><button type="submit" className="primary-button">Guardar contrato</button></div>
      </form>}
    </section>
  </main>;
}
