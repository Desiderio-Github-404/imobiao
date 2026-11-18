import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Building2, MapPin, Plus } from "lucide-react";
import { getActiveOrganization } from "@/lib/organization";

type Property = {
  id: string;
  name: string;
  property_type: string;
  address: string | null;
  municipality: string | null;
  province: string | null;
};

const typeLabels: Record<string, string> = {
  residential: "Residencial",
  commercial: "Comercial",
  mixed: "Misto",
  land: "Terreno",
  other: "Outro",
};

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ sucesso?: string }>;
}) {
  const { supabase, user, membership } = await getActiveOrganization();


  const { data, error } = await supabase
    .from("properties")
    .select("id, name, property_type, address, municipality, province")
    .eq("organization_id", membership.organization_id)
    .order("created_at", { ascending: false });

  const params = await searchParams;
  const properties = (data ?? []) as Property[];

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <div><Link className="brand" href="/dashboard">Imobi<span>AO</span></Link><p className="dashboard-subtitle">Gestão de património imobiliário</p></div>
        <Link href="/dashboard" className="back-link"><ArrowLeft size={16}/> Painel principal</Link>
      </header>
      <section className="dashboard-content">
        <div className="page-heading">
          <div><p className="eyebrow">PATRIMÓNIO</p><h1>Os meus imóveis</h1><p className="auth-description">Registe e acompanhe os edifícios, casas, lojas e terrenos da sua carteira.</p></div>
          <Link href="/dashboard/imoveis/novo" className="primary-link"><Plus size={17}/> Adicionar imóvel</Link>
        </div>
        {params.sucesso === "criado" && <p className="form-success page-message">Imóvel registado com sucesso.</p>}
        {error && <p className="form-error page-message">Não foi possível carregar os imóveis. Atualize a página.</p>}
        {properties.length === 0 ? (
          <section className="empty-panel">
            <div className="empty-icon"><Building2 size={25}/></div>
            <h2>Ainda não tem imóveis registados</h2>
            <p>Comece por adicionar o primeiro imóvel. Depois poderá organizar as respetivas unidades e inquilinos.</p>
            <Link href="/dashboard/imoveis/novo" className="primary-link"><Plus size={16}/> Registar primeiro imóvel</Link>
          </section>
        ) : (
          <div className="property-grid">
            {properties.map((property) => {
              const location = [property.municipality, property.province].filter(Boolean).join(", ");
              return <article className="property-card" key={property.id}>
                <div className="property-card-top"><span className="property-type">{typeLabels[property.property_type] ?? "Imóvel"}</span><span className="property-card-icon"><Building2 size={20}/></span></div>
                <h2>{property.name}</h2>
                <p className="property-location"><MapPin size={14}/>{location || property.address || "Localização não indicada"}</p>
                {property.address && <p className="property-address">{property.address}</p>}
                <Link href={`/dashboard/unidades?imovel=${property.id}`} className="property-units-link">Gerir unidades</Link>
              </article>;
            })}
          </div>
        )}
      </section>
    </main>
  );
}
