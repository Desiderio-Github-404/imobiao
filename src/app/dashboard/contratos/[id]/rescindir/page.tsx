import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, FileX2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { terminateLease } from "../../actions";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
};

export default async function TerminateLeasePage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase.from("memberships")
    .select("organization_id").eq("user_id", user.id)
    .in("role", ["owner", "manager"]).limit(1).maybeSingle();
  if (!membership) redirect("/dashboard/contratos");

  const { data: lease } = await supabase.from("leases")
    .select("id,start_date,status,tenants(full_name),units(name)")
    .eq("id", id).eq("organization_id", membership.organization_id).maybeSingle();
  if (!lease) notFound();
  if (lease.status !== "active") redirect("/dashboard/contratos?erro=contrato-inactivo");

  const tenant = lease.tenants as unknown as { full_name: string } | null;
  const unit = lease.units as unknown as { name: string } | null;
  const errors: Record<string, string> = {
    "dados-invalidos": "Indique uma data válida e um motivo com pelo menos 5 caracteres.",
    "contrato-inactivo": "Este contrato já não está ativo.",
    "data-invalida": "A data de rescisão não pode ser anterior ao início do contrato.",
    "falha-rescisao": "Não foi possível rescindir o contrato. Tente novamente.",
  };

  return <main className="dashboard-shell">
    <header className="dashboard-header">
      <div><Link className="brand" href="/dashboard">Imobi<span>AO</span></Link><p className="dashboard-subtitle">Gestão de património imobiliário</p></div>
      <Link href="/dashboard/contratos" className="back-link"><ArrowLeft size={16}/> Voltar aos contratos</Link>
    </header>
    <section className="dashboard-content form-page">
      <div className="form-page-title"><span className="form-title-icon"><FileX2 size={22}/></span><div><p className="eyebrow">GESTÃO CONTRATUAL</p><h1>Rescindir contrato</h1><p className="auth-description">{tenant?.full_name ?? "Inquilino"} · {unit?.name ?? "Unidade"}</p></div></div>
      {query.erro && <p className="form-error page-message">{errors[query.erro] ?? "Ocorreu um erro. Tente novamente."}</p>}
      <form action={terminateLease} className="property-form">
        <input type="hidden" name="lease_id" value={lease.id}/>
        <label>Data efetiva da rescisão *<input type="date" name="termination_date" required min={lease.start_date} defaultValue={new Date().toISOString().slice(0,10)}/></label>
        <label>Motivo da rescisão *<textarea name="reason" rows={5} minLength={5} maxLength={1000} required placeholder="Descreva o motivo do encerramento do contrato."/></label>
        <div className="notice-box">A rescisão encerra este contrato, regista o motivo e liberta automaticamente a unidade. As cobranças, pagamentos e recibos já existentes serão preservados.</div>
        <div className="form-actions"><Link href="/dashboard/contratos" className="secondary-button">Cancelar</Link><button type="submit" className="primary-button">Confirmar rescisão</button></div>
      </form>
    </section>
  </main>;
}
