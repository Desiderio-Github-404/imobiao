import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Home, Plus, MapPin, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type Unit = {
  id: string;
  property_id: string;
  name: string;
  floor: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  monthly_rent: number;
  status: string;
};

const statusLabels: Record<string, string> = {
  available: "Disponível",
  occupied: "Ocupada",
  maintenance: "Em manutenção",
  inactive: "Inativa",
};

export default async function UnitsPage({
  searchParams,
}: {
  searchParams: Promise<{ imovel?: string; sucesso?: string }>;
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

  const params = await searchParams;
  const { data: properties } = await supabase
    .from("properties")
    .select("id, name, municipality, province")
    .eq("organization_id", membership.organization_id)
    .order("name");

  const selectedProperty = params.imovel && properties?.some((p) => p.id === params.imovel)
    ? params.imovel
    : undefined;

  let unitsQuery = supabase
    .from("units")
    .select("id, property_id, name, floor, bedrooms, bathrooms, monthly_rent, status")
    .eq("organization_id", membership.organization_id)
    .order("created_at", { ascending: false });

  if (selectedProperty) unitsQuery = unitsQuery.eq("property_id", selectedProperty);

  const { data: units, error } = await unitsQuery;
  const propertyNames = new Map((properties ?? []).map((p) => [p.id, p.name]));

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <div><Link className="brand" href="/dashboard">Imobi<span>AO</span></Link><p className="dashboard-subtitle">Gestão de património imobiliário</p></div>
        <Link href="/dashboard/imoveis" className="back-link"><ArrowLeft size={16}/> Voltar aos imóveis</Link>
      </header>
      <section className="dashboard-content">
        <div className="page-heading">
          <div><p className="eyebrow">INVENTÁRIO</p><h1>Unidades imobiliárias</h1><p className="auth-description">Organize apartamentos, lojas, escritórios e outras unidades de cada imóvel.</p></div>
          <Link href="/dashboard/unidades/novo" className="primary-link"><Plus size={17}/> Adicionar unidade</Link>
        </div>
        {params.sucesso === "criado" && <p className="form-success page-message">Unidade registada com sucesso.</p>}
        {error && <p className="form-error page-message">Não foi possível carregar as unidades. Atualize a página.</p>}
        {selectedProperty && <p className="notice-box">A apresentar unidades de: {propertyNames.get(selectedProperty)}. <Link href="/dashboard/unidades">Ver todas</Link></p>}
        {!units?.length ? (
          <section className="empty-panel">
            <div className="empty-icon"><Home size={25}/></div>
            <h2>Ainda não existem unidades</h2>
            <p>Adicione as unidades que podem ser arrendadas dentro dos seus imóveis.</p>
            <Link href="/dashboard/unidades/novo" className="primary-link"><Plus size={16}/> Registar primeira unidade</Link>
          </section>
        ) : (
          <div className="property-grid">
            {(units as Unit[]).map((unit) => (
              <article className="property-card" key={unit.id}>
                <div className="property-card-top"><span className="property-type">{statusLabels[unit.status] ?? unit.status}</span><span className="property-card-icon"><Home size={20}/></span></div>
                <h2>{unit.name}</h2>
                <p className="property-location"><MapPin size={14}/>{propertyNames.get(unit.property_id) ?? "Imóvel"}</p>
                <div className="unit-meta">
                  {unit.floor && <span>Piso: {unit.floor}</span>}
                  {unit.bedrooms !== null && <span>{unit.bedrooms} quartos</span>}
                  {unit.bathrooms !== null && <span>{unit.bathrooms} WC</span>}
                </div>
                <div className="dashboard-quick-links"><Link href={`/dashboard/unidades/${unit.id}`}><FileText size={14}/> Ver ficha e histórico</Link></div>
                <p className="unit-rent">{new Intl.NumberFormat("pt-AO").format(Number(unit.monthly_rent))} Kz/mês</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
