import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck, UserPlus, Users, BriefcaseBusiness, Wallet, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { addTeamMember, updateTeamMemberRole, removeTeamMember } from "./actions";

type TeamMember = {
  user_id: string;
  email: string;
  full_name: string | null;
  role: "owner" | "manager" | "finance" | "staff";
  joined_at: string;
};

const roleLabels: Record<TeamMember["role"], string> = {
  owner: "Proprietário",
  manager: "Gestor",
  finance: "Financeiro",
  staff: "Assistente",
};

const roleDescriptions: Record<TeamMember["role"], string> = {
  owner: "Acesso total e controlo da equipa.",
  manager: "Gestão da carteira, contratos e operações gerais da organização.",
  finance: "Gestão de cobranças, pagamentos e operações financeiras.",
  staff: "Consulta dos dados, sem permissões de alteração.",
};

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ sucesso?: string; erro?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase.from("memberships")
    .select("organization_id,role").eq("user_id", user.id)
    .order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (!membership) redirect("/dashboard");

  const isOwner = membership.role === "owner";
  const { data: memberData, error } = await supabase.rpc("list_org_members");
  const members = (memberData ?? []) as TeamMember[];
  const params = await searchParams;

  const successMessages: Record<string, string> = {
    adicionado: "Membro adicionado à equipa.",
    actualizado: "Permissões atualizadas.",
    removido: "Membro removido da organização.",
  };
  const errorMessages: Record<string, string> = {
    "sem-permissao": "Apenas o proprietário pode gerir os membros da equipa.",
    "dados-invalidos": "Verifique o e-mail e a função selecionada.",
    "conta-inexistente": "Este e-mail ainda não tem conta no ImobiAO. A pessoa deve registar-se primeiro.",
    "membro-existente": "Este utilizador já pertence à organização.",
    "falha-adicao": "Não foi possível adicionar o membro. Verifique se já pertence à equipa.",
    "falha-actualizacao": "Não foi possível atualizar as permissões.",
    "falha-remocao": "Não foi possível remover o membro.",
  };

  return <main className="dashboard-shell">
    <header className="dashboard-header">
      <div><Link className="brand" href="/dashboard">Imobi<span>AO</span></Link><p className="dashboard-subtitle">Gestão da organização</p></div>
      <Link href="/dashboard" className="back-link"><ArrowLeft size={16}/> Painel principal</Link>
    </header>
    <section className="dashboard-content team-content">
      <div className="page-heading">
        <div><p className="eyebrow">ADMINISTRAÇÃO</p><h1>Equipa e permissões</h1><p className="auth-description">Controle quem pode consultar e gerir os dados da organização.</p></div>
        <div className="team-count"><Users size={17}/><strong>{members.length}</strong><span>membros</span></div>
      </div>
      {params.sucesso && successMessages[params.sucesso] && <p className="form-success page-message">{successMessages[params.sucesso]}</p>}
      {params.erro && errorMessages[params.erro] && <p className="form-error page-message">{errorMessages[params.erro]}</p>}
      {error && <p className="form-error page-message">Não foi possível carregar a equipa. Atualize a página.</p>}

      <div className="team-role-grid">
        <article><span><ShieldCheck size={18}/></span><h2>Proprietário</h2><p>Acesso total, incluindo gestão de membros e permissões.</p></article>
        <article><span><BriefcaseBusiness size={18}/></span><h2>Gestor</h2><p>Gere a carteira, contratos e operações gerais da organização.</p></article>
        <article><span><Wallet size={18}/></span><h2>Financeiro</h2><p>Gere cobranças e pagamentos, sem gerir o património.</p></article>
        <article><span><UserRound size={18}/></span><h2>Assistente</h2><p>Consulta os dados, sem alterar registos.</p></article>
      </div>

      {isOwner ? <section className="team-add-panel">
        <div><h2><UserPlus size={18}/> Adicionar membro</h2><p>O utilizador precisa de já ter uma conta registada no ImobiAO.</p></div>
        <form action={addTeamMember} className="team-add-form">
          <label>E-mail da conta<input type="email" name="email" placeholder="nome@exemplo.com" required/></label>
          <label>Função<select name="role" defaultValue="staff"><option value="manager">Gestor</option><option value="finance">Financeiro</option><option value="staff">Assistente</option></select></label>
          <button className="primary-button" type="submit"><UserPlus size={16}/> Adicionar à equipa</button>
        </form>
      </section> : <div className="notice-box">Pode consultar os membros da organização. Apenas o proprietário pode adicionar, remover ou alterar permissões.</div>}

      <section className="team-list-panel">
        <div className="team-list-heading"><div><h2>Membros da organização</h2><p>Contas associadas a esta organização.</p></div></div>
        {members.length === 0 ? <div className="chart-empty">Ainda não existem membros associados.</div> : <div className="team-member-list">
          {members.map((member) => <article className="team-member" key={member.user_id}>
            <div className="team-avatar">{(member.full_name || member.email || "?").slice(0,1).toUpperCase()}</div>
            <div className="team-member-info"><strong>{member.full_name || member.email}</strong><span>{member.email}</span><small>Desde {new Date(member.joined_at).toLocaleDateString("pt-AO")}</small></div>
            <span className={"team-role-badge role-" + member.role}>{roleLabels[member.role]}</span>
            {isOwner && member.role !== "owner" && <div className="team-member-actions">
              <form action={updateTeamMemberRole}>
                <input type="hidden" name="user_id" value={member.user_id}/>
                <label className="sr-only" htmlFor={"role-" + member.user_id}>Função de {member.email}</label>
                <select id={"role-" + member.user_id} name="role" defaultValue={member.role}>
                  <option value="manager">Gestor</option><option value="finance">Financeiro</option><option value="staff">Assistente</option>
                </select>
                <button className="secondary-button" type="submit">Guardar</button>
              </form>
              <form action={removeTeamMember}>
                <input type="hidden" name="user_id" value={member.user_id}/>
                <button className="team-remove-button" type="submit">Remover</button>
              </form>
            </div>}
          </article>)}
        </div>}
      </section>
      <p className="dashboard-footnote">A gestão de convites por e-mail será ativada numa fase posterior. Nesta versão, o utilizador deve criar a sua conta antes de ser associado.</p>
    </section>
  </main>;
}
