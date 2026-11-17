import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Home } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createUnit } from "../actions";

export default async function NewUnitPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; imovel?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("memberships")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) redirect("/dashboard");

  const { data: properties } = await supabase
    .from("properties")
    .select("id, name")
    .eq("organization_id", membership.organization_id)
    .order("name");

  const params = await searchParams;
  const errorMessages: Record<string, string> = {
    "dados-invalidos": "Verifique os dados. O nome, o imóvel e a renda mensal são obrigatórios.",
    "sem-permissao": "A sua conta não tem permissão para registar unidades nesta organização.",
    "falha-registo": "Não foi possível guardar a unidade. Confirme os dados e tente novamente.",
  };

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <div><Link className="brand" href="/dashboard">Imobi<span>AO</span></Link><p className="dashboard-subtitle">Gestão de património imobiliário</p></div>
        <Link href="/dashboard/unidades" className="back-link"><ArrowLeft size={16}/> Voltar às unidades</Link>
      </header>
      <section className="dashboard-content form-page">
        <div className="form-page-title"><span className="form-title-icon"><Home size={22}/></span><div><p className="eyebrow">NOVO REGISTO</p><h1>Adicionar unidade</h1><p className="auth-description">Registe um apartamento, loja, escritório ou outra unidade de arrendamento.</p></div></div>
        {params.erro && <p className="form-error page-message">{errorMessages[params.erro] ?? "Ocorreu um erro. Tente novamente."}</p>}
        {!properties?.length ? (
          <section className="empty-panel"><h2>Registe primeiro um imóvel</h2><p>Uma unidade precisa de estar associada a um imóvel existente.</p><Link href="/dashboard/imoveis/novo" className="primary-link">Adicionar imóvel</Link></section>
        ) : (
          <form action={createUnit} className="property-form">
            <div className="form-section-label">Identificação da unidade</div>
            <label>Imóvel associado *<select name="property_id" required defaultValue={params.imovel && properties.some((p) => p.id === params.imovel) ? params.imovel : ""}><option value="" disabled>Selecione o imóvel</option>{properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}</select></label>
            <label>Nome ou número da unidade *<input name="name" required minLength={1} maxLength={100} placeholder="Ex.: Apartamento 2B, Loja 04" /></label>
            <label>Piso<input name="floor" maxLength={30} placeholder="Ex.: 2.º andar, Rés-do-chão" /></label>
            <div className="form-two-columns">
              <label>Quartos<input name="bedrooms" type="number" min="0" max="50" step="1" placeholder="Ex.: 2" /></label>
              <label>Casas de banho<input name="bathrooms" type="number" min="0" max="50" step="0.5" placeholder="Ex.: 1" /></label>
            </div>
            <label>Renda mensal (Kz) *<input name="monthly_rent" type="number" required min="0" step="0.01" placeholder="Ex.: 150000" /></label>
            <label>Estado<select name="status" defaultValue="available"><option value="available">Disponível</option><option value="occupied">Ocupada</option><option value="maintenance">Em manutenção</option><option value="inactive">Inativa</option></select></label>
            <label>Notas<textarea name="notes" rows={3} maxLength={1000} placeholder="Características ou observações da unidade..." /></label>
            <div className="form-actions"><Link href="/dashboard/unidades" className="secondary-button">Cancelar</Link><button type="submit" className="primary-button">Guardar unidade</button></div>
          </form>
        )}
      </section>
    </main>
  );
}
