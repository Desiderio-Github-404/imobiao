import { redirect } from "next/navigation";
import { Building2, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { selectOrganization } from "./actions";

type Membership = {
  organization_id: string;
  role: string;
  organizations: { name: string } | { name: string }[] | null;
};

export default async function OrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("memberships")
    .select("organization_id, role, organizations(name)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const memberships = (data ?? []) as Membership[];
  if (error || memberships.length === 0) redirect("/dashboard");

  const params = await searchParams;
  const organizationName = (item: Membership) => {
    const relation = Array.isArray(item.organizations) ? item.organizations[0] : item.organizations;
    return relation?.name ?? "Organização sem nome";
  };

  return (
    <main className="auth-shell">
      <section className="auth-card auth-card-wide">
        <a className="brand" href="/dashboard">Imobi<span>AO</span></a>
        <p className="eyebrow">ESPAÇO DE TRABALHO</p>
        <h1>Escolha uma organização</h1>
        <p className="auth-description">Selecione a empresa ou património que pretende gerir nesta sessão.</p>
        {params.erro && <p className="form-error" role="alert">Não foi possível selecionar esta organização. Atualize a página e tente novamente.</p>}
        <div className="auth-form">
          {memberships.map((membership) => (
            <form action={selectOrganization} key={membership.organization_id}>
              <input type="hidden" name="organization_id" value={membership.organization_id} />
              <button className="secondary-button" type="submit" style={{ width: "100%", justifyContent: "space-between", padding: "16px" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <Building2 size={19} />
                  <span style={{ textAlign: "left" }}>
                    <strong style={{ display: "block" }}>{organizationName(membership)}</strong>
                    <small style={{ opacity: 0.75 }}>{membership.role}</small>
                  </span>
                </span>
                <CheckCircle2 size={18} />
              </button>
            </form>
          ))}
        </div>
      </section>
    </main>
  );
}
