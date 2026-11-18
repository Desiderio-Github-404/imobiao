"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getActiveOrganization } from "@/lib/organization";

export async function createRentCharge(formData: FormData) {
  const { supabase, membership } = await getActiveOrganization();

  const leaseId = String(formData.get("lease_id") ?? "");
  const period = String(formData.get("period") ?? "");
  if (!leaseId || !/^\d{4}-\d{2}$/.test(period)) redirect("/dashboard/rendas/novo?erro=dados-invalidos");

  if (!["owner", "manager", "finance"].includes(membership.role)) redirect("/dashboard/rendas/novo?erro=sem-permissao");

  const { data: lease } = await supabase.from("leases")
    .select("id,start_date,end_date,monthly_rent,due_day,status")
    .eq("id", leaseId).eq("organization_id", membership.organization_id).eq("status","active").maybeSingle();
  if (!lease) redirect("/dashboard/rendas/novo?erro=contrato-invalido");

  const [year, month] = period.split("-").map(Number);
  const periodStart = `${period}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const dueDay = Math.min(Number(lease.due_day), lastDay);
  const dueDate = `${period}-${String(dueDay).padStart(2,"0")}`;
  if (periodStart < lease.start_date || (lease.end_date && periodStart > lease.end_date)) {
    redirect("/dashboard/rendas/novo?erro=periodo-invalido");
  }

  const today = new Date().toISOString().slice(0,10);
  const { error } = await supabase.from("rent_charges").insert({
    organization_id: membership.organization_id,
    lease_id: lease.id,
    period_start: periodStart,
    due_date: dueDate,
    amount_due: lease.monthly_rent,
    amount_paid: 0,
    status: dueDate < today ? "overdue" : "pending",
    description: `Renda referente a ${String(month).padStart(2,"0")}/${year}`,
  });

  if (error) redirect(`/dashboard/rendas/novo?erro=${error.code === "23505" ? "duplicada" : "falha-registo"}`);
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/rendas");
  redirect("/dashboard/rendas?sucesso=cobranca");
}

export async function recordPayment(formData: FormData) {
  const { supabase, membership } = await getActiveOrganization();

  const chargeId = String(formData.get("charge_id") ?? "");
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const date = String(formData.get("payment_date") ?? "");
  const method = String(formData.get("payment_method") ?? "cash");
  const reference = String(formData.get("reference") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const amount = Number(amountRaw);
  const methods = ["cash","bank_transfer","multicaixa_express","other"];

  if (!chargeId || amountRaw === "" || !Number.isFinite(amount) || amount <= 0 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) || date > new Date().toISOString().slice(0,10) ||
      !methods.includes(method) || reference.length > 120 || notes.length > 1000) {
    redirect("/dashboard/rendas?erro=dados-invalidos");
  }

  if (!["owner", "manager", "finance"].includes(membership.role)) redirect("/dashboard/rendas?erro=sem-permissao");

  const { data: charge } = await supabase.from("rent_charges")
    .select("id,amount_due,amount_paid").eq("id",chargeId)
    .eq("organization_id",membership.organization_id).maybeSingle();
  if (!charge) redirect("/dashboard/rendas?erro=cobranca-invalida");
  if (amount > Number(charge.amount_due)-Number(charge.amount_paid)) redirect("/dashboard/rendas?erro=valor-excessivo");

  const { data: paymentId, error } = await supabase.rpc("record_rent_payment", {
    p_charge_id: chargeId, p_amount: amount, p_payment_date: date,
    p_payment_method: method, p_reference: reference || null, p_notes: notes || null,
  });
  if (error) redirect(`/dashboard/rendas?erro=${error.message.includes("exceeds outstanding") ? "valor-excessivo" : "falha-pagamento"}`);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/rendas");
  if (paymentId) redirect(`/dashboard/recibos/${paymentId}`);
  redirect("/dashboard/rendas?sucesso=pagamento");
}
