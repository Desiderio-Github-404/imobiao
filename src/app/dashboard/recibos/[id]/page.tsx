import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import PrintButton from "./print-button";

type Receipt = {
  id: string;
  receipt_number: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference: string | null;
  notes: string | null;
  rent_charges: {
    period_start: string;
    due_date: string;
    amount_due: number;
    amount_paid: number;
    leases: {
      monthly_rent: number;
      tenants: { full_name: string; phone: string | null; identity_document: string | null };
      units: { name: string; properties: { name: string; address: string | null; municipality: string | null; province: string | null } };
    };
  };
};

const methodLabels: Record<string, string> = {
  cash: "Dinheiro",
  bank_transfer: "Transferência bancária",
  multicaixa_express: "Multicaixa Express",
  other: "Outro",
};
const money = (value: number) => new Intl.NumberFormat("pt-AO", { maximumFractionDigits: 2 }).format(Number(value));

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase.from("memberships")
    .select("organization_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (!membership) redirect("/dashboard");

  const { data } = await supabase.from("payments")
    .select("id,receipt_number,amount,payment_date,payment_method,reference,notes,rent_charges!inner(period_start,due_date,amount_due,amount_paid,leases!inner(monthly_rent,tenants!inner(full_name,phone,identity_document),units!inner(name,properties!inner(name,address,municipality,province))))")
    .eq("id", id).eq("organization_id", membership.organization_id).maybeSingle();
  if (!data) notFound();

  const receipt = data as unknown as Receipt;
  const { data: organization } = await supabase.from("organizations")
    .select("name").eq("id", membership.organization_id).maybeSingle();
  const charge = receipt.rent_charges;
  const lease = charge.leases;
  const unit = lease.units;
  const property = unit.properties;
  const balance = Math.max(0, Number(charge.amount_due) - Number(charge.amount_paid));

  return <main className="dashboard-shell receipt-page">
    <header className="dashboard-header no-print">
      <div><Link className="brand" href="/dashboard">Imobi<span>AO</span></Link><p className="dashboard-subtitle">Recibo de pagamento</p></div>
      <Link href="/dashboard/rendas" className="back-link"><ArrowLeft size={16}/> Voltar às rendas</Link>
    </header>
    <section className="dashboard-content receipt-content">
      <div className="receipt-toolbar no-print">
        <div><p className="eyebrow">COMPROVATIVO</p><h1>Recibo de pagamento</h1></div>
        <PrintButton />
      </div>
      <article className="receipt-paper">
        <div className="receipt-topline"><div><div className="brand">Imobi<span>AO</span></div><p>Gestão de património imobiliário</p></div><div className="receipt-stamp">RECIBO</div></div>
        <div className="receipt-number"><span>Número do recibo</span><strong>{receipt.receipt_number}</strong></div>
        <h2>{organization?.name ?? "Proprietário"}</h2>
        <p className="receipt-muted">Comprovativo de valor recebido</p>
        <div className="receipt-amount"><span>Valor recebido</span><strong>{money(Number(receipt.amount))} Kz</strong></div>
        <div className="receipt-grid">
          <div><span>Inquilino</span><strong>{lease.tenants.full_name}</strong></div>
          <div><span>Data do pagamento</span><strong>{new Date(receipt.payment_date + "T12:00:00").toLocaleDateString("pt-AO")}</strong></div>
          <div><span>Imóvel</span><strong>{property.name}</strong></div>
          <div><span>Unidade</span><strong>{unit.name}</strong></div>
          <div><span>Período da renda</span><strong>{new Date(charge.period_start + "T12:00:00").toLocaleDateString("pt-AO", { month: "long", year: "numeric" })}</strong></div>
          <div><span>Meio de pagamento</span><strong>{methodLabels[receipt.payment_method] ?? receipt.payment_method}</strong></div>
          <div><span>Renda total</span><strong>{money(Number(charge.amount_due))} Kz</strong></div>
          <div><span>Total pago até agora</span><strong>{money(Number(charge.amount_paid))} Kz</strong></div>
          <div><span>Saldo em falta</span><strong>{money(balance)} Kz</strong></div>
          {receipt.reference && <div><span>Referência</span><strong>{receipt.reference}</strong></div>}
        </div>
        {receipt.notes && <div className="receipt-notes"><span>Observações</span><p>{receipt.notes}</p></div>}
        <p className="receipt-confirmation">Confirmamos o recebimento do valor acima indicado.</p>
        <div className="receipt-footer"><span>Documento emitido através do ImobiAO</span><span>{receipt.receipt_number}</span></div>
      </article>
      <p className="receipt-disclaimer no-print">Este recibo comprova o registo do pagamento na plataforma. Não substitui documentos fiscais legalmente exigidos, quando aplicáveis.</p>
    </section>
  </main>;
}
