import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Building2 } from "lucide-react";
import { getActiveOrganization } from "@/lib/organization";
import { createProperty } from "../actions";

const errorMessages: Record<string, string> = {
  "verifique-os-dados": "Verifique o nome e o tipo de imóvel selecionado.",
  "sem-permissao": "A sua conta não tem permissão para registar imóveis nesta organização.",
  "nao-foi-possivel-guardar": "Não foi possível guardar o imóvel. Tente novamente.",
};

export default async function NewPropertyPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { supabase, user, membership } = await getActiveOrganization();
  if (!["owner", "manager"].includes(membership.role)) redirect("/dashboard?erro=sem-permissao");
  const params = await searchParams;

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <div><Link className="brand" href="/dashboard">Imobi<span>AO</span></Link><p className="dashboard-subtitle">Gestão de património imobiliário</p></div>
        <Link href="/dashboard/imoveis" className="back-link"><ArrowLeft size={16}/> Voltar aos imóveis</Link>
      </header>
      <section className="dashboard-content form-page">
        <div className="form-page-title"><span className="form-title-icon"><Building2 size={22}/></span><div><p className="eyebrow">NOVO REGISTO</p><h1>Adicionar imóvel</h1><p className="auth-description">Preencha os dados principais. Poderá acrescentar mais detalhes posteriormente.</p></div></div>
        {params.erro && <p className="form-error page-message">{errorMessages[params.erro] ?? "Ocorreu um erro. Tente novamente."}</p>}
        <form action={createProperty} className="property-form">
          <div className="form-section-label">Informações do imóvel</div>
          <label>Nome do imóvel *<input name="name" required minLength={2} maxLength={120} placeholder="Ex.: Edifício Nova Vida" /></label>
          <label>Tipo de imóvel *<select name="property_type" required defaultValue="residential"><option value="residential">Residencial</option><option value="commercial">Comercial</option><option value="mixed">Misto (residencial e comercial)</option><option value="land">Terreno</option><option value="other">Outro</option></select></label>
          <label>Endereço completo<input name="address" maxLength={250} placeholder="Rua, avenida, número, bairro..." /></label>
          <div className="form-two-columns">
            <label>Município<input name="municipality" maxLength={100} placeholder="Ex.: Talatona" /></label>
            <label>Província<input name="province" maxLength={100} placeholder="Ex.: Luanda" /></label>
          </div>
          <label>Descrição (opcional)<textarea name="description" rows={4} maxLength={1000} placeholder="Notas ou características relevantes do imóvel..." /></label>
          <div className="form-actions"><Link href="/dashboard/imoveis" className="secondary-button">Cancelar</Link><button type="submit" className="primary-button">Guardar imóvel</button></div>
        </form>
      </section>
    </main>
  );
}
