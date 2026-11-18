"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getActiveOrganization } from "@/lib/organization";

export async function createLease(formData: FormData) {
  const { supabase, membership } = await getActiveOrganization();

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

  if (!["owner", "manager"].includes(membership.role)) redirect("/dashboard/contratos/novo?erro=sem-permissao");

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
  const { supabase, membership } = await getActiveOrganization();

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

  if (!leaseId || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
      (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) ||
      (endDate && endDate < startDate) ||
      rentRaw === "" || !Number.isFinite(rent) || rent < 0 ||
      !Number.isFinite(deposit) || deposit < 0 ||
      !Number.isInteger(dueDay) || dueDay < 1 || dueDay > 28 ||
      !allowedStatuses.includes(status) || notes.length > 2000) {
    redirect(`/dashboard/contratos/${leaseId}/editar?erro=dados-invalidos`);
  }

  if (!["owner", "manager"].includes(membership.role)) redirect("/dashboard/contratos?erro=sem-permissao");

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


export async function renewLease(formData: FormData) {
  const { supabase, membership } = await getActiveOrganization();

  const leaseId = String(formData.get("lease_id") ?? "");
  const startDate = String(formData.get("start_date") ?? "");
  const endDate = String(formData.get("end_date") ?? "").trim();
  const rentRaw = String(formData.get("monthly_rent") ?? "").trim();
  const depositRaw = String(formData.get("deposit_amount") ?? "0").trim();
  const dueDayRaw = String(formData.get("due_day") ?? "1").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const rent = Number(rentRaw);
  const deposit = Number(depositRaw);
  const dueDay = Number(dueDayRaw);

  if (!leaseId || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
      (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) ||
      (endDate && endDate < startDate) || rentRaw === "" ||
      !Number.isFinite(rent) || rent < 0 || !Number.isFinite(deposit) ||
      deposit < 0 || !Number.isInteger(dueDay) || dueDay < 1 || dueDay > 28 ||
      notes.length > 2000) {
    redirect(`/dashboard/contratos/${leaseId}/renovar?erro=dados-invalidos`);
  }

  const { data: membership } = await supabase.from("memberships")
    .select("organization_id").eq("user_id", user.id)
    .in("role", ["owner", "manager"]).limit(1).maybeSingle();
  if (!membership) redirect("/dashboard/contratos?erro=sem-permissao");

  const { data: newLeaseId, error } = await supabase.rpc("renew_lease", {
    p_lease_id: leaseId,
    p_start_date: startDate,
    p_end_date: endDate || null,
    p_monthly_rent: rent,
    p_deposit_amount: deposit,
    p_due_day: dueDay,
    p_notes: notes || null,
  });

  if (error || !newLeaseId) {
    const message = error?.message ?? "";
    const code = message.includes("Only active") ? "contrato-inactivo"
      : message.includes("Renewal must start") ? "data-invalida"
      : message.includes("duplicate") || error?.code === "23505" ? "unidade-ocupada"
      : "falha-renovacao";
    redirect(`/dashboard/contratos/${leaseId}/renovar?erro=${code}`);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/contratos");
  revalidatePath("/dashboard/rendas");
  revalidatePath("/dashboard/unidades");
  redirect("/dashboard/contratos?sucesso=renovado");
}


export async function terminateLease(formData: FormData) {
  const { supabase, membership } = await getActiveOrganization();

  const leaseId = String(formData.get("lease_id") ?? "");
  const terminationDate = String(formData.get("termination_date") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  if (!leaseId || !/^\d{4}-\d{2}-\d{2}$/.test(terminationDate) ||
      reason.length < 5 || reason.length > 1000) {
    redirect(`/dashboard/contratos/${leaseId}/rescindir?erro=dados-invalidos`);
  }

  const { data: membership } = await supabase.from("memberships")
    .select("organization_id").eq("user_id", user.id)
    .in("role", ["owner", "manager"]).limit(1).maybeSingle();
  if (!membership) redirect("/dashboard/contratos?erro=sem-permissao");

  const { error } = await supabase.rpc("terminate_lease", {
    p_lease_id: leaseId,
    p_termination_date: terminationDate,
    p_reason: reason,
  });

  if (error) {
    const code = error.message.includes("Only active") ? "contrato-inactivo"
      : error.message.includes("cannot precede") ? "data-invalida"
      : "falha-rescisao";
    redirect(`/dashboard/contratos/${leaseId}/rescindir?erro=${code}`);
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/contratos");
  revalidatePath("/dashboard/unidades");
  revalidatePath("/dashboard/rendas");
  revalidatePath("/dashboard/atividades");
  redirect("/dashboard/contratos?sucesso=rescindido");
}
