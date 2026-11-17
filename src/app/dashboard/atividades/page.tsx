import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ArrowLeft, Activity, PlusCircle, Pencil, Trash2, Clock3 } from "lucide-react";

const labels: Record<string,string> = {
  properties: "Imóvel", units: "Unidade", tenants: "Inquilino",
  leases: "Contrato", rent_charges: "Cobrança", payments: "Pagamento",
};
const actionLabels: Record<string,string> = { INSERT:"Criado", UPDATE:"Atualizado", DELETE:"Eliminado" };
const actionIcons = { INSERT: PlusCircle, UPDATE: Pencil, DELETE: Trash2 };

function describe(log: any) {
  const data = log.new_data ?? log.old_data ?? {};
  const name = data.name ?? data.full_name ?? data.description ?? data.receipt_number ?? "";
  return name ? `${labels[log.table_name] ?? log.table_name}: ${name}` : (labels[log.table_name] ?? log.table_name);
}

export default async function AtividadesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: membership } = await supabase.from("memberships")
    .select("organization_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (!membership) redirect("/dashboard");

  const { data: logs, error } = await supabase.from("activity_logs")
    .select("id,actor_id,table_name,record_id,operation,old_data,new_data,created_at")
    .eq("organization_id", membership.organization_id)
    .order("created_at", { ascending:false }).limit(100);

  return <main className="dashboard-shell">
    <header className="dashboard-header"><div><a className="brand" href="/dashboard">Imobi<span>AO</span></a><p className="dashboard-subtitle">Segurança e rastreabilidade</p></div><a className="back-link" href="/dashboard"><ArrowLeft size={16}/> Voltar ao painel</a></header>
    <section className="dashboard-content activity-content">
      <div className="page-heading"><div><p className="eyebrow">GESTÃO E CONTROLO</p><h1>Histórico de atividades</h1><p className="auth-description">Registo automático das operações realizadas na organização.</p></div><div className="activity-total"><Activity size={18}/><strong>{logs?.length ?? 0}</strong><span>registos recentes</span></div></div>
      {error ? <div className="notice-box">Não foi possível carregar o histórico. Confirme se executou a migração 0010.</div> : !logs?.length ? <section className="empty-panel"><div className="empty-icon"><Activity size={25}/></div><h2>Ainda não existem atividades registadas</h2><p>As próximas alterações a imóveis, unidades, inquilinos, contratos, cobranças e pagamentos serão registadas automaticamente.</p></section> :
      <div className="activity-list">{logs.map((log:any)=>{const Icon=actionIcons[log.operation as keyof typeof actionIcons] ?? Activity; return <article className="activity-item" key={log.id}><span className={`activity-action activity-${log.operation.toLowerCase()}`}><Icon size={17}/></span><div className="activity-info"><div className="activity-title"><strong>{actionLabels[log.operation] ?? log.operation}</strong><span>{labels[log.table_name] ?? log.table_name}</span></div><p>{describe(log)}</p><small><Clock3 size={12}/> {new Intl.DateTimeFormat("pt-AO",{dateStyle:"medium",timeStyle:"short"}).format(new Date(log.created_at))} · {log.actor_id === user.id ? "Realizado por si" : log.actor_id ? `Utilizador ${log.actor_id.slice(0,8)}` : "Sistema"}</small></div></article>})}</div>}
      <p className="dashboard-footnote">O histórico apresenta até 100 operações mais recentes. Os registos são gerados automaticamente pela base de dados.</p>
    </section>
  </main>;
}
