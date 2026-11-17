"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createLease(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const unitId = String(formData.get("unit_id") ?? "");
  const tenantId = String(formData.get("tenant_id") ?? "");
  const startDate = String(formData.get("start_date") ?? "");
  const endDate = String(formData.get("end_date") ?? "").trim();
  const rentRaw = String(formData.get("monthly_rent") ?? "").trim();
  const depositRaw = String(formData.get("deposit_amount") ?? "0").trim();
  const dueDayRaw = String(formData.get("due_day") ?? "1").trim();
  const status = String(formData.get("status") ?? "draft");
  const notes = String(formData.get("notes") ?? "").trim();

  const rent = Number(rentRaw);
  const deposit = Number(depositRaw);
  const dueDay = Number(dueDayRaw);
  const allowedStatuses = ["draft", "active"];

  if (!unitId || !tenantId || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
      (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) ||
      (endDate && endDate < startDate) ||
      rentRaw === "" || !Number.isFinite(rent) || rent < 0 ||
      !Number.isFinite(deposit) || deposit < 0 ||
      !Number.isInteger(dueDay) || dueDay < 1 || dueDay > 28 ||
      !allowedStatuses.includes(status) || notes.length > 2000) {
    redirect("/dashboard/contratos/novo?erro=dados-invalidos");
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("organization_id")
    .eq("user_id", user.id)
    .in("role", ["owner", "manager"])
    .limit(1)
    .maybeSingle();

  if (!membership) redirect("/dashboard/contratos/novo?erro=sem-permissao");

  const [{ data: unit }, { data: tenant }] = await Promise.all([
    supabase.from("units").select("id,status,monthly_rent").eq("id", unitId).eq("organization_id", membership.organization_id).maybeSingle(),
    supabase.from("tenants").select("id").eq("id", tenantId).eq("organization_id", membership.organization_id).maybeSingle(),
  ]);

  if (!unit || !tenant || (status === "active" && unit.status !== "available")) {
    redirect("/dashboard/contratos/novo?erro=relacoes-invalidas");
  }

  const { error } = await supabase.from("leases").insert({
    organization_id: membership.organization_id,
    unit_id: unitId,
    tenant_id: tenantId,
    start_date: startDate,
    end_date: endDate || null,
    monthly_rent: rent,
    deposit_amount: deposit,
    due_day: dueDay,
    status,
    notes: notes || null,
  });

  if (error) {
    const duplicate = error.code === "23505";
    redirect(`/dashboard/contratos/novo?erro=${duplicate ? "unidade-ocupada" : "falha-registo"}`);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/contratos");
  revalidatePath("/dashboard/unidades");
  redirect("/dashboard/contratos?sucesso=criado");
}


export async function updateLease(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const leaseId = String(formData.get("lease_id") ?? "");
  const startDate = String(formData.get("start_date") ?? "");
  const endDate = String(formData.get("end_date") ?? "").trim();
  const rentRaw = String(formData.get("monthly_rent") ?? "").trim();
  const depositRaw = String(formData.get("deposit_amount") ?? "0").trim();
  const dueDayRaw = String(formData.get("due_day") ?? "1").trim();
  const status = String(formData.get("status") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();

  const rent = Number(rentRaw);
  const deposit = Number(depositRaw);
  const dueDay = Number(dueDayRaw);
  const allowedStatuses = ["draft", "active", "ended", "terminated"];

  if (!leaseId || !/^\\d{4}-\\d{2}-\\d{2}$/.test(startDate) ||
      (endDate && !/^\\d{4}-\\d{2}-\\d{2}$/.test(endDate)) ||
      (endDate && endDate < startDate) ||
      rentRaw === "" || !Number.isFinite(rent) || rent < 0 ||
      !Number.isFinite(deposit) || deposit < 0 ||
      !Number.isInteger(dueDay) || dueDay < 1 || dueDay > 28 ||
      !allowedStatuses.includes(status) || notes.length > 2000) {
    redirect(`/dashboard/contratos/${leaseId}/editar?erro=dados-invalidos`);
  }

  const { data: membership } = await supabase
    .from("memberships")
    .select("organization_id")
    .eq("user_id", user.id)
    .in("role", ["owner", "manager"])
    .limit(1)
    .maybeSingle();

  if (!membership) redirect("/dashboard/contratos?erro=sem-permissao");

  const { data: currentLease } = await supabase
    .from("leases")
    .select("id,status,start_date,organization_id")
    .eq("id", leaseId)
    .eq("organization_id", membership.organization_id)
    .maybeSingle();

  if (!currentLease) redirect("/dashboard/contratos?erro=nao-encontrado");

  const { error } = await supabase
    .from("leases")
    .update({
      start_date: startDate,
      end_date: endDate || null,
      monthly_rent: rent,
      deposit_amount: deposit,
      due_day: dueDay,
      status,
      notes: notes || null,
    })
    .eq("id", leaseId)
    .eq("organization_id", membership.organization_id);

  if (error) {
    const duplicate = error.code === "23505";
    redirect(`/dashboard/contratos/${leaseId}/editar?erro=${duplicate ? "unidade-ocupada" : "falha-actualizacao"}`);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/contratos");
  revalidatePath("/dashboard/rendas");
  revalidatePath("/dashboard/unidades");
  redirect("/dashboard/contratos?sucesso=actualizado");
}
